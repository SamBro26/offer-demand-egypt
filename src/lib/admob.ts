/** Verified production AdMob identifiers for package `egypte.estate`. Env vars override; hardcoded fallbacks guarantee production builds initialize. */
export const ADMOB_APP_ID = import.meta.env["VITE_ADMOB_APP_ID"] || "ca-app-pub-5516554712058767~6067447332";
export const ADMOB_BANNER_ID = import.meta.env["VITE_ADMOB_BANNER_ID"] || "ca-app-pub-5516554712058767/4301658261";
export const ANDROID_PACKAGE = "egypte.estate";

let started = false;

/** Shows the native adaptive banner at the top when running inside the Capacitor app; no-op on the web. */
export async function startNativeBanner() {
  if (started || typeof window === "undefined") return;
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return;
  started = true;
  const { AdMob, BannerAdSize, BannerAdPosition } = await import("@capacitor-community/admob");
  await AdMob.initialize();
  await AdMob.showBanner({
    adId: ADMOB_BANNER_ID,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.TOP_CENTER,
    margin: 0,
    isTesting: false,
  });
}
