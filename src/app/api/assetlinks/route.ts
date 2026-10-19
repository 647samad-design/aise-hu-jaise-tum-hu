import { NextResponse } from "next/server";

// Served at /.well-known/assetlinks.json (see next.config.mjs). Lets an Android APK built with
// PWABuilder / Bubblewrap open the site full-screen without a browser bar.
export function GET() {
  const pkg = process.env.ANDROID_PACKAGE_NAME;
  const fps = (process.env.ANDROID_SHA256_FINGERPRINT ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const body = pkg && fps.length
    ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: fps } }]
    : [];
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
