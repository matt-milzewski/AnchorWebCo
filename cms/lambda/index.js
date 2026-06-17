const crypto = require("node:crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const ssm = new SSMClient({});

const env = {
  tableName: process.env.CMS_POSTS_TABLE,
  mediaBucket: process.env.CMS_MEDIA_BUCKET,
  sessionSecret: process.env.CMS_SESSION_SECRET,
  sitesConfigParameter: process.env.CMS_SITES_CONFIG_PARAMETER,
  allowedOrigins: (process.env.CMS_ALLOWED_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean),
  githubTokenParameter: process.env.GITHUB_TOKEN_PARAMETER,
  defaultWorkflow: process.env.GITHUB_WORKFLOW || "deploy.yml",
  awsRegion: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-southeast-2",
};

let cachedSitesConfig;
let cachedSitesConfigUntil = 0;

function responseHeaders(event, extra = {}) {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const allowedOrigin = env.allowedOrigins.includes(origin) ? origin : env.allowedOrigins[0] || "";

  return {
    "content-type": "application/json",
    "cache-control": "no-store",
    ...(allowedOrigin
      ? {
          "access-control-allow-origin": allowedOrigin,
          "access-control-allow-credentials": "true",
          "vary": "origin",
        }
      : {}),
    ...extra,
  };
}

function json(event, statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: responseHeaders(event, headers),
    body: JSON.stringify(body),
  };
}

function options(event) {
  return {
    statusCode: 204,
    headers: responseHeaders(event, {
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "3600",
    }),
    body: "",
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

function verifySession(token, siteId) {
  if (!token || !env.sessionSecret) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;

  const expected = crypto.createHmac("sha256", env.sessionSecret).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  return payload.exp > Math.floor(Date.now() / 1000) && payload.siteId === siteId;
}

function getCookie(event, name) {
  const apiGatewayCookie = (event.cookies || []).find((part) => part.startsWith(`${name}=`));
  if (apiGatewayCookie) return apiGatewayCookie.slice(name.length + 1);

  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || "";
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function slugify(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateSentence(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength + 1);
  const sentenceEnd = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf("? "), clipped.lastIndexOf("! "));
  if (sentenceEnd >= 80) return clipped.slice(0, sentenceEnd + 1).trim();
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 80 ? lastSpace : maxLength).trim()}...`;
}

async function getSecureParameter(name) {
  const result = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
  return result.Parameter?.Value || "";
}

async function loadSitesConfig() {
  if (cachedSitesConfig && Date.now() < cachedSitesConfigUntil) return cachedSitesConfig;
  const raw = await getSecureParameter(env.sitesConfigParameter);
  cachedSitesConfig = JSON.parse(raw);
  cachedSitesConfigUntil = Date.now() + 30 * 1000;
  return cachedSitesConfig;
}

async function getSite(siteId) {
  const config = await loadSitesConfig();
  const site = config.sites?.find((item) => item.siteId === siteId);
  if (!site) {
    const error = new Error(`Unknown CMS site: ${siteId}`);
    error.statusCode = 404;
    throw error;
  }
  return site;
}

function requireAuth(event, siteId) {
  if (!verifySession(getCookie(event, "anchor_cms_session"), siteId)) {
    return json(event, 401, { error: "Unauthorized" });
  }
  return null;
}

function normalizePost(input, siteId) {
  const slug = slugify(input.slug || input.title);

  if (!slug || !input.title) {
    throw new Error("Post title and slug are required.");
  }

  const title = String(input.title).trim();
  const body = String(input.body || "");
  const plainBody = stripHtml(body);
  const description = truncateSentence(input.description || plainBody, 155);
  const seoTitle = truncateSentence(input.seoTitle || title, 60);
  const seoDescription = truncateSentence(input.seoDescription || description || plainBody, 155);

  return {
    siteId,
    slug,
    title,
    date: String(input.date || new Date().toISOString().slice(0, 10)),
    status: input.status === "published" ? "published" : "draft",
    description,
    seoTitle,
    seoDescription,
    featuredImage: String(input.featuredImage || ""),
    body,
    updatedAt: new Date().toISOString(),
  };
}

function publicPost(post) {
  return {
    title: post.title,
    slug: post.slug,
    date: post.date,
    status: post.status,
    description: post.description,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    featuredImage: post.featuredImage,
    body: post.body,
  };
}

async function login(event, siteId) {
  const site = await getSite(siteId);
  const body = parseBody(event);

  if (body.username !== site.username || !verifyPassword(body.password, site.passwordHash)) {
    return json(event, 401, { error: "Invalid login." });
  }

  const token = signSession({
    siteId,
    sub: site.username,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  });

  return json(
    event,
    200,
    { ok: true, siteId },
    {
      "set-cookie": `anchor_cms_session=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=28800`,
    },
  );
}

async function listPosts(event, siteId, publishedOnly = false) {
  await getSite(siteId);

  const result = await dynamo.send(
    new QueryCommand({
      TableName: env.tableName,
      KeyConditionExpression: "siteId = :siteId",
      ExpressionAttributeValues: {
        ":siteId": siteId,
      },
    }),
  );

  const posts = (result.Items || [])
    .filter((post) => !publishedOnly || post.status === "published")
    .sort((left, right) => new Date(right.date) - new Date(left.date))
    .map(publicPost);

  return json(event, 200, { posts });
}

async function upsertPost(event, siteId, slug) {
  await getSite(siteId);
  const post = normalizePost({ ...parseBody(event), slug }, siteId);

  await dynamo.send(
    new PutCommand({
      TableName: env.tableName,
      Item: post,
    }),
  );

  return json(event, 200, { post: publicPost(post) });
}

async function deletePost(event, siteId, slug) {
  await getSite(siteId);
  await dynamo.send(
    new DeleteCommand({
      TableName: env.tableName,
      Key: {
        siteId,
        slug,
      },
    }),
  );
  return json(event, 200, { ok: true });
}

async function signUpload(event, siteId) {
  await getSite(siteId);
  const body = parseBody(event);
  const filename = String(body.filename || "upload").replace(/[^a-zA-Z0-9._-]/g, "-");
  const contentType = String(body.contentType || "application/octet-stream");
  const key = `${siteId}/blog/${Date.now()}-${filename}`;
  const command = new PutObjectCommand({
    Bucket: env.mediaBucket,
    Key: key,
    ContentType: contentType,
  });

  return json(event, 200, {
    key,
    uploadUrl: await getSignedUrl(s3, command, { expiresIn: 300 }),
    publicUrl: `https://${env.mediaBucket}.s3.${env.awsRegion}.amazonaws.com/${key}`,
  });
}

async function triggerDeploy(event, siteId) {
  const site = await getSite(siteId);
  if (!site.githubOwner || !site.githubRepo || !env.githubTokenParameter) {
    return json(event, 501, { error: "Deploy trigger is not configured for this site." });
  }

  const token = await getSecureParameter(env.githubTokenParameter);
  const workflow = site.githubWorkflow || env.defaultWorkflow;
  const url = `https://api.github.com/repos/${site.githubOwner}/${site.githubRepo}/actions/workflows/${workflow}/dispatches`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "anchor-blog-manager",
    },
    body: JSON.stringify({ ref: site.githubRef || "main" }),
  });

  if (!response.ok) {
    return json(event, 502, { error: "GitHub deploy trigger failed.", status: response.status });
  }

  return json(event, 200, { ok: true });
}

function routeParts(path) {
  const match = path.match(/^\/api\/cms\/sites\/([^/]+)(\/.*)?$/);
  return match ? { siteId: decodeURIComponent(match[1]), rest: match[2] || "" } : null;
}

exports.handler = async function handler(event) {
  try {
    const method = event.requestContext?.http?.method || event.httpMethod;
    const path = event.rawPath || event.path || "/";

    if (method === "OPTIONS") {
      return options(event);
    }

    const route = routeParts(path);
    if (!route) {
      return json(event, 404, { error: "Not found." });
    }

    if (method === "POST" && route.rest === "/auth/login") {
      return login(event, route.siteId);
    }

    if (method === "GET" && route.rest === "/published-posts") {
      return listPosts(event, route.siteId, true);
    }

    const authError = requireAuth(event, route.siteId);
    if (authError) return authError;

    if (method === "GET" && route.rest === "/posts") {
      return listPosts(event, route.siteId);
    }

    const postMatch = route.rest.match(/^\/posts\/([^/]+)$/);
    if (method === "PUT" && postMatch) {
      return upsertPost(event, route.siteId, decodeURIComponent(postMatch[1]));
    }

    if (method === "DELETE" && postMatch) {
      return deletePost(event, route.siteId, decodeURIComponent(postMatch[1]));
    }

    if (method === "POST" && route.rest === "/uploads/sign") {
      return signUpload(event, route.siteId);
    }

    if (method === "POST" && route.rest === "/deploy") {
      return triggerDeploy(event, route.siteId);
    }

    return json(event, 404, { error: "Not found." });
  } catch (error) {
    console.error(error);
    return json({ headers: {} }, error.statusCode || 500, { error: error.message || "Unexpected error." });
  }
};

exports.hashPasswordForSetup = function hashPasswordForSetup(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${hashPassword(password, salt)}`;
};
