# Fix R2 Bucket Binding Error

## Current Error
```
{"error":"Cannot read properties of undefined (reading 'put')"}
```

This means the R2 bucket is NOT bound to your Worker.

## ✅ Solution: Bind R2 Bucket (Choose One Method)

### Method 1: Using Cloudflare Dashboard (Easiest - 2 minutes)

1. **Go to Cloudflare Dashboard**
   - Navigate to: **Workers & Pages**
   - Click on: **r2-upload-proxy** (your worker)

2. **Open Settings**
   - Click **Settings** tab
   - Scroll to **Variables and Secrets** section

3. **Add R2 Bucket Binding**
   - Under **R2 Bucket Bindings**, click **Add binding**
   - Fill in:
     - **Variable name**: `COURSE_VIDEOS`
     - **R2 bucket**: `course-videos` (select from dropdown)
   - Click **Save**

4. **Wait 30 seconds** for changes to propagate

5. **Test**
   ```bash
   curl -X POST https://r2-upload-proxy.money-mahey.workers.dev/upload \
     -H "Content-Type: application/json" \
     -d '{"fileName":"test.mp4","courseId":"test","contentType":"video/mp4"}'
   ```
   Should return JSON with `uploadId`, not an error.

### Method 2: Using Wrangler CLI

1. **Verify wrangler.toml exists with correct config**
   ```toml
   name = "r2-upload-proxy"
   main = "workers/r2-upload.js"
   compatibility_date = "2024-01-01"

   [[r2_buckets]]
   binding = "COURSE_VIDEOS"
   bucket_name = "course-videos"
   ```

2. **Deploy with binding**
   ```bash
   cd /tmp/cc-agent/54353969/project
   wrangler deploy
   ```

3. **Verify binding worked**
   - Test endpoint (same curl command as above)

## Create R2 Bucket (If It Doesn't Exist)

### Dashboard Method:
1. Go to Cloudflare Dashboard → **R2**
2. Click **Create bucket**
3. Name: `course-videos`
4. Location: Choose closest to your users (e.g., WNAM for North America)
5. Click **Create bucket**

### CLI Method:
```bash
wrangler r2 bucket create course-videos
```

## Verify Setup

```bash
# List R2 buckets
wrangler r2 bucket list

# Should show:
# - course-videos
```

## Test Full Upload Flow

After binding is fixed, test in browser console:

```javascript
async function testWorker() {
  // 1. Initiate upload
  const init = await fetch('https://r2-upload-proxy.money-mahey.workers.dev/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'test.mp4',
      courseId: 'test-123',
      contentType: 'video/mp4'
    })
  }).then(r => r.json());

  console.log('✅ Initiate:', init);
  // Expected: { success: true, uploadId: "uuid...", objectKey: "courses/..." }

  if (!init.success) {
    console.error('❌ Upload initiation failed:', init.error);
    return;
  }

  // 2. Upload a small test chunk
  const chunk = new Uint8Array(1024); // 1KB
  const chunkResponse = await fetch('https://r2-upload-proxy.money-mahey.workers.dev/chunk', {
    method: 'PUT',
    headers: {
      'X-Upload-ID': init.uploadId,
      'X-Chunk-Index': '0',
      'X-Total-Chunks': '1'
    },
    body: chunk
  }).then(r => r.json());

  console.log('✅ Chunk:', chunkResponse);
  // Expected: { success: true, nextChunk: 1 }

  // 3. Complete upload
  const complete = await fetch('https://r2-upload-proxy.money-mahey.workers.dev/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadId: init.uploadId,
      totalChunks: 1
    })
  }).then(r => r.json());

  console.log('✅ Complete:', complete);
  // Expected: { success: true, url: "https://..." }

  return complete;
}

testWorker();
```

## Troubleshooting

### Still getting "undefined reading 'put'"?
**Cause**: Binding not applied correctly

**Fix**:
1. Check Worker Settings → Variables → R2 Bucket Bindings
2. Verify: Variable name = `COURSE_VIDEOS`, Bucket = `course-videos`
3. Click **Save** again
4. Wait 30-60 seconds
5. Test again

### "Bucket not found" error?
**Cause**: R2 bucket doesn't exist

**Fix**:
```bash
wrangler r2 bucket create course-videos
```

Or create via Dashboard (R2 → Create bucket)

### Worker shows old code?
**Cause**: Cache not cleared

**Fix**:
```bash
# Redeploy
wrangler deploy

# Or in Dashboard: Edit Code → Save and Deploy
```

### Check Worker Logs
```bash
wrangler tail
```

Then trigger an upload and watch real-time logs.

## Success Indicators

✅ POST /upload returns `{ success: true, uploadId: "..." }`
✅ No "undefined" errors
✅ No CORS errors
✅ PUT /chunk accepts file data
✅ POST /complete merges chunks
✅ Files appear in R2 bucket (`course-videos`)

## After Binding Works

1. **Redeploy Worker** (with updated code):
   ```bash
   wrangler deploy
   ```

2. **Update Admin Settings**:
   - Go to: Admin Dashboard → Settings → Video Storage
   - Select: **Cloudflare R2**
   - Worker URL: `https://r2-upload-proxy.money-mahey.workers.dev`
   - Fill in: Account ID, Access Key, Secret Key, Bucket Name
   - Click **Save Settings**

3. **Test Real Video Upload**:
   - Go to: Courses → Course Management
   - Create/edit a course
   - Add video content
   - Upload video file
   - Monitor progress (0% → 100%)

4. **Verify in R2**:
   - Cloudflare Dashboard → R2 → course-videos
   - Check `courses/` folder for uploaded files

## Quick Commands Reference

```bash
# List buckets
wrangler r2 bucket list

# Create bucket
wrangler r2 bucket create course-videos

# Deploy worker
wrangler deploy

# View logs
wrangler tail

# Test endpoint
curl -X POST https://r2-upload-proxy.money-mahey.workers.dev/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","courseId":"test","contentType":"video/mp4"}'
```

## Configuration Summary

**Required R2 Bucket Binding:**
- Variable name: `COURSE_VIDEOS`
- Bucket name: `course-videos`
- Type: R2 Bucket Binding

**Worker Endpoints:**
- POST `/upload` - Initiate chunked upload
- PUT `/chunk` - Upload individual 50MB chunks
- POST `/complete` - Merge chunks into final video
- GET `/status/:uploadId` - Check upload status
- DELETE `/cancel/:uploadId` - Cancel upload

**Next Steps:**
1. Bind R2 bucket (this guide)
2. Test endpoints
3. Configure admin settings
4. Upload test video
5. Verify video in R2 bucket
