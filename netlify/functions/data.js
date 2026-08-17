/**
 * CampusKart - Netlify Function
 * GET  /api/data  -> قراءة بيانات المتجر للجميع
 * PUT  /api/data  -> حفظ التعديلات من لوحة الإدارة
 *
 * التخزين: Netlify Blobs
 */

import { getStore } from "@netlify/blobs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const STORE_NAME = "campuskart-data";
const KEY = "store.json";
const BACKUP_KEY = "store.backup.latest.json";
const PREV_BACKUP_KEY = "store.backup.previous.json";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

// تحميل data/store.json أول مرة فقط
async function loadDefaults() {
  try {
    const here = dirname(fileURLToPath(import.meta.url));

    const candidates = [
      join(here, "..", "..", "..", "data", "store.json"),
      join(here, "..", "..", "data", "store.json"),
      join(process.cwd(), "data", "store.json")
    ];

    for (const path of candidates) {
      try {
        const text = await readFile(path, "utf-8");
        return JSON.parse(text);
      } catch (_) {
        // جرّب المسار التالي
      }
    }
  } catch (error) {
    console.error("loadDefaults error:", error);
  }

  // احتياط في حال تعذر قراءة store.json
  return {
    settings: {
      storeName: "CampusKart",
      storeSubtitle: "متجر الجامعة",
      slogan: "كل ما تحتاجه في مكان واحد",
      description: "",
      whatsappNumber: "",
      rates: {
        USD: 1,
        TRY: 33,
        SYP: 14000
      },
      currencyLabels: {
        USD: "دولار أمريكي",
        TRY: "ليرة تركية",
        SYP: "ليرة سورية"
      },
      currencySymbols: {
        USD: "$",
        TRY: "₺",
        SYP: "ل.س"
      },
      messageTemplate: {
        greeting: "السلام عليكم ورحمة الله وبركاته",
        intro: "أريد شراء هذه الأشياء:",
        totalsLabel: "السعر النهائي الإجمالي:",
        noteLabel: "ملاحظة:"
      },
      features: [],
      hero: {
        enabled: true,
        title: "كل ما تحتاجه",
        titleAccent: "في مكان واحد",
        subtitle: "",
        buttonText: "تسوّق الآن",
        buttonLink: "products.html",
        buttonVisible: true,
        image: "",
        imageVisible: true,
        titleVisible: true,
        subtitleVisible: true
      }
    },
    categories: [],
    products: []
  };
}

function normalizeData(input) {
  const data =
    input && typeof input === "object"
      ? input
      : {};

  if (!data.settings || typeof data.settings !== "object") {
    data.settings = {};
  }

  if (!Array.isArray(data.categories)) {
    data.categories = [];
  }

  if (!Array.isArray(data.products)) {
    data.products = [];
  }

  return data;
}

export default async (req) => {
  const method = req.method.toUpperCase();

  // CORS
  if (method === "OPTIONS") {
    return new Response("", {
      status: 204,
      headers: CORS_HEADERS
    });
  }

  const store = getStore({
    name: STORE_NAME,
    consistency: "strong"
  });

  // =========================
  // قراءة بيانات المتجر
  // =========================
  if (method === "GET") {
    try {
      let data = await store.get(KEY, {
        type: "json"
      });

      // أول تشغيل
      if (!data) {
        const backup = await store.get(BACKUP_KEY, {
          type: "json"
        });

        if (backup) {
          data = normalizeData(backup);

          await store.setJSON(KEY, data);
        } else {
          data = normalizeData(
            await loadDefaults()
          );

          await store.setJSON(KEY, data);
          await store.setJSON(
            BACKUP_KEY,
            data
          );
        }
      } else {
        data = normalizeData(data);
      }

      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: CORS_HEADERS
        }
      );

    } catch (error) {
      console.error("GET /api/data error:", error);

      return new Response(
        JSON.stringify({
          error: "تعذر قراءة بيانات المتجر",
          details: String(error)
        }),
        {
          status: 500,
          headers: CORS_HEADERS
        }
      );
    }
  }

  // =========================
  // حفظ بيانات المتجر
  // =========================
  if (method === "PUT") {

    const expectedPassword =
      process.env.ADMIN_PASSWORD || "";

    if (!expectedPassword) {
      return new Response(
        JSON.stringify({
          error:
            "ADMIN_PASSWORD غير مضبوط في Netlify."
        }),
        {
          status: 500,
          headers: CORS_HEADERS
        }
      );
    }

    const auth =
      req.headers.get("authorization") || "";

    const token = auth.startsWith("Bearer ")
      ? auth.slice(7)
      : "";

    if (token !== expectedPassword) {
      return new Response(
        JSON.stringify({
          error: "غير مصرح بالحفظ"
        }),
        {
          status: 401,
          headers: CORS_HEADERS
        }
      );
    }

    let body;

    try {
      body = await req.json();
    } catch (_) {
      return new Response(
        JSON.stringify({
          error: "بيانات JSON غير صالحة"
        }),
        {
          status: 400,
          headers: CORS_HEADERS
        }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      !body.settings ||
      !Array.isArray(body.categories) ||
      !Array.isArray(body.products)
    ) {
      return new Response(
        JSON.stringify({
          error:
            "بنية البيانات غير صالحة"
        }),
        {
          status: 400,
          headers: CORS_HEADERS
        }
      );
    }

    body = normalizeData(body);

    try {
      // نسخة احتياطية قبل الحفظ
      const current =
        await store.get(KEY, {
          type: "json"
        });

      if (current) {
        await store.setJSON(
          PREV_BACKUP_KEY,
          normalizeData(current)
        );
      }

      // حفظ البيانات الجديدة
      await store.setJSON(KEY, body);

      // نسخة احتياطية
      await store.setJSON(
        BACKUP_KEY,
        body
      );

      return new Response(
        JSON.stringify({
          ok: true,
          savedAt: Date.now()
        }),
        {
          status: 200,
          headers: CORS_HEADERS
        }
      );

    } catch (error) {
      console.error("PUT /api/data error:", error);

      return new Response(
        JSON.stringify({
          error: "تعذر حفظ البيانات",
          details: String(error)
        }),
        {
          status: 500,
          headers: CORS_HEADERS
        }
      );
    }
  }

  return new Response(
    JSON.stringify({
      error: "Method not allowed"
    }),
    {
      status: 405,
      headers: CORS_HEADERS
    }
  );
};

export const config = {
  path: "/api/data"
};
