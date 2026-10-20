import { GoogleGenAI, ThinkingLevel } from "@google/genai";

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
    const body = await req.json();
    const {
      messages,
      systemInstruction,
      thinkingMode = "balanced",
      useWebSearch = false,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const formattedContents = messages.map((msg: any) => {
      const parts: any[] = [];
      if (msg.attachments && Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.data && att.mimeType) {
            parts.push({
              inlineData: {
                data: att.data,
                mimeType: att.mimeType,
              },
            });
          }
        }
      }
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts: parts.length > 0 ? parts : [{ text: " " }],
      };
    });

    let thinkingLevel = ThinkingLevel.MEDIUM;
    if (thinkingMode === "fast") thinkingLevel = ThinkingLevel.LOW;
    if (thinkingMode === "deep") thinkingLevel = ThinkingLevel.HIGH;

    const config: any = {
      systemInstruction:
        systemInstruction ||
        "أنت 'نُور' (Noor AI)، مساعد ذكي متقدم واحترافي شبيه بـ ChatGPT. تجيب بدقة ووضوح، وتنظم إجاباتك باستخدام تنسيق Markdown (عناوين، قوائم، جداول، وكتل برمجية واضحة). تتحدث باللغة التي يخاطبك بها المستخدم بطلاقة وطبيعية.",
      thinkingConfig: {
        thinkingLevel,
      },
    };

    if (useWebSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.8-flash",
      contents: formattedContents,
      config,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text || "";
            const groundingChunks =
              chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;

            let sources: { title: string; uri: string }[] = [];
            if (groundingChunks && Array.isArray(groundingChunks)) {
              sources = groundingChunks
                .map((gc: any) => gc.web)
                .filter((w: any) => w && w.uri)
                .map((w: any) => ({
                  title: w.title || w.uri,
                  uri: w.uri,
                }));
            }

            const payload = JSON.stringify({
              text,
              sources: sources.length > 0 ? sources : undefined,
            });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (err: any) {
          const errPayload = JSON.stringify({
            error: err?.message || "حدث خطأ أثناء الاتصال بالخادم الذكي.",
          });
          controller.enqueue(encoder.encode(`data: ${errPayload}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error?.message || "حدث خطأ أثناء معالجة الطلب.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};
