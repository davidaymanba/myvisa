import { readingMinutes, type BlogArticle } from "../api/blog";

/**
 * Starter travel guides (seeded into the database, and the website's fallback when the API is down).
 * PLACEHOLDER: general guidance written for the launch — have an expert review it, and keep it current.
 */
const POSTS: Omit<BlogArticle, "readingMinutes">[] = [
  {
    slug: "schengen-visa-checklist",
    title: { ar: "ملف تأشيرة شنغن: قائمة تجهيز لا تنسَ فيها شيئًا", en: "Your Schengen visa file: a checklist that forgets nothing" },
    excerpt: {
      ar: "كل ما تحتاجه قبل موعد البصمة، مرتبًا كما يراجعه موظف المركز — من الجواز إلى كشف الحساب.",
      en: "Everything you need before your biometrics appointment, in the order a visa-centre officer checks it.",
    },
    coverImageId: "1502602898657-3e91760cbb34",
    coverAlt: "برج إيفل عند الغروب",
    tags: ["schengen", "checklist"],
    publishedAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
    author: "فريق ماي فيزا",
    body: {
      ar: `أغلب حالات تأخير تأشيرة شنغن لا تأتي من الرفض، بل من **مستند ناقص** يكتشفه الموظف يوم الموعد. رتّب ملفك بهذا التسلسل وستختصر على نفسك زيارة ثانية.

## 1. الجواز
- صالح لثلاثة أشهر على الأقل **بعد** تاريخ مغادرتك منطقة شنغن.
- فيه صفحتان فارغتان على الأقل.
- صادر خلال آخر عشر سنوات.

## 2. الصورة الشخصية
صورة حديثة بخلفية فاتحة ومقاس 35×45 مم. راجع [دليل الصورة](/blog/visa-photo-guide) قبل التصوير.

## 3. إثبات الرحلة
- حجز طيران ذهاب وعودة (يكفي غالبًا حجز مبدئي).
- حجز فندق يغطي كامل الإقامة.
- تأمين سفر يغطي 30,000 يورو على الأقل وصالح في كل دول شنغن.

## 4. الوضع المالي والوظيفي
- كشف حساب بنكي لآخر ثلاثة إلى ستة أشهر، مختوم من البنك.
- خطاب تعريف من جهة العمل يذكر الراتب والمسمى وتاريخ الالتحاق.

## 5. توقيت التقديم
يمكنك التقديم قبل السفر بستة أشهر كحد أقصى، وننصح بألّا يقل الوقت عن **ثلاثة أسابيع** قبل الرحلة، خاصة في مواسم الصيف والأعياد.

> نصيحة: اطبع نسختين من كل مستند، ورتّبها بنفس ترتيب القائمة أعلاه.

حين تقدّم عبر ماي فيزا، يراجع مختص كل صفحة قبل الموعد، ويخبرك فورًا إن نقص شيء.`,
      en: `Most Schengen delays aren't refusals — they're a **missing document** spotted on appointment day. Put your file together in this order and you'll save yourself a second trip.

## 1. Passport
- Valid for at least three months **after** you leave the Schengen area.
- At least two blank pages.
- Issued within the last ten years.

## 2. Photo
A recent 35×45 mm photo on a light background. Read the [photo guide](/en/blog/visa-photo-guide) before you take it.

## 3. Proof of the trip
- Return flight booking (a reservation is usually enough).
- Hotel booking covering your whole stay.
- Travel insurance covering at least €30,000, valid in every Schengen country.

## 4. Finances and work
- Bank statement for the last three to six months, stamped by the bank.
- Employer letter stating salary, title and start date.

## 5. When to apply
You can apply up to six months before travelling; we recommend at least **three weeks** ahead, especially around summer and the holidays.

> Tip: print two copies of everything, in the order above.

When you apply with myvisa, a specialist checks every page before your appointment and tells you straight away if anything is missing.`,
    },
  },
  {
    slug: "visa-photo-guide",
    title: { ar: "صورة التأشيرة: سبعة أخطاء تُرفض بسببها الصور", en: "Visa photos: seven mistakes that get them rejected" },
    excerpt: {
      ar: "الخلفية، الإضاءة، النظارات، والابتسامة… تفاصيل صغيرة تعيد طلبك أيامًا إلى الوراء.",
      en: "Background, lighting, glasses, the smile — small details that can set your application back by days.",
    },
    coverImageId: "1517841905240-472988babdf9",
    coverAlt: "صورة شخصية بخلفية فاتحة",
    tags: ["photos", "tips"],
    publishedAt: "2026-10-08T09:00:00.000Z",
    updatedAt: "2026-10-08T09:00:00.000Z",
    author: "فريق ماي فيزا",
    body: {
      ar: `الصورة أكثر مستند نطلب استبداله. هذه الأخطاء السبعة هي السبب في أغلب الحالات:

1. **خلفية غير فاتحة أو فيها ظلال.** المطلوب خلفية بيضاء أو رمادية فاتحة متساوية.
2. **صورة قديمة.** يجب أن تكون ملتقطة خلال آخر ستة أشهر.
3. **نظارات أو انعكاس.** انزع النظارات تمامًا.
4. **إمالة الرأس.** الوجه مستقيم ونظرك إلى العدسة مباشرة.
5. **تعبير مبالغ فيه.** ملامح طبيعية والفم مغلق.
6. **فلاتر أو تعديل.** أي تحسين رقمي يرفض الصورة.
7. **مقاس خاطئ.** المقاس يختلف بين الدول؛ شنغن والمملكة المتحدة مثلًا 35×45 مم، والولايات المتحدة 51×51 مم.

## غطاء الرأس
يُقبل غطاء الرأس لأسباب دينية بشرط أن يظهر الوجه كاملًا من أعلى الجبهة إلى أسفل الذقن.

## نصيحة عملية
صوّر قرب نافذة نهارًا بإضاءة أمامية متساوية، أو استخدم استوديو يعرف مواصفات السفارات. ويمكنك رفع الصورة من جوالك في صفحة المستندات، وسنخبرك إن كانت تحتاج إعادة.`,
      en: `The photo is the document we ask customers to replace most often. These seven mistakes cause nearly all of it:

1. **A background that isn't plain and light.** It should be even white or light grey, with no shadows.
2. **An old photo.** It must be taken within the last six months.
3. **Glasses or glare.** Take your glasses off.
4. **A tilted head.** Face straight on, looking into the lens.
5. **An exaggerated expression.** Neutral face, mouth closed.
6. **Filters or retouching.** Any digital enhancement gets it rejected.
7. **The wrong size.** It varies by country — Schengen and the UK use 35×45 mm, the US 51×51 mm.

## Head coverings
Religious head coverings are accepted as long as the whole face shows, from the top of the forehead to the bottom of the chin.

## A practical tip
Shoot by a window in daylight with even light from the front, or use a studio that knows embassy specs. You can upload the photo from your phone on the documents step, and we'll tell you if it needs a retake.`,
    },
  },
  {
    slug: "when-to-apply-for-a-visa",
    title: { ar: "متى تقدّم على التأشيرة؟ دليل التوقيت حسب نوعها", en: "When should you apply? Visa timing, type by type" },
    excerpt: {
      ar: "التأشيرة الإلكترونية تختلف عن الملصقة، والمواسم تغيّر كل شيء. هكذا تخطط دون قلق.",
      en: "E-visas aren't sticker visas, and the season changes everything. Here's how to plan without the stress.",
    },
    coverImageId: "1436491865332-7a61a109cc05",
    coverAlt: "طائرة فوق الغيوم",
    tags: ["planning", "tips"],
    publishedAt: "2026-10-15T09:00:00.000Z",
    updatedAt: "2026-10-15T09:00:00.000Z",
    author: "فريق ماي فيزا",
    body: {
      ar: `توقيت التقديم يعتمد على **نوع التأشيرة** أكثر من الوجهة نفسها.

| النوع | متى تبدأ | ملاحظة |
|---|---|---|
| إعفاء من التأشيرة | لا حاجة | تأكد من صلاحية الجواز وشروط الدخول |
| تصريح إلكتروني (ETA) | قبل أسبوع إلى أسبوعين | غالبًا يصدر خلال أيام |
| تأشيرة إلكترونية | قبل أسبوعين إلى أربعة | بعض الدول تطلب مستندات إضافية |
| تأشيرة ملصقة بموعد | قبل شهر إلى ثلاثة | المواعيد تمتلئ في المواسم |

## المواسم تغيّر الحساب
في الصيف وقبل الأعياد والإجازات المدرسية تمتلئ مواعيد مراكز التأشيرات بسرعة. أضف أسبوعين إلى ثلاثة على التقديرات أعلاه.

## لا تحجز غير القابل للاسترداد مبكرًا
احجز طيرانًا وفندقًا **قابلين للإلغاء** حتى تصدر التأشيرة.

## كيف نساعدك
نعرض لك مدة المعالجة المتوقعة لكل تأشيرة قبل الدفع، وتتابع كل خطوة من [صفحة التتبع](/track) أو من حسابك.`,
      en: `When to apply depends on the **type of visa** more than the destination itself.

| Type | Start | Note |
|---|---|---|
| Visa-free | No need | Check passport validity and entry rules |
| Electronic travel authorisation (ETA) | 1–2 weeks before | Often issued within days |
| E-visa | 2–4 weeks before | Some countries ask for extra documents |
| Sticker visa with an appointment | 1–3 months before | Appointments fill up in peak season |

## Seasons change the maths
In summer and before the holidays and school breaks, visa-centre appointments go fast. Add two to three weeks to the estimates above.

## Don't book non-refundable too early
Book **cancellable** flights and hotels until the visa is issued.

## How we help
We show the expected processing time for every visa before you pay, and you can follow each step on the [tracking page](/en/track) or in your account.`,
    },
  },
];

export const STARTER_POSTS: BlogArticle[] = POSTS.map((p) => ({ ...p, readingMinutes: { ar: readingMinutes(p.body.ar)!, en: readingMinutes(p.body.en) } }));
