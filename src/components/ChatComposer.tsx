import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Square,
  Paperclip,
  Mic,
  Globe,
  X,
  FileText,
  Loader2,
  Cpu,
  Zap,
  Sparkles,
  Smile,
} from "lucide-react";
import { Attachment, ThinkingMode } from "../types";

interface ChatComposerProps {
  onSend: (
    text: string,
    attachments: Attachment[],
    thinkingMode: ThinkingMode,
    useWebSearch: boolean
  ) => void;
  onStop: () => void;
  isStreaming: boolean;
  thinkingMode: ThinkingMode;
  setThinkingMode: (mode: ThinkingMode) => void;
  useWebSearch: boolean;
  setUseWebSearch: (val: boolean) => void;
  isLightMode: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSend,
  onStop,
  isStreaming,
  thinkingMode,
  setThinkingMode,
  useWebSearch,
  setUseWebSearch,
  isLightMode,
}) => {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<string>("popular");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleInsertEmoji = (emoji: string) => {
    if (!textareaRef.current) {
      setInput((prev) => prev + emoji);
      return;
    }
    const textarea = textareaRef.current;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const newText = input.substring(0, start) + emoji + input.substring(end);
    setInput(newText);

    // Re-focus and set cursor position after inserted emoji
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + emoji.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const EMOJI_CATEGORIES = [
    {
      id: "popular",
      name: "شائعة",
      emojis: ["✨", "💡", "🚀", "❤️", "👍", "🔥", "😊", "🎯", "🤖", "⭐", "👏", "🎉"],
    },
    {
      id: "faces",
      name: "وجوه",
      emojis: [
        "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥹", "😊", "😇", "🙂",
        "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😚", "😋", "😛", "😝", "😜",
        "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁",
        "🥺", "😢", "😭", "😤", "😠", "😡", "🤯", "😳", "🥵", "🥶", "😱", "😨",
        "🤔", "🫣", "🤫", "🫡", "🫢", "🤐", "🤨", "😐", "😑", "😶", "🫠", "😴"
      ],
    },
    {
      id: "gestures",
      name: "إيماءات",
      emojis: [
        "👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "👌", "🤌", "🤏", "✌️", "🤞",
        "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎",
        "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝", "🙏", "✍️"
      ],
    },
    {
      id: "objects",
      name: "أفكار وعمل",
      emojis: [
        "💡", "💻", "📱", "⌨️", "🖥️", "⚙️", "🔧", "🛠️", "📊", "📈", "📉", "📁",
        "📂", "📄", "📝", "📋", "📌", "📍", "📎", "🔒", "🔑", "🔍", "🔎", "✉️",
        "📦", "🏷️", "💳", "💰", "💵", "💎", "⏳", "⏱️", "⏰", "📅", "📆", "🎯"
      ],
    },
    {
      id: "symbols",
      name: "رموز",
      emojis: [
        "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
        "💖", "💗", "💘", "💝", "✨", "⭐", "🌟", "💫", "💥", "🔥", "⚡", "🌈",
        "☀️", "🌙", "☁️", "❄️", "🔔", "📢", "💬", "💭", "✔️", "✅", "❌", "⚠️"
      ],
    },
  ];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isStreaming) return;
    if (!input.trim() && attachments.length === 0) return;

    onSend(input.trim(), attachments, thinkingMode, useWebSearch);
    setInput("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 8 * 1024 * 1024) {
        setErrorMsg("حجم الملف يتجاوز الحد المسموح (8 ميجابايت).");
        continue;
      }

      const base64 = await readFileAsBase64(file);
      const base64Data = base64.split(",")[1] || "";

      newAttachments.push({
        id: `${Date.now()}-${i}`,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        data: base64Data,
        previewUrl: file.type.startsWith("image/") ? base64 : undefined,
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleRecording = async () => {
    setErrorMsg(null);
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        if (audioChunksRef.current.length === 0 || audioBlob.size < 200) {
          setIsTranscribing(false);
          setRecordingSeconds(0);
          return;
        }

        setIsTranscribing(true);
        try {
          const base64Full = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
          });
          const audioBase64 = base64Full.split(",")[1];

          const customApiKey = localStorage.getItem("diaa_custom_gemini_api_key") || "";
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (customApiKey) {
            headers["x-gemini-api-key"] = customApiKey;
          }

          const res = await fetch("/api/chat/transcribe", {
            method: "POST",
            headers,
            body: JSON.stringify({
              audioBase64,
              mimeType: mediaRecorder.mimeType || "audio/webm",
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.text) {
            setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
          } else if (data.error) {
            const errStr = String(data.error);
            if (errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("quota") || errStr.includes("429")) {
              setErrorMsg("تم بلوغ الحد المجاني المؤقت للتعرف الصوتي من جوجل. يمكنك وضع مفتاحك الخاص في إعدادات التخصيص ⚙️ للمتابعة فوراً.");
            } else {
              setErrorMsg(data.error);
            }
          } else {
            setErrorMsg("لم يتم التقاط صوت واضح، يرجى المحاولة مرة أخرى.");
          }
        } catch (err: any) {
          const errMsg = String(err?.message || "");
          if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || errMsg.includes("429")) {
            setErrorMsg("تم بلوغ الحد اليومي المؤقت. يرجى إضافة مفتاح API خاص بك في التخصيص ⚙️ للمتابعة.");
          } else {
            setErrorMsg(err?.message || "تعذر تحويل التسجيل الصوتي إلى نص.");
          }
        } finally {
          setIsTranscribing(false);
          setRecordingSeconds(0);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setErrorMsg("يرجى السماح بصلاحية الميكروفون للتسجيل الصوتي.");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 pb-8 sm:pb-4 pt-1 sm:pt-2">
      {errorMsg && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-400 hover:text-red-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div
        className={`rounded-2xl border transition-colors ${
          isLightMode
            ? "bg-white border-slate-200 focus-within:border-slate-400 shadow-sm"
            : "bg-[#111723] border-slate-800 focus-within:border-slate-700"
        }`}
      >
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3 pb-1">
            {attachments.map((att) => (
              <div
                key={att.id}
                className={`relative group flex items-center gap-2 p-1.5 rounded-xl border text-xs ${
                  isLightMode
                    ? "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-slate-800/70 border-slate-700 text-slate-200"
                }`}
              >
                {att.previewUrl ? (
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <span className="max-w-[120px] truncate pe-2">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="p-1 rounded-full bg-slate-900/80 text-slate-300 hover:text-white transition-colors"
                  title="إزالة المرفق"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea Input */}
        <div className="px-4 pt-3 pb-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording
                ? `جارٍ التسجيل الصوتي... (${recordingSeconds} ثانية)`
                : isTranscribing
                ? "جارٍ تحويل الصوت إلى نص..."
                : "اسأل ضياء أي شيء، أو أرفق صورة أو كود لتحليله..."
            }
            disabled={isRecording || isTranscribing}
            className={`w-full resize-none bg-transparent border-0 focus:ring-0 focus:outline-none text-[15px] leading-relaxed placeholder:text-slate-500 ${
              isLightMode ? "text-slate-900" : "text-slate-100"
            }`}
          />
        </div>

        {/* Bottom Control Bar */}
        <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* File Attachment Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,text/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                isLightMode
                  ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title="إرفاق صورة أو ملف"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Emoji Picker Button & Popup */}
            <div className="relative" ref={emojiPickerRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                  showEmojiPicker
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : isLightMode
                    ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
                }`}
                title="إدراج رمز تعبيري (Emoji)"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Emoji Picker Popover Modal */}
              {showEmojiPicker && (
                <div
                  className={`absolute bottom-full mb-3 start-0 z-50 w-72 sm:w-80 rounded-2xl border shadow-xl p-3 animate-in fade-in duration-150 ${
                    isLightMode
                      ? "bg-white border-slate-200 text-slate-800"
                      : "bg-[#111723] border-slate-800 text-slate-100"
                  }`}
                >
                  {/* Category Filter Tabs */}
                  <div
                    className={`flex items-center gap-1 p-1 rounded-xl border mb-3 overflow-x-auto ${
                      isLightMode
                        ? "bg-slate-100 border-slate-200"
                        : "bg-[#090D14] border-slate-800/80"
                    }`}
                  >
                    {EMOJI_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveEmojiCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                          activeEmojiCategory === cat.id
                            ? isLightMode
                              ? "bg-white text-slate-900 shadow-xs"
                              : "bg-slate-800 text-emerald-400 font-semibold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Emoji Grid */}
                  <div className="grid grid-cols-6 sm:grid-cols-7 gap-1 max-h-48 overflow-y-auto p-1">
                    {EMOJI_CATEGORIES.find(
                      (c) => c.id === activeEmojiCategory
                    )?.emojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInsertEmoji(emoji)}
                        className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-all hover:scale-120 active:scale-95 ${
                          isLightMode
                            ? "hover:bg-slate-100"
                            : "hover:bg-slate-800"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Web Search Toggle Button */}
            <button
              type="button"
              onClick={() => setUseWebSearch(!useWebSearch)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                useWebSearch
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : isLightMode
                  ? "text-slate-600 hover:bg-slate-100 border border-transparent"
                  : "text-slate-400 hover:bg-slate-800 border border-transparent"
              }`}
              title="تفعيل البحث اللحظي المباشر في الويب"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>بحث الويب</span>
            </button>

            {/* Thinking Depth Segmented Selector */}
            <div
              className={`hidden sm:flex items-center p-0.5 rounded-xl border ${
                isLightMode
                  ? "bg-slate-100 border-slate-200"
                  : "bg-[#0B0F17] border-slate-800/80"
              }`}
            >
              <button
                type="button"
                onClick={() => setThinkingMode("fast")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  thinkingMode === "fast"
                    ? isLightMode
                      ? "bg-white text-slate-900 shadow-xs"
                      : "bg-slate-800 text-slate-100"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>سريع</span>
              </button>
              <button
                type="button"
                onClick={() => setThinkingMode("balanced")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  thinkingMode === "balanced"
                    ? isLightMode
                      ? "bg-white text-slate-900 shadow-xs"
                      : "bg-slate-800 text-slate-100"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>متوازن</span>
              </button>
              <button
                type="button"
                onClick={() => setThinkingMode("deep")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  thinkingMode === "deep"
                    ? isLightMode
                      ? "bg-white text-slate-900 shadow-xs"
                      : "bg-slate-800 text-emerald-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>تفكير عميق</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Voice Recording Button */}
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isTranscribing || isStreaming}
              className={`p-2 rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                isRecording
                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : isLightMode
                  ? "text-slate-600 hover:bg-slate-100"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title={isRecording ? "إيقاف التسجيل" : "إملاء صوتي"}
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Send or Stop Button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-200 text-slate-900 hover:bg-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                title="إيقاف التوليد"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>إيقاف</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() && attachments.length === 0}
                className={`p-2 rounded-xl transition-all whitespace-nowrap shrink-0 ${
                  input.trim() || attachments.length > 0
                    ? "bg-emerald-600 text-white hover:bg-emerald-500"
                    : isLightMode
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-slate-800/70 text-slate-600 cursor-not-allowed"
                }`}
                title="إرسال (Enter)"
              >
                <Send className="w-4 h-4 rtl:-scale-x-100" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-[11px] text-slate-500 pb-3 sm:pb-0">
        يمكن لـ ضياء ارتكاب بعض الأخطاء. يرجى التحقق من المعلومات الهامة.
      </div>
    </div>
  );
};
