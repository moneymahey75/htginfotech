import { supabase } from './supabase';

export type StorageProvider = 'supabase' | 'cloudflare' | 'bunny';

export interface StorageSettings {
  activeProvider: StorageProvider;
  supabaseBucket: string;
  cloudflareAccountId?: string;
  cloudflareAccessKey?: string;
  cloudflareSecretKey?: string;
  cloudflareBucket?: string;
  cloudflareWorkerUrl?: string;
  cloudflarePublicUrl?: string;
  cloudflareStreamEnabled?: boolean;
  bunnyApiKey?: string;
  bunnyStorageZone?: string;
  bunnyCdnUrl?: string;
  bunnyStreamLibraryId?: string;
  signedUrlExpiry: number;
  maxFileSizeMB: number;
  autoCompress: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class VideoStorageService {
  private settingsCache: StorageSettings | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getSettings(): Promise<StorageSettings> {
    const now = Date.now();
    if (this.settingsCache && (now - this.cacheTime) < this.CACHE_DURATION) {
      return this.settingsCache;
    }

    const { data, error } = await supabase
      .from('tbl_video_storage_settings')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching storage settings:', error);
      throw new Error('Failed to load storage settings');
    }

    this.settingsCache = {
      activeProvider: data.tvss_active_provider as StorageProvider,
      supabaseBucket: data.tvss_supabase_bucket,
      cloudflareAccountId: data.tvss_cloudflare_account_id,
      cloudflareAccessKey: data.tvss_cloudflare_access_key,
      cloudflareSecretKey: data.tvss_cloudflare_secret_key,
      cloudflareBucket: data.tvss_cloudflare_bucket,
      cloudflareWorkerUrl: data.tvss_cloudflare_worker_url,
      cloudflarePublicUrl: data.tvss_cloudflare_public_url,
      cloudflareStreamEnabled: data.tvss_cloudflare_stream_enabled,
      bunnyApiKey: data.tvss_bunny_api_key,
      bunnyStorageZone: data.tvss_bunny_storage_zone,
      bunnyCdnUrl: data.tvss_bunny_cdn_url,
      bunnyStreamLibraryId: data.tvss_bunny_stream_library_id,
      signedUrlExpiry: data.tvss_signed_url_expiry_seconds,
      maxFileSizeMB: data.tvss_max_file_size_mb,
      autoCompress: data.tvss_auto_compress,
    };

    this.cacheTime = now;
    return this.settingsCache;
  }

  clearCache() {
    this.settingsCache = null;
    this.cacheTime = 0;
  }

  async uploadVideo(
    file: File,
    courseId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ storagePath: string; provider: StorageProvider; fileSize: number }> {
    const settings = await this.getSettings();

    if (file.size > settings.maxFileSizeMB * 1024 * 1024) {
      throw new Error(`File size exceeds maximum allowed size of ${settings.maxFileSizeMB}MB`);
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `courses/${courseId}/${timestamp}_${sanitizedFileName}`;

    let actualStoragePath = storagePath;

    switch (settings.activeProvider) {
      case 'supabase':
        await this.uploadToSupabase(file, storagePath, settings, onProgress);
        break;
      case 'cloudflare':
        actualStoragePath = await this.uploadToCloudflare(file, storagePath, settings, onProgress);
        break;
      case 'bunny':
        await this.uploadToBunny(file, storagePath, settings, onProgress);
        break;
      default:
        throw new Error('Invalid storage provider');
    }

    return {
      storagePath: actualStoragePath,
      provider: settings.activeProvider,
      fileSize: file.size,
    };
  }

  private async uploadToSupabase(
    file: File,
    path: string,
    settings: StorageSettings,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    const CHUNK_SIZE = 50 * 1024 * 1024;

    if (file.size > CHUNK_SIZE) {
      await this.uploadToSupabaseChunked(file, path, settings, onProgress);
    } else {
      const { error } = await supabase.storage
        .from(settings.supabaseBucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw new Error(`Supabase upload failed: ${error.message}`);

      if (onProgress) {
        onProgress({ loaded: file.size, total: file.size, percentage: 100 });
      }
    }
  }

  private async uploadToSupabaseChunked(
    file: File,
    path: string,
    settings: StorageSettings,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    const CHUNK_SIZE = 6 * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadedBytes = 0;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const uploadUrl = `${supabaseUrl}/storage/v1/object/${settings.supabaseBucket}/${path}`;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const contentRange = `bytes ${start}-${end - 1}/${file.size}`;

      const response = await fetch(uploadUrl, {
        method: chunkIndex === 0 ? 'POST' : 'PUT',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': file.type || 'application/octet-stream',
          'Content-Range': contentRange,
          'x-upsert': 'false',
        },
        body: chunk,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chunk upload failed: ${errorText}`);
      }

      uploadedBytes += chunk.size;

      if (onProgress) {
        onProgress({
          loaded: uploadedBytes,
          total: file.size,
          percentage: Math.round((uploadedBytes / file.size) * 100),
        });
      }
    }
  }

  private async uploadToCloudflare(
    file: File,
    path: string,
    settings: StorageSettings,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    if (!settings.cloudflareWorkerUrl) {
      throw new Error('Cloudflare Worker URL not configured. Please configure it in Admin → Video Storage Settings.');
    }

    const courseId = path.split('/')[1];
    const CHUNK_SIZE = 50 * 1024 * 1024;

    try {
      const initiateResponse = await fetch(
        `${settings.cloudflareWorkerUrl}/upload`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            courseId,
            contentType: file.type || 'video/mp4',
            storagePath: path,
          }),
        }
      );

      if (!initiateResponse.ok) {
        throw new Error(`Failed to initiate upload: ${initiateResponse.statusText}`);
      }

      const uploadData = await initiateResponse.json();
      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Failed to initiate upload');
      }

      const uploadId = uploadData.uploadId;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      let uploadedBytes = 0;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const chunkResponse = await fetch(
          `${settings.cloudflareWorkerUrl}/chunk`,
          {
            method: 'PUT',
            headers: {
              'X-Upload-ID': uploadId,
              'X-Chunk-Index': i.toString(),
              'X-Total-Chunks': totalChunks.toString(),
              'Content-Type': file.type || 'application/octet-stream',
            },
            body: chunk,
          }
        );

        if (!chunkResponse.ok) {
          throw new Error(`Chunk ${i} upload failed: ${chunkResponse.statusText}`);
        }

        uploadedBytes += chunk.size;

        if (onProgress) {
          onProgress({
            loaded: uploadedBytes,
            total: file.size,
            percentage: Math.round((uploadedBytes / file.size) * 100),
          });
        }
      }

      const completeResponse = await fetch(
        `${settings.cloudflareWorkerUrl}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId,
            totalChunks,
          }),
        }
      );

      if (!completeResponse.ok) {
        throw new Error(`Failed to complete upload: ${completeResponse.statusText}`);
      }

      const completeData = await completeResponse.json();
      if (!completeData.success) {
        throw new Error(completeData.error || 'Failed to complete upload');
      }

      if (onProgress) {
        onProgress({ loaded: file.size, total: file.size, percentage: 100 });
      }

      return completeData.objectKey || path;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Cloudflare upload failed');
    }
  }

  private async uploadToBunny(
    file: File,
    path: string,
    settings: StorageSettings,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    if (!settings.bunnyApiKey || !settings.bunnyStorageZone) {
      throw new Error('Bunny.net not configured. Please add Storage Zone Password and Storage Zone Name in Video Storage Settings.');
    }

    const apiKey = settings.bunnyApiKey.trim();
    const storageZone = settings.bunnyStorageZone.trim();

    if (!apiKey) {
      throw new Error('Bunny.net Storage Zone Password is empty. Please check your Video Storage Settings.');
    }

    const url = `https://storage.bunnycdn.com/${storageZone}/${path}`;

    console.log('Bunny.net Upload Request:', {
      url,
      storageZone,
      path,
      fileSize: file.size,
      fileName: file.name,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length
    });

    const response = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'AccessKey': apiKey,
        'Content-Type': 'application/octet-stream',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error('Bunny.net Upload Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        url
      });

      if (response.status === 401) {
        throw new Error(
          'Bunny.net Authentication Failed (401): Invalid Storage Zone Password. ' +
          'Please verify your password in Video Storage Settings. ' +
          'Find it in: Bunny Dashboard → Storage → Your Zone → FTP & API Access → Password'
        );
      }

      throw new Error(`Bunny.net upload failed (${response.status}): ${response.statusText}. ${errorText}`);
    }

    if (onProgress) {
      onProgress({ loaded: file.size, total: file.size, percentage: 100 });
    }
  }

  async getSignedUrl(contentId: string): Promise<string> {
    const { data: content, error } = await supabase
      .from('tbl_course_content')
      .select('tcc_storage_provider, tcc_storage_path, tcc_content_url')
      .eq('tcc_id', contentId)
      .single();

    if (error) throw error;

    // If it's an external URL, return it directly
    if (content.tcc_storage_provider === 'external' && content.tcc_content_url) {
      return content.tcc_content_url;
    }

    if (!content.tcc_storage_path) {
      throw new Error('Video storage path not found');
    }

    const settings = await this.getSettings();

    switch (content.tcc_storage_provider) {
      case 'supabase':
        return this.getSupabaseSignedUrl(content.tcc_storage_path, settings);
      case 'cloudflare':
        return this.getCloudflareSignedUrl(content.tcc_storage_path, settings);
      case 'bunny':
        return this.getBunnySignedUrl(content.tcc_storage_path, settings);
      default:
        throw new Error('Invalid storage provider');
    }
  }

  private async getSupabaseSignedUrl(path: string, settings: StorageSettings): Promise<string> {
    const { data, error } = await supabase.storage
      .from(settings.supabaseBucket)
      .createSignedUrl(path, settings.signedUrlExpiry);

    if (error) throw error;
    return data.signedUrl;
  }

  private async getCloudflareSignedUrl(path: string, settings: StorageSettings): Promise<string> {
    // Use R2 public URL if configured
    if (settings.cloudflarePublicUrl) {
      return `${settings.cloudflarePublicUrl}/${path}`;
    }

    // Fallback: try to get from Worker if available
    if (settings.cloudflareWorkerUrl) {
      try {
        const response = await fetch(
          `${settings.cloudflareWorkerUrl}/get-url`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objectKey: path }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.url) return data.url;
        }
      } catch (err) {
        console.error('Failed to get URL from Worker:', err);
      }
    }

    // Last fallback: construct URL (may not work without proper config)
    throw new Error('Cloudflare R2 public URL not configured. Please set it in Video Storage Settings.');
  }

  private async getBunnySignedUrl(path: string, settings: StorageSettings): Promise<string> {
    if (!settings.bunnyCdnUrl) {
      throw new Error('Bunny CDN URL not configured');
    }

    // Bunny.net signed URL with token
    const expiresAt = Math.floor(Date.now() / 1000) + settings.signedUrlExpiry;
    const token = btoa(`${settings.bunnyApiKey}:${expiresAt}`);
    return `${settings.bunnyCdnUrl}/${path}?token=${token}&expires=${expiresAt}`;
  }

  async deleteVideo(contentId: string): Promise<void> {
    const { data: content, error } = await supabase
      .from('tbl_course_content')
      .select('tcc_storage_provider, tcc_storage_path')
      .eq('tcc_id', contentId)
      .single();

    if (error) throw error;

    // Don't delete external URLs
    if (content.tcc_storage_provider === 'external') {
      console.log('Skipping deletion for external URL');
      return;
    }

    if (!content.tcc_storage_path) {
      console.log('No storage path found, skipping deletion');
      return;
    }

    console.log(`Deleting video from ${content.tcc_storage_provider}: ${content.tcc_storage_path}`);

    const settings = await this.getSettings();

    try {
      switch (content.tcc_storage_provider) {
        case 'supabase':
          await this.deleteFromSupabase(content.tcc_storage_path, settings);
          console.log('Successfully deleted from Supabase storage');
          break;
        case 'cloudflare':
          await this.deleteFromCloudflare(content.tcc_storage_path, settings);
          console.log('Successfully deleted from Cloudflare R2');
          break;
        case 'bunny':
          await this.deleteFromBunny(content.tcc_storage_path, settings);
          console.log('Successfully deleted from Bunny.net');
          break;
      }
    } catch (err) {
      console.error(`Error deleting video from ${content.tcc_storage_provider} storage:`, err);
      // Don't throw - still allow database deletion
    }
  }

  private async deleteFromSupabase(path: string, settings: StorageSettings): Promise<void> {
    const { error } = await supabase.storage
      .from(settings.supabaseBucket)
      .remove([path]);

    if (error) throw error;
  }

  private async deleteFromCloudflare(path: string, settings: StorageSettings): Promise<void> {
    if (!settings.cloudflareWorkerUrl) {
      throw new Error('Cloudflare Worker URL not configured. Cannot delete video.');
    }

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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to delete from Cloudflare R2: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete from Cloudflare R2');
    }
  }

  private async deleteFromBunny(path: string, settings: StorageSettings): Promise<void> {
    if (!settings.bunnyApiKey || !settings.bunnyStorageZone) {
      throw new Error('Bunny.net not configured');
    }

    const apiKey = settings.bunnyApiKey.trim();
    const storageZone = settings.bunnyStorageZone.trim();
    const url = `https://storage.bunnycdn.com/${storageZone}/${path}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'AccessKey': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      if (response.status === 401) {
        throw new Error('Bunny.net Authentication Failed: Invalid Storage Zone Password');
      }
      throw new Error(`Failed to delete from Bunny.net (${response.status}): ${response.statusText}`);
    }
  }

  async migrateVideo(
    contentId: string,
    targetProvider: StorageProvider
  ): Promise<void> {
    // Get current video
    const { data: content, error } = await supabase
      .from('tbl_course_content')
      .select('*')
      .eq('tcc_id', contentId)
      .single();

    if (error) throw error;

    if (content.tcc_storage_provider === 'external') {
      throw new Error('Cannot migrate external videos');
    }

    // Download from current provider
    const currentUrl = await this.getSignedUrl(contentId);
    const response = await fetch(currentUrl);
    const blob = await response.blob();
    const file = new File([blob], 'video' + this.getExtensionFromPath(content.tcc_storage_path), {
      type: blob.type,
    });

    // Upload to new provider
    const oldSettings = await this.getSettings();
    const oldProvider = oldSettings.activeProvider;

    // Temporarily change active provider
    this.settingsCache = { ...oldSettings, activeProvider: targetProvider };

    const { storagePath, provider } = await this.uploadVideo(file, content.tcc_course_id);

    // Update database
    await supabase
      .from('tbl_course_content')
      .update({
        tcc_storage_provider: provider,
        tcc_storage_path: storagePath,
      })
      .eq('tcc_id', contentId);

    // Delete from old provider
    this.settingsCache = { ...oldSettings, activeProvider: oldProvider };
    await this.deleteVideo(contentId);

    // Clear cache to reload settings
    this.clearCache();
  }

  private getExtensionFromPath(path: string): string {
    const match = path.match(/\.[^.]+$/);
    return match ? match[0] : '.mp4';
  }
}

export const videoStorage = new VideoStorageService();
