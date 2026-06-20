import { useCallback, useRef, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getVideosPage, type VideoListItem } from "../db/videoRepository";
import { getAuthenticatedWorkerId } from "../services/authService";
import { manuallyRetryUpload, requestUploadSync, subscribeToUploadState } from "../services/uploadSyncEngine";
import { deleteLocalRecording } from "../services/videoService";
import { styles, uploadStateStyles } from "../Styles/VideoDashboardScreen";
import type { RootStackParamList } from "../types/navigation";
import type { UploadState } from "../types/recording";

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<UploadState, string> = {
  pending: "Pending",
  uploading: "Uploading",
  uploaded: "Uploaded",
  failed: "Failed",
};

type Props = NativeStackScreenProps<RootStackParamList, "Videos">;

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRecordedAt(value: string): string {
  return new Date(value).toLocaleString();
}

export default function VideoDashboardScreen({ navigation }: Props) {
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestInProgress = useRef(false);

  const loadFirstPage = useCallback(async (showRefreshIndicator = false) => {
    if (requestInProgress.current) {
      return;
    }

    requestInProgress.current = true;
    setErrorMessage(null);
    showRefreshIndicator ? setRefreshing(true) : setLoading(true);

    try {
      const workerId = await getAuthenticatedWorkerId();
      const page = await getVideosPage({ workerId, limit: PAGE_SIZE });
      setVideos(page);
      setHasMore(page.length === PAGE_SIZE);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load recorded videos.");
    } finally {
      requestInProgress.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
      requestUploadSync();

      const unsubscribe = subscribeToUploadState((update) => {
        setVideos((current) =>
          current.map((item) =>
            item.videoId === update.videoId
              ? {
                  ...item,
                  uploadState: update.uploadState,
                  attemptCount: update.attemptCount,
                  lastError: update.lastError,
                  lastAttemptedAt: update.lastAttemptedAt,
                }
              : item
          )
        );
      });

      return unsubscribe;
    }, [loadFirstPage])
  );

  async function loadMore() {
    if (requestInProgress.current || loadingMore || !hasMore || videos.length === 0) {
      return;
    }

    const lastVideo = videos[videos.length - 1];
    requestInProgress.current = true;
    setLoadingMore(true);
    setErrorMessage(null);

    try {
      const workerId = await getAuthenticatedWorkerId();
      const page = await getVideosPage({
        workerId,
        limit: PAGE_SIZE,
        cursor: { startedAt: lastVideo.startedAt, videoId: lastVideo.videoId },
      });
      setVideos((current) => [...current, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load more videos.");
    } finally {
      requestInProgress.current = false;
      setLoadingMore(false);
    }
  }

  async function retryUpload(video: VideoListItem) {
    setActiveActionId(video.videoId);
    setErrorMessage(null);

    try {
      const queued = await manuallyRetryUpload(video.videoId);
      if (!queued) {
        throw new Error("This video is no longer available for retry.");
      }

      setVideos((current) =>
        current.map((item) =>
          item.videoId === video.videoId
            ? { ...item, uploadState: "pending", attemptCount: 0, lastError: null, lastAttemptedAt: null }
            : item
        )
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not retry the upload.");
    } finally {
      setActiveActionId(null);
    }
  }

  function confirmDelete(video: VideoListItem) {
    Alert.alert(
      "Delete local file?",
      "The dashboard record and any uploaded S3 object will remain.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteVideo(video);
          },
        },
      ]
    );
  }

  async function deleteVideo(video: VideoListItem) {
    setActiveActionId(video.videoId);
    setErrorMessage(null);

    try {
      await deleteLocalRecording(video);
      setVideos((current) =>
        current.map((item) =>
          item.videoId === video.videoId ? { ...item, localDeletedAt: new Date().toISOString() } : item
        )
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not delete the local file.");
    } finally {
      setActiveActionId(null);
    }
  }

  function renderVideo({ item }: { item: VideoListItem }) {
    const actionRunning = activeActionId === item.videoId;
    const canDelete = item.uploadState === "uploaded" || item.uploadState === "failed";

    return (
      <View style={styles.videoCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text numberOfLines={1} style={styles.videoId}>
              {item.videoId}
            </Text>
            <Text style={styles.recordedAt}>{formatRecordedAt(item.startedAt)}</Text>
          </View>
          <View style={[styles.statusBadge, uploadStateStyles[item.uploadState].badge]}>
            <Text style={[styles.statusText, uploadStateStyles[item.uploadState].text]}>
              {STATUS_LABELS[item.uploadState]}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Duration</Text>
            <Text style={styles.metricValue}>{formatDuration(item.durationMs)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>File size</Text>
            <Text style={styles.metricValue}>{formatFileSize(item.fileSizeBytes)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>FPS tier</Text>
            <Text style={styles.metricValue}>{item.fpsTier}</Text>
          </View>
        </View>

        {item.lastError ? (
          <Text numberOfLines={2} style={styles.itemError}>
            Attempt {item.attemptCount}: {item.lastError}
          </Text>
        ) : null}

        <View style={styles.actionRow}>
          {item.uploadState === "failed" && !item.localDeletedAt ? (
            <Pressable
              accessibilityRole="button"
              disabled={actionRunning}
              onPress={() => void retryUpload(item)}
              style={({ pressed }) => [styles.retryButton, pressed && styles.pressedButton, actionRunning && styles.disabledButton]}
            >
              <Text style={styles.retryButtonText}>Retry upload</Text>
            </Pressable>
          ) : null}

          {item.localDeletedAt ? (
            <Text style={styles.deletedLabel}>Local file deleted</Text>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={!canDelete || actionRunning}
              onPress={() => confirmDelete(item)}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && canDelete && styles.pressedButton,
                (!canDelete || actionRunning) && styles.disabledButton,
              ]}
            >
              <Text style={styles.deleteButtonText}>Delete local</Text>
            </Pressable>
          )}

          {actionRunning ? <ActivityIndicator color="#475569" size="small" /> : null}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Recorded videos</Text>
        <View style={styles.headerSpacer} />
      </View>

      {errorMessage ? <Text style={styles.pageError}>{errorMessage}</Text> : null}

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color="#0f766e" size="large" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={videos.length === 0 ? styles.emptyList : styles.listContent}
          data={videos}
          keyExtractor={(item) => item.videoId}
          ListEmptyComponent={<Text style={styles.emptyText}>No recorded videos</Text>}
          ListFooterComponent={
            hasMore ? (
              <Pressable
                accessibilityRole="button"
                disabled={loadingMore}
                onPress={() => void loadMore()}
                style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressedButton]}
              >
                {loadingMore ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.loadMoreText}>Load more</Text>}
              </Pressable>
            ) : videos.length > 0 ? (
              <Text style={styles.endText}>All videos loaded</Text>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void loadFirstPage(true)} tintColor="#0f766e" />
          }
          renderItem={renderVideo}
        />
      )}
    </SafeAreaView>
  );
}
