# Founder's Command Center Implementation Plan

## Executive Summary

This plan addresses stabilization of the existing codebase and implements Phase 4 (Founder's Command Center) from the blueprint. The critical constraint is that RLS policies must be verified and implemented BEFORE building the UI.

## Current State Analysis

### ✅ What Exists

- Projects table with basic CRUD operations
- Documents table with multimodal asset support
- Authentication via Supabase Auth
- Middleware for session management
- Railway worker for async processing
- Inngest for job orchestration
- Voyage AI for embeddings
- Environment validation

### ❌ What's Missing (Phase 4 Requirements)

- `profiles` table with role-based access control
- `platform_mandates` table (founder-only market intelligence)
- `deal_pipeline` table (founder-only deal tracking)
- RLS policies for projects table
- RLS policies for platform_mandates and deal_pipeline
- Role-based middleware protection
- Founder-only dashboard and CRUD interfaces

## Phase 1: Database Schema & RLS Security (Critical Foundation)

### 1.1 Create Profiles Table with Role Support

**File**: `db/migrations/008_create_profiles_with_roles.sql`

Create profiles table linking to auth.users with role field:

- Default role: 'creator'
- Supported roles: 'creator', 'founder'
- Auto-populate on signup via trigger
- RLS: Users can only view/update their own profile

### 1.2 Create Platform Mandates Table

**File**: `db/migrations/009_create_platform_mandates.sql`

Table structure per blueprint:

- id, platform_name, mandate_description, tags[], source, created_by, created_at
- **CRITICAL RLS**: Only users with role='founder' can SELECT/INSERT/UPDATE/DELETE
- Foreign key: created_by → profiles.id
- Index on platform_name and tags for search

### 1.3 Create Deal Pipeline Table

**File**: `db/migrations/010_create_deal_pipeline.sql`

Table structure per blueprint:

- id, project_id, target_buyer_name, status, feedback_notes, updated_at
- **CRITICAL RLS**: Only users with role='founder' can SELECT/INSERT/UPDATE/DELETE
- Foreign key: project_id → projects.id
- Status enum: 'introduced', 'passed', 'in_discussion', 'deal_closed'

### 1.4 Add RLS Policies to Projects Table

**File**: `db/migrations/011_add_projects_rls.sql`

Projects table needs RLS:

- Creators: Can SELECT/INSERT/UPDATE/DELETE only their own projects (owner_id = auth.uid())
- Founders: Can SELECT ALL projects (role check via profiles join)
- This enables founders to view all creator projects for deal-making

### 1.5 Update Database Types

**File**: `src/lib/database.types.ts`

Add TypeScript definitions for:

- profiles table
- platform_mandates table
- deal_pipeline table
- Update Database interface

## Phase 2: RLS Policy Verification & Testing

### 2.1 Create RLS Test Suite

**File**: `db/migrations/012_test_rls_policies.sql`

SQL test queries to verify:

1. Creator CANNOT access platform_mandates
2. Creator CANNOT access deal_pipeline
3. Creator CAN ONLY access their own projects
4. Founder CAN access platform_mandates
5. Founder CAN access deal_pipeline
6. Founder CAN access ALL projects
7. Founder CANNOT access other founders' mandates (if multiple founders exist)

### 2.2 Create Database Audit Script

**File**: `db/verify_security.sql`

Single comprehensive SQL file that:

- Lists all tables and their RLS status
- Shows all policies for each table
- Validates foreign key relationships
- Checks for missing indexes
- Output should be human-readable report

## Phase 3: Authentication & Middleware Enhancement

### 3.1 Create Profile Server Action

**File**: `src/app/actions/profile.ts`

Server actions:

- `getProfile()`: Fetch current user profile with role
- `getUserRole()`: Quick role check helper
- Used by middleware and protected routes

### 3.2 Enhance Middleware for Role-Based Routing

**File**: `middleware.ts`

Update to:

1. Check authentication (existing)
2. Fetch user profile and role from profiles table
3. Redirect non-founders attempting to access `/dashboard/founder/*`
4. Add role to request headers for downstream consumption

### 3.3 Create Role-Based Route Guards

**File**: `src/lib/utils/roleGuards.ts`

Reusable helper functions:

- `requireFounder()`: Throws if not founder role
- `requireAuth()`: Throws if not authenticated
- `isFounder(userId)`: Boolean check
- Used in server components and API routes

## Phase 4: Founder Command Center Backend

### 4.1 Platform Mandates Server Actions

**File**: `src/app/actions/platformMandates.ts`

CRUD operations:

- `getPlatformMandates()`: List all mandates (founder-only)
- `createPlatformMandate(data)`: Create new mandate
- `updatePlatformMandate(id, data)`: Update existing
- `deletePlatformMandate(id)`: Delete mandate
- All actions must call `requireFounder()`

### 4.2 Deal Pipeline Server Actions

**File**: `src/app/actions/dealPipeline.ts`

CRUD operations:

- `getDealsByProject(projectId)`: Get all deals for a project
- `getAllDeals()`: Get all deals across projects
- `createDeal(data)`: Add project to pipeline
- `updateDealStatus(id, status, notes)`: Update deal status
- `deleteDeal(id)`: Remove from pipeline
- All actions must call `requireFounder()`

### 4.3 Founder Dashboard Data Aggregation

**File**: `src/app/actions/founderDashboard.ts`

Aggregation functions:

- `getFounderDashboardData()`: Single function returning:
- Total projects count
- Total active deals count
- Recent projects (last 10)
- Deals by status breakdown
- Platform mandates count
- Uses service role for cross-user queries
- Returns sanitized data (no sensitive creator info)

## Phase 5: Founder Command Center UI

### 5.1 Founder Dashboard Layout

**File**: `src/app/dashboard/founder/layout.tsx`

Protected layout:

- Server-side role check (redirect if not founder)
- Sidebar navigation: Dashboard, Projects, Mandates, Pipeline
- Consistent header with founder-specific actions

### 5.2 Founder Main Dashboard

**File**: `src/app/dashboard/founder/page.tsx`

Overview page:

- Key metrics cards (total projects, active deals, success rate)
- Recent projects table with quick actions
- Deal pipeline status chart
- Platform mandates summary

### 5.3 All Projects View

**File**: `src/app/dashboard/founder/projects/page.tsx`

Projects list:

- Server-side fetch ALL projects (founder privilege)
- Searchable/filterable table
- Columns: Title, Creator, Status, Created Date, Actions
- Click to view project details
- Add to pipeline button

### 5.4 Project Detail for Founder

**File**: `src/app/dashboard/founder/projects/[id]/page.tsx`

Enhanced project view:

- Display project details and assets
- Show creator information
- Display deal pipeline history for this project
- Add/edit deals for this project
- Add notes and feedback

### 5.5 Platform Mandates CRUD Interface

**File**: `src/app/dashboard/founder/mandates/page.tsx`

Mandates management:

- List all mandates in table/cards
- Create mandate form (modal or inline)
- Edit mandate (inline or modal)
- Delete mandate with confirmation
- Search/filter by platform, tags
- Tag management

### 5.6 Deal Pipeline Management

**File**: `src/app/dashboard/founder/pipeline/page.tsx`

Pipeline view:

- Kanban board OR table view toggle
- Columns: Introduced, In Discussion, Deal Closed, Passed
- Drag-and-drop to update status (if Kanban)
- Filter by status, project, buyer
- Detailed modal for each deal
- Bulk actions

### 5.7 Reusable UI Components

**Files to create**:

- `src/components/founder/MandateCard.tsx`: Display single mandate
- `src/components/founder/MandateForm.tsx`: Create/edit mandate form
- `src/components/founder/DealCard.tsx`: Display deal in pipeline
- `src/components/founder/DealForm.tsx`: Create/edit deal form
- `src/components/founder/ProjectsList.tsx`: Reusable projects table
- `src/components/founder/StatusBadge.tsx`: Deal status badge

## Phase 6: Integration & Data Flow

### 6.1 Link Projects to Pipeline

**Enhancement**: Update existing project pages

In creator project view (`src/app/dashboard/projects/[id]/page.tsx`):

- Show deal status badge if project is in pipeline
- Display founder feedback (read-only)
- Founders see additional "Add to Pipeline" action

### 6.2 Mandate Integration with AI Packaging

**Future Enhancement Placeholder**

Add hooks in AI packaging agent to:

- Fetch relevant platform_mandates based on project genre/tags
- Include mandate data in AI prompts for better targeting
- Log which mandates influenced the packaging

## Phase 7: Testing & Verification

### 7.1 Manual Testing Checklist

**Database Security**:

- [ ] Run `db/migrations/012_test_rls_policies.sql` - all tests pass
- [ ] Run `db/verify_security.sql` - no security gaps reported
- [ ] Attempt to access platform_mandates as creator via SQL - DENIED
- [ ] Attempt to access deal_pipeline as creator via SQL - DENIED

**Authentication & Routing**:

- [ ] Creator user cannot navigate to /dashboard/founder/* - redirected
- [ ] Founder user can access /dashboard/founder/* - success
- [ ] Middleware properly identifies user role
- [ ] Profile auto-created on new signup

**Founder CRUD Operations**:

- [ ] Create platform mandate - success
- [ ] Update platform mandate - success
- [ ] Delete platform mandate - success
- [ ] List all platform mandates - success
- [ ] Create deal for project - success
- [ ] Update deal status - success
- [ ] View all projects (not just own) - success

**UI Functionality**:

- [ ] Founder dashboard loads all metrics correctly
- [ ] Projects list shows all user projects
- [ ] Can add project to pipeline from project page
- [ ] Kanban board drag-drop updates status
- [ ] Search/filter works on mandates and pipeline

**Integration Tests**:

- [ ] Railway worker still processes documents correctly
- [ ] Inngest jobs run successfully
- [ ] Environment variables all validated
- [ ] No breaking changes to creator experience

### 7.2 Deployment Verification on Vercel

After deployment:

- [ ] Database migrations applied successfully
- [ ] RLS policies active in production
- [ ] Founder routes return 200 for founder user
- [ ] Founder routes return 403/redirect for creator user
- [ ] No errors in Vercel logs related to role checking
- [ ] Supabase logs show proper RLS enforcement

## Phase 8: Documentation & Cleanup

### 8.1 Update Blueprint Documentation

**File**: `docs/blueprint.md`

Add section documenting:

- Implementation status of Phase 4
- Screenshots of Founder Command Center
- Role-based access control architecture
- How to grant founder role to a user

### 8.2 Create Founder Onboarding Guide

**File**: `docs/founder-setup.md`

Step-by-step guide:

1. How to create first founder account
2. How to manually update role in Supabase dashboard
3. How to access Founder Command Center
4. Overview of each feature
5. Best practices for using mandates and pipeline

### 8.3 Environment Variables Documentation

**File**: `.env.example`

Update with any new variables and document:

- All required Supabase variables
- Railway worker variables
- Inngest variables
- Voyage AI variables
- Segmind/BharatDiffusion variables

## Migration Execution Order

Execute migrations in exact order:

1. `008_create_profiles_with_roles.sql`
2. `009_create_platform_mandates.sql`
3. `010_create_deal_pipeline.sql`
4. `011_add_projects_rls.sql`
5. `012_test_rls_policies.sql` (test suite)

## Rollback Plan

If issues occur:

1. Each migration should include DROP statements at top (commented)
2. Rollback order: 011 → 010 → 009 → 008
3. Backup database before migrations
4. Test migrations on staging environment first

## Key Risks & Mitigations

**Risk 1**: Existing users don't have profiles

- **Mitigation**: Create backfill migration to create profiles for existing auth.users

**Risk 2**: RLS policies too restrictive, break existing features

- **Mitigation**: Test suite in Phase 2, staging environment testing

**Risk 3**: Founder role granted incorrectly

- **Mitigation**: Manual verification step, audit log of role changes

**Risk 4**: Performance impact of role checks in middleware

- **Mitigation**: Cache user role in session, only refresh periodically

## Success Criteria

Phase 4 is complete when:

1. ✅ All 5 database migrations execute successfully
2. ✅ RLS test suite passes 100%
3. ✅ Founder can access Command Center, creator cannot
4. ✅ All CRUD operations work for mandates and pipeline
5. ✅ No security vulnerabilities in RLS policies
6. ✅ No breaking changes to existing creator workflows
7. ✅ Documentation updated and complete
8. ✅ Deployed and verified on Vercel production