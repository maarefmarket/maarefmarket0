import { getStore } from "@netlify/blobs";

const IMAGES_STORE = "campuskart-images";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
];

const MAX_SIZE = 6 * 1024 * 1024;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Filename",
  "Cache-Control": "no-store"
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function randomId() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    b => b.toString(16).padStart(2, "0")
  ).join("");
}

function extFromType(type) {
  return ({
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
  })[type] || "bin";
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", {
      status: 204,
      headers: CORS_HEADERS
    });
  }

  if (req.method !== "POST") {
    return json(
      { error: "Method not allowed" },
      405
    );
  }

  const expectedPwd =
    process.env.ADMIN_PASSWORD || "";

  if (!expectedPwd) {
    return json(
      {
        error:
          "ADMIN_PASSWORD غير مضبوط على Netlify."
      },
      500
    );
  }

  const auth =
    req.headers.get("authorization") || "";

  const token = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : "";

  if (token !== expectedPwd) {
    return json(
      { error: "غير مصرح. كلمة المرور خاطئة." },
      401
    );
  }

  const contentType =
    (req.headers.get("content-type") || "")
      .toLowerCase()
      .split(";")[0]
      .trim();

  if (!ALLOWED_TYPES.includes(contentType)) {
    return json(
      { error: "نوع الصورة غير مدعوم." },
      400
    );
  }

  let buffer;

  try {
    const arrayBuffer = await req.arrayBuffer();
    buffer = new Uint8Array(arrayBuffer);
  } catch {
    return json(
      { error: "تعذر قراءة الصورة." },
      400
    );
  }

  if (!buffer.byteLength) {
    return json({ error: "الملف فارغ." }, 400);
  }

  if (buffer.byteLength > MAX_SIZE) {
    return json(
      { error: "حجم الصورة أكبر من 6MB." },
      413
    );
  }

  const id =
    `${Date.now()}-${randomId()}.${extFromType(contentType)}`;

  try {
    const store = getStore({
      name: IMAGES_STORE,
      consistency: "strong"
    });

    await store.set(id, buffer, {
      metadata: {
        contentType,
        size: buffer.byteLength
      }
    });

  } catch (error) {
    console.error("Upload error:", error);

    return json(
      {
        error:
          "تعذر حفظ الصورة: " +
          String(error.message || error)
      },
      500
    );
  }

  return json({
    ok: true,
    id,
    url: `/api/image/${id}`,
    size: buffer.byteLength,
    type: contentType
  });
};

export const config = {
  path: "/api/upload"
};
