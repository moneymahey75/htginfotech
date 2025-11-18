# Fix Cloudflare R2 Video Playback Issue

## Problem
Learners can play Supabase videos but NOT Cloudflare R2 videos.

## Root Cause
The R2 **public URL** is not configured, so the app cannot generate valid video URLs for playback.

## ✅ Quick Fix (5 minutes)

### Step 1: Get R2 Public URL

1. **Go to Cloudflare Dashboard**
   - Navigate to: **R2 → course-videos**

2. **Enable Public Access**
   - Click: **Settings** tab
   - Find: **Public R2.dev subdomain**
   - Click: **Allow Access** (if button is there)
   - **Copy the URL** shown (e.g., `https://pub-f8e6dfe236904fce9b86296eaf9cb927.r2.dev`)

### Step 2: Configure in Admin Panel

1. **Login to Admin Dashboard**

2. **Go to Settings → Video Storage**

3. **Fill in the new field**:
   - **R2 Public URL**: Paste the URL from Step 1
   - Example: `https://pub-f8e6dfe236904fce9b86296eaf9cb927.r2.dev`
   - ⚠️ No trailing slash!

4. **Click Save Settings**

### Step 3: Test

1. **Login as learner**
2. **Go to a course with R2 videos**
3. **Try playing a video**
4. **Should work now!** ✅

## What Changed?

### Before (Broken)
```javascript
// videoStorage.ts tried to construct invalid URL
getCloudflareSignedUrl() {
  return `https://${accountId}.r2.cloudflarestorage.com/...`; // ❌ Wrong format
}
```

### After (Fixed)
```javascript
// Now uses configured public URL
getCloudflareSignedUrl() {
  return `${cloudflarePublicUrl}/${path}`; // ✅ Correct format
}
```

## How It Works Now

### Upload Flow (Unchanged)
1. Video → Frontend
2. Frontend → Worker (chunked upload)
3. Worker → R2 storage
4. Worker returns success
5. Frontend saves path to database

### Playback Flow (Fixed)
1. Learner clicks play
2. Frontend gets video path from database
3. Frontend gets public URL from settings
4. Frontend constructs: `{publicUrl}/{path}`
5. Video player loads from R2
6. Video plays! ✅

## Example URL Construction

**Public URL (from settings)**:
```
https://pub-f8e6dfe236904fce9b86296eaf9cb927.r2.dev
```

**Video Path (from database)**:
```
courses/abc-123/1234567890_lesson1.mp4
```

**Final Playback URL**:
```
https://pub-f8e6dfe236904fce9b86296eaf9cb927.r2.dev/courses/abc-123/1234567890_lesson1.mp4
```

Test this URL in browser - should play or download the video.

## Troubleshooting

### "Failed to load video" Error

**Check 1: Public URL Configured?**
- Admin Dashboard → Video Storage Settings
- R2 Public URL field should be filled
- Should start with `https://pub-`

**Check 2: Public Access Enabled?**
```bash
# Test bucket access
curl -I https://pub-xxxxx.r2.dev/

# Should return: HTTP/2 404 (bucket is accessible, file not found)
# Should NOT return: HTTP/2 403 (forbidden - public access disabled)
```

If you get 403:
1. Go to Cloudflare → R2 → course-videos → Settings
2. Click "Allow Access" under Public R2.dev subdomain

**Check 3: Test Full Video URL**
1. Find a video path in database:
   ```sql
   SELECT tcc_storage_path FROM tbl_course_content
   WHERE tcc_storage_provider = 'cloudflare'
   LIMIT 1;
   ```

2. Construct full URL:
   ```
   https://pub-xxxxx.r2.dev/{path-from-step-1}
   ```

3. Open in browser - should play or download

**Check 4: Browser Console Errors**
- F12 → Console tab
- Try playing video
- Look for error messages:
  - `403 Forbidden` → Public access not enabled
  - `404 Not Found` → Wrong URL or file doesn't exist
  - `Failed to load video` → Check public URL configuration

### Videos Play for Some Learners, Not Others?

This is a caching issue:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard reload (Ctrl+Shift+R)
3. Try incognito mode
4. Wait 5 minutes (settings cache)

### Old Videos Still Don't Work?

If videos uploaded BEFORE the fix still don't work:
1. Check their storage provider in database
2. If they're marked as 'cloudflare' but stored elsewhere, re-upload them
3. Or update the storage provider in database to match actual location

## Files Changed

1. **src/lib/videoStorage.ts**
   - Added `cloudflarePublicUrl` to settings
   - Fixed `getCloudflareSignedUrl()` method
   - Now uses public URL instead of invalid URL format

2. **src/components/admin/VideoStorageSettings.tsx**
   - Added "R2 Public URL" input field
   - Added to Settings interface
   - Added to save operation

3. **supabase/migrations/20251118000002_add_cloudflare_public_url.sql**
   - New database column: `tvss_cloudflare_public_url`
   - Stores the R2 public domain URL

## Migration Required

Run this SQL in Supabase SQL Editor (or it will auto-run on next deploy):

```sql
-- Add the new column
ALTER TABLE tbl_video_storage_settings
ADD COLUMN IF NOT EXISTS tvss_cloudflare_public_url text;

-- Add helpful comment
COMMENT ON COLUMN tbl_video_storage_settings.tvss_cloudflare_public_url IS
'R2 public domain URL for video playback (e.g., https://pub-xxxxx.r2.dev)';
```

## Security Notes

### Is This Secure?

**Public URL** = Anyone with the full URL can access videos

**Current Security**:
- URLs are not easily guessable (contain timestamps + random IDs)
- Not indexed by search engines
- Video page requires login and enrollment
- URLs not exposed to non-enrolled users

**Good for**: Normal educational content
**Not good for**: Highly sensitive/confidential content

### For Enhanced Security

If you need private videos:
1. Use Cloudflare Stream (paid service with signed URLs)
2. Keep R2 private and proxy through Worker with auth
3. Implement time-limited signed URLs

## Testing Checklist

After applying the fix:

- [ ] Run database migration (or deploy, it runs automatically)
- [ ] Configure R2 Public URL in admin settings
- [ ] Upload a test video
- [ ] Verify upload completes (100%)
- [ ] Login as learner
- [ ] Navigate to course
- [ ] Play the video
- [ ] Video loads and plays
- [ ] Can pause/seek/fullscreen
- [ ] No console errors

## Summary

**What was broken**: Missing R2 public URL configuration
**What was fixed**: Added public URL field and updated video URL generation
**What you need to do**: Configure R2 public URL in admin settings (5 minutes)
**Result**: R2 videos now play for learners just like Supabase videos

Questions? Check `R2_BINDING_FIX.md` for Worker setup or `FIX_CORS_ISSUE.md` for upload issues.
