# Supabase CLI Quick Start Guide

Your Supabase CLI is now configured! Follow these steps to complete the setup.

## ✅ What's Already Done

1. Created [`supabase/config.toml`](supabase/config.toml) - Local configuration file
2. Updated [`.gitignore`](.gitignore) - Supabase files are properly ignored
3. Updated [`.env.example`](.env.example) - Template for environment variables
4. Verified Supabase CLI access via `npx`

## 🚀 Next Steps

### Step 1: Login to Supabase

Run this command to authenticate:

```bash
npx supabase login
```

This will open your browser to generate an access token. Follow the prompts.

### Step 2: Link Your Remote Project

**IMPORTANT:** You need your Supabase project reference ID.

**To find it:**
1. Go to https://app.supabase.com
2. Select your FinanceFlow project
3. Navigate to: **Settings → General**
4. Copy the **Reference ID** (looks like: `abcdefghijklmnop`)

**Then run:**

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

You'll be prompted for your database password (the one you set when creating the project).

### Step 3: Set Up Environment Variables

Create a `.env.local` file in the project root:

```bash
# Copy from .env.example
cp .env.example .env.local
```

**Then update `.env.local` with your Supabase credentials:**

Find these at: https://app.supabase.com/project/YOUR_PROJECT/settings/api

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 4: Choose Your Development Mode

#### Option A: Work with Remote Database (Recommended for now)
Keep the `.env.local` values pointing to your remote Supabase project. All changes will affect the remote database.

#### Option B: Local Development with Docker
If you have Docker Desktop installed and want a completely local setup:

```bash
npx supabase start
```

This starts local Supabase services. Update your `.env.local` with the local values shown in the terminal output.

## 📝 Common Commands

All commands should be prefixed with `npx` since we're not using a global installation:

```bash
# Check CLI version
npx supabase --version

# View project status
npx supabase status

# Push your local migrations to remote database
npx supabase db push

# Pull remote schema changes
npx supabase db pull

# Create a new migration
npx supabase migration new migration_name

# Generate TypeScript types from your database
npx supabase gen types typescript --linked > lib/supabase/database.types.ts

# Start local Supabase (requires Docker)
npx supabase start

# Stop local Supabase
npx supabase stop
```

## 🔍 Your Existing Migrations

This project has 3 migrations that will be applied to your database:

1. **20251216172210_initial_schema.sql** - Base database structure
2. **20251216210000_add_subscription_fields.sql** - Subscription tracking
3. **20251217160000_add_category_customizations.sql** - Category features

To apply these to your remote database:

```bash
npx supabase db push
```

## 💡 What You Can Now Do

With Supabase CLI configured, you have access to:

- ✅ **Database Migrations** - Version control your database schema
- ✅ **Type Generation** - Auto-generate TypeScript types from your database
- ✅ **Schema Diff** - See what's changed between local and remote
- ✅ **Seed Data** - Create test data for development
- ✅ **Local Development** - Full local Supabase stack (with Docker)
- ✅ **Edge Functions** - Deploy serverless functions (if needed)

## 📚 Documentation

- Full setup details: [`supabase/README.md`](supabase/README.md)
- Supabase CLI docs: https://supabase.com/docs/guides/cli

## ⚠️ Before Pushing Migrations

**IMPORTANT:** The `npx supabase db push` command will modify your remote database. 

Make sure to:
1. Have a backup or be working with a development project first
2. Review the migration files in `supabase/migrations/`
3. Test locally first if possible

---

**Ready to continue?** Start with `npx supabase login` and then link your project!
