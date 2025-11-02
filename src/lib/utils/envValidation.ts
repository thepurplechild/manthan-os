/**
 * Environment Variable Validation
 * Validates all required environment variables at startup
 */

const requiredEnvVars = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Voyage AI (for embeddings)
  VOYAGE_API_KEY: process.env.VOYAGE_API_KEY,
  
  // Inngest
  INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
  INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
  
  // Railway Worker
  RAILWAY_WORKER_URL: process.env.RAILWAY_WORKER_URL,
  WORKER_SECRET: process.env.WORKER_SECRET,
  
  // Optional but recommended
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

const optionalEnvVars = {
  // OpenAI (for processing)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // Segmind/Pixelbin (for image generation)
  SEGMIND_API_KEY: process.env.SEGMIND_API_KEY,
  PIXELBIN_API_KEY: process.env.PIXELBIN_API_KEY,
  PIXELBIN_ACCESS_TOKEN: process.env.PIXELBIN_ACCESS_TOKEN,
  PIXELBIN_ORG_ID: process.env.PIXELBIN_ORG_ID,
} as const;

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validate required environment variables
 */
export function validateEnvVars(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required vars
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    if (!value) {
      missing.push(key);
    }
  });

  // Check optional vars (warnings only)
  if (!optionalEnvVars.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY is missing - document processing will fail');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Validate and log environment variables (call at startup)
 */
export function validateAndLogEnvVars(): void {
  const result = validateEnvVars();

  if (!result.valid) {
    console.error('❌ Missing required environment variables:');
    result.missing.forEach((key) => {
      console.error(`   - ${key}`);
    });
    console.error('\nPlease set these in your environment or .env.local file');
    
    // In production, throw error to prevent server from starting
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${result.missing.join(', ')}`);
    }
  } else {
    console.log('✅ All required environment variables are set');
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️  Environment variable warnings:');
    result.warnings.forEach((warning) => {
      console.warn(`   - ${warning}`);
    });
  }
}

// Auto-validate on module load (only log, don't throw)
if (typeof window === 'undefined') {
  // Server-side only
  try {
    validateAndLogEnvVars();
  } catch (error) {
    // Log but don't crash - allow server to start with warnings
    console.error('Environment validation error:', error);
  }
}

