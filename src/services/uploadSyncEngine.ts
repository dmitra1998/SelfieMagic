import * as Network from "expo-network";
import { AppState } from "react-native";
import {
  claimPendingUpload,
  getUploadQueue,
  markUploadFailed,
  markUploadSucceeded,
  recoverInterruptedUploads,
  retryFailedUpload,
  type VideoListItem,
} from "../db/videoRepository";
import { getUploadNetworkType, isInternetAvailable } from "./networkService";
import { isUploadApiConfigured, uploadVideo } from "./uploadApi";
import type { UploadState } from "../types/recording";

const INITIAL_RETRY_DELAY_MS = 2_000;
const MAX_RETRY_DELAY_MS = 64_000;
const QUEUE_SCAN_LIMIT = 100;

let processing = false;
let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const stateListeners = new Set<(update: UploadStateUpdate) => void>();

export type UploadStateUpdate = {
  videoId: string;
  uploadState: UploadState;
  attemptCount: number;
  lastError: string | null;
  lastAttemptedAt: string | null;
};

function notifyStateChange(update: UploadStateUpdate): void {
  stateListeners.forEach((listener) => listener(update));
}

function retryDelayMs(attemptCount: number): number {
  return Math.min(INITIAL_RETRY_DELAY_MS * 2 ** Math.max(attemptCount - 1, 0), MAX_RETRY_DELAY_MS);
}

function dueAt(record: VideoListItem): number {
  if (!record.lastAttemptedAt || record.attemptCount === 0) {
    return 0;
  }

  return new Date(record.lastAttemptedAt).getTime() + retryDelayMs(record.attemptCount);
}

function schedule(delayMs = 0): void {
  if (!started || !isUploadApiConfigured()) {
    return;
  }

  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(() => {
    timer = null;
    void processQueue();
  }, Math.max(delayMs, 0));
}

async function processQueue(): Promise<void> {
  if (processing || !started) {
    return;
  }

  processing = true;

  try {
    const networkState = await Network.getNetworkStateAsync();
    if (!isInternetAvailable(networkState)) {
      return;
    }

    const queue = await getUploadQueue(QUEUE_SCAN_LIMIT);
    if (queue.length === 0) {
      return;
    }

    const now = Date.now();
    const dueRecord = queue.find((record) => dueAt(record) <= now);

    if (!dueRecord) {
      const nextDueAt = Math.min(...queue.map(dueAt));
      schedule(nextDueAt - now);
      return;
    }

    const networkType = getUploadNetworkType(networkState);
    const claimed = await claimPendingUpload(dueRecord.videoId, networkType);

    if (!claimed) {
      schedule();
      return;
    }

    notifyStateChange({
      videoId: claimed.videoId,
      uploadState: "uploading",
      attemptCount: claimed.attemptCount,
      lastError: null,
      lastAttemptedAt: claimed.lastAttemptedAt,
    });

    try {
      await uploadVideo(claimed);
      await markUploadSucceeded(claimed.videoId);
      notifyStateChange({
        videoId: claimed.videoId,
        uploadState: "uploaded",
        attemptCount: claimed.attemptCount,
        lastError: null,
        lastAttemptedAt: claimed.lastAttemptedAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown upload error";
      const nextState = await markUploadFailed(claimed.videoId, message);
      notifyStateChange({
        videoId: claimed.videoId,
        uploadState: nextState,
        attemptCount: claimed.attemptCount,
        lastError: message,
        lastAttemptedAt: claimed.lastAttemptedAt,
      });
      console.warn(`Upload failed for ${claimed.videoId}:`, message);
    }

    schedule();
  } catch (error) {
    console.error("Upload queue processing failed:", error);
    schedule(INITIAL_RETRY_DELAY_MS);
  } finally {
    processing = false;
  }
}

export function requestUploadSync(): void {
  schedule();
}

export function subscribeToUploadState(listener: (update: UploadStateUpdate) => void): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}

export async function manuallyRetryUpload(videoId: string): Promise<boolean> {
  const queued = await retryFailedUpload(videoId);
  if (queued) {
    notifyStateChange({
      videoId,
      uploadState: "pending",
      attemptCount: 0,
      lastError: null,
      lastAttemptedAt: null,
    });
    schedule();
  }
  return queued;
}

export async function startUploadSyncEngine(): Promise<() => void> {
  if (started) {
    return () => undefined;
  }

  started = true;

  try {
    await recoverInterruptedUploads();
  } catch (error) {
    started = false;
    throw error;
  }

  const networkSubscription = Network.addNetworkStateListener((state) => {
    if (isInternetAvailable(state)) {
      schedule();
    }
  });
  const appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      schedule();
    }
  });

  schedule();

  return () => {
    started = false;
    networkSubscription.remove();
    appStateSubscription.remove();

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}
