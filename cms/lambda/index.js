const crypto = require("node:crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const ssm = new SSMClient({});

const env = {
  siteId: process.env.CMS_SITE_ID || "anchor-web-co",
  tableName: process.env.CMS_POSTS_TABLE,
  mediaBucket: process.env.CMS_MEDIA_BUCKET,
  username: process.env.CMS_USERNAME || "anchor",
  passwordHash: process.env.CMS_PASSWORD_HASH,
  sessionSecret: process.env.CMS_SESSION_SECRET,
  githubTokenParameter: process.env.GITHUB_TOKEN_PARAMETER,
};

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event.body) return {};
  return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;
  const candidate = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", env.sessionSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifySession(token) {
  if (!token || !env.sessionSecret) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;
  const expected = crypto.createHmac("sha256", env.sessionSecret).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  return payload.exp > Math.floor(Date.now() / 1000) && payload.siteId === env.siteId;
}

function getCookie(event, name) {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || "";
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function requireAuth(event) {
  if (!verifySession(getCookie(event, "anchor_cms_session"))) {
    return json(401, { error: "Unauthorized" });
  }
  return null;
}

function normalizePost(input) {
  const slug = String(input.slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");

  if (!slug || !input.title) {
    throw new Error("Post title and slug are required.");
  }

  return {
    siteId: env.siteId,
    slug,
    title: String(input.title),
    date: String(input.date || new Date().toISOString().slice(0, 10)),
    status: input.status === "published" ? "published" : "draft",
    description: String(input.description || ""),
    seoTitle: String(input.seoTitle || input.title),
    seoDescription: String(input.seoDescription || input.description || ""),
    featuredImage: String(input.featuredImage || ""),
    body: String(input.body || ""),
    updatedAt: new Date().toISOString(),
  };
}

async function login(event) {
  const body = parseBody(event);
  if (body.username !== env.username || !verifyPassword(body.password, env.passwordHash)) {
    return json(401, { error: "Invalid login." });
  }

  const token = signSession({
    siteId: env.siteId,
    sub: env.username,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  });

  return json(
    200,
    { ok: true },
    {
      "set-cookie": `anchor_cms_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`,
    },
  );
}

async function listPosts() {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: env.tableName,
      KeyConditionExpression: "siteId = :siteId",
      ExpressionAttributeValues: {
        ":siteId": env.siteId,
      },
    }),
  );

  const posts = (result.Items || []).sort((left, right) => new Date(right.date) - new Date(left.date));
  return json(200, { posts });
}

async function upsertPost(event, slug) {
  const post = normalizePost({ ...parseBody(event), slug });
  await dynamo.send(
    new PutCommand({
      TableName: env.tableName,
      Item: post,
    }),
  );
  return json(200, { post });
}

async function deletePost(slug) {
  await dynamo.send(
    new DeleteCommand({
      TableName: env.tableName,
      Key: {
        siteId: env.siteId,
        slug,
      },
    }),
  );
  return json(200, { ok: true });
}

async function signUpload(event) {
  const body = parseBody(event);
  const filename = String(body.filename || "upload").replace(/[^a-zA-Z0-9._-]/g, "-");
  const contentType = String(body.contentType || "application/octet-stream");
  const key = `${env.siteId}/blog/${Date.now()}-${filename}`;
  const command = new PutObjectCommand({
    Bucket: env.mediaBucket,
    Key: key,
    ContentType: contentType,
  });

  return json(200, {
    key,
    uploadUrl: await getSignedUrl(s3, command, { expiresIn: 300 }),
    publicUrl: `/images/blog/${key.split("/").pop()}`,
  });
}

async function getSecureParameter(name) {
  const result = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
  return result.Parameter?.Value || "";
}

async function triggerDeploy() {
  if (!process.env.GITHUB_OWNER || !process.env.GITHUB_REPO || !process.env.GITHUB_WORKFLOW || !env.githubTokenParameter) {
    return json(501, { error: "Deploy trigger is not configured." });
  }

  const token = await getSecureParameter(env.githubTokenParameter);
  const url = `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/workflows/${process.env.GITHUB_WORKFLOW}/dispatches`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "anchor-blog-manager",
    },
    body: JSON.stringify({ ref: "main" }),
  });

  if (!response.ok) {
    return json(502, { error: "GitHub deploy trigger failed.", status: response.status });
  }

  return json(200, { ok: true });
}

exports.handler = async function handler(event) {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod;
    const path = event.rawPath || event.path || "/";

    if (method === "POST" && path.endsWith("/auth/login")) {
      return login(event);
    }

    const authError = requireAuth(event);
    if (authError) return authError;

    if (method === "GET" && path.endsWith("/posts")) {
      return listPosts();
    }

    const postMatch = path.match(/\/posts\/([^/]+)$/);
    if (method === "PUT" && postMatch) {
      return upsertPost(event, decodeURIComponent(postMatch[1]));
    }

    if (method === "DELETE" && postMatch) {
      return deletePost(decodeURIComponent(postMatch[1]));
    }

    if (method === "POST" && path.endsWith("/uploads/sign")) {
      return signUpload(event);
    }

    if (method === "POST" && path.endsWith("/deploy")) {
      return triggerDeploy();
    }

    return json(404, { error: "Not found." });
  } catch (error) {
    console.error(error);
    return json(500, { error: error.message || "Unexpected error." });
  }
};

exports.hashPasswordForSetup = function hashPasswordForSetup(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${hashPassword(password, salt)}`;
};
