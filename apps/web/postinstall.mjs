// apps/web/postinstall.mjs
/**
 * Safe postinstall:
 * - In CI/containers, do nothing and exit 0.
 * - Locally, you can add optional setup (fonts, telemetry opt-out, etc.)
 */
try {
  const isCI =
    process.env.CI ||
    process.env.CLOUD_BUILD ||
    process.env.CLOUD_RUN_JOB ||
    process.env.K_SERVICE ||   // Cloud Run
    process.env.K_REVISION;

  if (isCI) {
    console.log("[postinstall] CI/Cloud detected → skipping postinstall.");
    process.exit(0);
  }

  // ---- Optional local-only tasks (examples) ----
  // console.log("[postinstall] Local dev environment detected.");
  // // e.g. disable Next telemetry locally:
  // try {
  //   const { execSync } = await import("node:child_process");
  //   execSync("npx next telemetry disable", { stdio: "ignore" });
  // } catch {}
  console.log("[postinstall] Nothing to do.");
} catch (err) {
  console.warn("[postinstall] Soft-fail:", err?.message || err);
  // Never crash the install
  process.exit(0);
}
