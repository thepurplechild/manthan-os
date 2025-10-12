# Segmind AI Deployment Guide

## Required Environment Variables

Add these to Vercel (Settings → Environment Variables):

### Supabase (Already configured)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

### Segmind (NEW - REQUIRED)
```
SEGMIND_API_KEY=SG_xxxxxxxxxxxxx
```

Get your Segmind API key:
1. Sign up at https://www.segmind.com/
2. Go to https://www.segmind.com/api-keys
3. Create new API key
4. Copy and add to Vercel

## Deployment Steps

1. Add SEGMIND_API_KEY to Vercel environment variables
2. Commit changes: `git add . && git commit -m "feat: integrate Segmind AI"`
3. Push to deploy: `git push origin main`
4. Vercel will auto-deploy in 2-3 minutes

## Testing After Deployment

1. Navigate to a project
2. Click "AI Generator" tab
3. Try prompt: "Bollywood actress in red saree, cinematic lighting"
4. Style: Cinematic
5. Click Generate
6. Image should appear in 5-10 seconds

## Troubleshooting

- **401 Error**: Check SEGMIND_API_KEY is correct in Vercel
- **402 Error**: Add credits at https://www.segmind.com/billing
- **No image**: Check Supabase storage bucket is public