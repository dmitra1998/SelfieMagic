import { fetch, type FetchRequestInit } from "expo/fetch";
import { File } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import type { VideoListItem } from "../db/videoRepository";

const REQUEST_TIMEOUT_MS = 30_000;

type PresignedUploadResponse = {
  uploadUrl: string | null;
  objectKey: string;
  alreadyUploaded: boolean;
  etag: string | null;
  headers?: Record<string, string>;
};

function getApiBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_UPLOAD_API_URL;

  if (!value) {
    throw new Error("EXPO_PUBLIC_UPLOAD_API_URL is not configured.");
  }

  return value.replace(/\/$/, "");
}

async function fetchWithTimeout(url: string, init: FetchRequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requireSuccessfulResponse(response: Response, operation: string): Promise<void> {
  if (response.ok) {
    return;
  }

  const body = await response.text().catch(() => "");
  throw new Error(`${operation} failed with HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
}

async function requestPresignedUrl(video: VideoListItem): Promise<PresignedUploadResponse> {
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}/uploads/presign`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": video.videoId,
      },
      body: JSON.stringify({
        videoId: video.videoId,
        workerId: video.workerId,
        fileSizeBytes: video.fileSizeBytes,
        contentType: "video/mp4",
      }),
    },
    REQUEST_TIMEOUT_MS
  );

  await requireSuccessfulResponse(response, "Presigned URL request");
  const result = (await response.json()) as Partial<PresignedUploadResponse>;

  if (
    typeof result.objectKey !== "string" ||
    typeof result.alreadyUploaded !== "boolean" ||
    (!result.alreadyUploaded && typeof result.uploadUrl !== "string")
  ) {
    throw new Error("The presigned URL response was invalid.");
  }

  return {
    uploadUrl: result.uploadUrl ?? null,
    objectKey: result.objectKey,
    alreadyUploaded: result.alreadyUploaded,
    etag: typeof result.etag === "string" ? result.etag : null,
    headers: result.headers,
  };
}

async function confirmUpload(video: VideoListItem, objectKey: string, etag: string | null): Promise<void> {
  const response = await fetchWithTimeout(
    `${getApiBaseUrl()}/uploads/confirm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": video.videoId,
      },
      body: JSON.stringify({
        videoId: video.videoId,
        workerId: video.workerId,
        objectKey,
        etag,
        fileSizeBytes: video.fileSizeBytes,
      }),
    },
    REQUEST_TIMEOUT_MS
  );

  await requireSuccessfulResponse(response, "Upload confirmation");
}

async function uploadFileToS3(uploadUrl: string, localPath: string, headers?: Record<string, string>): Promise<string | null> {
  const response = await LegacyFileSystem.uploadAsync(uploadUrl, localPath, {
    httpMethod: "PUT",
    uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      "Content-Type": "video/mp4",
      ...headers,
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`S3 upload failed with HTTP ${response.status}${response.body ? `: ${response.body.slice(0, 300)}` : ""}`);
  }

  return response.headers.etag ?? response.headers.ETag ?? null;
}

export function isUploadApiConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_UPLOAD_API_URL);
}

export async function uploadVideo(video: VideoListItem): Promise<void> {
  const file = new File(video.localPath);

  if (!file.exists) {
    throw new Error(`Local video file does not exist: ${video.localPath}`);
  }

  if (file.size !== video.fileSizeBytes) {
    throw new Error(`Local video size changed from ${video.fileSizeBytes} to ${file.size} bytes.`);
  }

  const presigned = await requestPresignedUrl(video);

  if (presigned.alreadyUploaded) {
    await confirmUpload(video, presigned.objectKey, presigned.etag);
    return;
  }

  if (!presigned.uploadUrl) {
    throw new Error("The backend did not return an upload URL.");
  }

  const etag = await uploadFileToS3(presigned.uploadUrl, video.localPath, presigned.headers);
  await confirmUpload(video, presigned.objectKey, etag);
}
