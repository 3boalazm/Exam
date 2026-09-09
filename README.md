# Mini Exam — منصة الامتحانات المصغّرة 📝

منصة صغيرة للمعلم: من إدخال المحتوى حتى استلام نتائج الطلاب على WhatsApp في Flow واحد بسيط.

```
إدخال المحتوى / نماذج الأسئلة
        ↓
اختيار الدرس ونوع الأسئلة
        ↓
توليد الامتحان (بنك الأسئلة أو Groq + Validation)
        ↓
مراجعة المعلم (تعديل / إعادة توليد / حذف)
        ↓
نشر الامتحان + رابط
        ↓
الطلاب يحلّون (بدون Login)
        ↓
تصحيح تلقائي (Server-side)
        ↓
نتائج الطلاب
        ↓
إرسال النتيجة على WhatsApp
```

---

## ✨ المميزات

- **طريقتان للتوليد**: اختيار عشوائي سريع من بنك الأسئلة مباشرة (الافتراضي)، أو توليد بالذكاء الاصطناعي عبر Groq.
- **توليد Groq اختياري** بناءً على بنك أسئلة مرجعي — مع Pipeline تحقق كامل قبل دخول أي سؤال الامتحان.
- **إعدادات Groq يدوية (BYOK)**: صفحة إعدادات يضيف فيها كل معلم مفتاح Groq الخاص به + النموذج مع زر اختبار اتصال — تُفعّل الذكاء الاصطناعي على الموقع كله وتسبق مفتاح متغيرات البيئة.
- **أسئلة متغيّرة في كل اختبار**: اختيار عشوائي حقيقي من البنك + استبعاد أسئلة اختباراتك السابقة لنفس الدرس (مع تراجع آمن عند نفاد البنك)، وإصلاح ذاتي لنموذج Groq المحذوف عبر قائمة النماذج الحيّة.
- **4 أنواع أسئلة**: اختيار من متعدد (MCQ)، صح/غلط، توصيل (Matching)، ترتيب (Ordering).
- **التحكم للمعلم**: المادة، الموضوع، الدرس، أنواع الأسئلة، العدد، الصعوبة.
- **مراجعة كاملة قبل النشر**: تعديل نص/اختيارات/إجابة/درجة/حل، إعادة توليد سؤال بديل، حذف، إعادة ترتيب، إضافة سؤال يدويًا.
- **تصحيح تلقائي فوري** بدون AI — الدرجة والنسبة وتفاصيل كل إجابة.
- **شاشة نتائج** بالمعلم: إحصائيات + جدول الطلاب + تفصيل إجابات كل طالب.
- **إرسال النتيجة على WhatsApp** برسالة ديناميكية جاهزة (بدون API، عبر `wa.me`).
- **وضع تجريبي** يعمل بدون Firebase/Groq إطلاقًا — للتجربة الفورية.

---

## 🧱 التقنيات

| الجزء | التقنية |
|------|--------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS (RTL) |
| Backend | Next.js Serverless (Route Handlers + Server-Side Logic) |
| Database | Cloud Firestore (Firebase Admin SDK) |
| Authentication | Firebase Auth (للمعلمين فقط) |
| AI | Groq API |
| Validation | Zod + Logic Validators |
| WhatsApp | `wa.me` link (بدون API) |
| Hosting | Vercel |

**لا Railway، لا Supabase، لا NestJS، لا Microservices.**

---

## 🚀 التشغيل محليًا (وضع تجريبي — بدون أي مفاتيح)

```bash
npm install
npm run dev
```

افتح `http://localhost:3000` وسجّل دخولًا بأي بريد (الوضع التجريبي تلقائيًا إذا لم توجد مفاتيح Firebase).

> **الوضع التجريبي**: الاختيار من **بنك الأسئلة المحلي** (`data/mathematics.json`) هو الوضع الافتراضي ولا يحتاج Groq. وإذا اختير AI بدون `GROQ_API_KEY` يرجع النظام تلقائيًا للبنك. التخزين يكون محليًا بدل Firestore. مثالي للتجربة والإبلاغ.

### اختبار الـ Flow كاملًا عبر API

```bash
# توليد امتحان (معلم تجريبي)
curl -X POST http://localhost:3000/api/exams/generate \
  -H "Content-Type: application/json" -H "x-demo-teacher: demo-ahmed" \
  -d '{"title":"اختبار المتتابعات","subject":"الرياضيات","topics":["المتتابعات والأوساط الحسابية","المتتابعات والأوساط الهندسية"],"generationSource":"bank","questionTypes":["MCQ"],"difficulty":"mixed","questionCount":8}'
```

---

## ⚙️ الإعداد للإنتاج (Firebase + Groq + Vercel)

### 1) Firebase
1. أنشئ مشروعًا في [Firebase Console](https://console.firebase.google.com/).
2. **Authentication** → Sign-in method → فعّل **Email/Password**.
3. **Firestore Database** → أنشئ قاعدة (Production mode).
4. **Project Settings** → Service accounts → **Generate new private key** → انسخ محتوى الملف كاملًا.
5. أنشئ **Web App** وانسخ إعدادات SDK (`apiKey`, `authDomain`, `projectId`, `appId`).

### 2) Groq
- أنشئ مفتاحًا من [Groq Console](https://console.groq.com/keys).
- **بديل بدون متغيرات بيئة**: يستطيع كل معلم إضافة مفتاحه الخاص من صفحة
  **الإعدادات** (`⚙️ الإعدادات` في الشريط العلوي) — المفتاح اليدوي يأخذ
  الأولوية على `GROQ_API_KEY` ويُخزَّن على الخادم فقط (لا يظهر في المتصفح).

### 3) Vercel
1. استورد المستودع في Vercel.
2. أضف متغيرات البيئة (Environment Variables) من `.env.example` — انظر الجدول أدناه.
3. Deploy.

### 📋 متغيرات البيئة

| المتغير | النوع | الوصف |
|--------|-------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | عام | من إعدادات Web App |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | عام | من إعدادات Web App |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | عام | من إعدادات Web App |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | عام | من إعدادات Web App |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **سرّي** | ملف الـ Service Account كاملًا كسلسلة JSON (لـ Admin SDK) |
| `GROQ_API_KEY` | **سرّي** | مفتاح Groq |
| `GROQ_MODEL` | عام (اختياري) | نموذج Groq — الافتراضي `qwen/qwen3-32b` (يمكن لكل معلم اختيار نموذج من القائمة الحيّة في صفحة الإعدادات) |
| `NEXT_PUBLIC_SITE_URL` | عام | رابط الموقع النهائي لإنشاء روابط الامتحان |
| `DEMO_MODE` | عام (اختياري) | `1` = تجريبي إجباري، `0` = Firebase إجباري، فارغ = تلقائي |

> ⚠️ **الأمان**: `GROQ_API_KEY` و`FIREBASE_SERVICE_ACCOUNT_JSON` يعيشان **على الخادم فقط** ولا يظهران في المتصفح إطلاقًا. المفتاح اليدوي الذي يضيفه المعلم من صفحة الإعدادات يُحفظ أيضًا على الخادم فقط (مجموعة `groq_settings` منفصلة عن مستند المعلم).

---

## 🔐 الأمان

- **الطالب لا يرى الإجابات الصحيحة**: نسخة الطالب المُرسلة للمنتصف **معقّمة** — بدون `correctAnswer` وبدون `solution`. التصحيح يحدث Server-side فقط.
- **مستحيل تزوير النتيجة**: الطالب يرسل إجاباته فقط (`{q1: "B", q2: true, ...}`) — **لا يرسل الدرجة أبدًا**. الدرجة يُحسبها الخادم من الإجابات الصحيحة المخزنة في Firestore.
- **مصادقة المعلم**: عبر Firebase Auth (ID Token) في الإنتاج. كل عمليات المعلم مُتحقق منها.
- **ممنوع تعديل امتحان منشور**: تعديل/إعادة توليد/حذف الأسئلة يُرفض أثناء `published` — أغلقه أولًا ثم عدّل.
- **منع تكرار المحاولة**: نفس رقم الواتساب على نفس الامتحان = نفس المحاولة (لا إعادة تقديم).

### قواعد Firestore (قالب مرجعي)
كل القراءة/الكتابة الحساسة تتم عبر **Admin SDK** (خادم)، لذا يمكن تشديد قواعد Firestore. أنظر `firestore.rules` — الفكرة: لا يتفاعل أي عميل مباشر مع البيانات الحساسة.

---

## 📊 نموذج البيانات

```
teachers/{teacherId}      { name, email, createdAt }
groq_settings/{teacherId} { apiKey, model, updatedAt }   ← مفتاح Groq اليدوي (سرّي، خادم فقط)
exams/{examId}            { teacherId, title, subject, topic, topics[], subtopic,
                            generationSource(bank|ai), difficulty, questionTypes, questionCount,
                            status(draft|published|closed), code,
                            showResult, whatsappMessage, createdAt, publishedAt }
questions/{questionId}    { examId, type, question, data, correctAnswer,
                            solution, points, order }
attempts/{attemptId}      { examId, studentName, studentPhone,
                            score, totalScore, percentage, submittedAt }
answers/{answerId}        { attemptId, questionId, answer, isCorrect, points }
```

### شكل `data` حسب النوع
```jsonc
// MCQ
{ "options": ["10", "15", "20", "25"] }
// TRUE_FALSE
{ "statement": "..." }
// MATCHING
{ "leftItems": [], "rightItems": [] }
// ORDERING
{ "items": [] }   // بالترتيب الصحيح، تُعرض للطالب مبعثرة
```

### شكل `correctAnswer` حسب النوع
```
MCQ        → نص الاختيار الصحيح (string)
TRUE_FALSE → true | false
MATCHING   → number[]  (فهرس العنصر الصحيح في rightItems لكل left)
ORDERING   → string[]  (العناصر بالترتيب الصحيح)
```

---

## 🧠 Pipeline الـ AI

```
Teacher Settings
      ↓
Build Prompt (مع Reference Questions من البنك)
      ↓
Groq (json_object)
      ↓
Parse JSON
      ↓
Zod / Schema Validation
      ↓
Content + Answer Validation
      ↓
Math / Solution Validation
      ↓
Duplicate Check
      ↓
Firestore
```

- لو فشل سؤال: **Reject → Regenerate** (حتى 3 محاولات منفردة).
- **Groq لا يملك القرار**: النوع يحدده المعلم، والتصحيح يعمله النظام.
- **بنك الأسئلة هو الافتراضي**: `generationSource: "bank"` يختار عشوائيًا من `data/mathematics.json` حتى لو كان مفتاح Groq موجودًا.
- عند اختيار `generationSource: "ai"` بدون مفتاح Groq، يرجع النظام تلقائيًا إلى البنك بدل فشل الطلب.

---

## 🗂 هيكل المشروع

```
app/
├── page.tsx                    # الـ Landing
├── login/                      # دخول المعلم
├── dashboard/                  # لوحة تحكم المعلم
├── exams/
│   ├── new/                    # إنشاء اختبار + Generate
│   └── [id]/
│       ├── page.tsx            # معاينة/مراجعة/تعديل + نشر
│       └── results/            # شاشة النتائج
├── exam/[code]/                # صفحة الطالب (بدون Login)
└── api/                        # Route Handlers
    ├── config/  auth/me/  dashboard/
    ├── exams/generate/  [id]/  [id]/results/  code/[code]/
    ├── questions/  [id]/  [id]/regenerate/  reorder/
    └── attempts/  [id]/

lib/
├── firebase/   admin.ts · client.ts
├── groq/       generator.ts (Prompt + Groq call)
├── questions/  types.ts · validator.ts · grader.ts · generator.ts
├── services/   exam · question · generation · grading · result
├── store/      types · index · firebase-store · demo-store
├── whatsapp/   message.ts
├── api.ts      (auth + wrapper)
├── api-schemas.ts  (Zod)
├── bank.ts     (بنك الأسئلة المرجعي)
├── client.ts   (auth + fetch للواجهة)
└── utils.ts

data/
└── mathematics.json   # بنك الأسئلة المرجعي (Seed)
```

---

## 📡 API

| Method | Path | الوصف | Auth |
|--------|------|-------|------|
| `GET` | `/api/config` | الإعدادات + مواضيع البنك | — |
| `POST` | `/api/auth/me` | ضمان مستند المعلم | معلم |
| `GET` | `/api/dashboard` | بيانات اللوحة | معلم |
| `POST` | `/api/exams/generate` | توليد امتحان | معلم |
| `GET` | `/api/exams/[id]` | اختبار + أسئلته | معلم |
| `PATCH` | `/api/exams/[id]` | نشر/إغلاق/تحديث وصفية | معلم |
| `DELETE` | `/api/exams/[id]` | حذف | معلم |
| `GET` | `/api/exams/[id]/results` | النتائج + الإجابات | معلم |
| `GET` | `/api/exams/code/[code]` | نسخة الطالب المعقّمة | — |
| `POST` | `/api/questions` | إضافة سؤال يدوي | معلم |
| `PATCH` | `/api/questions/[id]` | تعديل سؤال | معلم |
| `DELETE` | `/api/questions/[id]` | حذف سؤال | معلم |
| `POST` | `/api/questions/[id]/regenerate` | إعادة توليد | معلم |
| `POST` | `/api/questions/reorder` | إعادة ترتيب | معلم |
| `POST` | `/api/attempts` | تسليم الطالب (تصحيح) | — |
| `GET` | `/api/attempts/[id]` | تفاصيل محاولة | معلم |
| `GET` | `/api/settings/groq` | حالة إعداد Groq (مقنّع) | معلم |
| `PUT` | `/api/settings/groq` | حفظ مفتاح Groq + النموذج | معلم |
| `DELETE` | `/api/settings/groq` | إزالة المفتاح اليدوي | معلم |
| `POST` | `/api/settings/groq/test` | اختبار اتصال Groq | معلم |

---

## 🔮 التوسعات القادمة (Phase 2+)

- **WhatsApp Business API** لإرسال النتيجة تلقائيًا للطالب (بدل زر المعلم).
- نقل بنك الأسئلة من JSON إلى Firestore ليديره المعلم من Dashboard.
- مؤقت زمني للاختبار، وإظهار/إخفاء الحل بعد النشر.
- رسوم بيانية أكثر تفصيلًا (توزيع الدرجات، تحليل كل سؤال).
- مواد ومواد دراسية إضافية + استيراد من ملف PDF/DOCX.
