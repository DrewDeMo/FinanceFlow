# Supabase CLI Setup for FinanceFlow

This guide will help you set up the Supabase CLI for local development and connect it to your remote Supabase project.

## Prerequisites

- Node.js installed
- A Supabase account and project created at [supabase.com](https://supabase.com)

## Step 1: Install Supabase CLI

### Windows Installation Options

**Option 1: Scoop (Recommended)**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Option 2: Chocolatey**
```powershell
choco install supabase
```

**Option 3: Use npx (No Installation Required)**
You can run Supabase commands without installing by using `npx`:
```bash
npx supabase --version
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

**Option 4: Direct Download**
Download the latest Windows binary from: https://github.com/supabase/cli/releases

### Verify Installation
```bash
supabase --version
```

**Note:** If using npx, prefix all `supabase` commands with `npx`, e.g., `npx supabase login`

## Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser window to generate an access token. Follow the prompts to authenticate.

## Step 3: Link to Your Remote Project

You need to link your local project to your remote Supabase project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

**Where to find your project ref:**
1. Go to [app.supabase.com](https://app.supabase.com)
2. Open your FinanceFlow project
3. Go to Settings → General
4. Copy the "Reference ID" (it looks like: `abcdefghijklmnop`)

You'll be prompted to enter your database password. This is the password you set when creating your Supabase project.

## Step 4: Set Up Environment Variables

Create a `.env.local` file in the project root with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Where to find these values:**
1. Go to [app.supabase.com](https://app.supabase.com)
2. Open your FinanceFlow project
3. Go to Settings → API
4. Copy "Project URL" → Use as `NEXT_PUBLIC_SUPABASE_URL`
5. Copy "Project API keys" → "anon" "public" → Use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 5: Pull Remote Schema (Optional)

If your remote database already has tables/schema that aren't reflected in your local migrations:

```bash
supabase db pull
```

This will generate a new migration file with your remote schema.

## Step 6: Push Local Migrations to Remote

If you want to apply your local migration files to the remote database:

```bash
supabase db push
```

⚠️ **Warning:** This will modify your remote database. Make sure you have a backup or are working with a development/staging project first.

## Local Development

### Start Supabase Locally

To run a local Supabase instance (includes database, auth, storage, etc.):

```bash
supabase start
```

This will start Docker containers with:
- PostgreSQL database (port 54322)
- Studio UI (port 54323) - http://localhost:54323
- API Gateway (port 54321)
- Email testing server (port 54324)

Your local development `.env.local` should use these values:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<shown in terminal after supabase start>
```

### Stop Supabase Locally

```bash
supabase stop
```

### Reset Local Database

```bash
supabase db reset
```

This will drop all tables and re-run all migrations from scratch.

## Useful Commands

### View Database Changes
```bash
supabase db diff
```

### Create New Migration
```bash
supabase migration new migration_name
```

### Check Migration Status
```bash
supabase migration list
```

### Access Logs
```bash
supabase logs
```

### Generate TypeScript Types
```bash
supabase gen types typescript --local > lib/supabase/database.types.ts
```

Or for remote:
```bash
supabase gen types typescript --linked > lib/supabase/database.types.ts
```

## Existing Migrations

This project already includes migrations in `supabase/migrations/`:
1. `20251216172210_initial_schema.sql` - Initial database schema
2. `20251216210000_add_subscription_fields.sql` - Subscription tracking fields
3. `20251217160000_add_category_customizations.sql` - Category customization support

These will be automatically applied when you run `supabase db push` or `supabase start`.

## Troubleshooting

### "Command not found: supabase"
- Make sure npm global bin directory is in your PATH
- Try closing and reopening your terminal
- On Windows, you may need to restart PowerShell/Command Prompt as Administrator

### "Docker not running"
- Supabase CLI requires Docker Desktop for local development
- Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)
- Make sure Docker Desktop is running before executing `supabase start`

### "Project not linked"
- Run `supabase link --project-ref YOUR_PROJECT_REF` first
- Make sure you're in the project root directory (h:/Development 2.0/FinanceFlow)

## Support

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Discord](https://discord.supabase.com)
