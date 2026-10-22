import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

let roundRobinTranscribeIndex = 0;

function getTranscribeApiKeys(userApiKey?: string | null): string[] {
  if (userApiKey && userApiKey.trim().length > 10) {
    return [userApiKey.trim()];
  }
  const rawPool = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  const pool = rawPool
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 10);
  if (pool.length === 0) return [process.env.GEMINI_API_KEY || ""];

  const startIndex = roundRobinTranscribeIndex % pool.length;
  roundRobinTranscribeIndex = (roundRobinTranscribeIndex + 1) % pool.length;
  return [...pool.slice(startIndex), ...pool.slice(0, startIndex)];
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-gemini-api-key",
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
    const userApiKey = req.headers.get("x-gemini-api-key");
    const apiKeys = getTranscribeApiKeys(userApiKey);

    const { audioBase64, mimeType = "audio/webm" } = await req.json();
    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "Audio data is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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
          console.warn(`Key ...${apiKey.slice(-6)} Audio model ${model} failed:`, err?.message);
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

    return new Response(
      JSON.stringify({ text: transcribedText }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    let errMessage = error?.message || "فشل تحويل الصوت إلى نص.";
    if (errMessage.includes("quota") || errMessage.includes("RESOURCE_EXHAUSTED")) {
      errMessage = "وصل مفتاح الذكاء الاصطناعي إلى الحد الأقصى للاستخدام اليومي المجاني (Google Free Tier Quota). يمكنك تغيير أو تحديث مفتاح API في الإعدادات.";
    }
    return new Response(
      JSON.stringify({
        error: errMessage,
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
