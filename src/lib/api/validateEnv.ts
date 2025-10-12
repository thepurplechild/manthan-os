export function validateBharatDiffusionEnv() {
  const required = {
    PIXELBIN_API_KEY: process.env.PIXELBIN_API_KEY,
    PIXELBIN_ACCESS_TOKEN: process.env.PIXELBIN_ACCESS_TOKEN,
    PIXELBIN_ORG_ID: process.env.PIXELBIN_ORG_ID,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing BharatDiffusion environment variables: ${missing.join(', ')}`);
  }

  console.log('[ENV] BharatDiffusion environment variables validated ✓');
}