import { getStore } from "@netlify/blobs";

const IMAGES_STORE = "campuskart-images";

export default async (req) => {
  const url = new URL(req.url);

  const id = decodeURIComponent(
    url.pathname.replace(/^\/api\/image\//, "")
  );

  if (!id) {
    return new Response("Missing image id", {
      status: 400
    });
  }

  try {
    const store = getStore({
      name: IMAGES_STORE,
      consistency: "strong"
    });

    const result = await store.getWithMetadata(
      id,
      { type: "arrayBuffer" }
    );

    if (!result || !result.data) {
      return new Response("Not found", {
        status: 404
      });
    }

    const contentType =
      (result.metadata &&
        result.metadata.contentType) ||
      "image/jpeg";

    return new Response(result.data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    console.error(
      "Image fetch error:",
      error
    );

    return new Response(
      "Server error: " +
        String(error.message || error),
      { status: 500 }
    );
  }
};

export const config = {
  path: "/api/image/*"
};
