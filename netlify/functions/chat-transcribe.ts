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
    const { audioBase64, mimeType = "audio/webm" } = await req.json();
    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "Audio data is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const candidateAudioModels = [
      "gemini-2.5-flash",
      "gemini-flash-latest",
      "gemini-3.8-flash",
    ];

    let transcribedText = "";
    let lastError: any = null;

    for (const model of candidateAudioModels) {
      try {
        const response = await ai.models.generateContent({
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
        console.warn(`Audio transcribe model ${model} failed:`, err?.message);
        lastError = err;
      }
    }

    if (!transcribedText && lastError) {
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
    return new Response(
      JSON.stringify({
        error: error?.message || "فشل تحويل الصوت إلى نص.",
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
