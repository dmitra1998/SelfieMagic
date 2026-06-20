const appJson = require("./app.json");

module.exports = () => {
  const allowCleartextTraffic = process.env.ALLOW_CLEARTEXT_TRAFFIC === "true";
  const plugins = appJson.expo.plugins.filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== "expo-build-properties";
  });

  return {
    ...appJson.expo,
    plugins: [
      ...plugins,
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: allowCleartextTraffic,
          },
        },
      ],
    ],
  };
};
