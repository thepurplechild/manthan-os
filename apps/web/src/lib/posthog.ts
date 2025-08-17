import posthog from 'posthog-js';

export function initPH() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (key && typeof window !== 'undefined') {
    posthog.init(key, { api_host: host });
  }
}
