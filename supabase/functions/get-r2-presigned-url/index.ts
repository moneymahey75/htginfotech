import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.551.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.551.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PresignedUrlRequest {
  fileName: string;
  courseId: string;
  contentType: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    const bucketName = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME');
    const publicUrl = Deno.env.get('CLOUDFLARE_R2_PUBLIC_URL');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
      console.error('Missing Cloudflare R2 configuration');
      return new Response(
        JSON.stringify({
          error: 'Cloudflare R2 is not properly configured',
          details: 'Missing required environment variables',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { fileName, courseId, contentType }: PresignedUrlRequest = await req.json();

    if (!fileName || !courseId || !contentType) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'fileName, courseId, and contentType are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const objectKey = `courses/${courseId}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    const publicFileUrl = `${publicUrl}/${objectKey}`;

    return new Response(
      JSON.stringify({
        success: true,
        presignedUrl,
        objectKey,
        publicUrl: publicFileUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating presigned URL:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate presigned URL',
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
