# AndroidManifest.xml — AdMob (package `egypte.estate`)

After `npx cap add android` (first time) and every `npx cap sync android`, confirm
`android/app/src/main/AndroidManifest.xml` contains, inside `<application>`:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-5516554712058767~6067447332"/>
```

And `android/app/build.gradle` has `applicationId "egypte.estate"`.

Banner unit: `ca-app-pub-5516554712058767/4301658261` (VITE_ADMOB_BANNER_ID, with hardcoded fallback in src/lib/admob.ts).
