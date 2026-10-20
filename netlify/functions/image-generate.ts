import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { prompt, aspectRatio = "1:1" } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Image prompt is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
        },
      },
    });

    let imageUrl: string | null = null;
    let textDescription: string | null = null;

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
      } else if (part.text) {
        textDescription = part.text;
      }
    }

    if (!imageUrl) {
      return new Response(
        JSON.stringify({
          error: "لم يتم استخراج صورة من النموذج. حاول تعديل وصف الصورة.",
          details: textDescription,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ imageUrl, textDescription }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    const rawMsg = error?.message || "";
    let friendlyMsg = "حدث خطأ أثناء توليد الصورة.";
    if (rawMsg.includes("limit: 0") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("quota")) {
      friendlyMsg =
        "تنبيه: توليد الصور بالذكاء الاصطناعي يتطلب تفعيل خطة الفوترة (Pay-as-you-go) في حساب Google AI Studio، لأن جوجل تحدد الحصة المجانية لنماذج الصور بـ 0. بينما المحادثة النصية مجانية بالكامل.";
    }

    return new Response(
      JSON.stringify({
        error: friendlyMsg,
        details: rawMsg,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};
