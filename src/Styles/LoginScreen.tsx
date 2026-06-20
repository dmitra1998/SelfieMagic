import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    elevation: 3,
    justifyContent: "center",
    marginTop: 32,
    paddingVertical: 16,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  container: {
    backgroundColor: "#f9fafb",
    flex: 1,
  },
  formContainer: {
    width: "100%",
  },
  headerContainer: {
    marginBottom: 32,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderWidth: 1,
    color: "#1f2937",
    elevation: 1,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  label: {
    color: "#4b5563",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 16,
  },
  title: {
    color: "#1f2937",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
});
