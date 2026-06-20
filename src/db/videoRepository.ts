import type { RecordingMetadata, UploadState } from "../types/recording";
import { getDatabase } from "./database";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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
     WHERE upload_state IN ('pending', 'failed')
     ORDER BY last_attempted_at IS NOT NULL, last_attempted_at ASC, started_at ASC
     LIMIT ?`,
    safeLimit
  );

  return rows.map(mapVideoRow);
}
