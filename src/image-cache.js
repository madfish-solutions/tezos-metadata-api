const crypto = require("crypto");
const sharp = require("sharp");
const dataUriToBuffer = require("data-uri-to-buffer");
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

  let buffer = await dataUriToBuffer(uri);
  if (buffer.type === "image/svg+xml") {
    try {
      buffer = await sharp(buffer).png().toBuffer();
      buffer.type = "image/png";
    } catch (err) {
      console.error("Failed to convert SVG to PNG", err);
      return getImgUriFallback(uri, 'FAILED_TO_PREPARE_IMAGE');
    }
  }

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const fileExtension = getSupportedExtensionFromMime(buffer.type);
  if (!fileExtension) {
    return getImgUriFallback(uri, 'UNSUPPORTED_EXTENSION');
  }

  const key = `${hash}.${fileExtension}`;

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
      })
    ); // check if the file already exists

    return getCdnUrl(key);
  } catch (err) {
    if (err.$metadata.httpStatusCode !== 404) {
      console.error("Cached image existance check failed", err);
    }
  }

  try {
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
  } catch (err) {
    console.error("Failed to upload image to S3", err);
    return getImgUriFallback(uri, 'FAILED_TO_CREATE_LINK');
  }

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
  }
}

function getCdnUrl(key) {
  return `${config.s3CdnUrl}/${key}`;
}

function getImgUriFallback(uri, fallback) {
  return uri.length > 100 ? fallback : uri;
}

module.exports = { getOrUpdateCachedImage };
