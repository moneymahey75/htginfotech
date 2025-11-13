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

// AWS Signature V4 signing
async function createPresignedUrl(
    endpoint: string,
    bucket: string,
    key: string,
    accessKeyId: string,
    secretAccessKey: string,
    contentType: string,
    expiresIn: number = 3600
): Promise<string> {
  const region = 'auto';
  const service = 's3';

  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  // Create canonical request
  const method = 'PUT';
  const canonicalUri = `/${key}`;
  const canonicalQueryString = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'content-type;host',
  }).toString();

  const host = new URL(endpoint).host;
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  // Create string to sign
  const encoder = new TextEncoder();
  const canonicalRequestHash = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(canonicalRequest)
  );
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    canonicalRequestHashHex,
  ].join('\n');

  // Calculate signature
  async function hmac(key: Uint8Array | string, data: string): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        typeof key === 'string' ? encoder.encode(key) : key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
    return new Uint8Array(signature);
  }

  let signingKey = await hmac(`AWS4${secretAccessKey}`, dateStamp);
  signingKey = await hmac(signingKey, region);
  signingKey = await hmac(signingKey, service);
  signingKey = await hmac(signingKey, 'aws4_request');

  const signature = await hmac(signingKey, stringToSign);
  const signatureHex = Array.from(signature)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

  // Build final URL
  const url = new URL(`${endpoint}/${bucket}/${key}`);
  url.search = canonicalQueryString + `&X-Amz-Signature=${signatureHex}`;

  return url.toString();
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

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const objectKey = `courses/${courseId}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const presignedUrl = await createPresignedUrl(
        endpoint,
        bucketName,
        objectKey,
        accessKeyId,
        secretAccessKey,
        contentType,
        3600
    );

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