import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Enable CORS for cross-origin frontend support
  app.use(cors());
  app.use(express.json({ limit: "25mb" }));

  // Health check endpoint for cloud platforms (Render, Railway, etc.)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Noor AI" });
  });

  // Streaming Chat Endpoint
  app.post("/api/chat/stream", async (req, res) => {
    try {
      const {
        messages,
        systemInstruction,
        thinkingMode = "balanced",
        useWebSearch = false,
      } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: "Messages array is required." });
        return;
      }

      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");

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

      const candidateModels = [
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-3.5-flash",
        "gemini-2.5-flash",
        "gemini-flash-latest",
      ];

      let responseStream: any = null;
      let streamError: any = null;

      async function attemptStream(currentConfig: any) {
        for (const modelName of candidateModels) {
          try {
            return await ai.models.generateContentStream({
              model: modelName,
              contents: formattedContents,
              config: currentConfig,
            });
          } catch (err: any) {
            streamError = err;
            console.warn(`Model ${modelName} failed:`, err?.message);
          }
        }
        return null;
      }

      responseStream = await attemptStream(config);

      // If failed and web search was requested, retry without googleSearch tool (e.g. 429 quota on search)
      if (!responseStream && useWebSearch) {
        console.warn("Retrying without googleSearch tool due to quota/error...");
        const fallbackConfig = { ...config };
        delete fallbackConfig.tools;
        responseStream = await attemptStream(fallbackConfig);
      }

      if (!responseStream) {
        throw streamError || new Error("الخدمة مشغولة مؤقتاً، يرجى المحاولة بعد ثوانٍ.");
      }



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
        res.write(`data: ${payload}\n\n`);
      }

      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Chat Stream Error:", error);
      const errorMessage =
        error?.message || "حدث خطأ أثناء الاتصال بالخادم الذكي.";
      if (!res.headersSent) {
        res.status(500).json({ error: errorMessage });
      } else {
        res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        res.end();
      }
    }
  });

  // Auto-generate short conversation title
  app.post("/api/chat/title", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        res.json({ title: "محادثة جديدة" });
        return;
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `قم بتلخيص هذه الرسالة في عنوان قصير جداً للمحادثة (3 إلى 5 كلمات كحد أقصى، بدون علامات تنصيص وبنفس لغة الرسالة): "${message.slice(0, 250)}"`,
      });
      const title = response.text?.trim().replace(/["']/g, "") || "محادثة جديدة";
      res.json({ title });
    } catch (error: any) {
      res.json({ title: "محادثة جديدة" });
    }
  });

  // Text-to-Speech (TTS) Endpoint using gemini-3.8-flash-lite-tts
  app.post("/api/chat/tts", async (req, res) => {
    try {
      const { text, voiceName = "Kore" } = req.body;
      if (!text) {
        res.status(400).json({ error: "Text is required" });
        return;
      }
      // Strip markdown syntax for cleaner speech reading
      const cleanText = text
        .replace(/```[\s\S]*?```/g, " كود برمجي. ")
        .replace(/[#*_~`>|]/g, "")
        .slice(0, 1200);

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [
          {
            role: "user",
            parts: [{ text: cleanText }],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(500).json({ error: "لم يتم توليد الصوت." });
        return;
      }
      res.json({ audioBase64: base64Audio });
    } catch (error: any) {
      console.error("TTS Error:", error);
      res.status(500).json({ error: error?.message || "فشل توليد الصوت." });
    }
  });

  // Audio Transcription Endpoint using gemini-3.5-transcribe
  app.post("/api/chat/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/webm" } = req.body;
      if (!audioBase64) {
        res.status(400).json({ error: "Audio data is required" });
        return;
      }
      const response = await ai.models.generateContent({
        model: "gemini-3.5-transcribe",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: "قم بتفريغ هذا التسجيل الصوتي إلى نص بدقة كما قيل تماماً بدون أي إضافات.",
            },
          ],
        },
      });
      res.json({ text: response.text?.trim() || "" });
    } catch (error: any) {
      console.error("Transcribe Error:", error);
      res.status(500).json({ error: error?.message || "فشل تحويل الصوت إلى نص." });
    }
  });

  // Image Generation Endpoint using gemini-3.1-flash-lite-image
  app.post("/api/image/generate", async (req, res) => {
    try {
      const { prompt, aspectRatio = "1:1" } = req.body;
      if (!prompt) {
        res.status(400).json({ error: "Image prompt is required." });
        return;
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
        res.status(500).json({
          error: "لم يتم استخراج صورة من النموذج. حاول تعديل وصف الصورة.",
          details: textDescription,
        });
        return;
      }

      res.json({ imageUrl, textDescription });
    } catch (error: any) {
      console.error("Image Generate Error:", error);
      const rawMsg = error?.message || "";
      let friendlyMsg = "حدث خطأ أثناء توليد الصورة.";
      if (rawMsg.includes("limit: 0") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("quota")) {
        friendlyMsg =
          "تنبيه: توليد الصور بالذكاء الاصطناعي يتطلب تفعيل خطة الفوترة (Pay-as-you-go) في حساب Google AI Studio، لأن جوجل تحدد الحصة المجانية لنماذج الصور بـ 0. بينما المحادثة النصية مجانية بالكامل.";
      }
      res.status(429).json({
        error: friendlyMsg,
        details: rawMsg,
      });
    }
  });

  // Image Editing Endpoint using gemini-3.1-flash-lite-image
  app.post("/api/image/edit", async (req, res) => {
    try {
      const { prompt, base64Image, mimeType = "image/png" } = req.body;
      if (!prompt || !base64Image) {
        res.status(400).json({ error: "Prompt and base64Image are required." });
        return;
      }

      const cleanBase64 = base64Image.includes(",")
        ? base64Image.split(",")[1]
        : base64Image;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
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
        res.status(500).json({
          error: "لم يتم تعديل الصورة بنجاح. حاول مع أمر مختلف.",
          details: textDescription,
        });
        return;
      }

      res.json({ imageUrl, textDescription });
    } catch (error: any) {
      console.error("Image Edit Error:", error);
      res.status(500).json({
        error: error?.message || "حدث خطأ أثناء تعديل الصورة.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Noor AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
