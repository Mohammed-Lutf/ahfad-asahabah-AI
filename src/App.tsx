import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Pin,
  Download,
  Sliders,
  Sun,
  Moon,
  X,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Code2,
  Globe,
  FileSearch,
  Image as ImageIcon,
  Gamepad2,
  BookOpen,
  Users,
  Award,
  Compass,
} from "lucide-react";
import { Conversation, ThinkingMode, Attachment, PersonaPreset } from "./types";
import { MessageItem } from "./components/MessageItem";
import { ChatComposer } from "./components/ChatComposer";
import { ImageStudio } from "./components/ImageStudio";
import { DiaaGame } from "./components/DiaaGame";
import {
  getCompleteSystemInstruction,
  CORE_KNOWLEDGE,
} from "./knowledge/systemKnowledge";

const STORAGE_KEY = "diaa_ai_conversations_v1";
const LEGACY_STORAGE_KEY = "noor_ai_conversations_v1";

const PERSONA_PRESETS: PersonaPreset[] = [
  {
    id: "admin_manager",
    name: "ضياء - المدير الإداري والمخطط الاستراتيجي",
    description: "التخطيط التشغيلي للمراكز والحلقات، إعداد الميزانيات، وهيكلة اللجان التنفيذية",
    instruction: getCompleteSystemInstruction(
      "أنت تعمل كمدير إداري ومخطط استراتيجي خبير للحلقات القرآنية والمراكز العلمية والدعوية والمساجد. ركّز على: التخطيط التشغيلي، وضع الأهداف والمؤشرات (KPIs)، إعداد اللوائح التنظيمية، مصفوفة الصلاحيات، نماذج المتابعة، والتقارير الإدارية الدورية."
    ),
  },
  {
    id: "student_affairs",
    name: "ضياء - رعاية شؤون الطلاب والأنشطة القيادية",
    description: "توزيع المسميات والرتب القيادية للطلاب، الأنشطة الميدانية، المخيمات، وبنك النقاط",
    instruction: getCompleteSystemInstruction(
      "أنت تعمل كمشرف تربوي ومسؤول عن شؤون الطلاب والأنشطة القيادية في الحلقات والمراكز. تخصصك هو: توزيع المسميات القيادية (النقيب، العريف، مسؤولي اللجان)، تنظيم المخيمات التربوية، الدوريات الرياضية، المسابقات التنافسية، ولائحة بنك النقاط والتحفيز السلوكي وتكريم الحفاظ."
    ),
  },
  {
    id: "quran_academic",
    name: "ضياء - المشرف القرآني ومناهج الإتقان",
    description: "تنظيم مسارات الحفظ والمراجعة الثلاثية، خطط الإتقان، واختبارات الإجازات",
    instruction: getCompleteSystemInstruction(
      "أنت تعمل كمشرف قرآني وخبير في مناهج التلاوة والتحفيظ. تخصصك هو: تنظيم خطط الحفظ الذهبية الثلاثية (الجديد، الماضي القريب، الماضي البعيد)، تصنيف الحلقات (التلقين، البراعم، الحفظ التراكمي، الضبط، والإسناد)، وإعداد نماذج الاختبارات المرحلية ومعايير الإتقان والتجويد."
    ),
  },
  {
    id: "dawah_guide",
    name: "ضياء - المستشار الدعوي ورسالة المساجد",
    description: "إعداد الكلمات التوجيهية، مجالس العلم وسير الصحابة، وإحياء المواسم الفاضلة",
    instruction: getCompleteSystemInstruction(
      "أنت تعمل كمستشار دعوي وعلمي للمساجد والمراكز والمجتمعات. ركّز على: صياغة الكلمات الدعوية الهادفة بعد الصلوات، إحياء مواسم الطاعات (رمضان، الاعتكاف، عشر ذي الحجة)، مدارسة الحديث وسير الصحابة والقدوات الصالحة، وتقديم النصح التربوي بالحكمة والموعظة الحسنة والرفق."
    ),
  },
  {
    id: "default",
    name: "ضياء - المساعد الشامل",
    description: "المساعد الذكي الرسمي والشامل لمنصة أحفاد الصحابة AI لكافة المهام اليومية",
    instruction: getCompleteSystemInstruction(
      "قدم إجابات شاملة، متوازنة، ودقيقة لكافة المهام اليومية والأسئلة العامة مع توضيح هويتك كـ ضياء المساعد الذكي الرسمي لمنصة أحفاد الصحابة AI."
    ),
  },
  {
    id: "coder",
    name: "ضياء - مهندس البرمجيات والمنصة",
    description: "العمل على المنصة وكتابة الأكواد وتصحيحها ومراجعة البنية الهندسية",
    instruction: getCompleteSystemInstruction(
      "أنت تعمل كمهندس برمجيات ونظم خبير لمساعدة المستخدمين في البرمجة والتطوير والعمل على المنصة وبناء الأنظمة. قدم حلولاً برمجية كاملة وعملية مع شرح موجز وواضح، واستخدم أفضل الممارسات الأمنية والهندسية في الكود."
    ),
  },
];

const STARTER_PROMPTS = [
  {
    title: "خطة تشغيلية لإدارة الحلقات",
    subtitle: "جدول الحفظ والمراجعة الثلاثية، السجلات، وتوزيع مستويات الطلاب",
    prompt:
      "ضع لي خطة تشغيلية فصلية متكاملة لإدارة حلقة قرآنية تضم 15 طالباً، تتضمن جدول الحفظ الجديد والماضي القريب والماضي البعيد، خطة متابعة الحضور والغياب، ونموذج بطاقة الطالب الشهرية.",
    icon: BookOpen,
  },
  {
    title: "الهيكل القيادي وتوزيع اللجان",
    subtitle: "مهام نقيب الحلقة، عريف المجموعة، وتنظيم المخيمات والرحلات",
    prompt:
      "وضح لي الهيكل التنظيمي للطلاب داخل الحلقة والمسجد، وكيفية توزيع المهام القيادية بين (نقيب الحلقة، عريف المجموعة، أمين النشاط الثقافي، وأمين النشاط الرياضي والاجتماعي)، مع خطة متكاملة لمخيم تربوي هادف.",
    icon: Users,
  },
  {
    title: "نظام بنك النقاط والتحفيز",
    subtitle: "معايير كسب النقاط، التكريم الأسبوعي، وجوائز الحفل الختامي",
    prompt:
      "صمم لي لائحة تحفيزية متكاملة قائمة على نظام \"بنك النقاط\" لحلقات التحفيظ والمراكز العلمية، توضح معايير احتساب النقاط (الحضور، الإتقان، السلوك، خدمة المسجد) وآلية صرف الجوائز وتكريم المتميزين.",
    icon: Award,
  },
  {
    title: "البرامج الدعوية ورسالة المسجد",
    subtitle: "جدول الكلمات بعد الصلوات، مجالس التفسير، وإحياء مواسم الطاعات",
    prompt:
      "اكتب لي جدولاً دعوياً شهرياً للمسجد والمركز العلمي، يشمل عناوين كلمات قصيرة بعد الصلوات (3-5 دقائق)، برنامج مدارسة سير الصحابة الكرام، وخطة لإحياء مواسم الخير والاعتكاف.",
    icon: Compass,
  },
  {
    title: "كتابة وتطوير كود برمجي",
    subtitle: "بناء وتصحيح مكونات الويب والأنظمة البرمجية الحديثة",
    prompt:
      "اكتب لي كود مكون React باستخدام TypeScript و Tailwind CSS لعرض لوحة متابعة طلاب الحلقات ودرجات الحفظ والغياب، مع فلترة وبحث سريع.",
    icon: Code2,
  },
  {
    title: "بحث متقدم في الويب ومقارنة",
    subtitle: "البحث المباشر عبر Google Search Grounding للنتائج الحديثة",
    prompt:
      "ابحث لي في الويب عن أحدث الاستراتيجيات والتقنيات التعليمية العالمية المطبقة في تحفيظ القرآن الكريم والتعليم التفاعلي للنشء، وقدم لي ملخصاً مقارناً مع المصادر المرجعية.",
    icon: Globe,
  },
];

export default function App() {
  const [appView, setAppView] = useState<"chat" | "images" | "game">("chat");
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore localStorage error
    }
    const initialConv: Conversation = {
      id: "conv-initial",
      title: "محادثة جديدة",
      updatedAt: Date.now(),
      messages: [],
      systemInstruction: PERSONA_PRESETS[0].instruction,
    };
    return [initialConv];
  });

  const [activeId, setActiveId] = useState<string>(() => conversations[0]?.id || "conv-initial");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [thinkingMode, setThinkingMode] = useState<ThinkingMode>("balanced");
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState("default");
  const [customInstruction, setCustomInstruction] = useState(
    PERSONA_PRESETS[0].instruction
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation =
    conversations.find((c) => c.id === activeId) || conversations[0];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // Ignore quota errors
    }
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages.length, isStreaming]);

  const createNewChat = () => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: "محادثة جديدة",
      updatedAt: Date.now(),
      messages: [],
      systemInstruction: customInstruction,
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const fallback: Conversation = {
          id: `conv-${Date.now()}`,
          title: "محادثة جديدة",
          updatedAt: Date.now(),
          messages: [],
          systemInstruction: customInstruction,
        };
        setActiveId(fallback.id);
        return [fallback];
      }
      if (id === activeId) {
        setActiveId(remaining[0].id);
      }
      return remaining;
    });
  };

  const togglePinConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  };

  const exportCurrentConversation = () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    const lines = [
      `# ${activeConversation.title}`,
      `تاريخ التصدير: ${new Date().toLocaleString("ar-EG")}`,
      "",
    ];
    for (const msg of activeConversation.messages) {
      const sender = msg.role === "user" ? "## أنت" : "## ضياء (Diaa AI)";
      lines.push(sender);
      lines.push(msg.content);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeConversation.title.replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateTitleForChat = async (convId: string, firstMessage: string) => {
    try {
      const res = await fetch("/api/chat/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: firstMessage }),
      });
      const data = await res.json();
      if (data.title) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: data.title } : c))
        );
      }
    } catch {
      // Ignore title generation failure
    }
  };

  const streamAssistantResponse = async (
    convId: string,
    messagesHistory: Conversation["messages"],
    mode: ThinkingMode,
    webSearch: boolean
  ) => {
    const assistantMsgId = `msg-${Date.now()}-ai`;
    const initialAssistantMsg = {
      id: assistantMsgId,
      role: "assistant" as const,
      content: "",
      timestamp: Date.now(),
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              updatedAt: Date.now(),
              messages: [...messagesHistory, initialAssistantMsg],
            }
          : c
      )
    );

    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesHistory,
          systemInstruction: getCompleteSystemInstruction(
            activeConversation?.systemInstruction || customInstruction
          ),
          thinkingMode: mode,
          useWebSearch: webSearch,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || "تعذر الاتصال بالخادم الذكي. حاول مرة أخرى."
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let accumulatedText = "";
      let accumulatedSources: { title: string; uri: string }[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const dataStr = line.replace(/^data:\s*/, "");
          if (dataStr === "[DONE]") break;

          let parsed: any = null;
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            // Ignore incomplete segment from chunk split
            continue;
          }

          if (parsed?.error) {
            let errorText = parsed.error;
            try {
              const nested = JSON.parse(errorText);
              if (nested?.error?.message) {
                errorText = nested.error.message;
              }
            } catch {
              // Not nested JSON
            }
            throw new Error(errorText);
          }

          if (parsed?.text) {
            accumulatedText += parsed.text;
          }
          if (parsed?.sources && Array.isArray(parsed.sources)) {
            for (const src of parsed.sources) {
              if (!accumulatedSources.some((s) => s.uri === src.uri)) {
                accumulatedSources.push(src);
              }
            }
          }

          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            content: accumulatedText,
                            sources:
                              accumulatedSources.length > 0
                                ? accumulatedSources
                                : undefined,
                          }
                        : m
                    ),
                  }
                : c
            )
          );
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        return;
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content:
                          error?.message || "حدث خطأ غير متوقع أثناء التوليد.",
                        isError: true,
                      }
                    : m
                ),
              }
            : c
        )
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = async (
    text: string,
    attachments: Attachment[],
    mode: ThinkingMode,
    webSearch: boolean
  ) => {
    if (!activeConversation) return;

    const isFirstMessage = activeConversation.messages.length === 0;
    const userMsg = {
      id: `msg-${Date.now()}-user`,
      role: "user" as const,
      content: text,
      timestamp: Date.now(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const updatedHistory = [...activeConversation.messages, userMsg];

    if (isFirstMessage && text) {
      generateTitleForChat(activeConversation.id, text);
    }

    await streamAssistantResponse(
      activeConversation.id,
      updatedHistory,
      mode,
      webSearch
    );
  };

  const handleStopStreaming = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const handleRegenerateLast = async () => {
    if (!activeConversation || isStreaming) return;
    const msgs = activeConversation.messages;
    if (msgs.length === 0) return;

    // Remove last assistant message
    const lastMsg = msgs[msgs.length - 1];
    const historyWithoutLast =
      lastMsg.role === "assistant" ? msgs.slice(0, -1) : msgs;

    if (historyWithoutLast.length === 0) return;

    await streamAssistantResponse(
      activeConversation.id,
      historyWithoutLast,
      thinkingMode,
      useWebSearch
    );
  };

  const handleEditUserMessage = async (
    messageId: string,
    newContent: string
  ) => {
    if (!activeConversation || isStreaming) return;
    const msgIndex = activeConversation.messages.findIndex(
      (m) => m.id === messageId
    );
    if (msgIndex === -1) return;

    const updatedUserMsg = {
      ...activeConversation.messages[msgIndex],
      content: newContent,
      timestamp: Date.now(),
    };

    const truncatedHistory = [
      ...activeConversation.messages.slice(0, msgIndex),
      updatedUserMsg,
    ];

    await streamAssistantResponse(
      activeConversation.id,
      truncatedHistory,
      thinkingMode,
      useWebSearch
    );
  };

  const filteredConversations = conversations
    .filter((c) =>
      c.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden ${
        isLightMode
          ? "bg-[#F8FAFC] text-slate-900"
          : "bg-[#0B0F17] text-[#F1F5F9]"
      }`}
    >
      {/* Collapsible Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        } transition-all duration-200 shrink-0 flex flex-col border-e ${
          isLightMode
            ? "bg-[#F1F5F9] border-slate-200"
            : "bg-[#090D14] border-slate-800/80"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={createNewChat}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>محادثة جديدة</span>
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className={`p-2 rounded-xl transition-colors ${
              isLightMode
                ? "text-slate-600 hover:bg-slate-200"
                : "text-slate-400 hover:bg-slate-800"
            }`}
            title="إخفاء القائمة الجانبية"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3.5 pb-2">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
              isLightMode
                ? "bg-white border-slate-200 text-slate-800"
                : "bg-[#111723] border-slate-800 text-slate-200"
            }`}
          >
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في سجل المحادثات..."
              className="w-full bg-transparent focus:outline-none placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-slate-500">
              لا توجد محادثات مطابقة للبحث.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversation?.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                    isActive
                      ? isLightMode
                        ? "bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200/80"
                        : "bg-[#161F30] text-white font-medium border border-slate-800"
                      : isLightMode
                      ? "text-slate-600 hover:bg-slate-200/60"
                      : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? "text-emerald-500" : "text-slate-500"
                      }`}
                    />
                    <span className="truncate">{conv.title}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={(e) => togglePinConversation(conv.id, e)}
                      className={`p-1 rounded hover:bg-slate-700/50 ${
                        conv.pinned ? "text-emerald-400 opacity-100" : ""
                      }`}
                      title={conv.pinned ? "إلغاء التثبيت" : "تثبيت المحادثة"}
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="p-1 rounded hover:bg-red-500/20 hover:text-red-400"
                      title="حذف المحادثة"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Navigation Section */}
        <div
          className={`p-3 border-t space-y-1 text-xs ${
            isLightMode ? "border-slate-200" : "border-slate-800/80"
          }`}
        >
          <button
            type="button"
            onClick={() => setAppView("chat")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
              appView === "chat"
                ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                : isLightMode
                ? "text-slate-700 hover:bg-slate-200/70"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>المحادثة الذكية</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAppView("images")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
              appView === "images"
                ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                : isLightMode
                ? "text-slate-700 hover:bg-slate-200/70"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>استوديو الصور (توليد وتعديل)</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setAppView("game")}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
              appView === "game"
                ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                : isLightMode
                ? "text-slate-700 hover:bg-slate-200/70"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
              <span>لعبة حارس ضياء (Diaa Guardian)</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowInstructionsModal(true)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
              isLightMode
                ? "text-slate-700 hover:bg-slate-200/70"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>تخصيص شخصية ضياء</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsLightMode(!isLightMode)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
              isLightMode
                ? "text-slate-700 hover:bg-slate-200/70"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isLightMode ? (
                <Moon className="w-3.5 h-3.5 text-slate-600" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isLightMode ? "الوضع الداكن" : "الوضع النهاري"}</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Bar Contract: 3 Clean Zones */}
        <header
          className={`flex items-center justify-between gap-8 px-6 py-3.5 border-b shrink-0 ${
            isLightMode
              ? "bg-white/80 border-slate-200"
              : "bg-[#0B0F17]/90 border-slate-800/80"
          }`}
        >
          {/* Zone 1: Brand Title */}
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className={`p-2 rounded-xl transition-colors ${
                  isLightMode
                    ? "text-slate-600 hover:bg-slate-100"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
                title="إظهار القائمة الجانبية"
              >
                <PanelRightOpen className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight whitespace-nowrap shrink-0 text-emerald-400">
                أحفاد الصحابة AI
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                | ضياء
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gemini 2.5 Flash</span>
            </div>
          </div>

          {/* Zone 2: Concise Navigation / Mode Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
            <button
              type="button"
              onClick={() => setAppView("chat")}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                appView === "chat" ? "text-emerald-400 font-semibold" : "hover:text-emerald-400"
              }`}
            >
              المحادثة الذكية
            </button>
            <button
              type="button"
              onClick={() => setAppView("images")}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                appView === "images" ? "text-emerald-400 font-semibold" : "hover:text-emerald-400"
              }`}
            >
              استوديو الصور
            </button>
            <button
              type="button"
              onClick={() => setAppView("game")}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                appView === "game" ? "text-emerald-400 font-semibold" : "hover:text-emerald-400"
              }`}
            >
              لعبة حارس ضياء
            </button>
            <button
              type="button"
              onClick={() => setShowInstructionsModal(true)}
              className="hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0"
            >
              شخصية المساعد
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {appView === "chat" ? (
              <button
                type="button"
                onClick={exportCurrentConversation}
                disabled={
                  !activeConversation || activeConversation.messages.length === 0
                }
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  !activeConversation || activeConversation.messages.length === 0
                    ? "opacity-40 cursor-not-allowed text-slate-500"
                    : isLightMode
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير المحادثة</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAppView("chat")}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>العودة للمحادثة</span>
              </button>
            )}
          </div>
        </header>

        {/* View Switcher: Chat vs ImageStudio vs DiaaGame */}
        {appView === "images" ? (
          <ImageStudio
            isLightMode={isLightMode}
            onSendToChat={(imageUrl, promptText) => {
              setAppView("chat");
              handleSendMessage(
                `ألقِ نظرة على هذه الصورة التي ولدتها بعنوان: "${promptText}". هل يمكنك تحليلها؟`,
                [
                  {
                    id: `${Date.now()}`,
                    name: "generated-image.png",
                    mimeType: "image/png",
                    data: imageUrl.split(",")[1] || "",
                    previewUrl: imageUrl,
                  },
                ],
                thinkingMode,
                useWebSearch
              );
            }}
          />
        ) : appView === "game" ? (
          <DiaaGame
            onBackToChat={() => setAppView("chat")}
            isLightMode={isLightMode}
          />
        ) : (
          <>
            {/* Scrollable Chat Viewport */}
            <main className="flex-1 overflow-y-auto px-4 sm:px-6">
              <div className="max-w-3xl mx-auto py-6">
                {!activeConversation ||
                activeConversation.messages.length === 0 ? (
                  /* Empty State / Welcome Screen */
                  <div className="flex flex-col items-center justify-center min-h-[62vh] text-center px-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
                      <Sparkles className="w-6 h-6" />
                    </div>

                    <h1
                      className="text-2xl sm:text-3xl font-bold tracking-tight mb-2.5"
                      style={{ textWrap: "balance" }}
                    >
                      أهلاً بك في منصة أحفاد الصحابة AI
                    </h1>
                    <p className="text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
                      المساعد الذكي المتطور ضياء (Diaa AI) لمساعدتك في العمل على منصة أحفاد الصحابة AI، إدارة الحلقات وشؤون الطلاب، كتابة وتنزيل الأكواد، تحليل البيانات، وتوليد وتعديل الصور.
                    </p>

                    {/* Actionable Feature Tiles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-4xl text-right">
                      {STARTER_PROMPTS.map((item, idx) => {
                        const IconComponent = item.icon;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              handleSendMessage(
                                item.prompt,
                                [],
                                thinkingMode,
                                useWebSearch
                              )
                            }
                            className={`group flex flex-col justify-between p-4 rounded-2xl border text-right transition-all ${
                              isLightMode
                                ? "bg-white border-slate-200/90 hover:border-emerald-500/50 hover:shadow-xs"
                                : "bg-[#111723] border-slate-800/90 hover:border-slate-700 hover:bg-[#151D2C]"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-sm font-semibold group-hover:text-emerald-400 transition-colors">
                                  {item.title}
                                </span>
                                <IconComponent className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                {item.subtitle}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Populated Conversation Thread */
                  <div className="space-y-2 pb-6">
                    {activeConversation.messages.map((msg, index) => {
                      const isLastAssistant =
                        msg.role === "assistant" &&
                        index === activeConversation.messages.length - 1;
                      return (
                        <MessageItem
                          key={msg.id}
                          message={msg}
                          isLastAssistant={isLastAssistant}
                          isStreaming={isStreaming && isLastAssistant}
                          onRegenerate={handleRegenerateLast}
                          onEditUserMessage={handleEditUserMessage}
                          isLightMode={isLightMode}
                        />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </main>

            {/* Bottom Docked Composer */}
            <ChatComposer
              onSend={handleSendMessage}
              onStop={handleStopStreaming}
              isStreaming={isStreaming}
              thinkingMode={thinkingMode}
              setThinkingMode={setThinkingMode}
              useWebSearch={useWebSearch}
              setUseWebSearch={setUseWebSearch}
              isLightMode={isLightMode}
            />
          </>
        )}
      </div>

      {/* Custom System Instructions / Persona Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-xl ${
              isLightMode
                ? "bg-white border-slate-200 text-slate-900"
                : "bg-[#111723] border-slate-800 text-slate-100"
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
              <h2 className="text-base font-bold">
                تخصيص شخصية ضياء وتعليمات النظام
              </h2>
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  اختر نمط الشخصية الجاهز:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERSONA_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        setCustomInstruction(preset.instruction);
                      }}
                      className={`p-3 rounded-xl border text-right transition-colors ${
                        selectedPresetId === preset.id
                          ? "border-emerald-500 bg-emerald-500/10"
                          : isLightMode
                          ? "border-slate-200 hover:bg-slate-50"
                          : "border-slate-800 hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="text-xs font-semibold mb-1">
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">
                        {preset.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  التعليمات المخصصة (System Instruction):
                </label>
                <textarea
                  rows={4}
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  className={`w-full rounded-xl border p-3 text-xs leading-relaxed focus:outline-none ${
                    isLightMode
                      ? "bg-slate-50 border-slate-200 text-slate-900"
                      : "bg-[#0B0F17] border-slate-800 text-slate-200"
                  }`}
                  placeholder="حدد كيف تريد أن يتصرف المساعد أو أسلوب الإجابة المفضل..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.id === activeConversation?.id
                        ? { ...c, systemInstruction: customInstruction }
                        : c
                    )
                  );
                  setShowInstructionsModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                حفظ وتطبيق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
