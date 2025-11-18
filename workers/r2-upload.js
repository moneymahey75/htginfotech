// Cloudflare Worker for R2 Video Uploads with CORS support

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Upload-ID, X-Chunk-Index, X-Total-Chunks',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      // POST /upload - Initiate upload
      if (pathname === '/upload' && request.method === 'POST') {
        const body = await request.json();
        const { fileName, courseId, contentType } = body;

        if (!fileName || !courseId) {
          return jsonResponse(
            { error: 'Missing required fields: fileName, courseId' },
            400,
            corsHeaders
          );
        }

        const uploadId = crypto.randomUUID();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const objectKey = `courses/${courseId}/${Date.now()}_${sanitizedFileName}`;

        const metadata = {
          uploadId,
          objectKey,
          fileName: sanitizedFileName,
          courseId,
          contentType: contentType || 'video/mp4',
          uploadedAt: new Date().toISOString(),
        };

        // Store metadata in R2
        await env.COURSE_VIDEOS.put(
          `.uploads/${uploadId}.json`,
          JSON.stringify(metadata),
          {
            httpMetadata: { contentType: 'application/json' },
            customMetadata: { 'upload-id': uploadId },
          }
        );

        return jsonResponse(
          {
            success: true,
            uploadId,
            objectKey,
            chunkSize: 50 * 1024 * 1024,
            message: 'Upload initiated',
          },
          200,
          corsHeaders
        );
      }

      // PUT /chunk - Upload chunk
      if (pathname === '/chunk' && request.method === 'PUT') {
        const uploadId = request.headers.get('X-Upload-ID');
        const chunkIndex = request.headers.get('X-Chunk-Index');
        const totalChunks = request.headers.get('X-Total-Chunks');

        if (!uploadId || chunkIndex === null) {
          return jsonResponse(
            { error: 'Missing upload tracking headers' },
            400,
            corsHeaders
          );
        }

        const chunkNumber = parseInt(chunkIndex);
        const body = await request.arrayBuffer();

        // Store chunk
        const chunkPath = `.uploads/${uploadId}/chunk_${chunkNumber}`;
        await env.COURSE_VIDEOS.put(chunkPath, body, {
          customMetadata: {
            'upload-id': uploadId,
            'chunk-index': chunkNumber.toString(),
            'total-chunks': totalChunks || '0',
          },
        });

        return jsonResponse(
          {
            success: true,
            uploadId,
            nextChunk: chunkNumber + 1,
            message: `Chunk ${chunkNumber + 1} received`,
          },
          200,
          corsHeaders
        );
      }

      // POST /complete - Complete upload
      if (pathname === '/complete' && request.method === 'POST') {
        const body = await request.json();
        const { uploadId, totalChunks } = body;

        if (!uploadId || !totalChunks) {
          return jsonResponse(
            { error: 'Missing required fields' },
            400,
            corsHeaders
          );
        }

        // Retrieve metadata
        const metadataObj = await env.COURSE_VIDEOS.get(`.uploads/${uploadId}.json`);
        if (!metadataObj) {
          return jsonResponse(
            { error: 'Upload not found' },
            404,
            corsHeaders
          );
        }

        const metadata = JSON.parse(await metadataObj.text());

        // Combine chunks
        const chunks = [];
        for (let i = 0; i < totalChunks; i++) {
          const chunkObj = await env.COURSE_VIDEOS.get(`.uploads/${uploadId}/chunk_${i}`);
          if (chunkObj) {
            chunks.push(new Uint8Array(await chunkObj.arrayBuffer()));
          }
        }

        // Merge chunks
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const merged = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }

        // Upload final file
        await env.COURSE_VIDEOS.put(metadata.objectKey, merged, {
          httpMetadata: { contentType: metadata.contentType },
          customMetadata: {
            'course-id': metadata.courseId,
            'uploaded-at': metadata.uploadedAt,
          },
        });

        // Clean up
        for (let i = 0; i < totalChunks; i++) {
          await env.COURSE_VIDEOS.delete(`.uploads/${uploadId}/chunk_${i}`);
        }
        await env.COURSE_VIDEOS.delete(`.uploads/${uploadId}.json`);

        // Generate public URL
        const publicUrl = `https://pub-f8e6dfe236904fce9b86296eaf9cb927.r2.dev/${metadata.objectKey}`;

        return jsonResponse(
          {
            success: true,
            uploadId,
            url: publicUrl,
            objectKey: metadata.objectKey,
            message: 'Upload completed successfully',
          },
          200,
          corsHeaders
        );
      }

      // GET /status/:uploadId - Check status
      if (pathname.startsWith('/status/') && request.method === 'GET') {
        const uploadId = pathname.split('/status/')[1];
        const metadataObj = await env.COURSE_VIDEOS.get(`.uploads/${uploadId}.json`);

        if (!metadataObj) {
          return jsonResponse(
            { error: 'Upload not found' },
            404,
            corsHeaders
          );
        }

        const metadata = JSON.parse(await metadataObj.text());
        return jsonResponse(metadata, 200, corsHeaders);
      }

      // DELETE /cancel/:uploadId - Cancel upload
      if (pathname.startsWith('/cancel/') && request.method === 'DELETE') {
        const uploadId = pathname.split('/cancel/')[1];

        // Delete chunks and metadata
        for (let i = 0; i < 1000; i++) {
          await env.COURSE_VIDEOS.delete(`.uploads/${uploadId}/chunk_${i}`);
        }
        await env.COURSE_VIDEOS.delete(`.uploads/${uploadId}.json`);

        return jsonResponse(
          { success: true, message: 'Upload cancelled' },
          200,
          corsHeaders
        );
      }

      return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse(
        { error: error.message || 'Internal server error' },
        500,
        corsHeaders
      );
    }
  },
};

function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
