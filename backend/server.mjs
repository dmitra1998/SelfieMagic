import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION;
const bucket = process.env.S3_BUCKET;
const port = Number(process.env.PORT ?? 3001);

if (!region || !bucket) {
  throw new Error("AWS_REGION and S3_BUCKET are required.");
}

const s3 = new S3Client({
  region,
  endpoint: process.env.AWS_ENDPOINT_URL,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
});

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) {
      throw new Error("Request body is too large.");
    }
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function requireString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} is required.`);
  }
  return value;
}

function validateVideoId(value) {
  const videoId = requireString(value, "videoId");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(videoId)) {
    throw new Error("videoId must be a UUID v4.");
  }
  return videoId;
}

function workerNamespace(workerId) {
  return createHash("sha256").update(workerId).digest("hex").slice(0, 32);
}

function objectKey(workerId, videoId) {
  return `workers/${workerNamespace(workerId)}/videos/${videoId}.mp4`;
}

function normalizeEtag(value) {
  return typeof value === "string" ? value.replaceAll('"', "") : null;
}

async function findExistingObject(key) {
  try {
    return await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound" || error?.name === "NoSuchKey") {
      return null;
    }
    throw error;
  }
}

async function createPresignedUpload(body, idempotencyKey) {
  const videoId = validateVideoId(body.videoId);
  const workerId = requireString(body.workerId, "workerId");
  const fileSizeBytes = Number(body.fileSizeBytes);

  if (idempotencyKey !== videoId) {
    throw new Error("Idempotency-Key must match videoId.");
  }

  if (!Number.isSafeInteger(fileSizeBytes) || fileSizeBytes <= 0) {
    throw new Error("fileSizeBytes must be a positive integer.");
  }

  const key = objectKey(workerId, videoId);
  const existingObject = await findExistingObject(key);

  if (existingObject) {
    if (existingObject.ContentLength !== fileSizeBytes) {
      throw new Error("An object already exists for this video_id with a different file size.");
    }

    return {
      uploadUrl: null,
      objectKey: key,
      alreadyUploaded: true,
      etag: normalizeEtag(existingObject.ETag),
    };
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: "video/mp4",
  });

  return {
    uploadUrl: await getSignedUrl(s3, command, { expiresIn: 15 * 60 }),
    objectKey: key,
    alreadyUploaded: false,
    etag: null,
    headers: { "Content-Type": "video/mp4" },
  };
}

async function confirmUploadedObject(body, idempotencyKey) {
  const videoId = validateVideoId(body.videoId);
  const workerId = requireString(body.workerId, "workerId");
  const expectedKey = objectKey(workerId, videoId);
  const fileSizeBytes = Number(body.fileSizeBytes);

  if (idempotencyKey !== videoId || body.objectKey !== expectedKey) {
    throw new Error("Upload identity does not match the scoped object key.");
  }

  const object = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: expectedKey }));
  if (object.ContentLength !== fileSizeBytes) {
    throw new Error(`Uploaded object size is ${object.ContentLength}; expected ${fileSizeBytes}.`);
  }

  const clientEtag = normalizeEtag(body.etag);
  const storedEtag = normalizeEtag(object.ETag);
  if (clientEtag && storedEtag && clientEtag !== storedEtag) {
    throw new Error("Uploaded object ETag does not match the PUT response.");
  }

  return { confirmed: true, videoId, objectKey: expectedKey, etag: storedEtag };
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  try {
    if (request.method !== "POST") {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    const body = await readJson(request);
    const idempotencyKey = request.headers["idempotency-key"];

    if (request.url === "/uploads/presign") {
      sendJson(response, 200, await createPresignedUpload(body, idempotencyKey));
      return;
    }

    if (request.url === "/uploads/confirm") {
      sendJson(response, 200, await confirmUploadedObject(body, idempotencyKey));
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    console.error(error);
    sendJson(response, 400, { error: message });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Upload API listening on http://0.0.0.0:${port}`);
});
