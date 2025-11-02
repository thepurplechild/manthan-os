# Founder Role Setup & Deployment Guide

## Part 1: Setting Up Founder Role in Supabase

### Step 1: Find Your User ID

1. **Sign up or login** to your application at `http://localhost:3000/signup` (or your deployed URL)
2. Open **Supabase Dashboard** at https://supabase.com/dashboard
3. Navigate to your project
4. Go to **Authentication** → **Users** in the left sidebar
5. You'll see a table of users with columns:
   - Email
   - User ID (UUID format like `a1b2c3d4-...`)
   - Created At
6. **Copy the User ID** (UUID) of the user you want to make a founder

### Step 2: Grant Founder Role via SQL

1. In Supabase Dashboard, go to **SQL Editor** in the left sidebar
2. Click **New query**
3. Paste the following SQL (replace `YOUR_USER_ID_HERE` with the actual UUID):

```sql
-- Update user role to founder
UPDATE profiles 
SET role = 'founder' 
WHERE id = 'YOUR_USER_ID_HERE';

-- Verify the update
SELECT id, full_name, role, created_at 
FROM profiles 
WHERE id = 'YOUR_USER_ID_HERE';
```

4. Click **Run** (or press Cmd/Ctrl + Enter)
5. You should see the verification query return 1 row with `role = 'founder'`

### Step 3: Verify Access

1. Logout and login again to your application
2. Navigate to `/dashboard/founder` 
3. If successful, you should see the Founder Command Center
4. If redirected to `/dashboard`, the role update didn't work - double-check the User ID

---

## Part 2: Running Migrations (If Not Done)

If you haven't run migrations 008-011 yet:

1. Open **Supabase Dashboard** → **SQL Editor**
2. Run each migration file **in order**:

```bash
# In order:
1. db/migrations/008_create_profiles_with_roles.sql
2. db/migrations/009_create_platform_mandates.sql
3. db/migrations/010_create_deal_pipeline.sql
4. db/migrations/011_add_projects_rls.sql
```

3. For each file:
   - Copy the entire SQL content
   - Paste into SQL Editor
   - Click **Run**
   - Verify no errors appear

4. **Optional**: Run the security audit:
```bash
# Copy and run:
db/verify_security.sql
```

---

## Part 3: Deploying to Vercel

### Prerequisites
- GitHub account
- Vercel account (sign up at https://vercel.com with GitHub)
- Your code committed to a GitHub repository

### Step 1: Push Code to GitHub

```bash
# If not already initialized
git init
git add .
git commit -m "feat: implement founder command center with RLS"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to https://vercel.com/dashboard
2. Click **Add New...** → **Project**
3. Select your GitHub repository
4. Click **Import**

### Step 3: Configure Environment Variables

Before deploying, add your environment variables:

1. In the import screen, scroll to **Environment Variables**
2. Add these variables (get from `.env.local` file):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase Service Role (for server-side operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Railway (if using)
RAILWAY_API_URL=your-railway-url

# Inngest
INNGEST_EVENT_KEY=your-inngest-key
INNGEST_SIGNING_KEY=your-signing-key

# Voyage AI
VOYAGE_API_KEY=your-voyage-key

# OpenAI
OPENAI_API_KEY=your-openai-key

# Segmind/BharatDiffusion (if using)
SEGMIND_API_KEY=your-segmind-key
```

### Step 4: Deploy

1. Click **Deploy**
2. Wait 2-5 minutes for build to complete
3. Once deployed, you'll see:
   - ✅ Deployment successful
   - A URL like `https://your-project.vercel.app`

### Step 5: Verify Deployment

1. Visit your Vercel URL
2. Sign up/login with your account
3. **If you haven't set founder role yet:**
   - Go to Supabase Dashboard
   - Find your user ID (from Authentication → Users)
   - Run the SQL from Part 1, Step 2
4. Navigate to `/dashboard/founder`
5. Verify you can access the Founder Command Center

---

## Part 4: Post-Deployment Verification Checklist

### Database Security
- [ ] Go to Supabase Dashboard → **Authentication** → **Policies**
- [ ] Verify RLS is enabled for: `profiles`, `projects`, `platform_mandates`, `deal_pipeline`
- [ ] Verify each table has 4 policies (SELECT, INSERT, UPDATE, DELETE)

### Founder Access
- [ ] Login as founder user
- [ ] Navigate to `/dashboard/founder` - should succeed
- [ ] Navigate to `/dashboard/founder/mandates` - should load
- [ ] Navigate to `/dashboard/founder/pipeline` - should load
- [ ] Try creating a platform mandate - should succeed

### Creator Restrictions
- [ ] Create a second test account (or logout founder)
- [ ] Login as regular creator
- [ ] Try navigating to `/dashboard/founder` - should redirect to `/dashboard`
- [ ] Verify creator can only see their own projects

### API & Worker Verification
- [ ] Upload a document as creator
- [ ] Verify Railway worker processes it (check Railway logs)
- [ ] Verify Inngest jobs run (check Inngest dashboard)
- [ ] Verify embeddings are created (check Voyage AI usage)

---

## Part 5: Troubleshooting

### Issue: "Cannot find user ID in Supabase"

**Solution:**
1. Make sure you've signed up at least once
2. Go to Supabase Dashboard → **Authentication** → **Users**
3. If no users appear, the auth flow isn't working - check:
   - Environment variables are set correctly
   - Supabase URL and anon key match your project

### Issue: "Redirected from /dashboard/founder to /dashboard"

**Solution:**
1. Verify role was set correctly:
```sql
SELECT * FROM profiles WHERE role = 'founder';
```
2. If no results, run the UPDATE query again with correct User ID
3. Clear browser cache and cookies, then login again

### Issue: "RLS policy error when accessing mandates"

**Solution:**
1. Verify migration 009 ran successfully:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'platform_mandates';
```
2. Should show 4 policies for founders
3. If missing, re-run migration 009

### Issue: "Build fails on Vercel"

**Solution:**
1. Check build logs in Vercel dashboard
2. Common issues:
   - Missing environment variables
   - TypeScript errors (run `npm run build` locally first)
   - Missing dependencies (run `npm install` locally)

### Issue: "Middleware infinite redirect loop"

**Solution:**
1. Check that `/login` and `/signup` routes are excluded from middleware
2. Verify in `middleware.ts`:
```typescript
!request.nextUrl.pathname.startsWith('/login') &&
!request.nextUrl.pathname.startsWith('/auth') &&
!request.nextUrl.pathname.startsWith('/signup')
```

---

## Part 6: Quick Reference Commands

### Find Your User ID (SQL)
```sql
SELECT id, email, raw_user_meta_data->>'full_name' as name 
FROM auth.users 
ORDER BY created_at DESC;
```

### Set Founder Role (SQL)
```sql
UPDATE profiles SET role = 'founder' WHERE id = 'YOUR_USER_ID';
```

### List All Founders (SQL)
```sql
SELECT p.id, p.full_name, u.email, p.role, p.created_at
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'founder'
ORDER BY p.created_at;
```

### Verify RLS Policies (SQL)
```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

### Check Deployment Status (Terminal)
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Check deployments
vercel ls

# View logs
vercel logs
```

---

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard → **Logs** → **API**
2. Check Vercel logs: Dashboard → **Deployments** → Click deployment → **Logs**
3. Check browser console for client-side errors (F12 → Console)
4. Review the RLS test suite: `db/migrations/012_test_rls_policies.sql`

