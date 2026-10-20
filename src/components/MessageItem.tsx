import React, { useState, useRef } from "react";
import {
  Copy,
  Check,
  RotateCcw,
  Volume2,
  Loader2,
  Square,
  Edit3,
  ExternalLink,
  FileText,
  Sparkles,
  User,
} from "lucide-react";
import { Message } from "../types";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MessageItemProps {
  message: Message;
  onRegenerate?: () => void;
  onEditUserMessage?: (messageId: string, newContent: string) => void;
  isLastAssistant?: boolean;
  isStreaming?: boolean;
  isLightMode?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRegenerate,
  onEditUserMessage,
  isLastAssistant = false,
  isStreaming = false,
  isLightMode = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.content);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isUser = message.role === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleSaveEdit = () => {
    if (editedText.trim() && onEditUserMessage) {
      onEditUserMessage(message.id, editedText.trim());
      setIsEditing(false);
    }
  };

  const handleSpeak = async () => {
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingAudio(false);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const res = await fetch("/api/chat/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message.content }),
      });
      const data = await res.json();
      if (res.ok && data.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        audioRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
        await audio.play();
        setIsPlayingAudio(true);
      }
    } catch {
      // Ignore TTS playback error
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString(
    "ar-EG",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  if (isUser) {
    return (
      <div className="group flex flex-col items-end my-5">
        <div className="flex items-start gap-3 max-w-[85%] sm:max-w-[75%]">
          <div className="flex flex-col items-end w-full">
            {/* Attachments if any */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 justify-end">
                {message.attachments.map((att) =>
                  att.previewUrl || att.mimeType.startsWith("image/") ? (
                    <img
                      key={att.id}
                      src={
                        att.previewUrl ||
                        `data:${att.mimeType};base64,${att.data}`
                      }
                      alt={att.name}
                      referrerPolicy="no-referrer"
                      className="max-h-48 rounded-xl border border-slate-700 object-cover"
                    />
                  ) : (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200"
                    >
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>{att.name}</span>
                    </div>
                  )
                )}
              </div>
            )}

            {isEditing ? (
              <div
                className={`w-full min-w-[280px] sm:min-w-[400px] p-3 rounded-2xl border ${
                  isLightMode
                    ? "bg-white border-slate-300"
                    : "bg-[#161F30] border-slate-700"
                }`}
              >
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={3}
                  className="w-full bg-transparent text-sm focus:outline-none resize-none"
                />
                <div className="flex items-center justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedText(message.content);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                  >
                    حفظ وإعادة الإرسال
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
                  isLightMode
                    ? "bg-slate-200/80 text-slate-900"
                    : "bg-[#1A2333] text-slate-100 border border-slate-800/80"
                }`}
              >
                {message.content}
              </div>
            )}

            {/* Quiet metadata + edit trigger */}
            <div className="flex items-center gap-2 mt-1.5 px-1 text-[11px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="tabular-nums">{formattedTime}</span>
              {!isEditing && onEditUserMessage && !isStreaming && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 hover:text-slate-300 transition-colors"
                    title="تعديل السؤال"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>تعديل</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isLightMode
                ? "bg-slate-200 text-slate-700"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3.5 my-6">
      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 text-xs text-slate-400">
          <span
            className={`font-semibold ${
              isLightMode ? "text-slate-900" : "text-slate-200"
            }`}
          >
            نُور
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            Gemini 3.8 Flash
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums text-[11px] text-slate-500">
            {formattedTime}
          </span>
        </div>

        {message.isError ? (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {message.content}
          </div>
        ) : message.content ? (
          <MarkdownRenderer
            content={message.content}
            isLightMode={isLightMode}
          />
        ) : (
          <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>يفكر نُور...</span>
          </div>
        )}

        {/* Web Search Grounding Citations */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/60">
            <div className="text-xs text-slate-400 mb-2">
              المصادر المرجعية من الويب:
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400">
              {message.sources.map((src, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span aria-hidden="true">·</span>}
                  <a
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline truncate max-w-[240px]"
                  >
                    <span className="truncate">{src.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Message Action Toolbar */}
        {message.content && !isStreaming && (
          <div className="flex items-center gap-3 mt-2.5 text-xs text-slate-500">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 hover:text-slate-300 transition-colors whitespace-nowrap shrink-0"
              title="نسخ الإجابة"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ</span>
                </>
              )}
            </button>

            <span aria-hidden="true">·</span>

            <button
              type="button"
              onClick={handleSpeak}
              disabled={isLoadingAudio}
              className="flex items-center gap-1 hover:text-slate-300 transition-colors whitespace-nowrap shrink-0"
              title="قراءة صوتية للإجابة"
            >
              {isLoadingAudio ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>جارٍ التحضير...</span>
                </>
              ) : isPlayingAudio ? (
                <>
                  <Square className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                  <span className="text-emerald-400">إيقاف القراءة</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>استماع</span>
                </>
              )}
            </button>

            {isLastAssistant && onRegenerate && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="flex items-center gap-1 hover:text-slate-300 transition-colors whitespace-nowrap shrink-0"
                  title="إعادة توليد الإجابة"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة التوليد</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
