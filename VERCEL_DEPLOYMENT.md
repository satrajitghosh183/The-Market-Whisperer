# Vercel Deployment Guide

## If You Can't See Your Deployment

### Step 1: Check Project Settings in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Click on your project (or create a new one if it doesn't exist)
3. Go to **Settings** → **General**
4. Check the **Root Directory** setting:
   - It should be set to: `frontend`
   - OR leave it empty if using the root `vercel.json` configuration

### Step 2: Connect Your GitHub Repository

1. In Vercel dashboard, go to **Settings** → **Git**
2. Make sure your GitHub repository is connected
3. Check that the correct branch is selected (usually `master` or `main`)

### Step 3: Configure Environment Variables

1. Go to **Settings** → **Environment Variables**
2. Add these variables:
   - `NEXT_PUBLIC_API_URL` = `https://the-market-whisperer.onrender.com`
   - `NEXT_PUBLIC_WS_URL` = `wss://the-market-whisperer.onrender.com`

### Step 4: Manual Deployment

If automatic deployment isn't working:

1. Go to **Deployments** tab
2. Click **"Redeploy"** or **"Deploy"**
3. Select the latest commit from your branch
4. Click **"Deploy"**

### Step 5: Check Build Logs

1. Click on a deployment
2. Check the **Build Logs** tab
3. Look for any errors or warnings
4. Common issues:
   - Missing environment variables
   - Build command failures
   - TypeScript errors

## Project Configuration

The project is configured as a **monorepo** with:
- **Root Directory**: `frontend` (Next.js app)
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/.next`

## Troubleshooting

### Issue: "No deployments found"
- **Solution**: Make sure your GitHub repo is connected and you've pushed commits

### Issue: "Build failed"
- **Solution**: Check build logs for specific errors
- Common fixes:
  - Add missing environment variables
  - Fix TypeScript errors
  - Check `package.json` dependencies

### Issue: "404 Not Found" after deployment
- **Solution**: 
  - Check that `rootDirectory` is set to `frontend` in Vercel settings
  - Verify `vercel.json` is in the root directory

### Issue: "Cannot find module"
- **Solution**: 
  - Make sure all dependencies are in `frontend/package.json`
  - Run `npm install` in the `frontend` directory locally to verify

## Quick Fix Checklist

- [ ] GitHub repository is connected to Vercel
- [ ] Root Directory is set to `frontend` in Vercel settings
- [ ] Environment variables are set (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`)
- [ ] Latest code is pushed to GitHub
- [ ] Build logs show no errors
- [ ] Deployment status is "Ready" or "Building"

## Need Help?

If deployments still don't appear:
1. Check Vercel dashboard → **Deployments** tab
2. Look for any error messages
3. Check GitHub → **Actions** (if GitHub Actions are enabled)
4. Verify the repository is public or Vercel has access

