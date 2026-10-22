import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import cors from "cors";
import { getCompleteSystemInstruction } from "./src/knowledge/systemKnowledge";

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

let serverRoundRobinIndex = 0;
function getServerApiKeys(userApiKey?: string): string[] {
  if (userApiKey && userApiKey.trim().length > 10) {
    return [userApiKey.trim()];
  }
  const rawPool = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  const pool = rawPool
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 10);
  if (pool.length === 0) return [process.env.GEMINI_API_KEY || ""];

  const startIndex = serverRoundRobinIndex % pool.length;
  serverRoundRobinIndex = (serverRoundRobinIndex + 1) % pool.length;
  return [...pool.slice(startIndex), ...pool.slice(0, startIndex)];
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Enable CORS for cross-origin frontend support
  app.use(cors());
  app.use(express.json({ limit: "25mb" }));

  // Health check endpoint for cloud platforms (Render, Railway, etc.)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "Diaa AI" });
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

      const userApiKey = req.headers["x-gemini-api-key"] as string | undefined;
      const apiKeys = getServerApiKeys(userApiKey);

      // gemini-flash-latest is prioritized as it has distinct quotas from 2.5
      const candidateModels = [
        "gemini-flash-latest",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
      ];

      const buildModelConfig = (modelName: string, withTools: boolean) => {
        const cfg: any = {
          systemInstruction: getCompleteSystemInstruction(systemInstruction),
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

      let sentAnyData = false;
      const searchOptions = useWebSearch ? [true, false] : [false];

      // Auto-failover across pooled API keys
      for (const apiKey of apiKeys) {
        if (sentAnyData) break;
        const activeAi = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        for (const withTools of searchOptions) {
          if (sentAnyData) break;
          for (const modelName of candidateModels) {
            if (sentAnyData) break;
            const cfg = buildModelConfig(modelName, withTools);
            try {
              const activeStream = await activeAi.models.generateContentStream({
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
                  res.write(`data: ${payload}\n\n`);
                }
              }

              if (sentAnyData) break;
            } catch (err: any) {
              console.warn(
                `Key ...${apiKey.slice(-6)} Model ${modelName} failed:`,
                err?.message
              );
            }
          }
        }
      }

      if (!sentAnyData) {
        res.write(
          `data: ${JSON.stringify({
            error:
              "وصلت كافة مفاتيح الذكاء الاصطناعي إلى الحد الأقصى المؤقت. يرجى المحاولة بعد قليل أو وضع مفتاحك الخاص في الإعدادات.",
          })}\n\n`
        );
      } else {
        res.write(`data: [DONE]\n\n`);
      }
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

  // Audio Transcription Endpoint using gemini-flash-latest and multi-model fallback
  app.post("/api/chat/transcribe", async (req, res) => {
    try {
      const userApiKey = req.headers["x-gemini-api-key"] as string | undefined;
      const apiKeys = getServerApiKeys(userApiKey);

      const { audioBase64, mimeType = "audio/webm" } = req.body;
      if (!audioBase64) {
        res.status(400).json({ error: "Audio data is required" });
        return;
      }

      const candidateAudioModels = [
        "gemini-flash-latest",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
      ];

      let transcribedText = "";
      let lastError: any = null;

      for (const apiKey of apiKeys) {
        if (transcribedText) break;
        const activeAi = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        for (const model of candidateAudioModels) {
          if (transcribedText) break;
          try {
            const response = await activeAi.models.generateContent({
              model,
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: audioBase64,
                    },
                  },
                  {
                    text: "أنت محرك تفريغ صوتي دقيق فائق السرعة. قم بتحويل هذا المقطع الصوتي المسجل باللغة العربية أو الإنجليزية إلى نص مكتوب مطابق لما قيل تماماً، دون أي مقدمات، تعليقات، أو إضافات من قبلك.",
                  },
                ],
              },
            });
            transcribedText = response.text?.trim() || "";
            if (transcribedText) break;
          } catch (err: any) {
            console.warn(`Key ...${apiKey.slice(-6)} Audio transcribe model ${model} failed:`, err?.message);
            lastError = err;
          }
        }
      }

      if (!transcribedText && lastError) {
        const errStr = lastError?.message || "";
        if (lastError?.status === 429 || errStr.includes("quota") || errStr.includes("RESOURCE_EXHAUSTED")) {
          throw new Error("وصلت مفاتيح الذكاء الاصطناعي إلى الحد الأقصى للاستخدام اليومي المجاني (Google Free Tier Quota). يمكنك تغيير أو تحديث مفتاح API في الإعدادات.");
        }
        throw lastError;
      }

      res.json({ text: transcribedText });
    } catch (error: any) {
      console.error("Transcribe Error:", error);
      let errMessage = error?.message || "فشل تحويل الصوت إلى نص.";
      if (errMessage.includes("quota") || errMessage.includes("RESOURCE_EXHAUSTED")) {
        errMessage = "وصل مفتاح الذكاء الاصطناعي إلى الحد الأقصى للاستخدام اليومي المجاني (Google Free Tier Quota). يمكنك تغيير أو تحديث مفتاح API في الإعدادات.";
      }
      res.status(500).json({ error: errMessage });
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
          "المميزة تحتاج الى اشتراك مدفوع وهي قيد التطوير .. يمكنك التواصل مع المطور والمساهمة في تفعيلها ..";
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
      const rawMsg = error?.message || "";
      let friendlyMsg = "حدث خطأ أثناء تعديل الصورة.";
      if (rawMsg.includes("limit: 0") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("quota")) {
        friendlyMsg =
          "المميزة تحتاج الى اشتراك مدفوع وهي قيد التطوير .. يمكنك التواصل مع المطور والمساهمة في تفعيلها ..";
      }
      res.status(429).json({
        error: friendlyMsg,
        details: rawMsg,
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
    console.log(`Diaa AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
