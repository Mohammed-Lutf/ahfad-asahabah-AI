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

    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-3.8-flash",
    ];

    const buildModelConfig = (modelName: string, withTools: boolean) => {
      const cfg: any = {
        systemInstruction:
          systemInstruction ||
          "أنت 'نُور' (Noor AI)، مساعد ذكي متقدم واحترافي شبيه بـ ChatGPT. تجيب بدقة ووضوح، وتنظم إجاباتك باستخدام تنسيق Markdown (عناوين، قوائم، جداول، وكتل برمجية واضحة). تتحدث باللغة التي يخاطبك بها المستخدم بطلاقة وطبيعية.",
      };

      if (modelName.startsWith("gemini-3")) {
        let thinkingLevel = ThinkingLevel.MEDIUM;
        if (thinkingMode === "fast") thinkingLevel = ThinkingLevel.LOW;
        if (thinkingMode === "deep") thinkingLevel = ThinkingLevel.HIGH;
        cfg.thinkingConfig = { thinkingLevel };
      } else if (modelName.includes("2.5")) {
        if (thinkingMode === "fast") {
          cfg.thinkingConfig = { thinkingBudget: 0 };
        }
      }

      if (withTools && useWebSearch) {
        cfg.tools = [{ googleSearch: {} }];
      }

      return cfg;
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let sentAnyData = false;
        const searchOptions = useWebSearch ? [true, false] : [false];

        for (const withTools of searchOptions) {
          if (sentAnyData) break;
          for (const modelName of candidateModels) {
            if (sentAnyData) break;
            const cfg = buildModelConfig(modelName, withTools);
            try {
              const activeStream = await ai.models.generateContentStream({
                model: modelName,
                contents: formattedContents,
                config: cfg,
              });

              for await (const chunk of activeStream) {
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

                if (text || sources.length > 0) {
                  sentAnyData = true;
                  const payload = JSON.stringify({
                    text,
                    sources: sources.length > 0 ? sources : undefined,
                  });
                  controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                }
              }

              if (sentAnyData) break;
            } catch (err: any) {
              console.warn(
                `Model ${modelName} (withTools=${withTools}) failed:`,
                err?.message
              );
            }
          }
        }

        if (!sentAnyData) {
          const errPayload = JSON.stringify({
            error: "الخدمة مشغولة مؤقتاً، يرجى المحاولة بعد لحظات.",
          });
          controller.enqueue(encoder.encode(`data: ${errPayload}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        }
        controller.close();
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
