# Vercel Deployment Setup - Fix Production Overrides

## The Problem
Vercel is trying to build from the root directory, but your Next.js app is in the `frontend/` folder.

## Solution: Update Vercel Settings

### Option 1: Set Root Directory (Recommended)

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **General**
2. Scroll down to **"Root Directory"**
3. Click **"Edit"**
4. Set it to: `frontend`
5. Click **"Save"**

This will automatically update all the build commands to work from the `frontend/` directory.

### Option 2: Update Production Overrides Manually

If you can't set Root Directory, update the Production Overrides:

1. Go to **Vercel Dashboard** → Your Project → **Deployments** → Click on a deployment
2. Go to **"Settings"** tab → **"Production Overrides"**
3. Update these values:

   **Build Command:**
   ```
   cd frontend && npm run build
   ```

   **Output Directory:**
   ```
   frontend/.next
   ```

   **Install Command:**
   ```
   cd frontend && npm install
   ```

4. Click **"Save"**

### After Updating

1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Select **"Use Production Settings"**
4. Click **"Redeploy"**

## Verify It's Working

After redeploying, check:
- Build logs should show: `cd frontend && npm install`
- Build should complete successfully
- Your site should be accessible

## Current Configuration

The `vercel.json` file is configured for the monorepo structure, but Vercel's Production Overrides might be overriding it. Setting the Root Directory to `frontend` is the cleanest solution.

