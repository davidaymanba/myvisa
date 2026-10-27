// Sample service catalog — operations will verify and edit these in the admin CMS (Phase 3) before launch.
import { sar, type Halalas } from "../money";
import type { InsurancePlanId, L10n } from "./types";

export type ServiceCategory = "visas" | "travel-insurance" | "driving-license" | "translation" | "document-shipping";

export interface ServiceFeature {
  title: L10n;
  body: L10n;
}

export interface ServiceCategoryInfo {
  slug: ServiceCategory;
  /** Lucide icon name, resolved in the UI. */
  icon: "Stamp" | "ShieldPlus" | "Car" | "Languages" | "Truck";
  name: L10n;
  tagline: L10n;
  description: L10n;
  /** Starting price incl. our fee (display only). */
  fromPrice: Halalas;
  turnaround: L10n;
  features: ServiceFeature[];
  steps: L10n[];
}

export interface InsurancePlan {
  id: InsurancePlanId;
  name: L10n;
  coverage: L10n;
  /** Medical cover in EUR/USD as displayed text, e.g. "€30,000". */
  medicalCover: string;
  pricePerWeek: Halalas;
  embassyAccepted: boolean;
  highlights: L10n[];
}

export const VISA_TYPES: { id: string; name: L10n; body: L10n }[] = [
  { id: "tourist", name: { ar: "تأشيرات سياحية", en: "Tourist visas" }, body: { ar: "عطلات وزيارات قصيرة لأكثر من 40 وجهة.", en: "Holidays and short visits to 40+ destinations." } },
  { id: "study", name: { ar: "تأشيرات دراسية", en: "Student visas" }, body: { ar: "ملف كامل مع القبول الجامعي والضمان المالي.", en: "Full file with university acceptance and financial proof." } },
  { id: "medical", name: { ar: "تأشيرات علاجية", en: "Medical visas" }, body: { ar: "تنسيق مع المستشفى ومرافق المريض.", en: "Coordinated with the hospital and the patient's companion." } },
  { id: "business", name: { ar: "تأشيرات أعمال", en: "Business visas" }, body: { ar: "خطابات الدعوة والسجل التجاري والمعارض.", en: "Invitation letters, CR documents and trade fairs." } },
  { id: "domestic", name: { ar: "تأشيرات العمالة المنزلية", en: "Domestic-worker visas" }, body: { ar: "تأشيرات مرافقة العمالة المنزلية في سفر العائلة.", en: "Visas for domestic workers travelling with the family." } },
  { id: "evisa", name: { ar: "التأشيرات الإلكترونية", en: "e-Visas & ETAs" }, body: { ar: "تصدر خلال أيام دون زيارة أي سفارة.", en: "Issued in days, no embassy visit needed." } },
];

export const INSURANCE_PLANS: InsurancePlan[] = [
  {
    id: "SCHENGEN",
    name: { ar: "تأمين شنغن", en: "Schengen insurance" },
    coverage: { ar: "جميع دول شنغن الـ 29", en: "All 29 Schengen states" },
    medicalCover: "€30,000+",
    pricePerWeek: sar(65),
    embassyAccepted: true,
    highlights: [
      { ar: "مطابق لاشتراطات السفارات", en: "Meets embassy requirements" },
      { ar: "إعادة طبية للوطن", en: "Medical repatriation" },
      { ar: "وثيقة فورية PDF", en: "Instant PDF policy" },
    ],
  },
  {
    id: "TURKEY",
    name: { ar: "تأمين تركيا", en: "Turkey insurance" },
    coverage: { ar: "كامل الأراضي التركية", en: "All of Turkey" },
    medicalCover: "€30,000",
    pricePerWeek: sar(45),
    embassyAccepted: true,
    highlights: [
      { ar: "مستشفيات شريكة في إسطنبول وأنطاليا", en: "Partner hospitals in Istanbul & Antalya" },
      { ar: "تغطية الحوادث", en: "Accident cover" },
      { ar: "دعم بالعربية 24/7", en: "24/7 Arabic support" },
    ],
  },
  {
    id: "GEORGIA",
    name: { ar: "تأمين جورجيا", en: "Georgia insurance" },
    coverage: { ar: "كامل جورجيا", en: "All of Georgia" },
    medicalCover: "$30,000",
    pricePerWeek: sar(40),
    embassyAccepted: true,
    highlights: [
      { ar: "مطلوب عند الدخول", en: "Required at entry" },
      { ar: "تغطية الأنشطة الجبلية", en: "Mountain activities covered" },
      { ar: "إصدار خلال دقائق", en: "Issued in minutes" },
    ],
  },
  {
    id: "USA_CANADA",
    name: { ar: "تأمين أمريكا وكندا", en: "USA & Canada insurance" },
    coverage: { ar: "الولايات المتحدة وكندا", en: "United States & Canada" },
    medicalCover: "$100,000",
    pricePerWeek: sar(120),
    embassyAccepted: true,
    highlights: [
      { ar: "تغطية عالية تناسب تكاليف العلاج هناك", en: "High limits for North American costs" },
      { ar: "تأخير الأمتعة والرحلات", en: "Baggage & trip delay" },
      { ar: "شبكة مستشفيات واسعة", en: "Wide hospital network" },
    ],
  },
  {
    id: "WORLDWIDE",
    name: { ar: "تأمين عالمي", en: "Worldwide insurance" },
    coverage: { ar: "جميع دول العالم", en: "Every country" },
    medicalCover: "$50,000",
    pricePerWeek: sar(85),
    embassyAccepted: true,
    highlights: [
      { ar: "رحلات متعددة الوجهات", en: "Multi-destination trips" },
      { ar: "إلغاء الرحلة", en: "Trip cancellation" },
      { ar: "تجديد بنقرة", en: "One-tap renewal" },
    ],
  },
];

export const SERVICE_CATEGORIES: ServiceCategoryInfo[] = [
  {
    slug: "visas",
    icon: "Stamp",
    name: { ar: "التأشيرات", en: "Visas" },
    tagline: { ar: "ملف كامل، موعد محجوز، ومتابعة حتى القرار.", en: "A complete file, a booked slot, follow-up until the decision." },
    description: {
      ar: "نراجع مستنداتك، نعبّئ النماذج، نحجز موعد البصمة، ونتابع مع السفارة أو مركز التأشيرات نيابةً عنك — مع تحديث على واتساب في كل خطوة.",
      en: "We review your documents, fill in the forms, book your biometrics slot and follow up with the embassy or visa centre for you — with a WhatsApp update at every step.",
    },
    fromPrice: sar(149),
    turnaround: { ar: "من يوم إلى 21 يوم عمل", en: "1–21 working days" },
    features: [
      { title: { ar: "مراجعة بشرية لكل مستند", en: "Human review of every document" }, body: { ar: "مختص يتأكد من كل ورقة قبل التقديم لتقليل احتمالية الرفض.", en: "A specialist checks every page before submission to reduce refusals." } },
      { title: { ar: "حجز المواعيد", en: "Appointment booking" }, body: { ar: "نراقب مواعيد VFS وTLS وBLS ونحجز أقرب موعد يناسبك.", en: "We watch VFS, TLS and BLS slots and grab the earliest that suits you." } },
      { title: { ar: "عائلات ومجموعات", en: "Families & groups" }, body: { ar: "طلب واحد لكل العائلة بمتابعة موحدة.", en: "One application for the whole family, tracked together." } },
    ],
    steps: [
      { ar: "اختر الوجهة وارفع المستندات", en: "Pick a destination and upload documents" },
      { ar: "نراجع الملف خلال ساعتين عمل", en: "We review the file within 2 working hours" },
      { ar: "نحجز الموعد ونقدّم الطلب", en: "We book the slot and submit" },
      { ar: "يصلك الجواز مع التأشيرة", en: "Your passport comes back with the visa" },
    ],
  },
  {
    slug: "travel-insurance",
    icon: "ShieldPlus",
    name: { ar: "تأمين السفر", en: "Travel insurance" },
    tagline: { ar: "وثيقة مقبولة لدى السفارات خلال دقائق.", en: "Embassy-accepted policies in minutes." },
    description: {
      ar: "تأمين شنغن وتركيا وجورجيا وأمريكا وكندا وتغطية عالمية، بوثيقة PDF فورية تُرفق مباشرة بطلب التأشيرة.",
      en: "Schengen, Turkey, Georgia, USA & Canada and worldwide cover, with an instant PDF policy attached straight to your visa file.",
    },
    fromPrice: sar(40),
    turnaround: { ar: "فوري", en: "Instant" },
    features: [
      { title: { ar: "مقبول لدى السفارات", en: "Embassy-accepted" }, body: { ar: "حدود تغطية تطابق اشتراطات كل سفارة.", en: "Cover limits that meet each embassy's rules." } },
      { title: { ar: "مرتبط بطلبك", en: "Linked to your file" }, body: { ar: "تُرفق الوثيقة بطلب التأشيرة تلقائيًا.", en: "The policy is attached to your visa application automatically." } },
      { title: { ar: "مطالبات بالعربية", en: "Claims in Arabic" }, body: { ar: "دعم على مدار الساعة بلغتك.", en: "Round-the-clock support in your language." } },
    ],
    steps: [
      { ar: "اختر الوجهة ومدة السفر", en: "Choose destination and dates" },
      { ar: "أدخل بيانات المسافرين", en: "Enter traveller details" },
      { ar: "ادفع واستلم الوثيقة فورًا", en: "Pay and receive the policy instantly" },
    ],
  },
  {
    slug: "driving-license",
    icon: "Car",
    name: { ar: "رخصة القيادة الدولية", en: "International driving licence" },
    tagline: { ar: "تُصدر خلال يوم عمل وتصلك للباب.", en: "Issued in one working day, delivered to your door." },
    description: {
      ar: "رخصة قيادة دولية معتمدة صالحة لسنة، نصدرها من صورة رخصتك السعودية وصورة شخصية، ونوصلها لعنوانك الوطني.",
      en: "An approved international driving permit valid for a year, issued from your Saudi licence and a photo, delivered to your national address.",
    },
    fromPrice: sar(199),
    turnaround: { ar: "يوم عمل واحد", en: "1 working day" },
    features: [
      { title: { ar: "بدون زيارة أي فرع", en: "No branch visit" }, body: { ar: "كل شيء من جوالك.", en: "Everything from your phone." } },
      { title: { ar: "توصيل سريع", en: "Fast delivery" }, body: { ar: "شحن لكل مدن المملكة.", en: "Shipping to every city in the Kingdom." } },
      { title: { ar: "صالحة في 150+ دولة", en: "Valid in 150+ countries" }, body: { ar: "وفق اتفاقية فيينا للسير.", en: "Under the Vienna Convention on Road Traffic." } },
    ],
    steps: [
      { ar: "ارفع صورة الرخصة والصورة الشخصية", en: "Upload your licence and a photo" },
      { ar: "نصدر الرخصة خلال يوم عمل", en: "We issue it within a working day" },
      { ar: "تصلك مع المندوب", en: "A courier delivers it" },
    ],
  },
  {
    slug: "translation",
    icon: "Languages",
    name: { ar: "الترجمة المعتمدة", en: "Certified translation" },
    tagline: { ar: "ترجمة تقبلها السفارات من أول مرة.", en: "Translations embassies accept first time." },
    description: {
      ar: "ترجمة معتمدة لكشوف الحساب وشهادات العمل والسجلات العائلية والشهادات الدراسية إلى الإنجليزية والفرنسية والألمانية وغيرها.",
      en: "Certified translation of bank statements, employment letters, family records and certificates into English, French, German and more.",
    },
    fromPrice: sar(79),
    turnaround: { ar: "من 1 إلى 3 أيام عمل", en: "1–3 working days" },
    features: [
      { title: { ar: "مترجمون معتمدون", en: "Certified translators" }, body: { ar: "ختم وتوقيع مقبول لدى السفارات.", en: "Stamped and signed to embassy standards." } },
      { title: { ar: "سعر واضح لكل صفحة", en: "Clear per-page pricing" }, body: { ar: "تعرف السعر قبل الدفع.", en: "Know the price before you pay." } },
      { title: { ar: "نسخة رقمية وورقية", en: "Digital and paper copies" }, body: { ar: "PDF فوري والنسخة الأصلية بالشحن.", en: "Instant PDF plus the original by courier." } },
    ],
    steps: [
      { ar: "ارفع المستند", en: "Upload the document" },
      { ar: "استلم عرض السعر فورًا", en: "Get an instant quote" },
      { ar: "استلم الترجمة المعتمدة", en: "Receive the certified translation" },
    ],
  },
  {
    slug: "document-shipping",
    icon: "Truck",
    name: { ar: "شحن المستندات", en: "Document shipping" },
    tagline: { ar: "نستلم جوازك ونعيده إليك بأمان.", en: "We collect your passport and bring it back safely." },
    description: {
      ar: "استلام وتسليم الجوازات والمستندات من باب منزلك إلى مركز التأشيرات وبالعكس، بتتبع لحظي وتأمين على الشحنة.",
      en: "Door-to-door collection and return of passports and documents to the visa centre and back, with live tracking and insured shipments.",
    },
    fromPrice: sar(59),
    turnaround: { ar: "خلال 24 ساعة داخل المدن الرئيسية", en: "Within 24h in major cities" },
    features: [
      { title: { ar: "تتبع لحظي", en: "Live tracking" }, body: { ar: "تعرف أين جوازك في كل لحظة.", en: "Know where your passport is at every moment." } },
      { title: { ar: "شحنات مؤمنة", en: "Insured shipments" }, body: { ar: "تأمين كامل على المستندات.", en: "Full cover on your documents." } },
      { title: { ar: "مواعيد مرنة", en: "Flexible slots" }, body: { ar: "اختر وقت الاستلام المناسب.", en: "Pick a collection time that suits you." } },
    ],
    steps: [
      { ar: "حدد العنوان والوقت", en: "Set address and time" },
      { ar: "يستلم المندوب المستندات", en: "A courier collects the documents" },
      { ar: "نعيدها إليك بعد الإنجاز", en: "We return them when done" },
    ],
  },
];

export function getServiceCategory(slug: string): ServiceCategoryInfo | undefined {
  return SERVICE_CATEGORIES.find((c) => c.slug === slug);
}
