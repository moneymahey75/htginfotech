# Fix "env.COURSE_VIDEOS.put is not a function" Error

## Current Status
✅ R2 bucket IS bound (env.COURSE_VIDEOS exists)
❌ Wrong binding type (put method not available)

## Root Cause
The R2 bucket was bound incorrectly in Cloudflare Dashboard. It might be bound as a variable instead of an R2 Bucket Binding.

## ✅ Solution: Fix the Binding Type

### Step 1: Remove Incorrect Binding

1. Go to: **Cloudflare Dashboard → Workers & Pages → r2-upload-proxy**
2. Click: **Settings** tab
3. Find the **COURSE_VIDEOS** binding under **Variables and Secrets**
4. If it's under **Environment Variables** (wrong!) → Click **X** to remove it
5. If it's under **KV Namespace Bindings** (wrong!) → Click **X** to remove it
6. Remove ANY binding with name **COURSE_VIDEOS**

### Step 2: Add Correct R2 Bucket Binding

1. Still in **Settings** tab
2. Scroll to find: **R2 Bucket Bindings** section
3. Click: **Add binding**
4. Configure:
   - **Variable name**: `COURSE_VIDEOS` (exactly, case-sensitive)
   - **R2 bucket**: Select `course-videos` from dropdown
5. Click: **Save**

### Step 3: Verify Binding Type

The section should now show:

```
R2 Bucket Bindings
┌────────────────┬──────────────────┐
│ Variable name  │ R2 bucket        │
├────────────────┼──────────────────┤
│ COURSE_VIDEOS  │ course-videos    │
└────────────────┴──────────────────┘
```

**NOT** under:
- ❌ Environment Variables
- ❌ KV Namespace Bindings
- ❌ Durable Object Bindings
- ❌ Service Bindings

### Step 4: Deploy Updated Worker

Since the binding configuration might be cached:

```bash
cd /tmp/cc-agent/54353969/project
wrangler deploy
```

This ensures the Worker code and bindings are in sync.

### Step 5: Test

```bash
curl -X POST https://r2-upload-proxy.money-mahey.workers.dev/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","courseId":"test","contentType":"video/mp4"}'
```

**Expected Response:**
```json
{
  "success": true,
  "uploadId": "uuid-here",
  "objectKey": "courses/test/timestamp_test.mp4",
  "chunkSize": 52428800,
  "message": "Upload initiated"
}
```

## Alternative: Deploy via Wrangler CLI (Recommended)

This ensures correct configuration:

```bash
cd /tmp/cc-agent/54353969/project

# Login (if not already)
wrangler login

# Deploy (this will create correct bindings)
wrangler deploy

# Test
curl -X POST https://r2-upload-proxy.money-mahey.workers.dev/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","courseId":"test","contentType":"video/mp4"}'
```

Using wrangler CLI is better because it reads `wrangler.toml` and creates the binding correctly.

## Debug: Check Current Binding

To see what's actually bound, temporarily deploy the test worker:

1. **Edit wrangler.toml**:
   ```toml
   name = "r2-upload-proxy"
   main = "workers/r2-upload-test.js"  # <-- Changed to test worker
   compatibility_date = "2024-01-01"

   [[r2_buckets]]
   binding = "COURSE_VIDEOS"
   bucket_name = "course-videos"
   ```

2. **Deploy test worker**:
   ```bash
   wrangler deploy
   ```

3. **Check diagnostic info**:
   ```bash
   curl https://r2-upload-proxy.money-mahey.workers.dev/
   ```

   This will return JSON showing:
   - What type `env.COURSE_VIDEOS` is
   - Available methods
   - Test put/get/delete results

4. **Switch back to main worker**:
   ```toml
   main = "workers/r2-upload.js"  # <-- Back to main
   ```

5. **Deploy again**:
   ```bash
   wrangler deploy
   ```

## Common Issues

### Issue: "Bucket not found"
**Solution**: Create the bucket first
```bash
wrangler r2 bucket create course-videos
```

### Issue: "Permission denied"
**Solution**:
1. Make sure you're logged into the correct Cloudflare account
2. Verify account has R2 enabled (Workers & Pages → R2)

### Issue: Binding shows in dashboard but still doesn't work
**Solution**: Clear cache and redeploy
```bash
# In Cloudflare Dashboard
Settings → Clear Cache

# Then redeploy
wrangler deploy
```

### Issue: Different error after fixing binding
**Solution**: You're making progress! The binding works. Check the new error message.

## Verify R2 Bucket Exists

```bash
# List all R2 buckets
wrangler r2 bucket list

# Should show:
# course-videos

# If not, create it:
wrangler r2 bucket create course-videos
```

## Expected Behavior After Fix

✅ `env.COURSE_VIDEOS` exists
✅ `env.COURSE_VIDEOS.put()` is a function
✅ Can write files to R2
✅ Can read files from R2
✅ Can delete files from R2
✅ Upload endpoint returns success
✅ Chunks can be uploaded
✅ Complete endpoint merges chunks

## Test After Fix

```javascript
// In browser console
fetch('https://r2-upload-proxy.money-mahey.workers.dev/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'test.mp4',
    courseId: 'test-123',
    contentType: 'video/mp4'
  })
})
.then(r => r.json())
.then(d => {
  if (d.success) {
    console.log('✅ Upload initiated:', d.uploadId);
  } else {
    console.error('❌ Error:', d.error);
  }
});
```

## Next Steps After Success

1. **Update Admin Settings**:
   - Admin Dashboard → Settings → Video Storage
   - Select Cloudflare R2
   - Worker URL: `https://r2-upload-proxy.money-mahey.workers.dev`
   - Save

2. **Test Real Upload**:
   - Go to Course Management
   - Upload a video
   - Monitor progress

3. **Verify in R2**:
   - Cloudflare Dashboard → R2 → course-videos
   - Check for uploaded files in `courses/` folder
