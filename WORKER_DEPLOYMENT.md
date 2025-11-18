# Quick Worker Deployment Guide

Your Worker is having CORS and routing issues. Here's how to fix and redeploy:

## Problem
- Worker returns 405 Method Not Allowed
- CORS headers missing
- POST /upload endpoint not working

## Solution

### Step 1: Install Wrangler (if not installed)
```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare
```bash
wrangler login
```

### Step 3: Deploy the Fixed Worker
```bash
cd /tmp/cc-agent/54353969/project
wrangler deploy
```

You should see:
```
✨ Uploaded r2-upload-proxy
📝 Bundled in XXX ms
✨ Deployed to https://r2-upload-proxy.money-mahey.workers.dev
```

### Step 4: Test the Worker
```bash
# Test OPTIONS (CORS preflight)
curl -X OPTIONS https://r2-upload-proxy.money-mahey.workers.dev/upload -v

# Should return 204 with CORS headers

# Test POST /upload
curl -X POST https://r2-upload-proxy.money-mahey.workers.dev/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","courseId":"test-123","contentType":"video/mp4"}'

# Should return JSON with uploadId
```

## What Was Fixed

1. **CORS Headers**: Now includes all required headers including `Access-Control-Allow-Origin: *`
2. **OPTIONS Handler**: Properly handles CORS preflight with 204 status
3. **POST /upload**: Fixed routing to accept POST requests
4. **Error Handling**: Better error messages in responses
5. **Simplified Code**: Removed TypeScript, using pure JavaScript for compatibility

## Verify CORS in Browser

After deployment, open browser console and test:

```javascript
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
.then(console.log)
.catch(console.error);
```

Should return:
```json
{
  "success": true,
  "uploadId": "uuid-here",
  "objectKey": "courses/test-123/timestamp_test.mp4",
  "chunkSize": 52428800,
  "message": "Upload initiated"
}
```

## Troubleshooting

### Still getting 405?
- Make sure you deployed the new code: `wrangler deploy`
- Check Worker logs: `wrangler tail`
- Verify wrangler.toml points to correct file: `main = "workers/r2-upload.js"`

### CORS errors still?
- Clear browser cache and reload
- Check response headers in Network tab (should see Access-Control-Allow-Origin)
- Verify OPTIONS request returns 204

### R2 bucket errors?
- Make sure bucket "course-videos" exists in your Cloudflare R2
- Verify R2 bucket binding in wrangler.toml
- Check bucket permissions

## Configuration in Admin Panel

After successful deployment, update in Admin Dashboard:

1. Go to **Admin → Settings → Video Storage**
2. Select **Cloudflare R2**
3. Enter Worker URL: `https://r2-upload-proxy.money-mahey.workers.dev`
4. Fill in other Cloudflare credentials
5. Save settings
6. Test video upload

## Expected Behavior

✅ OPTIONS request → 204 with CORS headers
✅ POST /upload → 200 with uploadId
✅ PUT /chunk → 200 with chunk confirmation
✅ POST /complete → 200 with final URL
✅ No CORS errors in browser console
