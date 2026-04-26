const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

let _client = null;
function getClient() {
  if (_client) return _client;
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  _client = new S3Client({
    endpoint: endpoint,
    region: process.env.S3_REGION || 'ru-1',
    credentials: { accessKeyId: accessKeyId, secretAccessKey: secretAccessKey },
    forcePathStyle: true,
  });
  return _client;
}

function isEnabled() {
  return !!(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
}

async function putObject(key, body, contentType) {
  contentType = contentType || 'image/webp';
  const client = getClient();
  if (!client) throw new Error('S3 not configured');
  const bucket = process.env.S3_BUCKET;
  // ACL не задаём — у Timeweb S3 он не поддерживается, бакет настраивается публичным в панели
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=2592000',
  }));
  const endpoint = process.env.S3_ENDPOINT.replace(/\/$/, '');
  // key безопасный (latin/digits/dots/dashes/slashes), encode не нужен
  return endpoint + '/' + bucket + '/' + key;
}

module.exports = { isEnabled: isEnabled, putObject: putObject };
