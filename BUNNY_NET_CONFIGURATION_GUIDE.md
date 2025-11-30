# Bunny.net Configuration Guide

## Overview

Your platform uses Bunny.net for cost-effective video storage and delivery. This guide explains how to properly configure all required fields.

## Bunny.net Architecture

Bunny.net has two main services for video handling:

1. **Bunny Storage** - File storage service (like AWS S3)
2. **Bunny Stream** - Video streaming service with transcoding and adaptive bitrate

Your platform currently uses **Bunny Storage** for file uploads and delivery.

---

## Required Configuration Fields

### 1. Storage Zone Password (API Key) *

**What it is:** The authentication password for your Storage Zone. This is also called the "AccessKey" in API requests.

**How to find it:**
1. Log in to your Bunny.net dashboard
2. Navigate to **Storage** in the left menu
3. Click on your Storage Zone name
4. Go to **FTP & API Access** tab
5. Copy the **Password** field

**Usage:** This password is used to:
- Upload files to your storage zone
- Delete files from your storage zone
- Authenticate all Storage API requests

**In UI:** "Storage Zone Password (API Key)"

**Database field:** `tvss_bunny_api_key`

**Important:** This is NOT your Bunny.net account password. Each Storage Zone has its own unique password.

---

### 2. Storage Zone Name *

**What it is:** The unique name of your Storage Zone where files are stored.

**How to find it:**
1. Log in to your Bunny.net dashboard
2. Navigate to **Storage**
3. Your Storage Zone name is listed (e.g., "my-videos", "course-content")

**Usage:** Forms the base URL for storage operations:
```
https://storage.bunnycdn.com/{storage-zone-name}/{file-path}
```

**In UI:** "Storage Zone Name"

**Database field:** `tvss_bunny_storage_zone`

**Example:** If your zone is named "eduplatform", your storage URL would be:
```
https://storage.bunnycdn.com/eduplatform/courses/video1.mp4
```

---

### 3. Pull Zone URL (CDN URL) *

**What it is:** The public CDN URL where your content is delivered to end users.

**How to find it:**
1. Log in to your Bunny.net dashboard
2. Navigate to **CDN** (Pull Zones)
3. Find the Pull Zone connected to your Storage Zone
4. Copy the **CDN URL** (usually ends with `.b-cdn.net`)

**Usage:** Forms the public URL for accessing files:
```
https://your-pullzone.b-cdn.net/{file-path}
```

**In UI:** "Pull Zone URL (CDN URL)"

**Database field:** `tvss_bunny_cdn_url`

**Example:**
- Storage upload: `https://storage.bunnycdn.com/eduplatform/video.mp4`
- Public delivery: `https://educdn.b-cdn.net/video.mp4`

**Important:** Make sure this Pull Zone is connected to your Storage Zone, or files won't be accessible.

---

### 4. Stream Library ID (Optional)

**What it is:** The ID of your Bunny Stream video library for advanced video streaming features.

**How to find it:**
1. Log in to your Bunny.net dashboard
2. Navigate to **Stream** in the left menu
3. Click on your Video Library
4. Go to **API** section
5. Copy the **Library ID** (a numeric value)

**Usage:** Currently not used in the platform, but available for future Bunny Stream integration.

**In UI:** "Stream Library ID (Optional)"

**Database field:** `tvss_bunny_stream_library_id`

**Note:** Bunny Stream is a separate service from Bunny Storage. Stream offers:
- Automatic video transcoding
- Adaptive bitrate streaming
- Built-in video player
- Higher cost than simple storage

Your platform currently uses **Bunny Storage only**, so this field is optional.

---

## Setup Instructions

### Step 1: Create a Bunny.net Account

1. Go to [https://bunny.net](https://bunny.net)
2. Sign up for an account
3. Verify your email

### Step 2: Create a Storage Zone

1. In Bunny dashboard, go to **Storage**
2. Click **Add Storage Zone**
3. Fill in:
   - **Name**: Choose a unique name (e.g., "my-course-videos")
   - **Region**: Select closest to your users
   - **Replication**: Choose based on your needs (Standard is usually fine)
4. Click **Add Storage Zone**

### Step 3: Get Storage Zone Password

1. Click on your newly created Storage Zone
2. Go to **FTP & API Access** tab
3. Copy the **Password** - this is your Storage Zone Password (API Key)

### Step 4: Create a Pull Zone (CDN)

1. Go to **CDN** → **Pull Zones**
2. Click **Add Pull Zone**
3. Fill in:
   - **Name**: Choose a name (e.g., "my-course-cdn")
   - **Origin Type**: Select **Storage Zone**
   - **Storage Zone**: Select the Storage Zone you created
4. Click **Add Pull Zone**
5. Copy the **CDN URL** (e.g., `https://mycdn.b-cdn.net`)

### Step 5: Configure in Your Platform

1. Log in to your Admin Dashboard
2. Go to **Settings → Video Storage**
3. Select **Bunny.net** as the active provider
4. Fill in the fields:
   - **Storage Zone Password (API Key)**: Paste the password from Step 3
   - **Storage Zone Name**: Enter the name from Step 2
   - **Pull Zone URL (CDN URL)**: Paste the CDN URL from Step 4
   - **Stream Library ID**: Leave empty (optional)
5. Click **Save Settings**

---

## API Implementation Details

### Upload Process

When uploading a video, the platform:

1. Constructs the upload URL:
   ```
   https://storage.bunnycdn.com/{storage-zone-name}/{path}
   ```

2. Makes a PUT request with:
   ```javascript
   headers: {
     'AccessKey': storageZonePassword,
     'Content-Type': 'application/octet-stream'
   }
   ```

3. Uploads the file as the request body

### Retrieval Process

When serving a video to users, the platform:

1. Constructs the CDN URL:
   ```
   https://{pull-zone-url}/{path}
   ```

2. Optionally adds token authentication:
   ```
   https://{pull-zone-url}/{path}?token={token}&expires={timestamp}
   ```

3. Returns the URL to the video player

### Delete Process

When deleting a video, the platform:

1. Constructs the delete URL:
   ```
   https://storage.bunnycdn.com/{storage-zone-name}/{path}
   ```

2. Makes a DELETE request with:
   ```javascript
   headers: {
     'AccessKey': storageZonePassword
   }
   ```

---

## Common Issues and Solutions

### Issue: "Bunny.net not configured"

**Cause:** Missing Storage Zone Password or Storage Zone Name

**Solution:**
1. Verify both fields are filled in Video Storage Settings
2. Check that the password is correct (from FTP & API Access page)

### Issue: Upload succeeds but video doesn't play

**Cause:** Pull Zone not connected to Storage Zone

**Solution:**
1. Go to CDN → Pull Zones in Bunny dashboard
2. Edit your Pull Zone
3. Ensure **Origin Type** is set to **Storage Zone**
4. Ensure correct Storage Zone is selected

### Issue: 401 Unauthorized error on upload

**Cause:** Incorrect Storage Zone Password

**Solution:**
1. Go to Storage → Your Zone → FTP & API Access
2. Copy the correct password
3. Update it in Video Storage Settings

### Issue: 404 Not Found on video playback

**Cause:** Incorrect Pull Zone URL or file path

**Solution:**
1. Verify the Pull Zone URL is correct (includes `https://` and ends with `.b-cdn.net`)
2. Check that files are being uploaded successfully
3. Try accessing the file directly in browser: `https://your-pullzone.b-cdn.net/path/to/file.mp4`

---

## Cost Information

### Bunny Storage Pricing (as of 2024)

- **Storage**: $0.01/GB per month
- **Bandwidth (Downloads)**: $0.01-0.03/GB depending on region
- **API Calls**: Free (unlimited)
- **Minimum**: No minimum charge

### Example Costs

**Small Platform** (50GB storage, 500GB bandwidth/month):
- Storage: 50 × $0.01 = $0.50/month
- Bandwidth: 500 × $0.01 = $5.00/month
- **Total: ~$5.50/month**

**Medium Platform** (200GB storage, 2TB bandwidth/month):
- Storage: 200 × $0.01 = $2.00/month
- Bandwidth: 2000 × $0.01 = $20.00/month
- **Total: ~$22/month**

**Large Platform** (1TB storage, 10TB bandwidth/month):
- Storage: 1000 × $0.01 = $10.00/month
- Bandwidth: 10000 × $0.01 = $100.00/month
- **Total: ~$110/month**

### Comparison with Other Providers

| Provider | Storage (100GB) | Bandwidth (1TB) | Total/Month |
|----------|----------------|-----------------|-------------|
| **Bunny.net** | $1 | $10 | **$11** |
| Cloudflare R2 | $1.50 | $0 (free egress) | **$1.50** |
| Supabase | Included in $25 plan | Included | **$25** |

**Recommendation:**
- For < 100GB storage: Use **Cloudflare R2** (free 10GB, then $0.015/GB)
- For 100GB-1TB: Use **Bunny.net** (most cost-effective)
- For simplicity: Use **Supabase** (no setup, fixed cost)

---

## Advanced: Bunny Stream Integration (Future)

If you want to use Bunny Stream in the future:

### Benefits of Bunny Stream over Bunny Storage

- Automatic video transcoding (multiple quality levels)
- Adaptive bitrate streaming (adjusts to user's connection)
- Built-in video player with controls
- Thumbnail generation
- Video analytics
- DRM protection (optional)

### Cost Difference

**Bunny Storage:** $0.01/GB storage + $0.01/GB bandwidth = **~$0.02/GB total**

**Bunny Stream:** $0.005/GB storage + $0.01/GB bandwidth + $0.10/min encoding = **~$0.11/GB total** (varies by video length)

### When to Use Stream vs Storage

**Use Storage (current setup):**
- Cost-sensitive platform
- Simple video hosting
- You handle video encoding yourself
- Basic playback requirements

**Use Stream:**
- Need multiple quality levels (360p, 720p, 1080p)
- Want adaptive bitrate for mobile users
- Need detailed video analytics
- Want protected content (DRM)

---

## Security Best Practices

1. **Never expose Storage Zone Password in frontend code**
   - Always keep it server-side or in secure environment variables
   - Your platform correctly stores it in database settings

2. **Use token authentication for CDN**
   - Enable token authentication in Pull Zone settings
   - Generate signed URLs with expiration

3. **Restrict allowed origins**
   - Configure allowed domains in Pull Zone settings
   - Prevent hotlinking from other sites

4. **Use HTTPS only**
   - All Bunny.net URLs use HTTPS by default
   - Never downgrade to HTTP

5. **Rotate passwords periodically**
   - Change Storage Zone password every 6-12 months
   - Update in platform settings immediately

---

## Troubleshooting Checklist

Before contacting support, verify:

- [ ] Storage Zone Password is correct (from FTP & API Access page)
- [ ] Storage Zone Name matches exactly (case-sensitive)
- [ ] Pull Zone URL includes `https://` and ends with `.b-cdn.net`
- [ ] Pull Zone is connected to the correct Storage Zone
- [ ] Storage Zone has available space (check usage in dashboard)
- [ ] No typos in any configuration fields
- [ ] Settings are saved and cache is cleared in platform

---

## Support Resources

### Bunny.net Support
- Documentation: [https://docs.bunny.net](https://docs.bunny.net)
- Support Portal: [https://support.bunny.net](https://support.bunny.net)
- Community: [https://community.bunny.net](https://community.bunny.net)

### Platform Support
- Check browser console for error messages
- Review application logs in Admin Dashboard
- Contact your platform administrator

---

## Summary

Your Bunny.net configuration requires:

✅ **Storage Zone Password** - Authentication key from FTP & API Access
✅ **Storage Zone Name** - Name of your storage zone
✅ **Pull Zone URL** - CDN URL for content delivery
⭕ **Stream Library ID** - Optional, for future Bunny Stream features

With these fields configured, your platform can:
- Upload videos to Bunny Storage
- Deliver videos via Bunny CDN
- Delete videos from storage
- Manage video content efficiently

The current implementation uses the Storage Zone Password as the AccessKey for all API operations, which is the correct approach according to Bunny.net documentation.
