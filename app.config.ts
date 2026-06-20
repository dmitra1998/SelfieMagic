import type { ConfigContext, ExpoConfig } from "expo/config";
import appJson from "./app.json";

export default (_context: ConfigContext): ExpoConfig => {
  const allowCleartextTraffic = process.env.ALLOW_CLEARTEXT_TRAFFIC === "true";
  const baseConfig = appJson.expo as ExpoConfig;
  const plugins = (baseConfig.plugins ?? []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== "expo-build-properties";
  });

  return {
    ...baseConfig,
    plugins: [
      ...plugins,
      [
        "expo-build-properties",
        {
          android: { usesCleartextTraffic: allowCleartextTraffic },
        },
      ],
    ],
  };
};
