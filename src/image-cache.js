const crypto = require("crypto");
const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const config = require("./config");

const client = new S3Client({
  endpoint: config.s3Endpoint,
  forcePathStyle: false,
  region: config.s3Region,
  credentials: {
    accessKeyId: config.s3AccessKeyId,
    secretAccessKey: config.s3SecretAccessKey,
  },
});

async function getOrUpdateCachedImage(uri, tag) {
  if (!isDataUri(uri)) {
    return uri;
  }

  const dataUriToBuffer = (await import("data-uri-to-buffer")).default;
  const buffer = await dataUriToBuffer(uri);
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const fileExtension = getSupportedExtensionFromMime(buffer.type);
  const key = `${hash}.${fileExtension}`;

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
      })
    ); // check if the file already exists

    return getCdnUrl(key);
  } catch (err) {}

  await client.send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: buffer.type,
      ACL: "public-read",
      Tagging: `tag=${tag}`,
    })
  );

  return getCdnUrl(key);
}

function isDataUri(dataUri) {
  return /^data:/i.test(dataUri);
}

function getSupportedExtensionFromMime(mimeType) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      throw new Error(
        `Cannot retrieve file extension from mime type ${mimeType}`
      );
  }
}

function getCdnUrl(key) {
  return `${config.s3CdnUrl}/${key}`;
}

module.exports = { getOrUpdateCachedImage };
