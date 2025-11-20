# Vimeo Integration Guide

## Why Vimeo?

Vimeo's **free plan** offers an incredible benefit for educational platforms:

- **2GB upload per week** - Upload limit resets every 7 days
- **Unlimited total storage** - All videos remain on your account permanently
- **Professional video player** - Clean, customizable embedded player
- **No storage cap** - Theoretically grow to 100GB+ after 1 year
- **Reliable streaming** - Professional CDN delivery worldwide
- **Unlisted privacy** - Videos are not searchable, only accessible via link

### Cost Comparison

| Provider | Free Tier | After Free Tier |
|----------|-----------|-----------------|
| **Vimeo** | 2GB/week upload, unlimited storage | $7/month for 250GB storage |
| Supabase | None | $25/month for 100GB |
| Cloudflare R2 | 10GB storage | $0.015/GB/month |
| Bunny.net | None | $0.01/GB/month |

For small to medium platforms uploading less than 2GB per week, **Vimeo is the most cost-effective option**.

---

## Setup Instructions

### Step 1: Create a Vimeo Account

1. Go to [https://vimeo.com/join](https://vimeo.com/join)
2. Sign up for a free account
3. Verify your email address

### Step 2: Create a Vimeo App

1. Go to [https://developer.vimeo.com/apps](https://developer.vimeo.com/apps)
2. Click **"Create App"**
3. Fill in the details:
   - **App Name**: Your platform name (e.g., "HTG Infotech Platform")
   - **App Description**: "Learning management system for course videos"
   - **App URL**: Your website URL
4. Accept the terms and click **"Create App"**

### Step 3: Generate Access Token

1. After creating the app, you'll see your **Client Identifier** and **Client Secret**
2. Scroll down to **"Generate an access token"**
3. Select these scopes (permissions):
   - ✅ **Public** (view public videos)
   - ✅ **Private** (view private videos)
   - ✅ **Upload** (upload videos)
   - ✅ **Edit** (edit video metadata)
   - ✅ **Delete** (delete videos)
4. Click **"Generate Token"**
5. **Copy the access token** - you won't be able to see it again!

### Step 4: Configure in Your Platform

1. Log in to your Admin Dashboard
2. Go to **Settings → Video Storage**
3. Select **"Vimeo"** as the active provider
4. Paste your **Access Token** in the field
5. (Optional) Add Client ID and Client Secret
6. Click **"Save Settings"**

---

## How to Use Vimeo

### Uploading Videos

1. Go to **Admin Dashboard → Course Management**
2. Select a course and click **"Manage Lessons"**
3. Click **"Add Lesson"** or edit an existing lesson
4. Select content type: **"Video"**
5. Choose **"Upload File"**
6. Select your video file (max 2GB at a time)
7. Click **"Save Lesson"**

The video will be uploaded to Vimeo and automatically embedded in your course.

### What Happens Behind the Scenes

1. **Upload**: Video is uploaded to Vimeo using their TUS resumable upload protocol
2. **Storage**: Vimeo stores the video with URI like `/videos/123456789`
3. **Privacy**: Videos are set to "unlisted" - only accessible via direct link
4. **Database**: Your database stores the Vimeo video URI
5. **Playback**: When learners access the lesson, they get Vimeo's embedded player URL

### Deleting Videos

When you delete a lesson with a Vimeo video:
1. The video is **automatically deleted from Vimeo** using the API
2. The database record is removed
3. This frees up your weekly upload allowance

---

## Weekly Upload Management

### Understanding the 2GB Weekly Limit

- Limit resets **every 7 days** from when you first uploaded
- If you upload 1.5GB on Monday, you have 0.5GB left until next Monday
- **Unused allowance does NOT roll over**
- Plan your uploads to stay within the weekly limit

### Tips for Managing Uploads

1. **Compress videos before uploading**:
   - Use H.264 codec for best compatibility
   - Lower resolution (720p instead of 1080p) for most courses
   - Use video editing software to reduce file size

2. **Batch your uploads**:
   - Upload all course videos within your weekly allowance
   - Wait for the reset if you need more

3. **Monitor your usage**:
   - Check Vimeo dashboard: [https://vimeo.com/settings/account](https://vimeo.com/settings/account)
   - Look for "Weekly upload limit" status

4. **Delete unused videos**:
   - Deleting videos doesn't restore your weekly limit
   - But it prevents future storage issues

---

## Video Player Features

Vimeo provides a professional, customizable video player:

- **Responsive design** - Works on all devices
- **Quality selection** - Auto-adjusts based on connection
- **Playback speed** - Students can watch at 1.25x, 1.5x, 2x
- **Keyboard shortcuts** - Professional viewing experience
- **Captions support** - Add subtitles for accessibility
- **No Vimeo branding** - Clean player (on paid plans)

---

## Troubleshooting

### "Upload limit exceeded"

**Problem**: You've uploaded more than 2GB this week.

**Solution**: Wait until your weekly limit resets. Check when it resets at vimeo.com/settings/account.

### "Invalid access token"

**Problem**: Your access token is incorrect or expired.

**Solution**:
1. Go to developer.vimeo.com/apps
2. Find your app
3. Regenerate the access token
4. Update it in your platform's Video Storage Settings

### "Failed to upload video"

**Problem**: Upload interrupted or file too large.

**Solution**:
1. Check your internet connection
2. Ensure video is under 2GB
3. Try compressing the video
4. Try uploading again

### "Video not playing"

**Problem**: Vimeo is still processing the video.

**Solution**: Wait 2-5 minutes for Vimeo to process the video, then refresh the page.

---

## Migration from Other Providers

If you're currently using Supabase, Cloudflare R2, or Bunny.net:

1. **Don't delete old videos yet** - Keep them accessible
2. **Switch to Vimeo** in Video Storage Settings
3. **Upload new videos** to Vimeo going forward
4. **Gradually migrate** old videos (within weekly limits)
5. **Update old lessons** to point to new Vimeo videos
6. **Delete old videos** after migration is complete

The platform supports multiple storage providers simultaneously, so you can have:
- Old videos on Cloudflare R2
- New videos on Vimeo
- Both working side-by-side

---

## Best Practices

### Video Optimization

1. **Resolution**: 720p is sufficient for most courses
2. **Bitrate**: 2-4 Mbps for 720p, 5-8 Mbps for 1080p
3. **Format**: MP4 with H.264 codec
4. **Audio**: AAC codec, 128-192 kbps

### Content Strategy

1. **Keep videos under 10 minutes** - Better engagement
2. **Break long content** into multiple lessons
3. **Use timestamps** in descriptions
4. **Add captions** for accessibility

### Security

1. **Videos are unlisted** - Not searchable on Vimeo
2. **Domain-level privacy** - Available on paid plans
3. **Password protection** - Available on paid plans
4. **Content ID** - Vimeo has copyright protection

---

## Upgrade Path

If you outgrow the free plan:

| Plan | Price | Storage | Features |
|------|-------|---------|----------|
| **Free** | $0/month | 2GB/week | Unlimited storage |
| **Plus** | $7/month | 250GB total | Remove Vimeo branding |
| **Pro** | $20/month | 1TB total | Advanced privacy, stats |
| **Business** | $50/month | 5TB total | Team collaboration |

For most educational platforms, the **free plan** is sufficient until you reach 100+ hours of content.

---

## API Limits

Vimeo API has these rate limits:

- **Authenticated**: 500 requests per 5 minutes
- **Unauthenticated**: 100 requests per 5 minutes

Your platform's normal usage won't hit these limits. Each video:
- **Upload**: 3-5 API calls
- **Playback**: 1 API call (cached after first load)
- **Deletion**: 1 API call

---

## Support

### Vimeo Support
- Help Center: [https://vimeo.com/help](https://vimeo.com/help)
- API Docs: [https://developer.vimeo.com/api/reference](https://developer.vimeo.com/api/reference)
- Community: [https://vimeo.com/forums](https://vimeo.com/forums)

### Platform Support
- Check browser console for error messages
- Review logs in Admin Dashboard
- Contact your platform administrator

---

## Summary

Vimeo integration is now fully configured in your platform. You can:

✅ Upload videos directly from Course Management
✅ Automatically embed videos with professional player
✅ Delete videos from both database and Vimeo
✅ Serve videos to learners with reliable streaming
✅ Grow your video library indefinitely (2GB/week)

Start uploading your course videos and leverage Vimeo's unlimited storage on the free plan!
