import type { RecordingMetadata, RecordingMetadataJson, UploadNetworkType, UploadState } from "../types/recording";
import { getDatabase } from "./database";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
export const MAX_UPLOAD_ATTEMPTS = 7;

export type VideoListItem = Omit<RecordingMetadata, "metadata"> & {
  metadataJson: string;
};

type VideoRow = {
  video_id: string;
  worker_id: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  file_size_bytes: number;
  fps: number;
  fps_tier: RecordingMetadata["fpsTier"];
  device_model: string;
  os_version: string;
  resolution: string;
  local_path: string;
  metadata_json: string;
  upload_state: UploadState;
  attempt_count: number;
  last_error: string | null;
  last_attempted_at: string | null;
};

function mapVideoRow(row: VideoRow): VideoListItem {
  return {
    videoId: row.video_id,
    workerId: row.worker_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    fileSizeBytes: row.file_size_bytes,
    fps: row.fps,
    fpsTier: row.fps_tier,
    deviceModel: row.device_model,
    osVersion: row.os_version,
    resolution: row.resolution,
    localPath: row.local_path,
    metadataJson: row.metadata_json,
    uploadState: row.upload_state,
    attemptCount: row.attempt_count,
    lastError: row.last_error,
    lastAttemptedAt: row.last_attempted_at,
  };
}

function parseMetadataJson(value: string): RecordingMetadataJson {
  const metadata = JSON.parse(value) as Partial<RecordingMetadataJson>;

  if (typeof metadata.video_id !== "string" || typeof metadata.worker_id !== "string") {
    throw new Error("Stored recording metadata is invalid.");
  }

  return metadata as RecordingMetadataJson;
}

export async function insertRecording(recording: RecordingMetadata): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO workers (worker_id, created_at, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(worker_id) DO UPDATE SET updated_at = excluded.updated_at`,
      recording.workerId,
      now,
      now
    );

    await transaction.runAsync(
      `INSERT INTO videos (
         video_id, worker_id, started_at, ended_at, duration_ms,
         file_size_bytes, fps, fps_tier, device_model, os_version,
         resolution, local_path, metadata_json, upload_state, attempt_count,
         last_error, last_attempted_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      recording.videoId,
      recording.workerId,
      recording.startedAt,
      recording.endedAt,
      recording.durationMs,
      recording.fileSizeBytes,
      recording.fps,
      recording.fpsTier,
      recording.deviceModel,
      recording.osVersion,
      recording.resolution,
      recording.localPath,
      JSON.stringify(recording.metadata),
      recording.uploadState,
      recording.attemptCount,
      recording.lastError,
      recording.lastAttemptedAt,
      now,
      now
    );
  });
}

export async function getVideosPage(options: {
  workerId: string;
  limit?: number;
  cursor?: { startedAt: string; videoId: string };
}): Promise<VideoListItem[]> {
  const database = await getDatabase();
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const columns = `
    video_id, worker_id, started_at, ended_at, duration_ms, file_size_bytes,
    fps, fps_tier, device_model, os_version, resolution, local_path,
    metadata_json, upload_state, attempt_count, last_error, last_attempted_at
  `;

  const rows = options.cursor
    ? await database.getAllAsync<VideoRow>(
        `SELECT ${columns}
         FROM videos
         WHERE worker_id = ?
           AND (started_at < ? OR (started_at = ? AND video_id < ?))
         ORDER BY started_at DESC, video_id DESC
         LIMIT ?`,
        options.workerId,
        options.cursor.startedAt,
        options.cursor.startedAt,
        options.cursor.videoId,
        limit
      )
    : await database.getAllAsync<VideoRow>(
        `SELECT ${columns}
         FROM videos
         WHERE worker_id = ?
         ORDER BY started_at DESC, video_id DESC
         LIMIT ?`,
        options.workerId,
        limit
      );

  return rows.map(mapVideoRow);
}

export async function getUploadQueue(limit = 10): Promise<VideoListItem[]> {
  const database = await getDatabase();
  const safeLimit = Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
  const rows = await database.getAllAsync<VideoRow>(
    `SELECT
       video_id, worker_id, started_at, ended_at, duration_ms, file_size_bytes,
       fps, fps_tier, device_model, os_version, resolution, local_path,
       metadata_json, upload_state, attempt_count, last_error, last_attempted_at
     FROM videos
     WHERE upload_state = 'pending'
     ORDER BY last_attempted_at IS NOT NULL, last_attempted_at ASC, started_at ASC
     LIMIT ?`,
    safeLimit
  );

  return rows.map(mapVideoRow);
}

export async function recoverInterruptedUploads(): Promise<number> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `UPDATE videos
     SET upload_state = CASE WHEN attempt_count >= ? THEN 'failed' ELSE 'pending' END,
         last_error = COALESCE(last_error, 'Upload interrupted before completion.'),
         updated_at = ?
     WHERE upload_state = 'uploading'`,
    MAX_UPLOAD_ATTEMPTS,
    now
  );

  return result.changes;
}

export async function claimPendingUpload(videoId: string, networkType: UploadNetworkType): Promise<VideoListItem | null> {
  const database = await getDatabase();
  let claimedRow: VideoRow | null = null;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync<VideoRow>(
      `SELECT
         video_id, worker_id, started_at, ended_at, duration_ms, file_size_bytes,
         fps, fps_tier, device_model, os_version, resolution, local_path,
         metadata_json, upload_state, attempt_count, last_error, last_attempted_at
       FROM videos
       WHERE video_id = ? AND upload_state = 'pending'`,
      videoId
    );

    if (!row) {
      return;
    }

    const attemptedAt = new Date().toISOString();
    const metadata = parseMetadataJson(row.metadata_json);
    metadata.network_type_at_upload = networkType;

    const result = await transaction.runAsync(
      `UPDATE videos
       SET upload_state = 'uploading',
           attempt_count = attempt_count + 1,
           last_error = NULL,
           last_attempted_at = ?,
           network_type_at_upload = ?,
           metadata_json = ?,
           updated_at = ?
       WHERE video_id = ? AND upload_state = 'pending'`,
      attemptedAt,
      networkType,
      JSON.stringify(metadata),
      attemptedAt,
      videoId
    );

    if (result.changes !== 1) {
      return;
    }

    claimedRow = {
      ...row,
      metadata_json: JSON.stringify(metadata),
      upload_state: "uploading",
      attempt_count: row.attempt_count + 1,
      last_error: null,
      last_attempted_at: attemptedAt,
    };
  });

  return claimedRow ? mapVideoRow(claimedRow) : null;
}

export async function markUploadSucceeded(videoId: string): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `UPDATE videos
     SET upload_state = 'uploaded',
         last_error = NULL,
         uploaded_at = ?,
         updated_at = ?
     WHERE video_id = ? AND upload_state = 'uploading'`,
    now,
    now,
    videoId
  );

  if (result.changes === 0) {
    const row = await database.getFirstAsync<{ upload_state: UploadState }>(
      "SELECT upload_state FROM videos WHERE video_id = ?",
      videoId
    );

    if (row?.upload_state !== "uploaded") {
      throw new Error(`Video ${videoId} was not in the uploading state.`);
    }
  }
}

export async function markUploadFailed(videoId: string, errorMessage: string): Promise<UploadState> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  let nextState: UploadState = "pending";

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync<{ attempt_count: number; upload_state: UploadState }>(
      "SELECT attempt_count, upload_state FROM videos WHERE video_id = ?",
      videoId
    );

    if (!row || row.upload_state !== "uploading") {
      return;
    }

    nextState = row.attempt_count >= MAX_UPLOAD_ATTEMPTS ? "failed" : "pending";
    await transaction.runAsync(
      `UPDATE videos
       SET upload_state = ?, last_error = ?, updated_at = ?
       WHERE video_id = ? AND upload_state = 'uploading'`,
      nextState,
      errorMessage.slice(0, 1000),
      now,
      videoId
    );
  });

  return nextState;
}

export async function retryFailedUpload(videoId: string): Promise<boolean> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const result = await database.runAsync(
    `UPDATE videos
     SET upload_state = 'pending',
         attempt_count = 0,
         last_error = NULL,
         last_attempted_at = NULL,
         updated_at = ?
     WHERE video_id = ? AND upload_state = 'failed'`,
    now,
    videoId
  );

  return result.changes === 1;
}
