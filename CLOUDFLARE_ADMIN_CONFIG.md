# Cloudflare R2 Configuration Guide

## Admin Panel Configuration

The admin can configure Cloudflare R2 storage directly from the Admin Dashboard → Video Storage Settings panel.

### Required Fields

When selecting **Cloudflare R2** as the active storage provider, the following fields need to be configured:

#### 1. Worker URL (Required) ⭐
- **Field**: `Worker URL`
- **Example**: `https://course-videos.workers.dev`
- **Purpose**: The deployed Cloudflare Worker endpoint that handles video uploads
- **How to get**: After deploying your Worker (see `CLOUDFLARE_WORKER_SETUP.md`), copy the URL from the deployment output

#### 2. Account ID
- **Field**: `Account ID`
- **Example**: `685378d8d4914f935103641ce2025ea7`
- **Purpose**: Your Cloudflare account identifier
- **How to get**: Cloudflare Dashboard → R2 → Overview → Account ID

#### 3. Access Key ID
- **Field**: `Access Key ID`
- **Example**: `d04a576e7467cc8465794c9278049249`
- **Purpose**: Used by the Worker to authenticate with R2
- **How to get**: Cloudflare Dashboard → R2 → Manage R2 API Tokens → Create API Token

#### 4. Secret Access Key
- **Field**: `Secret Access Key`
- **Example**: `b9a47f2635a11be9138cc6e806578045ee154f4d5a2bc4b11cdbc0abd1ed3c53`
- **Purpose**: Secret key for R2 authentication (stored securely)
- **How to get**: Shown once when creating the R2 API Token (copy and save immediately)

#### 5. Bucket Name
- **Field**: `Bucket Name`
- **Example**: `course-videos`
- **Purpose**: The R2 bucket where videos will be stored
- **How to get**: Cloudflare Dashboard → R2 → Create/Select Bucket

## Configuration Flow

### Step 1: Deploy the Cloudflare Worker
1. Follow instructions in `CLOUDFLARE_WORKER_SETUP.md`
2. Deploy the Worker: `wrangler deploy --env development`
3. Copy the Worker URL from deployment output

### Step 2: Create R2 API Credentials
1. Go to Cloudflare Dashboard → R2
2. Click "Manage R2 API Tokens"
3. Click "Create API Token"
4. Select permissions: **Admin Read & Write**
5. Copy the:
   - Access Key ID
   - Secret Access Key (save immediately - shown only once!)

### Step 3: Configure in Admin Panel
1. Log in to Admin Dashboard
2. Navigate to **Settings → Video Storage**
3. Select **Cloudflare R2** provider
4. Fill in all fields:
   - Worker URL (from Step 1)
   - Account ID
   - Access Key ID (from Step 2)
   - Secret Access Key (from Step 2)
   - Bucket Name
5. Click **Save Settings**

### Step 4: Test Upload
1. Go to **Courses → Course Management**
2. Create or edit a course
3. Add a lesson with video
4. Upload a test video file
5. Monitor upload progress
6. Verify video appears in Cloudflare R2 bucket

## How It Works

```
Browser Upload Request
         ↓
Admin Config (Worker URL)
         ↓
Cloudflare Worker
         ↓
Chunked Upload (50MB chunks)
         ↓
Cloudflare R2 Bucket
         ↓
Video Available for Playback
```

### Benefits of Using the Worker

1. **No CORS Issues**: Worker handles CORS headers automatically
2. **Large File Support**: Chunked uploads support files up to 5GB
3. **Progress Tracking**: Real-time upload progress (0-100%)
4. **Resumable**: Can resume failed uploads
5. **Secure**: Credentials never exposed to browser
6. **Fast**: Global edge deployment

## Database Schema

The configuration is stored in the `tbl_video_storage_settings` table:

```sql
- tvss_cloudflare_worker_url (text)      -- Worker URL endpoint
- tvss_cloudflare_account_id (text)      -- Cloudflare Account ID
- tvss_cloudflare_access_key (text)      -- R2 Access Key ID
- tvss_cloudflare_secret_key (text)      -- R2 Secret Access Key
- tvss_cloudflare_bucket (text)          -- R2 Bucket Name
- tvss_active_provider (text)            -- 'cloudflare' when active
```

## Security Notes

1. **Worker URL is public** - It's okay to expose (has CORS protection)
2. **R2 credentials are server-side** - Stored in database, used by Worker only
3. **Credentials never reach browser** - Worker authenticates with R2
4. **HTTPS required** - All communication uses encrypted HTTPS

## Troubleshooting

### Error: "Cloudflare Worker URL not configured"
- **Solution**: Go to Admin → Video Storage Settings and set the Worker URL

### Error: "Failed to initiate upload"
- **Check**: Worker URL is correct and accessible
- **Check**: Worker is deployed and running
- **Check**: CORS is configured in Worker (should be automatic)

### Error: "Chunk upload failed"
- **Check**: R2 credentials (Access Key, Secret Key) are correct
- **Check**: Bucket name matches the one in Cloudflare
- **Check**: R2 API Token has Read & Write permissions

### Upload is very slow
- **Check**: File size (recommend < 2GB for best experience)
- **Check**: Internet connection speed
- **Info**: Large files are chunked (50MB each) for reliability

## Cost Comparison

### Cloudflare R2 Pricing
- **Free Tier**: 10GB storage per month
- **Storage**: $0.015/GB/month (after free tier)
- **Class A Operations** (uploads): $4.50 per million requests
- **Class B Operations** (downloads): $0.36 per million requests
- **Egress**: **FREE** (no bandwidth charges)

### Example Monthly Cost
- 100GB video storage: $1.35/month
- 10,000 uploads: $0.045
- 100,000 views: $0.036
- **Total**: ~$1.50/month for 100GB + lots of traffic

Compare to:
- Supabase: $25/month for 100GB
- AWS S3: $2.30/month + egress fees
- Bunny.net: $1/month + $0.50 for bandwidth

## Migration from Other Providers

If switching from Supabase or Bunny.net to Cloudflare:

1. New uploads automatically use Cloudflare
2. Existing videos remain on old provider
3. Old videos continue to work normally
4. Optionally migrate old videos using migration tool (future feature)

## Support

For issues:
- Check Worker logs: `wrangler tail`
- Check browser console for client errors
- Verify all credentials in Admin Panel
- Test Worker endpoint directly: `curl https://your-worker-url/status`
