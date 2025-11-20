# Video Deletion and Storage Path Synchronization - FIXED

## Problems Identified

### Problem 1: Different File Names in Database vs Cloudflare R2
**Root Cause:**
- Frontend generated path: `courses/{courseId}/{timestamp}_video.mp4`
- OLD Cloudflare Worker generated its OWN timestamp: `courses/{courseId}/{different_timestamp}_video.mp4`
- Frontend saved its path to database, but R2 had Worker's path
- Result: Database and R2 had different filenames, causing 404 errors

### Problem 2: Deletion Only from Database
**Root Cause:**
- No DELETE endpoint existed in Cloudflare Worker
- `deleteFromCloudflare()` tried to use incorrect S3-compatible API
- Files accumulated in storage even after database deletion

## Solutions Implemented

### 1. Fixed Cloudflare Worker (`workers/r2-upload.js`)

**Added storagePath parameter:**
```javascript
// Line 53: Now accepts storagePath from frontend
const { fileName, courseId, contentType, storagePath } = body;

// Line 65: Uses provided storagePath OR generates one as fallback
const objectKey = storagePath || `courses/${courseId}/${Date.now()}_${sanitizedFileName}`;
```

**Added DELETE endpoint:**
```javascript
// POST /delete - Delete a video file
if (pathname === '/delete' && request.method === 'POST') {
  const body = await request.json();
  const { objectKey } = body;

  await env.COURSE_VIDEOS.delete(objectKey);

  return jsonResponse({
    success: true,
    message: 'File deleted successfully',
    objectKey,
  });
}
```

### 2. Fixed Frontend Upload (`src/lib/videoStorage.ts`)

**Send storagePath to Worker:**
```javascript
// Line 214-218: Now sends the frontend-generated path
body: JSON.stringify({
  fileName: file.name,
  courseId,
  contentType: file.type || 'video/mp4',
  storagePath: path,  // ← NEW: Send our path
}),
```

**Use Worker's returned objectKey:**
```javascript
// Line 100: Changed uploadToCloudflare to return string
actualStoragePath = await this.uploadToCloudflare(file, storagePath, settings, onProgress);

// Line 297: Return actual objectKey from Worker's response
return completeData.objectKey || path;

// Line 109: Save the actual path Worker used
return {
  storagePath: actualStoragePath,  // ← Now uses Worker's path
  provider: settings.activeProvider,
  fileSize: file.size,
};
```

### 3. Fixed Cloudflare Deletion (`src/lib/videoStorage.ts`)

**Call Worker's DELETE endpoint:**
```javascript
// Line 467-486: Use Worker's /delete endpoint
const response = await fetch(
  `${settings.cloudflareWorkerUrl}/delete`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      objectKey: path,
    }),
  }
);
```

**Added comprehensive logging:**
```javascript
// Line 440: Log what's being deleted
console.log(`Deleting video from ${content.tcc_storage_provider}: ${content.tcc_storage_path}`);

// Line 452: Log success
console.log('Successfully deleted from Cloudflare R2');

// Line 460: Log errors but don't block database deletion
console.error(`Error deleting video from ${content.tcc_storage_provider} storage:`, err);
```

## Deployment Steps

### Step 1: Deploy Updated Cloudflare Worker

1. Go to **Cloudflare Dashboard** → **Workers & Pages**
2. Find your `r2-upload` worker
3. Click **Edit Code**
4. Copy the contents of `workers/r2-upload.js` from this project
5. Paste and **Save and Deploy**
6. Verify deployment succeeded

### Step 2: Test the Complete Flow

#### Test Upload:
1. Go to Admin Dashboard → Course Management
2. Add a new video lesson to a course
3. Upload a video file
4. **Check browser console** for upload messages
5. **Note the storage path** that gets saved to database

#### Verify R2 Storage:
1. Go to **Cloudflare Dashboard** → **R2**
2. Open your `course-videos` bucket
3. Browse to `courses/{courseId}/`
4. **Verify the filename MATCHES** what's in your database

#### Test Deletion:
1. Delete the video lesson you just uploaded
2. **Check browser console** - you should see:
   - `Deleting video from cloudflare: courses/...`
   - `Successfully deleted from Cloudflare R2`
3. **Verify in Cloudflare R2** - file should be GONE
4. **Verify in database** - record should be deleted

### Step 3: Clean Up Old Orphaned Files

Your existing videos have mismatched paths. Here's how to handle them:

**Option A: Re-upload all videos** (Recommended)
1. Download your existing videos from R2
2. Delete the old lessons from your system
3. Re-upload them through the admin panel
4. New uploads will have matching paths

**Option B: Manual cleanup**
1. Go to Cloudflare R2 → course-videos bucket
2. Browse through folders and delete files that don't match database paths
3. This is tedious but ensures no orphaned files

## How to Verify It's Working

### Console Logs to Look For:

**During Upload:**
- No console errors
- Upload progress reaches 100%

**During Deletion:**
```
Deleting video from cloudflare: courses/abc123/1234567890_video.mp4
Successfully deleted from Cloudflare R2
Lesson Deleted - Lesson and associated video file have been deleted successfully
```

**If Deletion Fails:**
```
Error deleting video from cloudflare storage: [error message]
```
This means the Worker deletion failed, but database deletion still proceeded.

### What Each Provider Does:

| Storage Provider | Upload Location | Deletion Method |
|-----------------|----------------|-----------------|
| **Supabase** | Supabase Storage bucket | Direct bucket.remove() |
| **Cloudflare** | R2 via Worker | Worker /delete endpoint |
| **Bunny.net** | Bunny Storage Zone | Direct API DELETE |
| **External URL** | Not stored | No deletion needed |

## Troubleshooting

### Issue: Upload works but still getting 404
**Cause:** Old Worker deployed without the storagePath fix
**Solution:** Redeploy the Worker with updated code from `workers/r2-upload.js`

### Issue: Deletion fails silently
**Cause:** Worker URL not configured OR Worker doesn't have DELETE endpoint
**Solution:**
1. Check Admin → Video Storage Settings → Worker URL is set
2. Redeploy Worker with DELETE endpoint code

### Issue: Path still doesn't match
**Cause:** Using old uploaded videos
**Solution:** Delete and re-upload the video

### Issue: Worker returns 404 on /delete
**Cause:** Old Worker code deployed
**Solution:** Redeploy Worker with latest code

## Files Modified

1. **workers/r2-upload.js** - Added storagePath parameter and DELETE endpoint
2. **src/lib/videoStorage.ts** - Fixed upload to use Worker's objectKey, fixed deletion to use Worker endpoint
3. **src/components/admin/CourseManagement.tsx** - No changes needed (already calls videoStorage.deleteVideo)

## Summary

✅ Worker now uses frontend's storagePath instead of generating its own
✅ Frontend now saves the actual path Worker returns
✅ DELETE endpoint added to Worker for removing files from R2
✅ Frontend deletion calls Worker's DELETE endpoint
✅ Comprehensive logging added for debugging
✅ Database and storage paths now match perfectly
✅ Deleting lessons removes files from both database AND storage
