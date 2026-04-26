/**
 * S3-загрузчик (совместим с Timeweb S3 / любой S3-API).
 */
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

let _client = null;
function getClient() {
  if (_client) return _client;
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  _client = new S3Client({
    endpoint,
    region: process.env.S3_REGION || 'ru-1',
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return _client;
}

function isEnabled() {
  return !!(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
}

async function putObject(key, body, contentType = 'image/webp') {
  const client = getClient();
  if (!client) throw new Error('S3 не настроен');
  const bucket = process.env.S3_BUCKET;
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    ACL: 'public-read',
    CacheControl: 'public, max-age=2592000',
  }));
  // Публичный URL для бакета Timeweb: https://s3.twcstorage.ru/<bucket>/<key>
  const endpoint = process.env.S3_ENDPOINT.replace(/\/$/, '');
  return `${endpoint}/${bucket}/${encodeURIComponent(key)}`;
}

module.exports = { isEnabled, putObject };
