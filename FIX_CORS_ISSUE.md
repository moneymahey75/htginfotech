# 🚨 FIX CORS ERROR - Quick Guide

## Your Current Error

```
Access to fetch at 'https://r2-upload-proxy.money-mahey.workers.dev/upload'
has been blocked by CORS policy
POST https://r2-upload-proxy.money-mahey.workers.dev/upload
net::ERR_FAILED 405 (Method Not Allowed)
```

## Root Cause
Your deployed Worker code is incorrect or outdated. It's not handling CORS properly and returning 405 for POST requests.

## ✅ Quick Fix (5 minutes)

### Option 1: Redeploy the Fixed Worker

```bash
# Navigate to project directory
cd /tmp/cc-agent/54353969/project

# Deploy the corrected Worker
wrangler deploy
```

### Option 2: Copy-Paste Worker Code Directly

Go to Cloudflare Dashboard:
1. **Workers & Pages** → **r2-upload-proxy**
2. Click **Edit Code**
3. **Delete all existing code**
4. Copy the code from `workers/r2-upload.js`
5. Paste it
6. Click **Save and Deploy**

## Test After Deployment

Open browser console on your app and run:

```javascript
// Test CORS
fetch('https://r2-upload-proxy.money-mahey.workers.dev/upload', {
  method: 'OPTIONS'
}).then(r => console.log('CORS OK:', r.status === 204))

// Test Upload Initiation
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
.then(d => console.log('Upload Init:', d))
```

**Expected Results:**
- CORS OK: true
- Upload Init: `{ success: true, uploadId: "...", ... }`

## What the Fixed Worker Does

✅ **Handles CORS Preflight**
- Returns 204 for OPTIONS requests
- Includes `Access-Control-Allow-Origin: *`

✅ **Accepts POST /upload**
- Initiates chunked upload
- Returns uploadId

✅ **Accepts PUT /chunk**
- Stores video chunks in R2
- Returns progress confirmation

✅ **Accepts POST /complete**
- Merges all chunks
- Saves final video to R2
- Returns public URL

## Files Created

1. **workers/r2-upload.js** - Fixed Worker code (JavaScript, not TypeScript)
2. **wrangler.toml** - Worker configuration
3. **WORKER_DEPLOYMENT.md** - Detailed deployment guide
4. **FIX_CORS_ISSUE.md** - This quick reference

## Deployment Commands

```bash
# Login to Cloudflare
wrangler login

# Deploy Worker
wrangler deploy

# View logs (for debugging)
wrangler tail

# Test Worker
curl -X POST https://r2-upload-proxy.money-mahey.workers.dev/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","courseId":"test","contentType":"video/mp4"}'
```

## Still Not Working?

### Check 1: Verify Deployment
```bash
wrangler deployments list
```
Should show recent deployment timestamp.

### Check 2: Check Logs
```bash
wrangler tail
```
Then try uploading a video. You'll see real-time logs.

### Check 3: Verify R2 Bucket
- Go to Cloudflare Dashboard → R2
- Verify bucket "course-videos" exists
- Check it's bound to the Worker

### Check 4: Browser Cache
- Clear browser cache
- Hard reload (Ctrl+Shift+R or Cmd+Shift+R)
- Try in incognito mode

## After Fix Works

Update your admin settings:
1. Admin Dashboard → Settings → Video Storage
2. Select Cloudflare R2
3. Worker URL: `https://r2-upload-proxy.money-mahey.workers.dev`
4. Fill in Account ID, Access Keys, Bucket Name
5. Save
6. Test video upload

## Success Indicators

✅ No CORS errors in browser console
✅ Upload progress shows (0% → 100%)
✅ Video appears in R2 bucket
✅ Video URL accessible for playback

## Need Help?

Check logs:
```bash
# Worker logs
wrangler tail

# Browser console logs (Network tab)
# Look for OPTIONS and POST requests
```

Common issues:
- **405 Error**: Worker code not updated, redeploy
- **CORS Error**: Missing headers, check OPTIONS response
- **404 Error**: Wrong Worker URL in admin settings
- **500 Error**: R2 bucket not found or misconfigured
