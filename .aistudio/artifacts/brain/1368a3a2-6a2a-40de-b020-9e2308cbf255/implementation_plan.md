# خطة تفعيل الخادم الذكي مباشرة على Netlify عبر Netlify Functions

## ملخص الهدف والحل
لقد أكدت أنك تريد تشغيل كامل ميزات الذكاء الاصطناعي **مباشرة داخل Netlify** بدون الحاجة إلى استضافة خارجية منفصلة.  
سنقوم بتحويل نقاط الاتصال (`/api/chat/stream`, `/api/chat/title`, `/api/chat/tts`, `/api/image/generate`, `/api/image/edit`) إلى **Netlify Functions** خفيفة وسريعة تعمل بسلاسة على بيئة Netlify السحابية (Serverless Edge & Node.js).

---

## 1. المعمارية الفنية على Netlify

```
┌─────────────────────────────────────────────────────────────┐
│             متصفح المستخدم على Netlify                      │
│        (https://ahfad-assahabbah99.netlify.app)             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                       طلب /api/*
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Netlify Functions                        │
│          /netlify/functions/chat-stream.ts                  │
│          /netlify/functions/chat-title.ts                   │
│          /netlify/functions/chat-tts.ts                     │
│          /netlify/functions/image-generate.ts               │
│          /netlify/functions/image-edit.ts                   │
│                                                             │
│   (توجيه تلقائي من /api/* عبر netlify.toml)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Google Gemini API                        │
│          (باستخدام GEMINI_API_KEY المعرف في Netlify)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. خطوات التنفيذ التفصيلية

### الخطوة 1: إنشاء مجلد ودوال Netlify Functions (`netlify/functions/`)
1. **`netlify/functions/chat-stream.ts`**:
   - استقبال رسائل المحادثة وبث الإجابة الفورية (Streaming SSE) والبحث الحي عبر Google Search grounding.
2. **`netlify/functions/chat-title.ts`**:
   - تلخيص عنوان المحادثة تلقائياً.
3. **`netlify/functions/chat-tts.ts`**:
   - القراءة الصوتية للإجابات بالذكاء الاصطناعي.
4. **`netlify/functions/image-generate.ts`** & **`image-edit.ts`**:
   - توليد وتعديل الصور بالأوامر النصية.

### الخطوة 2: تحديث `netlify.toml`
- تحديد مجلد الدوال: `functions = "netlify/functions"`
- إضافة قواعد إعادة التوجيه التلقائية (Rewrites):
  - تحويل `/api/chat/stream` إلى `/.netlify/functions/chat-stream`
  - تحويل `/api/chat/title` إلى `/.netlify/functions/chat-title`
  - تحويل `/api/chat/tts` إلى `/.netlify/functions/chat-tts`
  - تحويل `/api/image/generate` إلى `/.netlify/functions/image-generate`
  - تحويل `/api/image/edit` إلى `/.netlify/functions/image-edit`
  - الإبقاء على توجيه SPA العام `/* -> /index.html`

### الخطوة 3: التوافق المزدوج (Dual Compatibility)
- يظل الخادم المحلي `server.ts` قيد العمل للتطوير المباشر المحلي وAI Studio Dev Server، بينما تتولى Netlify Functions الرد فوراً عند نشر الموقع على Netlify.

---

## 3. الخطوة المتبقية على لوحة تحكم Netlify للمستخدم

بعد تطبيق هذه الملفات ورفعها إلى مستودع GitHub:
1. في لوحة تحكم Netlify لموقعك (كما يظهر في صورتك `ahfad-assahabbah99`):
   - اضغط على **Environment variables** في القائمة الجانبية اليسرى.
   - اضغط على **Add a variable**.
   - ضع الاسم: `GEMINI_API_KEY`
   - ضع القيمة: *(مفتاح Google Gemini API الخاص بك)*
2. سيقوم Netlify بعمل Deploy تلقائي، وسيعمل الموقع بالكامل دون أي خطأ في الاتصال!
