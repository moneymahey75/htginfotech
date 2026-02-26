# Netlify Deployment Fix

Your build is correctly configured with Supabase environment variables. The issue on production is likely due to one of the following:

## 1. Clear Netlify Cache and Redeploy

The most common issue is that Netlify is serving a cached old build. To fix this:

1. Go to your Netlify dashboard: https://app.netlify.com
2. Navigate to your site: `bespoke-mousse-21acda`
3. Go to **Deploys** tab
4. Click **Trigger deploy** → **Clear cache and deploy site**

This will force Netlify to rebuild from scratch and deploy the latest version.

## 2. Verify Environment Variables (If Cache Clear Doesn't Work)

If clearing cache doesn't work, verify environment variables in Netlify:

1. In Netlify dashboard, go to **Site configuration** → **Environment variables**
2. Verify these variables are set:
   - `VITE_SUPABASE_URL` = `https://bbbuvwntxxzkqakrduoc.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJiYnV2d250eHh6a3Fha3JkdW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzQ3ODksImV4cCI6MjA3MDM1MDc4OX0.gwjLX-Pg4STaGuwqZzQvL8DzWAvfwFZ_UHE1BL-bXGs`

**Note:** The environment variables in `netlify.toml` should be sufficient, but setting them in the UI provides a fallback.

## 3. Check Browser Console for Errors

If the site still doesn't work:

1. Open the site in a new incognito/private window: https://bespoke-mousse-21acda.netlify.app/
2. Open browser DevTools (F12 or right-click → Inspect)
3. Go to the **Console** tab
4. Look for any error messages (red text)
5. Also check the **Network** tab for failed requests

Common errors to look for:
- CORS errors (Cross-Origin Resource Sharing)
- 401/403 authentication errors with Supabase
- Failed to fetch errors
- Module import errors

## 4. Verify Supabase Configuration

Check your Supabase dashboard:

1. Go to: https://supabase.com/dashboard/project/bbbuvwntxxzkqakrduoc
2. Go to **Settings** → **API**
3. Verify the URL and anon key match what's in your `.env` file
4. Go to **Authentication** → **URL Configuration**
5. Add your Netlify domain to the allowed redirect URLs:
   - `https://bespoke-mousse-21acda.netlify.app/**`
   - `https://bespoke-mousse-21acda.netlify.app/auth/callback`

## 5. Check Supabase RLS Policies

If users can't access data:

1. In Supabase dashboard, go to **Database** → **Policies**
2. Verify RLS policies allow authenticated users to read data
3. Check that the policies aren't blocking public access for pages that need it

## 6. Force a Fresh Build Locally and Deploy

If all else fails:

```bash
# Remove build artifacts
rm -rf dist node_modules

# Reinstall dependencies
npm install

# Build fresh
npm run build

# Commit and push to trigger Netlify redeploy
git add .
git commit -m "Force fresh build"
git push
```

## Expected Result

After clearing the cache and redeploying, your site should:
- Load the home page correctly
- Show navigation menu
- Allow users to browse courses
- Enable login/registration
- Connect to Supabase database successfully

## Current Build Status

✅ Environment variables are correctly embedded in the build
✅ Supabase URL and anon key are present in bundled JavaScript
✅ Redirects are configured correctly in `public/_redirects`
✅ Build completes without errors
✅ Local development works perfectly

The issue is most likely on the Netlify deployment side, not in the code itself.
