import { StyleSheet } from "react-native";
import type { UploadState } from "../types/recording";

export const uploadStateStyles: Record<UploadState, { badge: object; text: object }> = {
  pending: {
    badge: { backgroundColor: "#fef3c7", borderColor: "#f59e0b" },
    text: { color: "#92400e" },
  },
  uploading: {
    badge: { backgroundColor: "#dbeafe", borderColor: "#3b82f6" },
    text: { color: "#1e40af" },
  },
  uploaded: {
    badge: { backgroundColor: "#dcfce7", borderColor: "#22c55e" },
    text: { color: "#166534" },
  },
  failed: {
    badge: { backgroundColor: "#fee2e2", borderColor: "#ef4444" },
    text: { color: "#991b1b" },
  },
};

export const styles = StyleSheet.create({
  actionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 40,
  },
  backButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 64,
  },
  backButtonText: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "700",
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  cardTitleContainer: {
    flex: 1,
    minWidth: 0,
  },
  centerContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  deletedLabel: {
    color: "#64748b",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 6,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  deleteButtonText: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.42,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 16,
    textAlign: "center",
  },
  endText: {
    color: "#64748b",
    fontSize: 13,
    paddingVertical: 20,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: 8,
  },
  headerSpacer: {
    width: 64,
  },
  itemError: {
    color: "#b91c1c",
    fontSize: 12,
    lineHeight: 17,
  },
  listContent: {
    gap: 10,
    padding: 12,
    paddingBottom: 24,
  },
  loadMoreButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#0f766e",
    borderRadius: 6,
    height: 44,
    justifyContent: "center",
    marginTop: 8,
    width: 140,
  },
  loadMoreText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  metric: {
    flex: 1,
    gap: 3,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  metricsRow: {
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 11,
  },
  pageError: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 10,
    textAlign: "center",
  },
  pressedButton: {
    opacity: 0.72,
  },
  recordedAt: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 3,
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: "#0f766e",
    borderRadius: 6,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  safeArea: {
    backgroundColor: "#f8fafc",
    flex: 1,
  },
  statusBadge: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 76,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: "#0f172a",
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  videoCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 11,
    padding: 14,
  },
  videoId: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
  },
});
