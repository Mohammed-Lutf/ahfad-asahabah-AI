import React, { useState, useRef } from "react";
import {
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Download,
  Upload,
  RefreshCw,
  Loader2,
  Layers,
  ArrowRight,
  Sliders,
  Check,
} from "lucide-react";

interface ImageStudioProps {
  isLightMode: boolean;
  onSendToChat?: (imageUrl: string, prompt: string) => void;
}

export const ImageStudio: React.FC<ImageStudioProps> = ({
  isLightMode,
  onSendToChat,
}) => {
  const [activeTab, setActiveTab] = useState<"create" | "edit">("create");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<
    "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
  >("1:1");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [textDescription, setTextDescription] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Tab State
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceMimeType, setSourceMimeType] = useState("image/png");
  const [editPrompt, setEditPrompt] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SUBSCRIPTION_REQUIRED_MSG =
    "الميزة تحتاج الى اشتراك مدفوع وهي قيد التطوير .. يمكنك التواصل مع المطور والمساهمة في تفعيلها ..";

  const getCleanErrorMessage = (err: any) => {
    const raw = typeof err === "string" ? err : err?.message || "";
    if (
      raw.includes("limit: 0") ||
      raw.includes("RESOURCE_EXHAUSTED") ||
      raw.includes("quota") ||
      raw.includes("429") ||
      raw.includes("اشتراك")
    ) {
      return SUBSCRIPTION_REQUIRED_MSG;
    }
    return raw || "حدث خطأ أثناء معالجة الصورة.";
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setErrorMsg(null);
    setTextDescription(null);

    try {
      const res = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "فشل توليد الصورة.");
      }
      setGeneratedImage(data.imageUrl);
      if (data.textDescription) setTextDescription(data.textDescription);
    } catch (err: any) {
      setErrorMsg(getCleanErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editPrompt.trim() || !sourceImage || loading) return;
    setLoading(true);
    setErrorMsg(null);
    setTextDescription(null);

    try {
      const res = await fetch("/api/image/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: editPrompt.trim(),
          base64Image: sourceImage,
          mimeType: sourceMimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "فشل تعديل الصورة.");
      }
      setGeneratedImage(data.imageUrl);
      if (data.textDescription) setTextDescription(data.textDescription);
    } catch (err: any) {
      setErrorMsg(getCleanErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg("حجم الصورة كبير جداً (الحد الأقصى 8 ميجابايت).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSourceImage(reader.result as string);
      setSourceMimeType(file.type || "image/png");
    };
    reader.readAsDataURL(file);
  };

  const downloadImage = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-5xl mx-auto w-full">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>استوديو الصور بالذكاء الاصطناعي التوليدي</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          ابتكار وتعديل الصور بالأوامر النصية
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          حوّل أفكارك وخيالك إلى تصاميم ورسومات إبداعية فائقة الدقة أو قم بتعديل
          صورك الحالية بسهولة.
        </p>
      </div>

      {/* Mode Tabs */}
      <div className="flex justify-center mb-6">
        <div
          className={`inline-flex p-1 rounded-xl border ${
            isLightMode
              ? "bg-slate-100 border-slate-200"
              : "bg-[#111723] border-slate-800"
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === "create"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>إنشاء صورة جديدة</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === "edit"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>تعديل صورة موجودة</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm text-center">
          {errorMsg}
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className={`p-5 rounded-2xl border ${
              isLightMode
                ? "bg-white border-slate-200"
                : "bg-[#111723] border-slate-800"
            }`}
          >
            {activeTab === "create" ? (
              <>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  وصف الصورة (Prompt):
                </label>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="مثال: رائد فضاء عربي يرتدي بزة متطورة يقف في مدينة مستقبلية محاطة بأشجار النخيل المضيئة، إضاءة سينمائية واقعية..."
                  className={`w-full rounded-xl p-3 text-xs leading-relaxed focus:outline-none border mb-4 ${
                    isLightMode
                      ? "bg-slate-50 border-slate-200 text-slate-900"
                      : "bg-[#0B0F17] border-slate-800 text-slate-100"
                  }`}
                />

                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  نسبة الأبعاد (Aspect Ratio):
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-5">
                  {(
                    [
                      { id: "1:1", label: "مربع 1:1" },
                      { id: "16:9", label: "أفقي 16:9" },
                      { id: "9:16", label: "طولي 9:16" },
                      { id: "4:3", label: "كلاسيك 4:3" },
                      { id: "3:4", label: "بورتريه 3:4" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setAspectRatio(item.id)}
                      className={`py-2 px-2 rounded-xl text-[11px] font-medium border text-center transition-colors ${
                        aspectRatio === item.id
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-semibold"
                          : isLightMode
                          ? "border-slate-200 hover:bg-slate-50 text-slate-700"
                          : "border-slate-800 hover:bg-slate-800/60 text-slate-400"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Preset Prompt Suggestions */}
                <div className="mb-5">
                  <div className="text-[11px] text-slate-400 mb-2">
                    أفكار مقترحة سريعة:
                  </div>
                  <div className="space-y-1.5">
                    {[
                      "واحة عربية مستقبلية في الغسق، هندسة معمارية عصرية تدمج التراث بالطاقة النظيفة، إضاءة دافئة.",
                      "رسم توضيحي ثلاثي الأبعاد لطيف لروبوت ودود يقرأ كتاباً كبيراً، ألوان ناعمة ومبهجة.",
                      "شعار عصري أنيق تجريدي لشركة ذكاء اصطناعي، خطوط انسيابية ذهبية على خلفية داكنة فاخرة.",
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPrompt(p)}
                        className={`w-full text-right p-2 rounded-lg text-[11px] truncate transition-colors ${
                          isLightMode
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-white transition-all ${
                    loading || !prompt.trim()
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500 shadow-sm"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ التوليد الفني...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>توليد الصورة الآن</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  الصورة الأصلية المراد تعديلها:
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSourceUpload}
                  className="hidden"
                />

                {sourceImage ? (
                  <div className="relative mb-4 rounded-xl overflow-hidden border border-slate-700 group">
                    <img
                      src={sourceImage}
                      alt="Source"
                      className="w-full max-h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-white text-xs transition-opacity"
                    >
                      <Upload className="w-4 h-4" />
                      <span>تغيير الصورة</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full py-8 mb-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
                      isLightMode
                        ? "border-slate-300 hover:border-emerald-500 bg-slate-50"
                        : "border-slate-800 hover:border-emerald-500/50 bg-[#0B0F17]"
                    }`}
                  >
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-xs text-slate-400">
                      اضغط لرفع صورة من جهازك
                    </span>
                  </button>
                )}

                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  طلب التعديل (Edit Instruction):
                </label>
                <textarea
                  rows={3}
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="مثال: أضف نظارات شمسية للشخصية، أو حوّل الخلفية إلى شاطئ وقت الغروب..."
                  className={`w-full rounded-xl p-3 text-xs leading-relaxed focus:outline-none border mb-4 ${
                    isLightMode
                      ? "bg-slate-50 border-slate-200 text-slate-900"
                      : "bg-[#0B0F17] border-slate-800 text-slate-100"
                  }`}
                />

                <button
                  type="button"
                  onClick={handleEdit}
                  disabled={loading || !editPrompt.trim() || !sourceImage}
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-white transition-all ${
                    loading || !editPrompt.trim() || !sourceImage
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500 shadow-sm"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ تطبيق التعديلات...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>تطبيق التعديل على الصورة</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Preview Canvas Column */}
        <div className="lg:col-span-7">
          <div
            className={`p-5 rounded-2xl border flex flex-col items-center justify-center min-h-[440px] text-center ${
              isLightMode
                ? "bg-white border-slate-200"
                : "bg-[#111723] border-slate-800"
            }`}
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
                <p className="text-sm font-medium">الذكاء الاصطناعي يرسم الآن...</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  يتم معالجة وضبط عناصر وتفاصيل الصورة بأعلى جودة بصرية ممكنة.
                </p>
              </div>
            ) : generatedImage ? (
              <div className="w-full flex flex-col items-center">
                <div className="relative group max-w-full rounded-xl overflow-hidden border border-slate-700 shadow-md">
                  <img
                    src={generatedImage}
                    alt="Generated output"
                    className="max-h-[460px] object-contain rounded-xl"
                  />
                </div>

                {textDescription && (
                  <p className="text-xs text-slate-400 mt-3 max-w-md text-center">
                    {textDescription}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() =>
                      downloadImage(generatedImage, "diaa-ai-image")
                    }
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل الصورة (PNG)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSourceImage(generatedImage);
                      setActiveTab("edit");
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      isLightMode
                        ? "border-slate-300 hover:bg-slate-100 text-slate-700"
                        : "border-slate-700 hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>إرسال للتعديل</span>
                  </button>

                  {onSendToChat && (
                    <button
                      type="button"
                      onClick={() =>
                        onSendToChat(
                          generatedImage,
                          activeTab === "create" ? prompt : editPrompt
                        )
                      }
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${
                        isLightMode
                          ? "border-slate-300 hover:bg-slate-100 text-slate-700"
                          : "border-slate-700 hover:bg-slate-800 text-slate-300"
                      }`}
                    >
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                      <span>فتح في المحادثة</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
                <ImageIcon className="w-12 h-12 stroke-[1.2] text-slate-600" />
                <p className="text-xs sm:text-sm">
                  ستظهر الصورة المولدة بدقة عالية هنا فور اكتمالها.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
