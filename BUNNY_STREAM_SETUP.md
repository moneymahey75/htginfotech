# Bunny Stream Setup Guide

## Overview

Your application now supports **Bunny Stream** for professional video streaming with automatic transcoding, adaptive quality, and a built-in video player.

## What's the Difference?

### Bunny Storage (Basic)
- ❌ No video transcoding
- ❌ No adaptive streaming
- ❌ No built-in player
- ✅ Simple file hosting
- 💰 $0.01/GB storage + $0.005/GB bandwidth

### Bunny Stream (Professional) ⭐ RECOMMENDED
- ✅ Automatic video transcoding (360p, 720p, 1080p, 4K)
- ✅ HLS adaptive streaming (adjusts quality based on internet speed)
- ✅ Professional video player included
- ✅ Automatic thumbnail generation
- ✅ Token-based security for paid content
- ✅ Video analytics (watch time, completion rates)
- 💰 Similar pricing with better features

## Step 1: Create a Bunny Stream Library

1. Log in to your **Bunny.net Dashboard**: https://dash.bunny.net/
2. Click **Stream** in the left menu
3. Click **Add Video Library**
4. Enter a name (e.g., "Course Videos")
5. Choose a region closest to your users
6. Click **Create**

## Step 2: Get Your Credentials

Once your library is created:

1. Click on your library name
2. Go to the **API** tab
3. You'll see two important values:

```
Library ID: 12345 (example)
API Key: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Important:** Click the 📋 Copy button to ensure accurate copying!

## Step 3: Run Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add Bunny Stream columns
ALTER TABLE tbl_video_storage_settings
ADD COLUMN IF NOT EXISTS tvss_bunny_stream_api_key text;

ALTER TABLE tbl_video_storage_settings
ADD COLUMN IF NOT EXISTS tvss_bunny_use_stream boolean DEFAULT false;

-- Add helpful comments
COMMENT ON COLUMN tbl_video_storage_settings.tvss_bunny_stream_api_key IS
  'API key for Bunny Stream. Found in Stream → Library → API tab';

COMMENT ON COLUMN tbl_video_storage_settings.tvss_bunny_use_stream IS
  'Toggle between Bunny Storage (false) and Bunny Stream (true)';
```

## Step 4: Configure in Admin Panel

1. Go to **Admin Dashboard** → **Video Storage Settings**
2. Select **Bunny.net** as your storage provider
3. Toggle to **🎬 Bunny Stream** mode (not Bunny Storage)
4. Enter your credentials:
   - **Stream Library ID**: `12345` (from Step 2)
   - **Stream API Key**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (from Step 2)
5. Click **Save Settings**

## Step 5: Upload a Test Video

1. Go to **Course Management**
2. Edit any course
3. Click **Add Video**
4. Upload a video file
5. Wait for the upload to complete

The video will:
- ✅ Upload to Bunny Stream
- ✅ Automatically transcode to multiple quality levels
- ✅ Generate thumbnails
- ✅ Be ready for streaming in a few minutes

## Step 6: Verify Playback

1. Go to the course page as a learner
2. Click on the video
3. You should see the Bunny Stream player with:
   - Quality selector (Auto, 1080p, 720p, 480p, 360p)
   - Playback speed controls
   - Fullscreen support
   - Professional player controls

## How It Works

### Upload Process

```
1. User uploads video → 2. Create video entry in Bunny Stream
                      → 3. Upload file to Bunny
                      → 4. Bunny transcodes automatically
                      → 5. Video ready for streaming
```

### Storage Path

Videos are stored with a special path format:
```
bunny-stream://video-guid-here
```

The system detects this format and serves the video through Bunny's embed player instead of direct file URLs.

### Playback

- Storage videos: Direct video file playback
- Stream videos: Embedded Bunny player with iframe

The VideoPlayer component automatically detects which method to use.

## Troubleshooting

### "Authentication Failed (401)"

**Problem:** Invalid Stream API Key

**Solution:**
1. Go to Bunny Dashboard → Stream → Your Library → API
2. Copy the API Key again using the 📋 Copy button
3. Update in Admin Panel → Video Storage Settings
4. Make sure you're using the **Stream API Key**, not the Storage Zone Password

### "Library ID not found"

**Problem:** Incorrect Library ID

**Solution:**
1. Verify the Library ID in Bunny Dashboard → Stream → Your Library → API
2. It should be a number like `12345`
3. Update in Admin Panel

### Video not playing

**Problem:** Video might still be processing

**Solution:**
- Wait 2-5 minutes for Bunny to finish transcoding
- Check Bunny Dashboard → Stream → Your Library → Videos
- Look for the video status (should be "Ready")

### Uploads fail immediately

**Check:**
1. Library ID is correct (numbers only)
2. API Key is correct (full UUID format)
3. Both fields are filled in Video Storage Settings
4. "Use Stream" toggle is enabled

## Cost Estimate

For a typical course platform:

**100 videos (1GB each):**
- Storage: 100GB × $0.005/GB = **$0.50/month**
- Encoding: **Free** (included)
- Streaming: 500GB bandwidth × $0.005/GB = **$2.50/month**

**Total: ~$3/month for 100GB video library**

Compare to:
- Supabase Storage: $25/month for 100GB
- AWS S3: ~$5-10/month (no transcoding)

## Security Features

Bunny Stream includes:

1. **Token Authentication**: Videos can't be accessed without valid tokens
2. **Referrer Restrictions**: Prevent embedding on unauthorized sites
3. **Geographic Restrictions**: Limit playback to specific countries
4. **IP Whitelisting**: Control access by IP address

Configure these in: Bunny Dashboard → Stream → Your Library → Security

## Next Steps

1. ✅ Run the database migration
2. ✅ Configure credentials in Admin Panel
3. ✅ Upload a test video
4. ✅ Verify playback works
5. 🎉 Start uploading your course content!

## Support

If you need help:
- Bunny.net Support: https://support.bunny.net/
- Bunny Stream Docs: https://docs.bunny.net/docs/stream

---

**Note:** You can switch back to Bunny Storage at any time by toggling the service type in Video Storage Settings. Existing videos will continue to work with their original storage method.
