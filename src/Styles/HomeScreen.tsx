import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb", // Match Login screen background
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 32,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    gap: 16, // Adds uniform space between buttons
  },
  disabledButton: {
    opacity: 0.45,
  },
  durationError: {
    color: "#dc2626",
  },
  durationHint: {
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 17,
  },
  durationInput: {
    backgroundColor: "#ffffff",
    borderColor: "#d1d5db",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 10,
    textAlign: "center",
  },
  durationInputInvalid: {
    borderColor: "#dc2626",
  },
  durationInputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  durationLabel: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "700",
  },
  durationSection: {
    alignSelf: "stretch",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
    padding: 16,
  },
  durationUnit: {
    color: "#4b5563",
    fontSize: 15,
    fontWeight: "600",
  },
  dashboardButton: {
    alignItems: "center",
    backgroundColor: "#e0f2f1",
    borderRadius: 8,
    justifyContent: "center",
    paddingVertical: 16,
  },
  dashboardButtonText: {
    color: "#0f766e",
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#2563eb", // Vibrant main brand blue
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#fee2e2", // Light soft red background for logout
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#dc2626", // Deep red text
    fontSize: 16,
    fontWeight: "600",
  },
});
