import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "egypte.estate",
  appName: "عقارك بنفسك",
  webDir: "dist/client",
  plugins: {
    AdMob: { appId: "ca-app-pub-5516554712058767~6067447332" },
  },
};

export default config;
