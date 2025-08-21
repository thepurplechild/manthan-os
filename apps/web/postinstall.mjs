// apps/web/postinstall.mjs
try {
  const isCI =
    process.env.CI ||
    process.env.CLOUD_BUILD ||
    process.env.CLOUD_RUN_JOB ||
    process.env.K_SERVICE ||
    process.env.K_REVISION;

  if (isCI) {
    console.log("[postinstall] CI detected → skipping.");
    process.exit(0);
  }

  console.log("[postinstall] Nothing to do locally.");
} catch (err) {
  console.warn("[postinstall] Soft-fail:", err?.message || err);
  process.exit(0);
}
