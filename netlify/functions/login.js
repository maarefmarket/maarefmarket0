/**
 * CampusKart - Admin Login
 * POST /api/login
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", {
      status: 204,
      headers: CORS_HEADERS
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed"
      }),
      {
        status: 405,
        headers: CORS_HEADERS
      }
    );
  }

  const expectedPwd =
    process.env.ADMIN_PASSWORD || "";

  if (!expectedPwd) {
    return new Response(
      JSON.stringify({
        error:
          "ADMIN_PASSWORD غير مضبوط في إعدادات Netlify."
      }),
      {
        status: 500,
        headers: CORS_HEADERS
      }
    );
  }

  let body;

  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "JSON غير صالح"
      }),
      {
        status: 400,
        headers: CORS_HEADERS
      }
    );
  }

  const pwd =
    body && body.password
      ? String(body.password)
      : "";

  if (pwd !== expectedPwd) {
    await new Promise((resolve) =>
      setTimeout(resolve, 400)
    );

    return new Response(
      JSON.stringify({
        ok: false,
        error: "كلمة المرور غير صحيحة"
      }),
      {
        status: 401,
        headers: CORS_HEADERS
      }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      token: pwd
    }),
    {
      status: 200,
      headers: CORS_HEADERS
    }
  );
};

export const config = {
  path: "/api/login"
};
