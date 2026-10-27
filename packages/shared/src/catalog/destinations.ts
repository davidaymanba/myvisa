/**
 * SAMPLE CATALOG DATA — the operations team must verify every fee, rule, processing time
 * and requirement in the admin CMS before launch. Visa rules and embassy fees change often;
 * amounts in foreign currencies were converted to SAR at approximate rates and rounded.
 *
 * Image ids were checked by downloading each Unsplash photo and confirming what it shows.
 */
import { sar } from "../money";
import type {
  ApplicantType,
  Destination,
  L10n,
  Nationality,
  PriceOption,
  Requirement,
  VisaOption,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers (internal)
// ---------------------------------------------------------------------------

const t = (ar: string, en: string): L10n => ({ ar, en });

function price(applicant: ApplicantType, governmentFee: number, serviceFee: number, note?: L10n): PriceOption {
  return {
    applicant,
    eligible: true,
    governmentFee: sar(governmentFee),
    serviceFee: sar(serviceFee),
    ...(note ? { note } : {}),
  };
}

const citizen = (governmentFee: number, serviceFee: number, note?: L10n): PriceOption =>
  price("SAUDI_CITIZEN", governmentFee, serviceFee, note);

const resident = (governmentFee: number, serviceFee: number, note?: L10n): PriceOption =>
  price("RESIDENT", governmentFee, serviceFee, note);

function notFor(applicant: ApplicantType, ineligibleReason: L10n): PriceOption {
  return { applicant, eligible: false, governmentFee: 0, serviceFee: 0, ineligibleReason };
}

const NATIONALITY_NOTE = t(
  "تختلف المتطلبات حسب الجنسية — سنتحقق من أهليتك قبل البدء.",
  "Requirements vary by nationality — we'll confirm your eligibility before we start.",
);

function fxNote(ar: string, en: string, forResidents = false): L10n {
  return forResidents ? t(`${ar} ${NATIONALITY_NOTE.ar}`, `${en} ${NATIONALITY_NOTE.en}`) : t(ar, en);
}

/** Requirement building blocks, reused across destinations so wording stays consistent. */
const R = {
  passport: (months: number): Requirement => ({
    doc: "PASSPORT",
    title: t("جواز سفر ساري المفعول", "Valid passport"),
    details: t(
      `صالح لمدة ${months} أشهر على الأقل بعد تاريخ العودة، وفيه صفحتان فارغتان على الأقل.`,
      `Valid for at least ${months} months beyond your return date, with at least two blank pages.`,
    ),
  }),
  photo: (): Requirement => ({
    doc: "PERSONAL_PHOTO",
    title: t("صورتان شخصيتان حديثتان", "Two recent passport photos"),
    details: t("بخلفية بيضاء، ملتقطتان خلال آخر 6 أشهر، دون نظارات.", "White background, taken within the last 6 months, no glasses."),
  }),
  photoSchengen: (): Requirement => ({
    doc: "PERSONAL_PHOTO",
    title: t("صورتان شخصيتان بمقاس شنغن", "Two Schengen-size photos"),
    details: t("مقاس 3.5 × 4.5 سم بخلفية بيضاء فاتحة، ويظهر الوجه بوضوح.", "3.5 × 4.5 cm on a light background, face clearly visible."),
  }),
  photoUs: (): Requirement => ({
    doc: "PERSONAL_PHOTO",
    title: t("صورة شخصية بالمواصفات الأمريكية", "US-specification photo"),
    details: t("مقاس 5 × 5 سم بخلفية بيضاء، دون نظارات، تُرفع رقميًا مع نموذج DS-160.", "5 × 5 cm, white background, no glasses, uploaded with the DS-160."),
  }),
  photoDigital: (): Requirement => ({
    doc: "PERSONAL_PHOTO",
    title: t("صورة شخصية رقمية", "Digital passport photo"),
    details: t("صورة واضحة بخلفية بيضاء؛ يمكنك تصويرها بالجوال وسنراجعها لك.", "A clear photo on a white background — a phone photo is fine, we'll check it."),
  }),
  nationalId: (): Requirement => ({
    doc: "NATIONAL_ID",
    applicant: "SAUDI_CITIZEN",
    title: t("صورة الهوية الوطنية", "Copy of national ID"),
  }),
  iqama: (months: number): Requirement => ({
    doc: "IQAMA",
    applicant: "RESIDENT",
    title: t("صورة الإقامة السارية", "Copy of valid iqama"),
    details: t(`سارية لمدة ${months} أشهر على الأقل بعد تاريخ العودة.`, `Valid for at least ${months} months after your return date.`),
  }),
  bank: (months: number, optional = false): Requirement => ({
    doc: "BANK_STATEMENT",
    title: t(`كشف حساب بنكي لآخر ${months} أشهر`, `Bank statement for the last ${months} months`),
    details: t("مختوم من البنك، ويُفضّل أن يُظهر حركة منتظمة ورصيدًا يغطي الرحلة.", "Bank-stamped, ideally showing regular activity and enough balance for the trip."),
    ...(optional ? { optional: true } : {}),
  }),
  salary: (): Requirement => ({
    doc: "SALARY_CERTIFICATE",
    title: t("خطاب تعريف بالراتب", "Salary certificate"),
    details: t(
      "من جهة العمل، يذكر المسمى الوظيفي والراتب وتاريخ الالتحاق والموافقة على الإجازة.",
      "From your employer, stating job title, salary, start date and approved leave.",
    ),
  }),
  employment: (): Requirement => ({
    doc: "EMPLOYMENT_LETTER",
    title: t("خطاب من جهة العمل", "Employer letter"),
    details: t("يوضح غرض الرحلة ومدتها، وأن الشركة تتحمل التكاليف إن وُجد ذلك.", "Explaining the purpose and length of the trip, and who covers the costs."),
  }),
  cr: (): Requirement => ({
    doc: "COMMERCIAL_REGISTRATION",
    title: t("صورة السجل التجاري", "Commercial registration copy"),
    details: t("لأصحاب الأعمال، أو للشركة الموفِدة.", "For business owners, or for the sending company."),
    optional: true,
  }),
  hotel: (optional = false): Requirement => ({
    doc: "HOTEL_BOOKING",
    title: t("حجز فندقي مؤكد", "Confirmed hotel booking"),
    details: t("لكامل مدة الرحلة؛ يكفي حجز قابل للإلغاء.", "Covering the whole stay; a refundable booking is fine."),
    ...(optional ? { optional: true } : {}),
  }),
  flight: (optional = false): Requirement => ({
    doc: "FLIGHT_BOOKING",
    title: t("حجز طيران ذهاب وعودة", "Return flight reservation"),
    details: t("حجز مبدئي يكفي في أغلب الحالات؛ لا تشترِ التذكرة قبل صدور التأشيرة.", "A reservation is usually enough — don't buy the ticket before the visa is issued."),
    ...(optional ? { optional: true } : {}),
  }),
  insurance: (details: L10n, optional = false): Requirement => ({
    doc: "TRAVEL_INSURANCE",
    title: t("تأمين سفر طبي", "Travel medical insurance"),
    details,
    ...(optional ? { optional: true } : {}),
  }),
  insuranceSchengen: (): Requirement => ({
    doc: "TRAVEL_INSURANCE",
    title: t("تأمين سفر شنغن", "Schengen travel insurance"),
    details: t(
      "بتغطية لا تقل عن 30,000 يورو، صالح في جميع دول شنغن طوال الرحلة. يمكنك إصداره معنا.",
      "Minimum €30,000 cover, valid across the Schengen area for the whole trip. You can buy it with us.",
    ),
  }),
  invitation: (title: L10n, details?: L10n): Requirement => ({
    doc: "INVITATION_LETTER",
    title,
    ...(details ? { details } : {}),
  }),
  university: (title: L10n, details?: L10n): Requirement => ({
    doc: "UNIVERSITY_ACCEPTANCE",
    title,
    ...(details ? { details } : {}),
  }),
  medical: (): Requirement => ({
    doc: "MEDICAL_REPORT",
    title: t("تقرير طبي حديث", "Recent medical report"),
    details: t("من الطبيب المعالج، يوضح التشخيص والحاجة إلى العلاج في الخارج.", "From your treating doctor, stating the diagnosis and the need for treatment abroad."),
  }),
  familyRecord: (): Requirement => ({
    doc: "FAMILY_RECORD",
    title: t("سجل الأسرة", "Family record"),
    details: t("عند سفر العائلة أو الأطفال مع أحد الوالدين.", "When travelling as a family or with children."),
    optional: true,
  }),
  other: (title: L10n, details?: L10n, optional = false): Requirement => ({
    doc: "OTHER",
    title,
    ...(details ? { details } : {}),
    ...(optional ? { optional: true } : {}),
  }),
};

// --- Schengen ---------------------------------------------------------------

const SCHENGEN_FEE = 370; // €90
const SCHENGEN_NOTE_CITIZEN = t(
  "الرسوم 90 يورو وتتغير بالريال حسب سعر الصرف؛ رسوم مركز التأشيرات تُدفع في المركز. الأطفال من 6 إلى 12 سنة 45 يورو، ودون 6 سنوات معفون.",
  "The fee is €90, so the SAR amount moves with the exchange rate; the visa centre's own fee is paid there. Children 6–12 pay €45; under 6 are exempt.",
);
const SCHENGEN_NOTE_RESIDENT = fxNote(
  "الرسوم 90 يورو وتتغير بالريال حسب سعر الصرف؛ رسوم مركز التأشيرات تُدفع في المركز.",
  "The fee is €90, so the SAR amount moves with the exchange rate; the visa centre's own fee is paid there.",
  true,
);

function schengenTourism(cc: string, appointmentNote: L10n): VisaOption {
  return {
    id: `${cc}-tourism-schengen`,
    purpose: "TOURISM",
    kind: "STICKER",
    name: t("تأشيرة شنغن سياحية", "Schengen tourist visa"),
    entry: "MULTIPLE",
    validityDays: 180,
    maxStayDays: 90,
    processingDays: [10, 15],
    appointment: true,
    appointmentNote,
    pricing: [citizen(SCHENGEN_FEE, 299, SCHENGEN_NOTE_CITIZEN), resident(SCHENGEN_FEE, 299, SCHENGEN_NOTE_RESIDENT)],
    requirements: [
      R.passport(3),
      R.photoSchengen(),
      R.iqama(3),
      R.bank(3),
      R.salary(),
      R.hotel(),
      R.flight(),
      R.insuranceSchengen(),
    ],
  };
}

function schengenBusiness(cc: string, appointmentNote: L10n): VisaOption {
  return {
    id: `${cc}-business-schengen`,
    purpose: "BUSINESS",
    kind: "STICKER",
    name: t("تأشيرة شنغن للأعمال", "Schengen business visa"),
    entry: "MULTIPLE",
    validityDays: 180,
    maxStayDays: 90,
    processingDays: [10, 15],
    appointment: true,
    appointmentNote,
    pricing: [citizen(SCHENGEN_FEE, 349, SCHENGEN_NOTE_CITIZEN), resident(SCHENGEN_FEE, 349, SCHENGEN_NOTE_RESIDENT)],
    requirements: [
      R.passport(3),
      R.photoSchengen(),
      R.iqama(3),
      R.invitation(
        t("خطاب دعوة من الشركة المضيفة", "Invitation from the host company"),
        t("يذكر بيانات الشركة وغرض الزيارة وتواريخها ومن يتحمل التكاليف.", "Stating company details, purpose, dates and who covers costs."),
      ),
      R.employment(),
      R.cr(),
      R.bank(3, true),
      R.insuranceSchengen(),
    ],
  };
}

function schengenMedical(cc: string, appointmentNote: L10n): VisaOption {
  return {
    id: `${cc}-medical-schengen`,
    purpose: "MEDICAL",
    kind: "STICKER",
    name: t("تأشيرة شنغن للعلاج", "Schengen medical visa"),
    entry: "MULTIPLE",
    validityDays: 180,
    maxStayDays: 90,
    processingDays: [10, 15],
    appointment: true,
    appointmentNote,
    pricing: [
      citizen(
        SCHENGEN_FEE,
        349,
        t(
          "الرسوم 90 يورو. للمرضى المحالين من جهة حكومية نُرفق خطاب الضمان بدل كشف الحساب.",
          "The fee is €90. For patients referred by a government body we submit the guarantee letter instead of a bank statement.",
        ),
      ),
      resident(SCHENGEN_FEE, 349, SCHENGEN_NOTE_RESIDENT),
    ],
    requirements: [
      R.passport(3),
      R.photoSchengen(),
      R.iqama(3),
      R.medical(),
      R.invitation(
        t("موعد مؤكد من المستشفى مع تقدير التكلفة", "Confirmed hospital appointment with cost estimate"),
        t("من المستشفى أو العيادة في بلد العلاج، ويُذكر فيه اسم المرافق إن وُجد.", "From the hospital or clinic, naming any companion."),
      ),
      R.bank(3),
      R.insuranceSchengen(),
    ],
  };
}

// ---------------------------------------------------------------------------
// Destinations
// ---------------------------------------------------------------------------

export const DESTINATIONS: Destination[] = [
  // 1. Turkey -----------------------------------------------------------------
  {
    slug: "turkey",
    iso2: "tr",
    iata: "IST",
    lat: 41.2753,
    lon: 28.7519,
    name: t("تركيا", "Turkey"),
    capital: t("أنقرة", "Ankara"),
    region: "EUROPE",
    schengen: false,
    popular: true,
    tagline: t("بين قارتين، على ضفاف البوسفور", "Two continents, one Bosphorus"),
    overview: t(
      "من مساجد إسطنبول وأسواقها العريقة إلى مرتفعات طرابزون الخضراء وشواطئ أنطاليا، تجمع تركيا التاريخ والطبيعة وضيافة قريبة من ذوق المسافر السعودي. يدخلها المواطنون السعوديون دون تأشيرة، ونتولى عن المقيمين ملف التأشيرة كاملًا.",
      "From Istanbul's historic mosques and bazaars to the green highlands of Trabzon and the beaches of Antalya, Turkey blends history, nature and familiar hospitality. Saudi citizens enter visa-free, and we handle the full visa file for residents.",
    ),
    imageId: "1524231757912-21f4fe3a7200",
    imageAlt: t("برج غلطة يعلو أسطح إسطنبول القديمة والنوارس في السماء", "Galata Tower rising above Istanbul's rooftops, with gulls overhead"),
    bestTime: t("أبريل–يونيو وسبتمبر–أكتوبر", "April–June and September–October"),
    flightHours: 4.5,
    currency: "TRY",
    insurance: "TURKEY",
    visas: [
      {
        id: "tr-tourism-visa-free",
        purpose: "TOURISM",
        kind: "VISA_FREE",
        name: t("دخول دون تأشيرة للمواطنين", "Visa-free entry for Saudi citizens"),
        entry: "MULTIPLE",
        validityDays: 180,
        maxStayDays: 90,
        processingDays: [1, 2],
        appointment: false,
        pricing: [
          citizen(0, 0, t(
              "لا تحتاج تأشيرة. ننصح بتأمين سفر — متاح كخدمة منفصلة.",
              "No visa needed. We recommend travel insurance — available as a separate service.",
            )),
          notFor("RESIDENT", t("هذا الخيار للمواطنين السعوديين فقط — اختر تأشيرة المقيمين.", "This option is for Saudi citizens only — choose the resident visa.")),
        ],
        requirements: [
          R.passport(6),
          R.nationalId(),
          R.flight(),
          R.hotel(),
          R.insurance(t("غير إلزامي للدخول لكنه موصى به بشدة.", "Not required for entry, but strongly recommended."), true),
        ],
      },
      {
        id: "tr-tourism-sticker",
        purpose: "TOURISM",
        kind: "STICKER",
        name: t("تأشيرة سياحية للمقيمين", "Tourist visa for residents"),
        entry: "SINGLE",
        validityDays: 90,
        maxStayDays: 30,
        processingDays: [7, 15],
        appointment: true,
        appointmentNote: t(
          "تؤخذ البصمة في مركز طلبات التأشيرة التركية بالرياض أو جدة أو الخبر.",
          "Biometrics are taken at the Turkish visa application centre in Riyadh, Jeddah or Khobar.",
        ),
        pricing: [
          notFor("SAUDI_CITIZEN", t("المواطنون السعوديون معفون من التأشيرة حتى 90 يومًا.", "Saudi citizens are visa-exempt for up to 90 days.")),
          resident(
            320,
            249,
            t(
              "تختلف المتطلبات حسب الجنسية — سنتحقق من أهليتك. قد يحق لبعض الجنسيات تأشيرة إلكترونية إذا كانت لديهم تأشيرة أو إقامة سارية من شنغن أو أمريكا أو بريطانيا أو أيرلندا.",
              "Requirements vary by nationality — we'll confirm your eligibility. Some nationalities qualify for an e-Visa if they hold a valid Schengen, US, UK or Irish visa or residence permit.",
            ),
          ),
        ],
        requirements: [
          R.passport(6),
          R.photo(),
          R.iqama(3),
          R.bank(6),
          R.salary(),
          R.hotel(),
          R.flight(),
          R.insurance(t("يغطي كامل مدة الإقامة في تركيا.", "Covering your entire stay in Turkey.")),
        ],
      },
      {
        id: "tr-medical-sticker",
        purpose: "MEDICAL",
        kind: "STICKER",
        name: t("تأشيرة علاج", "Medical treatment visa"),
        entry: "SINGLE",
        validityDays: 90,
        maxStayDays: 90,
        processingDays: [7, 15],
        appointment: true,
        appointmentNote: t(
          "تؤخذ البصمة في مركز طلبات التأشيرة التركية بالرياض أو جدة أو الخبر.",
          "Biometrics are taken at the Turkish visa application centre in Riyadh, Jeddah or Khobar.",
        ),
        pricing: [
          notFor(
            "SAUDI_CITIZEN",
            t("يدخل المواطنون السعوديون للعلاج دون تأشيرة حتى 90 يومًا — اختر خيار الدخول دون تأشيرة.", "Saudi citizens can travel for treatment visa-free for up to 90 days — choose the visa-free option."),
          ),
          resident(320, 299, NATIONALITY_NOTE),
        ],
        requirements: [
          R.passport(6),
          R.photo(),
          R.iqama(3),
          R.medical(),
          R.invitation(
            t("خطاب قبول من المستشفى في تركيا", "Acceptance letter from the Turkish hospital"),
            t("يذكر موعد العلاج وتقدير التكلفة واسم المرافق إن وُجد.", "Stating the treatment date, cost estimate and any companion."),
          ),
          R.bank(3),
          R.insurance(t("يُفضّل أن يشمل الطوارئ خلال فترة العلاج.", "Ideally covering emergencies during treatment."), true),
        ],
      },
    ],
    faqs: [
      {
        q: t("هل أحتاج تأشيرة لتركيا كمواطن سعودي؟", "Do Saudi citizens need a visa for Turkey?"),
        a: t(
          "لا، يدخل المواطنون السعوديون بالجواز العادي دون تأشيرة لمدة تصل إلى 90 يومًا خلال 180 يومًا. يكفي جواز صالح 6 أشهر على الأقل.",
          "No. Saudi citizens on an ordinary passport can stay up to 90 days in any 180 without a visa, provided the passport has at least 6 months' validity.",
        ),
      },
      {
        q: t("أنا مقيم في السعودية، كم تستغرق التأشيرة؟", "I'm a resident in Saudi Arabia — how long does the visa take?"),
        a: t(
          "عادة من 7 إلى 15 يوم عمل بعد موعد البصمة. ننصح بالتقديم قبل السفر بشهر على الأقل، وبوقت أطول في موسم الصيف.",
          "Usually 7–15 working days after your biometrics appointment. Apply at least a month ahead, and earlier in summer.",
        ),
      },
      {
        q: t("هل التأمين الصحي إلزامي؟", "Is health insurance mandatory?"),
        a: t(
          "للمقيمين المتقدمين بتأشيرة نعم، ويجب أن يغطي مدة الإقامة. أما المواطنون فليس شرطًا لدخولهم، لكننا ننصح به لأن العلاج في المستشفيات الخاصة مكلف.",
          "For residents applying for a visa, yes — it must cover the whole stay. For citizens it isn't an entry requirement, but we recommend it as private hospitals are expensive.",
        ),
      },
    ],
  },

  // 2. Georgia ----------------------------------------------------------------
  {
    slug: "georgia",
    iso2: "ge",
    iata: "TBS",
    lat: 41.6692,
    lon: 44.9547,
    name: t("جورجيا", "Georgia"),
    capital: t("تبليسي", "Tbilisi"),
    region: "ASIA",
    schengen: false,
    popular: true,
    tagline: t("جبال القوقاز وخضرة لا تنتهي", "Caucasus peaks and endless green"),
    overview: t(
      "تبليسي بأحيائها القديمة وحماماتها الكبريتية، وباتومي على البحر الأسود، وقرى كازبيجي بين الجبال. وجهة قريبة بطيران مباشر من الرياض وجدة، ويدخلها المواطنون السعوديون دون تأشيرة.",
      "Tbilisi's old quarter and sulphur baths, Batumi on the Black Sea and the mountain villages of Kazbegi. It's a short direct flight from Riyadh or Jeddah, and Saudi citizens need no visa.",
    ),
    imageId: "1565008576549-57569a49371d",
    imageAlt: t("البلدة القديمة في تبليسي وجسر السلام عند الغروب", "Tbilisi Old Town and the Bridge of Peace at sunset"),
    bestTime: t("مايو–سبتمبر، وديسمبر–مارس للتزلج في غودوري", "May–September; December–March for skiing in Gudauri"),
    flightHours: 3.5,
    currency: "GEL",
    insurance: "GEORGIA",
    visas: [
      {
        id: "ge-tourism-visa-free",
        purpose: "TOURISM",
        kind: "VISA_FREE",
        name: t("دخول دون تأشيرة", "Visa-free entry"),
        entry: "MULTIPLE",
        validityDays: 365,
        maxStayDays: 365,
        processingDays: [1, 2],
        appointment: false,
        pricing: [
          citizen(0, 0, t(
              "لا تحتاج تأشيرة. ننصح بتأمين سفر — متاح كخدمة منفصلة.",
              "No visa needed. We recommend travel insurance — available as a separate service.",
            )),
          resident(
            0,
            0,
            t(
              "يدخل حاملو إقامة خليجية سارية من معظم الجنسيات دون تأشيرة لمدة 90 يومًا خلال 180 يومًا — نتحقق من أهليتك مجانًا.",
              "Holders of a valid GCC residence permit from most nationalities enter visa-free for 90 days in 180 — we'll confirm your eligibility for free.",
            ),
          ),
        ],
        requirements: [
          R.passport(6),
          R.iqama(3),
          R.flight(),
          R.hotel(),
          R.insurance(t("مطلوب من الزوار الأجانب وقد يُطلب إثباته عند الوصول.", "Required for foreign visitors and may be checked on arrival.")),
        ],
      },
      {
        id: "ge-tourism-evisa",
        purpose: "TOURISM",
        kind: "E_VISA",
        name: t("تأشيرة إلكترونية للمقيمين", "e-Visa for residents"),
        entry: "SINGLE",
        validityDays: 120,
        maxStayDays: 30,
        processingDays: [5, 10],
        appointment: false,
        pricing: [
          notFor("SAUDI_CITIZEN", t("المواطنون السعوديون معفون من التأشيرة.", "Saudi citizens are visa-exempt.")),
          resident(
            80,
            149,
            t(
              "للمقيمين غير المشمولين بالإعفاء. تختلف المتطلبات حسب الجنسية — سنتحقق من أهليتك.",
              "For residents not covered by the exemption. Requirements vary by nationality — we'll confirm your eligibility.",
            ),
          ),
        ],
        requirements: [
          R.passport(6),
          R.photoDigital(),
          R.iqama(3),
          R.bank(3),
          R.hotel(),
          R.flight(),
          R.insurance(t("يغطي كامل مدة الإقامة في جورجيا.", "Covering your entire stay in Georgia.")),
        ],
      },
    ],
    faqs: [
      {
        q: t("كم مدة الإقامة المسموحة في جورجيا؟", "How long can I stay in Georgia?"),
        a: t(
          "يمكن للمواطن السعودي البقاء حتى سنة كاملة دون تأشيرة. أما المقيمون المشمولون بالإعفاء فمدتهم 90 يومًا خلال 180 يومًا.",
          "Saudi citizens can stay up to a full year visa-free. Residents covered by the exemption can stay 90 days in any 180.",
        ),
      },
      {
        q: t("هل التأمين مطلوب عند الدخول؟", "Is insurance required on entry?"),
        a: t(
          "نعم، أصبح تأمين السفر الصحي مطلوبًا من الزوار الأجانب وقد يُطلب إثباته في المطار. يمكنك إصداره معنا خلال دقائق.",
          "Yes — travel health insurance is now required for foreign visitors and may be checked at the airport. You can buy it with us in minutes.",
        ),
      },
      {
        q: t("أنا مقيم وجنسيتي تحتاج تأشيرة عادةً، هل أحتاجها لجورجيا؟", "I'm a resident whose nationality usually needs visas — do I need one for Georgia?"),
        a: t(
          "غالبًا لا، فالإقامة الخليجية السارية تكفي لمعظم الجنسيات. وإن لم تكن مشمولًا نستخرج لك التأشيرة الإلكترونية خلال 5 إلى 10 أيام عمل.",
          "Usually not — a valid GCC residence permit covers most nationalities. If you're not covered, we'll get your e-Visa in 5–10 working days.",
        ),
      },
    ],
  },

  // 3. Azerbaijan -------------------------------------------------------------
  {
    slug: "azerbaijan",
    iso2: "az",
    iata: "GYD",
    lat: 40.4675,
    lon: 50.0467,
    name: t("أذربيجان", "Azerbaijan"),
    capital: t("باكو", "Baku"),
    region: "ASIA",
    schengen: false,
    popular: false,
    tagline: t("أسوار باكو القديمة وأبراج اللهب", "Baku's old walls and Flame Towers"),
    overview: t(
      "باكو مدينة على بحر قزوين تجمع البلدة القديمة المسوّرة وأبراج اللهب والكورنيش الطويل، وعلى بُعد ساعات منها جبال قبالا وشاهداغ. الرحلة المباشرة من الرياض نحو 3 ساعات ونصف، والتأشيرة إلكترونية وسريعة.",
      "Baku sits on the Caspian, pairing a walled old town with the Flame Towers and a long seafront, with the mountains of Gabala and Shahdag a few hours away. It's about three and a half hours direct from Riyadh, and the visa is a quick e-Visa.",
    ),
    imageId: "1596306499398-8d88944a5ec4",
    imageAlt: t("أبراج اللهب في باكو تطل على المدينة عند الغسق", "Baku's Flame Towers above the city at dusk"),
    bestTime: t("أبريل–يونيو وسبتمبر–أكتوبر", "April–June and September–October"),
    flightHours: 3.5,
    currency: "AZN",
    insurance: "WORLDWIDE",
    visas: [
      {
        id: "az-tourism-evisa",
        purpose: "TOURISM",
        kind: "E_VISA",
        name: t("تأشيرة ASAN الإلكترونية", "ASAN e-Visa"),
        entry: "SINGLE",
        validityDays: 90,
        maxStayDays: 30,
        processingDays: [3, 5],
        appointment: false,
        pricing: [
          citizen(100, 99, t("الرسوم بالدولار الأمريكي وقد تتغير قليلًا بالريال.", "The fee is set in USD, so the SAR amount may vary slightly.")),
          resident(100, 129, fxNote("الرسوم بالدولار الأمريكي.", "The fee is set in USD.", true)),
        ],
        requirements: [
          R.passport(6),
          R.photoDigital(),
          R.iqama(3),
          R.hotel(),
          R.flight(),
          R.insurance(t("موصى به لتغطية الطوارئ الطبية.", "Recommended for medical emergencies."), true),
        ],
      },
    ],
    faqs: [
      {
        q: t("كم تستغرق التأشيرة الإلكترونية؟", "How long does the e-Visa take?"),
        a: t(
          "عادة 3 أيام عمل، وتتوفر خدمة مستعجلة خلال ساعات برسوم حكومية أعلى. تصلك التأشيرة بالبريد الإلكتروني لتطبعها أو تعرضها عند الوصول.",
          "Usually 3 working days, with an urgent option within hours for a higher government fee. It arrives by email to print or show on arrival.",
        ),
      },
      {
        q: t("هل يمكنني الحصول على التأشيرة في مطار باكو؟", "Can I get the visa at Baku airport?"),
        a: t(
          "تتوفر التأشيرة عند الوصول لبعض الجنسيات، لكن التأشيرة الإلكترونية أضمن وتوفّر عليك الانتظار في المطار، لذا نوصي بها دائمًا.",
          "Some nationalities can get a visa on arrival, but the e-Visa is more reliable and saves queuing at the airport, so we always recommend it.",
        ),
      },
      {
        q: t("هل أحتاج إلى تسجيل إقامتي إذا بقيت مدة طويلة؟", "Do I need to register if I stay longer?"),
        a: t(
          "نعم، إذا تجاوزت إقامتك 15 يومًا يجب التسجيل لدى دائرة الهجرة. الفنادق تتولى ذلك عادة، أما في الشقق الخاصة فاحرص عليه بنفسك.",
          "Yes — stays over 15 days must be registered with the migration service. Hotels normally do it for you; in private rentals, make sure it's done.",
        ),
      },
    ],
  },

  // 4. United Kingdom ---------------------------------------------------------
  {
    slug: "united-kingdom",
    iso2: "gb",
    iata: "LHR",
    lat: 51.47,
    lon: -0.4543,
    name: t("المملكة المتحدة", "United Kingdom"),
    capital: t("لندن", "London"),
    region: "EUROPE",
    schengen: false,
    popular: true,
    tagline: t("من ضفاف التايمز إلى مرتفعات اسكتلندا", "From the Thames to the Scottish Highlands"),
    overview: t(
      "لندن بمتاحفها ومتاجرها وحدائقها، وريف كوتسوولدز، وقلاع اسكتلندا. يكفي المواطن السعودي تصريح السفر الإلكتروني (ETA) بدل التأشيرة، بينما نجهّز للمقيمين ملف تأشيرة الزيارة كاملًا.",
      "London's museums, shops and parks, the Cotswolds countryside and Scotland's castles. Saudi citizens need only an Electronic Travel Authorisation (ETA), while we prepare the full visitor visa file for residents.",
    ),
    imageId: "1513635269975-59663e0ac1ad",
    imageAlt: t("منظر جوي للندن ونهر التايمز وجسر البرج", "Aerial view of London, the Thames and Tower Bridge"),
    bestTime: t("مايو–سبتمبر", "May–September"),
    flightHours: 6.5,
    currency: "GBP",
    insurance: "WORLDWIDE",
    visas: [
      {
        id: "gb-tourism-eta",
        purpose: "TOURISM",
        kind: "ETA",
        name: t("تصريح السفر الإلكتروني (ETA)", "Electronic Travel Authorisation (ETA)"),
        entry: "MULTIPLE",
        validityDays: 730,
        maxStayDays: 180,
        processingDays: [1, 3],
        appointment: false,
        pricing: [
          citizen(
            80,
            99,
            t(
              "الرسوم 16 جنيهًا إسترلينيًا وتتغير بالريال حسب سعر الصرف. صالح لسنتين أو حتى انتهاء الجواز أيهما أقرب.",
              "The fee is £16, so the SAR amount moves with the exchange rate. Valid for two years or until the passport expires, whichever is sooner.",
            ),
          ),
          notFor("RESIDENT", t("المقيمون يحتاجون تأشيرة زيارة — اختر تأشيرة الزيارة القياسية.", "Residents need a visitor visa — choose the Standard Visitor visa.")),
        ],
        requirements: [
          R.passport(6),
          R.photoDigital(),
          R.nationalId(),
          R.flight(true),
          R.hotel(true),
        ],
      },
      {
        id: "gb-tourism-visitor",
        purpose: "TOURISM",
        kind: "STICKER",
        name: t("تأشيرة الزيارة القياسية", "Standard Visitor visa"),
        entry: "MULTIPLE",
        validityDays: 180,
        maxStayDays: 180,
        processingDays: [15, 20],
        appointment: true,
        appointmentNote: t(
          "تؤخذ البصمة في مراكز VFS Global بالرياض وجدة والخبر، وتتوفر خدمة الأولوية برسوم إضافية.",
          "Biometrics at VFS Global in Riyadh, Jeddah or Khobar; priority service is available for an extra fee.",
        ),
        pricing: [
          notFor("SAUDI_CITIZEN", t("يكفيك تصريح ETA للزيارات حتى 6 أشهر.", "An ETA covers your visits of up to 6 months.")),
          resident(640, 349, fxNote("الرسوم 127 جنيهًا إسترلينيًا.", "The fee is £127.", true)),
        ],
        requirements: [
          R.passport(6),
          R.photo(),
          R.iqama(3),
          R.bank(6),
          R.salary(),
          R.hotel(),
          R.flight(),
          R.familyRecord(),
        ],
      },
      {
        id: "gb-study-student",
        purpose: "STUDY",
        kind: "STICKER",
        name: t("تأشيرة الطالب", "Student visa"),
        entry: "MULTIPLE",
        validityDays: 365,
        maxStayDays: 365,
        processingDays: [15, 20],
        appointment: true,
        appointmentNote: t(
          "تؤخذ البصمة في مراكز VFS Global بالرياض وجدة والخبر.",
          "Biometrics at VFS Global in Riyadh, Jeddah or Khobar.",
        ),
        pricing: [
          citizen(
            2620,
            499,
            t(
              "الرسوم 524 جنيهًا، ولا تشمل رسوم الصحة البريطانية (IHS) التي تُدفع عند التقديم عن كل سنة دراسية.",
              "The fee is £524 and excludes the Immigration Health Surcharge (IHS), paid per year of study when you apply.",
            ),
          ),
          resident(
            2620,
            499,
            fxNote("الرسوم 524 جنيهًا ولا تشمل رسوم الصحة البريطانية (IHS).", "The fee is £524, excluding the Immigration Health Surcharge (IHS).", true),
          ),
        ],
        requirements: [
          R.passport(6),
          R.photo(),
          R.iqama(6),
          R.university(
            t("خطاب القبول ورقم CAS", "Offer letter and CAS number"),
            t("صادر عن جامعة مرخّصة لاستقبال الطلاب الدوليين.", "Issued by a licensed student sponsor."),
          ),
          {
            doc: "BANK_STATEMENT",
            title: t("إثبات القدرة المالية", "Proof of funds"),
            details: t(
              "رصيد يغطي الرسوم الدراسية ونفقات المعيشة لمدة 28 يومًا متتالية، أو خطاب ضمان من الجهة المبتعِثة.",
              "A balance covering fees and living costs held for 28 consecutive days, or a sponsor's guarantee letter.",
            ),
          },
          R.other(t("شهادة اللغة الإنجليزية المعتمدة", "Approved English test result"), t("مثل IELTS for UKVI حسب متطلبات الجامعة.", "Such as IELTS for UKVI, as your university requires.")),
        ],
      },
    ],
    faqs: [
      {
        q: t("ما الفرق بين ETA وتأشيرة الزيارة؟", "What's the difference between an ETA and a visitor visa?"),
        a: t(
          "تصريح ETA إلكتروني بالكامل للمواطنين السعوديين، دون بصمة أو مقابلة، ويغطي زيارات السياحة والأعمال حتى 6 أشهر. أما المقيمون فيحتاجون تأشيرة زيارة تتطلب بصمة في مركز VFS.",
          "The ETA is fully online for Saudi citizens — no biometrics or interview — and covers tourism and business visits of up to 6 months. Residents need a visitor visa with biometrics at VFS.",
        ),
      },
      {
        q: t("كم تستغرق تأشيرة الزيارة، وهل توجد خدمة مستعجلة؟", "How long does the visitor visa take, and is there a fast track?"),
        a: t(
          "المدة المعتادة نحو 3 أسابيع بعد البصمة. تتوفر خدمة الأولوية والأولوية القصوى برسوم إضافية تُدفع لمركز التأشيرات.",
          "Around 3 weeks after biometrics as standard. Priority and super-priority services are available for an extra fee paid to the visa centre.",
        ),
      },
      {
        q: t("رُفض طلبي سابقًا، هل يمكنني التقديم مجددًا؟", "I was refused before — can I reapply?"),
        a: t(
          "نعم، لا توجد فترة انتظار في أغلب الحالات. نراجع خطاب الرفض معك ونعالج أسبابه قبل إعادة التقديم، ويجب الإفصاح عن الرفض السابق في النموذج.",
          "Yes, in most cases there's no waiting period. We review the refusal letter with you and address the reasons first — and the previous refusal must be declared on the form.",
        ),
      },
    ],
  },

  // 5. United States ----------------------------------------------------------
  {
    slug: "united-states",
    iso2: "us",
    iata: "JFK",
    lat: 40.6413,
    lon: -73.7781,
    name: t("الولايات المتحدة", "United States"),
    capital: t("واشنطن العاصمة", "Washington, D.C."),
    region: "AMERICAS",
    schengen: false,
    popular: false,
    tagline: t("من أفق مانهاتن إلى سواحل كاليفورنيا", "From Manhattan's skyline to the California coast"),
    overview: t(
      "نيويورك وواشنطن وأورلاندو ولوس أنجلوس — وجهة للعائلة والتسوق والدراسة. تتطلب التأشيرة مقابلة شخصية في السفارة أو القنصلية، ونحن نجهّز نموذج DS-160 ونهيّئك للمقابلة خطوة بخطوة.",
      "New York, Washington, Orlando and Los Angeles — for family trips, shopping and study. The visa needs an in-person interview at the embassy or a consulate; we prepare your DS-160 and coach you for the interview.",
    ),
    imageId: "1485871981521-5b1fd3805eee",
    imageAlt: t("مبنى إمباير ستيت وأفق مانهاتن عند الغروب", "The Empire State Building and Manhattan skyline at sunset"),
    bestTime: t("أبريل–يونيو وسبتمبر–نوفمبر", "April–June and September–November"),
    flightHours: 13.5,
    currency: "USD",
    insurance: "USA_CANADA",
    visas: [
      {
        id: "us-tourism-b1b2",
        purpose: "TOURISM",
        kind: "STICKER",
        name: t("تأشيرة الزيارة B1/B2", "B1/B2 visitor visa"),
        entry: "MULTIPLE",
        validityDays: 1825,
        maxStayDays: 180,
        processingDays: [5, 10],
        appointment: true,
        appointmentNote: t(
          "المقابلة في السفارة الأمريكية بالرياض أو القنصليتين في جدة والظهران. فترات انتظار المواعيد متغيرة وقد تمتد لأشهر.",
          "Interview at the US Embassy in Riyadh or the consulates in Jeddah and Dhahran. Appointment wait times vary and can run to months.",
        ),
        pricing: [
          citizen(
            694,
            449,
            t(
              "رسوم MRV البالغة 185 دولارًا؛ قد تفرض الحكومة الأمريكية رسومًا إضافية عند الإصدار.",
              "The $185 MRV fee; the US government may charge additional fees on issuance.",
            ),
          ),
          resident(
            694,
            449,
            t(
              "رسوم MRV البالغة 185 دولارًا. مدة صلاحية التأشيرة تختلف حسب الجنسية — سنتحقق من أهليتك.",
              "The $185 MRV fee. Visa validity varies by nationality — we'll confirm your eligibility.",
            ),
          ),
        ],
        requirements: [
          R.passport(6),
          R.photoUs(),
          R.nationalId(),
          R.iqama(6),
          R.bank(6),
          R.salary(),
          R.familyRecord(),
        ],
      },
      {
        id: "us-study-f1",
        purpose: "STUDY",
        kind: "STICKER",
        name: t("تأشيرة الطالب F-1", "F-1 student visa"),
        entry: "MULTIPLE",
        validityDays: 365,
        maxStayDays: 365,
        processingDays: [5, 10],
        appointment: true,
        appointmentNote: t(
          "المقابلة في السفارة الأمريكية بالرياض أو القنصليتين في جدة والظهران. للطلاب أولوية في مواعيد الصيف.",
          "Interview at the US Embassy in Riyadh or the consulates in Jeddah and Dhahran. Students get priority for summer appointments.",
        ),
        pricing: [
          citizen(
            694,
            499,
            t(
              "لا تشمل رسوم SEVIS البالغة 350 دولارًا (نحو 1,315 ريالًا) التي تُدفع قبل المقابلة.",
              "Excludes the $350 SEVIS fee (about SAR 1,315), paid before the interview.",
            ),
          ),
          resident(
            694,
            499,
            t(
              "لا تشمل رسوم SEVIS البالغة 350 دولارًا. تختلف المتطلبات حسب الجنسية — سنتحقق من أهليتك.",
              "Excludes the $350 SEVIS fee. Requirements vary by nationality — we'll confirm your eligibility.",
            ),
          ),
        ],
        requirements: [
          R.passport(6),
          R.photoUs(),
          R.iqama(6),
          R.university(t("نموذج I-20 من الجامعة", "Form I-20 from your school"), t("موقّع من الجامعة ومن الطالب.", "Signed by the school and the student.")),
          {
            doc: "BANK_STATEMENT",
            title: t("إثبات القدرة المالية", "Proof of funds"),
            details: t("كشف حساب يغطي تكاليف السنة الأولى، أو خطاب ضمان من الجهة المبتعِثة.", "A statement covering the first year's costs, or a sponsor's guarantee letter."),
          },
          R.other(t("إيصال سداد رسوم SEVIS", "SEVIS fee receipt")),
        ],
      },
    ],
    faqs: [
      {
        q: t("كم أنتظر لموعد المقابلة؟", "How long is the wait for an interview?"),
        a: t(
          "يختلف من أسابيع إلى عدة أشهر حسب الموسم والمدينة. نحجز لك أقرب موعد متاح ونراقب المواعيد التي تُفتح لاحقًا لتقديم موعدك.",
          "Anywhere from weeks to several months depending on season and city. We book the earliest slot and keep watching for earlier openings.",
        ),
      },
      {
        q: t("هل يحتاج الأطفال إلى مقابلة؟", "Do children need an interview?"),
        a: t(
          "أصبحت المقابلة مطلوبة لمعظم المتقدمين بمن فيهم الأطفال، مع استثناءات محدودة لبعض حالات التجديد. سنراجع حالة كل فرد من العائلة ونخبرك إن كان مؤهلًا للإعفاء.",
          "Most applicants, including children, now need an interview, with limited exceptions for some renewals. We'll check each family member and tell you if a waiver applies.",
        ),
      },
      {
        q: t("ماذا يعني الرفض بموجب المادة 214(b)؟", "What does a 214(b) refusal mean?"),
        a: t(
          "يعني أن الضابط لم يقتنع بقوة روابطك بالسعودية. يمكنك إعادة التقديم عند تغيّر ظروفك أو توضيحها بشكل أفضل، ولا تُسترد رسوم MRV.",
          "It means the officer wasn't convinced of your ties to Saudi Arabia. You can reapply once your circumstances change or can be shown more clearly; the MRV fee isn't refunded.",
        ),
      },
    ],
  },

  // 6. Canada -----------------------------------------------------------------
  {
    slug: "canada",
    iso2: "ca",
    iata: "YYZ",
    lat: 43.6777,
    lon: -79.6248,
    name: t("كندا", "Canada"),
    capital: t("أوتاوا", "Ottawa"),
    region: "AMERICAS",
    schengen: false,
    popular: false,
    tagline: t("بحيرات فيروزية وجبال روكي ومدن نابضة", "Turquoise lakes, the Rockies and lively cities"),
    overview: t(
      "تورونتو وفانكوفر ومونتريال، وطبيعة بانف وشلالات نياغارا. يُقدَّم طلب تأشيرة الزائر إلكترونيًا ثم تؤخذ البصمة في مركز VFS، ومدة المعالجة طويلة نسبيًا فخطّط مبكرًا.",
      "Toronto, Vancouver and Montreal, plus Banff's wilderness and Niagara Falls. The visitor visa is applied for online with biometrics at VFS, and processing can be slow — so plan early.",
    ),
    imageId: "1503614472-8c93d56e92ce",
    imageAlt: t("بحيرة مورين وجبال روكي منعكسة على مياهها الفيروزية", "Moraine Lake with the Rockies reflected in its turquoise water"),
    bestTime: t("يونيو–سبتمبر، وأكتوبر لألوان الخريف", "June–September; October for autumn colours"),
    flightHours: 14,
    currency: "CAD",
    insurance: "USA_CANADA",
    visas: [
      {
        id: "ca-tourism-trv",
        purpose: "TOURISM",
        kind: "STICKER",
        name: t("تأشيرة الزائر (TRV)", "Visitor visa (TRV)"),
        entry: "MULTIPLE",
        validityDays: 1825,
        maxStayDays: 180,
        processingDays: [20, 60],
        appointment: true,
        appointmentNote: t(
          "بعد التقديم الإلكتروني تؤخذ البصمة في مراكز VFS Global بالرياض وجدة والخبر.",
          "After the online application, biometrics are taken at VFS Global in Riyadh, Jeddah or Khobar.",
        ),
        pricing: [
          citizen(
            510,
            399,
            t(
              "تشمل 100 دولار كندي للتأشيرة و85 للبصمة، وتتغير بالريال حسب سعر الصرف.",
              "Includes CAD 100 for the visa and CAD 85 for biometrics; the SAR amount moves with the exchange rate.",
            ),
          ),
          resident(510, 399, fxNote("تشمل 100 دولار كندي للتأشيرة و85 للبصمة.", "Includes CAD 100 for the visa and CAD 85 for biometrics.", true)),
        ],
        requirements: [
          R.passport(6),
          R.photoDigital(),
          R.iqama(6),
          R.bank(6),
          R.salary(),
          R.hotel(),
          R.familyRecord(),
        ],
      },
      {
        id: "ca-study-permit",
        purpose: "STUDY",
        kind: "STICKER",
        name: t("تصريح الدراسة", "Study permit"),
        entry: "MULTIPLE",
        validityDays: 365,
        maxStayDays: 365,
        processingDays: [30, 80],
        appointment: true,
        appointmentNote: t(
          "تؤخذ البصمة في مراكز VFS Global بالرياض وجدة والخبر.",
          "Biometrics at VFS Global in Riyadh, Jeddah or Khobar.",
        ),
        pricing: [
          citizen(
            650,
            499,
            t(
              "تشمل 150 دولارًا كنديًا لتصريح الدراسة و85 للبصمة. قد يُطلب خطاب إقليمي (PAL) وفحص طبي معتمد.",
              "Includes CAD 150 for the permit and CAD 85 for biometrics. A provincial attestation letter (PAL) and an approved medical exam may be required.",
            ),
          ),
          resident(650, 499, fxNote("تشمل 150 دولارًا كنديًا لتصريح الدراسة و85 للبصمة.", "Includes CAD 150 for the permit and CAD 85 for biometrics.", true)),
        ],
        requirements: [
          R.passport(6),
          R.photoDigital(),
          R.iqama(6),
          R.university(t("خطاب القبول (LOA)", "Letter of acceptance (LOA)"), t("من مؤسسة تعليمية معتمدة (DLI).", "From a designated learning institution (DLI).")),
          {
            doc: "BANK_STATEMENT",
            title: t("إثبات القدرة المالية", "Proof of funds"),
            details: t("يغطي الرسوم الدراسية ونفقات المعيشة للسنة الأولى، أو خطاب ضمان من الجهة المبتعِثة.", "Covering first-year tuition and living costs, or a sponsor's guarantee letter."),
          },
          R.other(t("الخطاب الإقليمي (PAL)", "Provincial attestation letter (PAL)"), t("مطلوب لمعظم البرامج الجامعية.", "Required for most college and university programmes.")),
          {
            doc: "MEDICAL_REPORT",
            title: t("فحص طبي لدى طبيب معتمد", "Medical exam by an approved panel physician"),
            details: t("عند طلبه من دائرة الهجرة الكندية.", "If requested by IRCC."),
            optional: true,
          },
        ],
      },
    ],
    faqs: [
      {
        q: t("هل يكفي تصريح eTA بدل التأشيرة؟", "Can I use an eTA instead of a visa?"),
        a: t(
          "لا للمواطنين السعوديين، فهم يحتاجون تأشيرة زائر. لكن بعض الجنسيات، كالفلبينية، قد تتأهل لتصريح eTA عند السفر جوًا إذا كانت لديها تأشيرة أمريكية سارية أو تأشيرة كندية خلال آخر 10 سنوات.",
          "Not for Saudi citizens — they need a visitor visa. Some nationalities, such as Filipinos, may qualify for an eTA when flying if they hold a valid US visa or had a Canadian visa in the last 10 years.",
        ),
      },
      {
        q: t("كم تستغرق المعالجة؟", "How long does processing take?"),
        a: t(
          "تختلف حسب ضغط الطلبات، وقد تتراوح بين 4 أسابيع وعدة أشهر. نتابع طلبك ونبلغك فور طلب جوازك لختم التأشيرة.",
          "It depends on demand — from about 4 weeks to several months. We track your file and tell you as soon as your passport is requested for stamping.",
        ),
      },
      {
        q: t("هل أحتاج تأمينًا صحيًا؟", "Do I need health insurance?"),
        a: t(
          "ليس شرطًا للتأشيرة السياحية، لكنه ضروري عمليًا لأن تكاليف العلاج في كندا مرتفعة جدًا. خطة أمريكا وكندا لدينا تغطيك طوال الرحلة.",
          "It isn't a visa requirement, but it's essential in practice — treatment in Canada is very expensive. Our USA & Canada plan covers your whole trip.",
        ),
      },
    ],
  },

  // 7. France -----------------------------------------------------------------
  {
    slug: "france",
    iso2: "fr",
    iata: "CDG",
    lat: 49.0097,
    lon: 2.5479,
    name: t("فرنسا", "France"),
    capital: t("باريس", "Paris"),
    region: "EUROPE",
    schengen: true,
    popular: true,
    tagline: t("باريس والريفيرا وقرى بروفانس", "Paris, the Riviera and Provençal villages"),
    overview: t(
      "باريس بمتاحفها وشوارعها الأنيقة، ونيس وكان على الريفيرا، وحقول اللافندر في بروفانس صيفًا. تأشيرة شنغن الصادرة من فرنسا تتيح لك التنقل في دول المنطقة كلها.",
      "Paris with its museums and elegant boulevards, Nice and Cannes on the Riviera, and Provence's lavender fields in summer. A Schengen visa issued by France lets you travel across the whole area.",
    ),
    imageId: "1502602898657-3e91760cbb34",
    imageAlt: t("برج إيفل على ضفاف نهر السين عند الغسق", "The Eiffel Tower above the Seine at dusk"),
    bestTime: t("أبريل–يونيو وسبتمبر–أكتوبر", "April–June and September–October"),
    flightHours: 6.5,
    currency: "EUR",
    insurance: "SCHENGEN",
    visas: [
      schengenTourism("fr", t("البصمة في مراكز TLScontact بالرياض وجدة والخبر. المواعيد تزدحم من مايو إلى أغسطس.", "Biometrics at TLScontact in Riyadh, Jeddah or Khobar. Slots get busy from May to August.")),
      schengenBusiness("fr", t("البصمة في مراكز TLScontact بالرياض وجدة والخبر.", "Biometrics at TLScontact in Riyadh, Jeddah or Khobar.")),
    ],
    faqs: [
      {
        q: t("متى أقدّم على تأشيرة فرنسا؟", "When should I apply for a French visa?"),
        a: t(
          "يمكن التقديم قبل السفر بـ 6 أشهر كحد أقصى و15 يومًا كحد أدنى. في الصيف تنفد المواعيد سريعًا، لذا ننصح بالبدء قبل شهرين على الأقل.",
          "You can apply up to 6 months and no later than 15 days before travel. Summer slots go fast, so start at least two months ahead.",
        ),
      },
      {
        q: t("هل يمكن الحصول على تأشيرة متعددة طويلة المدة؟", "Can I get a long-validity multiple-entry visa?"),
        a: t(
          "نعم، قد يحصل المواطنون السعوديون على تأشيرة متعددة الدخول لسنوات وفق نظام التدرّج الأوروبي، خاصة مع سجل سفر جيد. القرار النهائي يعود للقنصلية.",
          "Yes — Saudi citizens may receive multi-year multiple-entry visas under the EU's cascade rules, especially with a good travel history. The final decision rests with the consulate.",
        ),
      },
      {
        q: t("ما رسوم الأطفال وما المطلوب لهم؟", "What do children pay and need?"),
        a: t(
          "الأطفال دون 6 سنوات معفون من الرسوم، ومن 6 إلى أقل من 12 سنة يدفعون 45 يورو. يُطلب شهادة ميلاد، وموافقة الوالد غير المسافر إن سافر الطفل مع أحد والديه فقط.",
          "Under-6s pay nothing and children aged 6–11 pay €45. Bring a birth certificate, plus consent from the non-travelling parent if only one parent is travelling.",
        ),
      },
    ],
  },

  // 8. Italy ------------------------------------------------------------------
  {
    slug: "italy",
    iso2: "it",
    iata: "FCO",
    lat: 41.8003,
    lon: 12.2389,
    name: t("إيطاليا", "Italy"),
    capital: t("روما", "Rome"),
    region: "EUROPE",
    schengen: true,
    popular: true,
    tagline: t("روما والبندقية وساحل أمالفي", "Rome, Venice and the Amalfi Coast"),
    overview: t(
      "من آثار روما وأزقة فلورنسا إلى قنوات البندقية وبحيرة كومو وساحل أمالفي، إيطاليا متحف مفتوح ومطبخ لا يُنسى. التأشيرة شنغن، والمواعيد تزدحم من أبريل حتى أغسطس.",
      "From Rome's ruins and Florence's lanes to Venice's canals, Lake Como and the Amalfi Coast, Italy is an open-air museum with unforgettable food. It's a Schengen visa, and appointments fill up from April to August.",
    ),
    imageId: "1523906834658-6e24ef2386f9",
    imageAlt: t("جسر ريالتو على القناة الكبرى في البندقية وقارب جندول في المقدمة", "Rialto Bridge on Venice's Grand Canal, with a gondola in the foreground"),
    bestTime: t("أبريل–يونيو وسبتمبر–أكتوبر", "April–June and September–October"),
    flightHours: 5.5,
    currency: "EUR",
    insurance: "SCHENGEN",
    visas: [
      schengenTourism("it", t("البصمة في مراكز VFS Global المعتمدة لإيطاليا بالرياض وجدة والخبر.", "Biometrics at Italy's VFS Global centres in Riyadh, Jeddah or Khobar.")),
      schengenBusiness("it", t("البصمة في مراكز VFS Global المعتمدة لإيطاليا بالرياض وجدة والخبر.", "Biometrics at Italy's VFS Global centres in Riyadh, Jeddah or Khobar.")),
    ],
    faqs: [
      {
        q: t("هل يجب أن تكون إيطاليا وجهتي الرئيسية؟", "Does Italy need to be my main destination?"),
        a: t(
          "نعم، تقدّم لدى الدولة التي ستقضي فيها أطول مدة، أو دولة الدخول الأولى إذا تساوت المدد. سنراجع خط سيرك ونحدد الجهة الصحيحة.",
          "Yes — apply to the country where you'll spend the longest, or your first entry point if stays are equal. We'll check your itinerary and pick the right one.",
        ),
      },
      {
        q: t("ما التغطية المطلوبة في التأمين؟", "What insurance cover is required?"),
        a: t(
          "تأمين سفر يغطي 30,000 يورو على الأقل للعلاج والإعادة إلى الوطن، صالح في جميع دول شنغن طوال مدة الرحلة.",
          "At least €30,000 for medical treatment and repatriation, valid across all Schengen countries for the whole trip.",
        ),
      },
      {
        q: t("ماذا يحدث إذا رُفضت التأشيرة؟", "What happens if the visa is refused?"),
        a: t(
          "تحصل على خطاب يوضح سبب الرفض، ويمكنك الاعتراض خلال المدة المذكورة فيه أو إعادة التقديم بملف أقوى. لا تُسترد رسوم التأشيرة، ونساعدك في تقوية الملف.",
          "You'll get a letter stating the reason. You can appeal within the period it gives or reapply with a stronger file. The visa fee isn't refunded — we'll help you strengthen the application.",
        ),
      },
    ],
  },

  // 9. Spain ------------------------------------------------------------------
  {
    slug: "spain",
    iso2: "es",
    iata: "MAD",
    lat: 40.4983,
    lon: -3.5676,
    name: t("إسبانيا", "Spain"),
    capital: t("مدريد", "Madrid"),
    region: "EUROPE",
    schengen: true,
    popular: false,
    tagline: t("شمس الأندلس وروح مدريد وبرشلونة", "Andalusian sun, Madrid and Barcelona"),
    overview: t(
      "قصر الحمراء في غرناطة وجامع قرطبة يرويان تاريخ الأندلس، ومدريد وبرشلونة تجمعان الفن وكرة القدم والتسوق. تأشيرة شنغن تُقدَّم عبر مراكز BLS.",
      "Granada's Alhambra and the Mosque of Córdoba tell the story of Al-Andalus, while Madrid and Barcelona bring art, football and shopping. The Schengen visa is filed through BLS centres.",
    ),
    imageId: "1543783207-ec64e4d95325",
    imageAlt: t("إطلالة من الأعلى على مباني وسط مدريد التاريخية", "Rooftop view over the grand buildings of central Madrid"),
    bestTime: t("مارس–يونيو وسبتمبر–نوفمبر", "March–June and September–November"),
    flightHours: 7,
    currency: "EUR",
    insurance: "SCHENGEN",
    visas: [
      schengenTourism("es", t("البصمة في مراكز BLS International بالرياض وجدة والخبر.", "Biometrics at BLS International in Riyadh, Jeddah or Khobar.")),
      schengenBusiness("es", t("البصمة في مراكز BLS International بالرياض وجدة والخبر.", "Biometrics at BLS International in Riyadh, Jeddah or Khobar.")),
    ],
    faqs: [
      {
        q: t("هل يجب أن أحضر بنفسي إلى المركز؟", "Do I have to attend the centre in person?"),
        a: t(
          "نعم لأخذ البصمة. إذا سُجّلت بصماتك في نظام شنغن خلال آخر 59 شهرًا فقد تُعفى من الحضور حسب تقدير المركز.",
          "Yes, for biometrics. If your fingerprints were taken for a Schengen visa in the last 59 months, you may be exempt at the centre's discretion.",
        ),
      },
      {
        q: t("كم يجب أن يكون رصيدي البنكي؟", "How much should be in my bank account?"),
        a: t(
          "تطلب إسبانيا ملاءة مالية تقارب 120 يورو عن كل يوم للشخص، مع حد أدنى لإجمالي الرحلة. كشف بحركة منتظمة أفضل من إيداع كبير مفاجئ قبل التقديم.",
          "Spain looks for roughly €120 per person per day, with a minimum for the whole trip. Regular account activity is better than a large last-minute deposit.",
        ),
      },
      {
        q: t("هل أستطيع زيارة البرتغال بالتأشيرة نفسها؟", "Can I visit Portugal on the same visa?"),
        a: t(
          "نعم، تأشيرة شنغن تتيح التنقل في جميع دول المنطقة ومنها البرتغال، بشرط أن تكون إسبانيا وجهتك الرئيسية.",
          "Yes — a Schengen visa covers the whole area, including Portugal, as long as Spain is your main destination.",
        ),
      },
    ],
  },

  // 10. Germany ---------------------------------------------------------------
  {
    slug: "germany",
    iso2: "de",
    iata: "FRA",
    lat: 50.0379,
    lon: 8.5622,
    name: t("ألمانيا", "Germany"),
    capital: t("برلين", "Berlin"),
    region: "EUROPE",
    schengen: true,
    popular: false,
    tagline: t("قلاع بافاريا ومدن أنيقة وغابات سوداء", "Bavarian castles, elegant cities, Black Forest"),
    overview: t(
      "ميونخ وقلاع بافاريا، والغابة السوداء، وبرلين بتاريخها الحديث، إلى جانب سمعة عالمية في الطب والتعليم. نجهّز ملفات السياحة والعلاج والدراسة.",
      "Munich and the Bavarian castles, the Black Forest and Berlin's modern history — plus a world-class reputation for medicine and education. We prepare tourism, medical and study files.",
    ),
    imageId: "1467269204594-9661b134dd2b",
    imageAlt: t("زقاق حجري في روتنبورغ القديمة ببيوتها الخشبية وبوابة البرج", "Cobbled lane in Rothenburg ob der Tauber with half-timbered houses and a gate tower"),
    bestTime: t("مايو–سبتمبر، ونوفمبر–ديسمبر للأسواق الشتوية", "May–September; November–December for the winter markets"),
    flightHours: 6,
    currency: "EUR",
    insurance: "SCHENGEN",
    visas: [
      schengenTourism("de", t("البصمة في مراكز VFS Global بالرياض وجدة والخبر.", "Biometrics at VFS Global in Riyadh, Jeddah or Khobar.")),
      schengenMedical("de", t("البصمة في مراكز VFS Global بالرياض وجدة والخبر؛ تتوفر مواعيد عاجلة للحالات الطبية.", "Biometrics at VFS Global in Riyadh, Jeddah or Khobar; urgent slots are available for medical cases.")),
      {
        id: "de-study-national",
        purpose: "STUDY",
        kind: "STICKER",
        name: t("تأشيرة الدراسة الوطنية (D)", "National study visa (D)"),
        entry: "MULTIPLE",
        validityDays: 180,
        maxStayDays: 180,
        processingDays: [20, 60],
        appointment: true,
        appointmentNote: t(
          "يُقدَّم الطلب عبر مراكز VFS Global أو السفارة الألمانية بالرياض حسب نوع البرنامج.",
          "Filed via VFS Global or the German Embassy in Riyadh, depending on the programme.",
        ),
        pricing: [
          citizen(
            310,
            499,
            t(
              "الرسوم 75 يورو. يُطلب حساب بنكي مغلق (Sperrkonto) أو خطاب ضمان من الجهة المبتعِثة. بعد الوصول تحوّل التأشيرة إلى إقامة دراسية.",
              "The fee is €75. A blocked account (Sperrkonto) or a sponsor's guarantee letter is required. On arrival you convert it into a student residence permit.",
            ),
          ),
          resident(310, 499, fxNote("الرسوم 75 يورو، ويُطلب حساب بنكي مغلق (Sperrkonto) أو خطاب ضمان.", "The fee is €75; a blocked account or guarantee letter is required.", true)),
        ],
        requirements: [
          R.passport(6),
          R.photoSchengen(),
          R.iqama(6),
          R.university(t("خطاب القبول من الجامعة الألمانية", "Admission letter from the German university"), t("أو قبول مشروط بدورة لغة تحضيرية.", "Or a conditional admission with a preparatory language course.")),
          {
            doc: "BANK_STATEMENT",
            title: t("حساب بنكي مغلق أو خطاب ضمان", "Blocked account or guarantee letter"),
            details: t("بالمبلغ السنوي الذي تحدده السلطات الألمانية لنفقات المعيشة.", "For the annual living-cost amount set by the German authorities."),
          },
          R.insurance(t("تأمين صحي يغطي فترة ما قبل التسجيل في الجامعة.", "Health cover until you enrol in German student insurance.")),
          R.other(t("الشهادات الدراسية مصدّقة", "Certified academic certificates"), t("مع ترجمة معتمدة إلى الألمانية أو الإنجليزية.", "With certified German or English translations.")),
        ],
      },
    ],
    faqs: [
      {
        q: t("أريد العلاج في ألمانيا، ماذا أحتاج؟", "I want treatment in Germany — what do I need?"),
        a: t(
          "تقرير طبي حديث، وموعد مؤكد من المستشفى مع تقدير التكلفة، وإثبات القدرة على الدفع أو خطاب ضمان من جهة حكومية أو تأمينية. المرافق يتقدم بتأشيرة مستقلة للغرض نفسه.",
          "A recent medical report, a confirmed hospital appointment with a cost estimate, and proof you can pay or a guarantee from a government body or insurer. A companion applies separately for the same purpose.",
        ),
      },
      {
        q: t("كم تستغرق تأشيرة الدراسة؟", "How long does the study visa take?"),
        a: t(
          "عادة من 4 إلى 12 أسبوعًا، لذا قدّم فور حصولك على القبول وفتح الحساب المغلق أو إصدار خطاب الضمان.",
          "Usually 4–12 weeks, so apply as soon as you have your admission and the blocked account or guarantee letter.",
        ),
      },
      {
        q: t("هل أحتاج حجز فندق مدفوعًا؟", "Does my hotel booking need to be paid?"),
        a: t(
          "لا، يكفي حجز مؤكد قابل للإلغاء لكامل المدة، لكن تأكد أنه ما زال ساريًا يوم الموعد لأن بعض المراكز تتحقق منه.",
          "No — a confirmed refundable booking for the whole stay is enough, but make sure it's still active on your appointment day as some centres check.",
        ),
      },
    ],
  },

  // 11. Switzerland -----------------------------------------------------------
  {
    slug: "switzerland",
    iso2: "ch",
    iata: "ZRH",
    lat: 47.4582,
    lon: 8.5555,
    name: t("سويسرا", "Switzerland"),
    capital: t("برن", "Bern"),
    region: "EUROPE",
    schengen: true,
    popular: true,
    tagline: t("قمم الألب وبحيرات بلون الزمرد", "Alpine peaks and emerald lakes"),
    overview: t(
      "إنترلاكن وزيرمات ولوسيرن، وقطارات بانورامية بين الجبال والبحيرات — الوجهة الصيفية المفضلة لكثير من العائلات السعودية. سويسرا ضمن منطقة شنغن، وتشتهر أيضًا بعياداتها ومستشفياتها.",
      "Interlaken, Zermatt and Lucerne, with panoramic trains between peaks and lakes — a summer favourite for Saudi families. Switzerland is in Schengen and is also known for its clinics and hospitals.",
    ),
    imageId: "1530122037265-a5f1f91d3b99",
    imageAlt: t("وادي لاوتربرونن وشلال شتاوباخ بين المنحدرات الصخرية", "Lauterbrunnen valley and Staubbach Falls between sheer cliffs"),
    bestTime: t("يونيو–سبتمبر، وديسمبر–مارس للثلوج", "June–September; December–March for snow"),
    flightHours: 6,
    currency: "CHF",
    insurance: "SCHENGEN",
    visas: [
      schengenTourism("ch", t("البصمة في مركز التأشيرات المعتمد لسويسرا بالرياض وجدة والخبر. مواعيد الصيف تنفد مبكرًا.", "Biometrics at Switzerland's visa centre in Riyadh, Jeddah or Khobar. Summer slots go early.")),
      schengenMedical("ch", t("البصمة في مركز التأشيرات المعتمد لسويسرا بالرياض وجدة والخبر.", "Biometrics at Switzerland's visa centre in Riyadh, Jeddah or Khobar.")),
    ],
    faqs: [
      {
        q: t("مواعيد الصيف مزدحمة، متى أبدأ؟", "Summer slots are busy — when should I start?"),
        a: t(
          "تُفتح المواعيد قبل السفر بـ 6 أشهر. لرحلات يوليو وأغسطس ننصح بالبدء في مارس أو أبريل.",
          "Slots open 6 months before travel. For July and August trips, start in March or April.",
        ),
      },
      {
        q: t("هل تكفي تأشيرة سويسرا لزيارة دول أوروبية أخرى؟", "Does a Swiss visa cover other European countries?"),
        a: t(
          "نعم، لجميع دول شنغن مثل فرنسا وإيطاليا وألمانيا والنمسا، بشرط أن تكون سويسرا وجهتك الرئيسية. لا تشمل المملكة المتحدة.",
          "Yes — all Schengen countries such as France, Italy, Germany and Austria, as long as Switzerland is your main destination. It doesn't cover the UK.",
        ),
      },
      {
        q: t("هل يحتاج مرافق المريض إلى تأشيرة؟", "Does a patient's companion need a visa?"),
        a: t(
          "نعم، يتقدم المرافق بتأشيرة مستقلة مع خطاب المستشفى الذي يذكر اسمه، ونجهّز الملفين معًا ليُعالجا في الوقت نفسه.",
          "Yes — the companion applies separately with the hospital letter naming them. We prepare both files together so they're processed at the same time.",
        ),
      },
    ],
  },

  // 12. Austria ---------------------------------------------------------------
  {
    slug: "austria",
    iso2: "at",
    iata: "VIE",
    lat: 48.1103,
    lon: 16.5697,
    name: t("النمسا", "Austria"),
    capital: t("فيينا", "Vienna"),
    region: "EUROPE",
    schengen: true,
    popular: false,
    tagline: t("فيينا الكلاسيكية وبحيرات الألب", "Classical Vienna and Alpine lakes"),
    overview: t(
      "فيينا بقصورها ومقاهيها، وزيلامسي وهالشتات بين البحيرات والجبال — وجهة هادئة ومحبّبة للعائلات صيفًا. التأشيرة شنغن، ونتولى الملف من الحجز حتى الاستلام.",
      "Vienna's palaces and coffee houses, and Zell am See and Hallstatt among lakes and mountains — a calm summer favourite for families. It's a Schengen visa, and we handle the file from booking to collection.",
    ),
    imageId: "1516550893923-42d28e5677af",
    imageAlt: t("كاتدرائية القديس ستيفان تعلو أسطح فيينا عند الغروب", "St Stephen's Cathedral rising above Vienna's rooftops at dusk"),
    bestTime: t("مايو–سبتمبر", "May–September"),
    flightHours: 5.5,
    currency: "EUR",
    insurance: "SCHENGEN",
    visas: [
      schengenTourism("at", t("البصمة في مراكز VFS Global بالرياض وجدة والخبر.", "Biometrics at VFS Global in Riyadh, Jeddah or Khobar.")),
      schengenBusiness("at", t("البصمة في مراكز VFS Global بالرياض وجدة والخبر.", "Biometrics at VFS Global in Riyadh, Jeddah or Khobar.")),
    ],
    faqs: [
      {
        q: t("هل أستطيع زيارة زيلامسي وميونخ في رحلة واحدة؟", "Can I combine Zell am See and Munich in one trip?"),
        a: t(
          "نعم، تأشيرة شنغن تشمل النمسا وألمانيا معًا. تقدّم لدى الدولة التي ستقضي فيها ليالي أكثر، وسنحدد ذلك من خط سيرك.",
          "Yes — one Schengen visa covers both. Apply to the country where you'll spend more nights; we'll work it out from your itinerary.",
        ),
      },
      {
        q: t("ما المدة المسموح بها للإقامة؟", "How long can I stay?"),
        a: t(
          "حتى 90 يومًا خلال أي 180 يومًا في دول شنغن مجتمعة، حتى لو كانت التأشيرة صالحة لسنوات.",
          "Up to 90 days in any 180 across all Schengen countries combined — even if the visa is valid for years.",
        ),
      },
      {
        q: t("هل يحتاج المتقاعد إلى خطاب من جهة العمل؟", "Do retirees need an employer letter?"),
        a: t(
          "لا، يكفي ما يثبت الدخل مثل خطاب التقاعد وكشف الحساب، أو خطاب كفالة من أحد الأبناء مع كشف حسابه.",
          "No — proof of income such as a pension letter and bank statement is enough, or a sponsorship letter from a son or daughter with their statement.",
        ),
      },
    ],
  },

  // 13. Japan -----------------------------------------------------------------
  {
    slug: "japan",
    iso2: "jp",
    iata: "HND",
    lat: 35.5494,
    lon: 139.7798,
    name: t("اليابان", "Japan"),
    capital: t("طوكيو", "Tokyo"),
    region: "ASIA",
    schengen: false,
    popular: true,
    tagline: t("تقاليد عريقة في قلب المستقبل", "Ancient traditions, futuristic cities"),
    overview: t(
      "طوكيو المتلألئة، ومعابد كيوتو، وجبل فوجي، وقطار الشينكانسن الذي يربطها كلها. يمكن التقديم على تأشيرة اليابان الإلكترونية دون زيارة السفارة، وتُعرض من جوالك عند الوصول.",
      "Dazzling Tokyo, Kyoto's temples and Mount Fuji, all linked by the shinkansen. You can apply for Japan's eVISA without visiting the embassy and show it on your phone on arrival.",
    ),
    imageId: "1493976040374-85c8e12f0c0e",
    imageAlt: t("زقاق في كيوتو يقود إلى معبد ياساكا عند الغسق وامرأتان بالكيمونو", "Kyoto lane leading to the Yasaka Pagoda at dusk, two women in kimono walking"),
    bestTime: t("مارس–أبريل لأزهار الساكورا، وأكتوبر–نوفمبر للخريف", "March–April for cherry blossom; October–November for autumn leaves"),
    flightHours: 13,
    currency: "JPY",
    insurance: "WORLDWIDE",
    visas: [
      {
        id: "jp-tourism-evisa",
        purpose: "TOURISM",
        kind: "E_VISA",
        name: t("تأشيرة اليابان الإلكترونية", "Japan eVISA"),
        entry: "SINGLE",
        validityDays: 90,
        maxStayDays: 90,
        processingDays: [5, 10],
        appointment: false,
        pricing: [
          citizen(75, 149, t("الرسوم بالين الياباني وتتغير بالريال حسب سعر الصرف.", "The fee is set in yen, so the SAR amount moves with the exchange rate.")),
          resident(75, 149, NATIONALITY_NOTE),
        ],
        requirements: [
          R.passport(6),
          R.photoDigital(),
          R.iqama(3),
          R.bank(3),
          R.flight(),
          R.hotel(),
          R.other(t("جدول الرحلة اليومي", "Day-by-day itinerary"), t("نجهّزه لك بالنموذج المعتمد من السفارة.", "We'll prepare it on the embassy's template.")),
        ],
      },
      {
        id: "jp-business-sticker",
        purpose: "BUSINESS",
        kind: "STICKER",
        name: t("تأشيرة أعمال قصيرة", "Short-term business visa"),
        entry: "SINGLE",
        validityDays: 90,
        maxStayDays: 90,
        processingDays: [5, 10],
        appointment: true,
        appointmentNote: t(
          "يُقدَّم الطلب في سفارة اليابان بالرياض أو القنصلية العامة في جدة حسب منطقة إقامتك.",
          "Filed at the Embassy of Japan in Riyadh or the Consulate-General in Jeddah, depending on where you live.",
        ),
        pricing: [
          citizen(75, 249, t("الرسوم بالين الياباني؛ تتوفر تأشيرة متعددة الدخول للمسافرين الدائمين برسوم أعلى.", "Fee set in yen; multiple-entry visas for frequent travellers cost more.")),
          resident(75, 249, NATIONALITY_NOTE),
        ],
        requirements: [
          R.passport(6),
          R.photo(),
          R.iqama(3),
          R.invitation(
            t("خطاب دعوة وضمان من الشركة اليابانية", "Invitation and guarantee letter from the Japanese company"),
            t("مع جدول الزيارة وبيانات الشركة المضيفة.", "With the visit schedule and host company details."),
          ),
          R.employment(),
          R.cr(),
          R.flight(),
        ],
      },
    ],
    faqs: [
      {
        q: t("كم تستغرق التأشيرة الإلكترونية؟", "How long does the eVISA take?"),
        a: t(
          "عادة من 5 إلى 10 أيام عمل. تصلك التأشيرة على بريدك وتعرضها من جوالك عند الصعود إلى الطائرة وفي مطار الوصول.",
          "Usually 5–10 working days. It arrives by email and you show it on your phone at boarding and on arrival.",
        ),
      },
      {
        q: t("هل تصلح التأشيرة الإلكترونية لأي منفذ دخول؟", "Is the eVISA valid at any port of entry?"),
        a: t(
          "هي للدخول جوًا فقط، فلا تناسب الوصول بالسفن السياحية. إن كانت رحلتك بحرية فأخبرنا لنقدّم على التأشيرة الورقية.",
          "It's for arrival by air only, so it doesn't suit cruise arrivals. If you're coming by sea, tell us and we'll apply for a sticker visa.",
        ),
      },
      {
        q: t("هل أحتاج كفيلًا في اليابان؟", "Do I need a sponsor in Japan?"),
        a: t(
          "للسياحة لا، يكفي جدول رحلتك وحجوزاتك. أما زيارات العمل فتتطلب خطاب دعوة وضمان من الشركة اليابانية المضيفة.",
          "Not for tourism — your itinerary and bookings are enough. Business visits need an invitation and guarantee letter from the Japanese host company.",
        ),
      },
    ],
  },

  // 14. South Korea -----------------------------------------------------------
  {
    slug: "south-korea",
    iso2: "kr",
    iata: "ICN",
    lat: 37.4602,
    lon: 126.4407,
    name: t("كوريا الجنوبية", "South Korea"),
    capital: t("سيول", "Seoul"),
    region: "ASIA",
    schengen: false,
    popular: false,
    tagline: t("سيول بين القصور العتيقة والأبراج", "Seoul: royal palaces and glass towers"),
    overview: t(
      "سيول بقصورها وأسواقها وثقافتها الشبابية، وجزيرة جيجو البركانية، وبوسان على البحر. يدخلها المواطن السعودي دون تأشيرة بعد الحصول على تصريح K-ETA الإلكتروني.",
      "Seoul's palaces, markets and youth culture, volcanic Jeju Island and seaside Busan. Saudi citizens enter visa-free once they have a K-ETA travel authorisation.",
    ),
    imageId: "1534274867514-d5b47ef89ed7",
    imageAlt: t("برج لوتي العالمي ينعكس على مياه نهر هان في سيول", "Lotte World Tower reflected in the Han River, Seoul"),
    bestTime: t("أبريل–مايو وسبتمبر–نوفمبر", "April–May and September–November"),
    flightHours: 12,
    currency: "KRW",
    insurance: "WORLDWIDE",
    visas: [
      {
        id: "kr-tourism-keta",
        purpose: "TOURISM",
        kind: "ETA",
        name: t("تصريح السفر الإلكتروني K-ETA", "K-ETA travel authorisation"),
        entry: "MULTIPLE",
        validityDays: 1095,
        maxStayDays: 30,
        processingDays: [1, 3],
        appointment: false,
        pricing: [
          citizen(30, 99, t("رسوم K-ETA نحو 10,000 وون كوري.", "The K-ETA fee is about KRW 10,000.")),
          resident(
            30,
            99,
            t(
              "متاح فقط لجنسيات الدول المعفاة من التأشيرة مثل الولايات المتحدة وبريطانيا — سنتحقق من أهليتك.",
              "Only for visa-exempt nationalities such as US and UK citizens — we'll confirm your eligibility.",
            ),
          ),
        ],
        requirements: [R.passport(6), R.photoDigital(), R.flight(), R.hotel()],
      },
      {
        id: "kr-tourism-sticker",
        purpose: "TOURISM",
        kind: "STICKER",
        name: t("تأشيرة سياحية للمقيمين", "Tourist visa for residents"),
        entry: "SINGLE",
        validityDays: 90,
        maxStayDays: 30,
        processingDays: [7, 10],
        appointment: true,
        appointmentNote: t(
          "يُقدَّم الطلب في سفارة كوريا بالرياض أو القنصلية العامة في جدة حسب منطقة إقامتك.",
          "Filed at the Korean Embassy in Riyadh or the Consulate-General in Jeddah, depending on where you live.",
        ),
        pricing: [
          notFor("SAUDI_CITIZEN", t("يدخل المواطنون السعوديون دون تأشيرة مع تصريح K-ETA.", "Saudi citizens enter visa-free with a K-ETA.")),
          resident(150, 249, NATIONALITY_NOTE),
        ],
        requirements: [R.passport(6), R.photo(), R.iqama(3), R.bank(6), R.salary(), R.hotel(), R.flight()],
      },
    ],
    faqs: [
      {
        q: t("متى أقدّم على K-ETA؟", "When should I apply for a K-ETA?"),
        a: t(
          "قبل السفر بـ 72 ساعة على الأقل، وننصح بأسبوع. التصريح صالح 3 سنوات لزيارات متعددة لا تتجاوز كل منها 30 يومًا.",
          "At least 72 hours before departure — we suggest a week. It's valid for 3 years for multiple visits of up to 30 days each.",
        ),
      },
      {
        q: t("ماذا لو رُفض طلب K-ETA؟", "What if my K-ETA is refused?"),
        a: t(
          "يمكنك التقدم بتأشيرة سياحية عادية عبر السفارة، ونتولى الملف بالكامل ونرفق ما يوضح سبب الرحلة.",
          "You can apply for a regular tourist visa through the embassy — we'll handle the whole file and explain your trip clearly.",
        ),
      },
      {
        q: t("هل التأمين مطلوب في كوريا؟", "Is insurance required in Korea?"),
        a: t(
          "ليس شرطًا للدخول، لكنه مهم لتغطية العلاج الطارئ. خطة التأمين العالمية لدينا تشمل كوريا.",
          "It isn't an entry requirement, but it matters for emergency treatment. Our worldwide plan covers Korea.",
        ),
      },
    ],
  },

  // 15. China -----------------------------------------------------------------
  {
    slug: "china",
    iso2: "cn",
    iata: "PEK",
    lat: 40.0799,
    lon: 116.6031,
    name: t("الصين", "China"),
    capital: t("بكين", "Beijing"),
    region: "ASIA",
    schengen: false,
    popular: false,
    tagline: t("سور عظيم وحضارة بآلاف السنين", "The Great Wall and millennia of history"),
    overview: t(
      "بكين وسورها العظيم، وشنغهاي الحديثة، وقوانغتشو مركز التجارة والمعارض. يدخل المواطنون السعوديون الصين حاليًا دون تأشيرة لمدة تصل إلى 30 يومًا ضمن إعفاء مؤقت، ونستخرج تأشيرات السياحة والأعمال للمقيمين.",
      "Beijing and the Great Wall, modern Shanghai, and Guangzhou's trade fairs. Saudi citizens currently enter visa-free for up to 30 days under a temporary waiver, and we arrange tourist and business visas for residents.",
    ),
    imageId: "1508804185872-d7badad00f7d",
    imageAlt: t("سور الصين العظيم يمتد على تلال بألوان الخريف", "The Great Wall winding over autumn-coloured hills"),
    bestTime: t("أبريل–مايو وسبتمبر–أكتوبر", "April–May and September–October"),
    flightHours: 8.5,
    currency: "CNY",
    insurance: "WORLDWIDE",
    visas: [
      {
        id: "cn-tourism-visa-free",
        purpose: "TOURISM",
        kind: "VISA_FREE",
        name: t("دخول دون تأشيرة للمواطنين", "Visa-free entry for Saudi citizens"),
        entry: "MULTIPLE",
        validityDays: 180,
        maxStayDays: 30,
        processingDays: [1, 2],
        appointment: false,
        pricing: [
          citizen(0, 0, t(
              "لا تحتاج تأشيرة. ننصح بتأمين سفر — متاح كخدمة منفصلة.",
              "No visa needed. We recommend travel insurance — available as a separate service.",
            )),
          notFor(
            "RESIDENT",
            t("الإعفاء خاص بجنسيات محددة — اختر التأشيرة السياحية وسنتحقق من جنسيتك.", "The waiver covers specific nationalities only — choose the tourist visa and we'll check yours."),
          ),
        ],
        requirements: [
          R.passport(6),
          R.flight(),
          R.hotel(),
          R.insurance(t("موصى به لتغطية الطوارئ الطبية.", "Recommended for medical emergencies."), true),
        ],
      },
      {
        id: "cn-tourism-sticker",
        purpose: "TOURISM",
        kind: "STICKER",
        name: t("تأشيرة سياحية (L)", "Tourist visa (L)"),
        entry: "SINGLE",
        validityDays: 90,
        maxStayDays: 30,
        processingDays: [4, 7],
        appointment: true,
        appointmentNote: t(
          "يُقدَّم الطلب وتؤخذ البصمة في مركز خدمات التأشيرة الصينية بالرياض أو جدة.",
          "Filed with biometrics at the Chinese Visa Application Service Center in Riyadh or Jeddah.",
        ),
        pricing: [
          notFor(
            "SAUDI_CITIZEN",
            t("المواطنون السعوديون معفون حاليًا للزيارات حتى 30 يومًا. للإقامة الأطول تواصل معنا.", "Saudi citizens are currently exempt for visits up to 30 days. For longer stays, contact us."),
          ),
          resident(
            400,
            249,
            t(
              "تشمل رسوم التأشيرة ورسوم مركز الخدمة. تختلف المتطلبات حسب الجنسية — سنتحقق من أهليتك.",
              "Includes visa and service-centre fees. Requirements vary by nationality — we'll confirm your eligibility.",
            ),
          ),
        ],
        requirements: [R.passport(6), R.photo(), R.iqama(3), R.bank(3), R.salary(), R.hotel(), R.flight()],
      },
      {
        id: "cn-business-sticker",
        purpose: "BUSINESS",
        kind: "STICKER",
        name: t("تأشيرة أعمال (M)", "Business visa (M)"),
        entry: "MULTIPLE",
        validityDays: 365,
        maxStayDays: 30,
        processingDays: [4, 7],
        appointment: true,
        appointmentNote: t(
          "يُقدَّم الطلب وتؤخذ البصمة في مركز خدمات التأشيرة الصينية بالرياض أو جدة.",
          "Filed with biometrics at the Chinese Visa Application Service Center in Riyadh or Jeddah.",
        ),
        pricing: [
          citizen(
            400,
            299,
            t(
              "للزيارات التجارية المتكررة على مدار السنة أو الأطول من مدة الإعفاء.",
              "For frequent business trips through the year, or stays longer than the waiver allows.",
            ),
          ),
          resident(400, 299, NATIONALITY_NOTE),
        ],
        requirements: [
          R.passport(6),
          R.photo(),
          R.iqama(3),
          R.invitation(
            t("خطاب دعوة من الشركة الصينية", "Invitation letter from the Chinese company"),
            t("يذكر بيانات الشركة وغرض الزيارة وتواريخها.", "Stating company details, purpose and dates."),
          ),
          R.employment(),
          R.cr(),
        ],
      },
    ],
    faqs: [
      {
        q: t("هل يشمل الإعفاء زيارات العمل؟", "Does the waiver cover business trips?"),
        a: t(
          "نعم، يشمل السياحة والأعمال وزيارة الأهل والعبور حتى 30 يومًا. ولمن يحتاج دخولًا متكررًا طوال السنة تبقى تأشيرة الأعمال متعددة الدخول أنسب.",
          "Yes — it covers tourism, business, family visits and transit for up to 30 days. If you travel often through the year, a multiple-entry business visa is still the better fit.",
        ),
      },
      {
        q: t("هل تعمل تطبيقاتي المعتادة في الصين؟", "Will my usual apps work in China?"),
        a: t(
          "كثير من تطبيقات Google وواتساب لا تعمل دون حلول بديلة، والدفع يعتمد على Alipay وWeChat Pay. ننصح بتفعيلهما وربطهما ببطاقتك قبل السفر.",
          "Many Google services and WhatsApp won't work without workarounds, and payments run on Alipay and WeChat Pay. Set them up and link your card before you fly.",
        ),
      },
      {
        q: t("كم تستغرق تأشيرة المقيمين؟", "How long does the resident visa take?"),
        a: t(
          "عادة 4 أيام عمل بعد تقديم الملف، وتتوفر خدمة مستعجلة برسوم إضافية.",
          "Usually 4 working days after submission, with an express option for an extra fee.",
        ),
      },
    ],
  },

  // 16. Malaysia --------------------------------------------------------------
  {
    slug: "malaysia",
    iso2: "my",
    iata: "KUL",
    lat: 2.7456,
    lon: 101.7099,
    name: t("ماليزيا", "Malaysia"),
    capital: t("كوالالمبور", "Kuala Lumpur"),
    region: "ASIA",
    schengen: false,
    popular: true,
    tagline: t("غابات استوائية وجزر بلون الفيروز", "Rainforest, islands and a dazzling skyline"),
    overview: t(
      "كوالالمبور بأبراجها وأسواقها، ولنكاوي وبينانغ بشواطئهما، ومرتفعات كاميرون الخضراء — وجهة مريحة للعائلات المسلمة. يدخلها المواطن السعودي دون تأشيرة، ويكفي تعبئة بطاقة الوصول الرقمية.",
      "Kuala Lumpur's towers and markets, the beaches of Langkawi and Penang, and the green Cameron Highlands — an easy, Muslim-friendly family destination. Saudi citizens need no visa, just the digital arrival card.",
    ),
    imageId: "1596422846543-75c6fc197f07",
    imageAlt: t("برجا بتروناس وأفق كوالالمبور مضاءان عند الغسق", "The Petronas Twin Towers and Kuala Lumpur skyline lit at dusk"),
    bestTime: t("نوفمبر–أبريل لكوالالمبور ولنكاوي، ومارس–أكتوبر للساحل الشرقي", "November–April for KL and Langkawi; March–October for the east coast"),
    flightHours: 8.5,
    currency: "MYR",
    insurance: "WORLDWIDE",
    visas: [
      {
        id: "my-tourism-visa-free",
        purpose: "TOURISM",
        kind: "VISA_FREE",
        name: t("دخول دون تأشيرة للمواطنين", "Visa-free entry for Saudi citizens"),
        entry: "MULTIPLE",
        validityDays: 180,
        maxStayDays: 90,
        processingDays: [1, 2],
        appointment: false,
        pricing: [
          citizen(0, 0, t(
              "لا تحتاج تأشيرة. ننصح بتأمين سفر — متاح كخدمة منفصلة.",
              "No visa needed. We recommend travel insurance — available as a separate service.",
            )),
          notFor(
            "RESIDENT",
            t("يعتمد الإعفاء على جنسيتك — اختر التأشيرة الإلكترونية وسنخبرك إن كنت معفى.", "Exemption depends on your nationality — choose the e-Visa and we'll tell you if you're exempt."),
          ),
        ],
        requirements: [
          R.passport(6),
          R.flight(),
          R.hotel(),
          R.other(t("بطاقة الوصول الرقمية MDAC", "MDAC digital arrival card"), t("مجانية عبر الموقع الرسمي لدائرة الهجرة الماليزية.", "Free on the official Malaysian Immigration website.")),
        ],
      },
      {
        id: "my-tourism-evisa",
        purpose: "TOURISM",
        kind: "E_VISA",
        name: t("تأشيرة إلكترونية للمقيمين", "e-Visa for residents"),
        entry: "SINGLE",
        validityDays: 90,
        maxStayDays: 30,
        processingDays: [3, 5],
        appointment: false,
        pricing: [
          notFor("SAUDI_CITIZEN", t("المواطنون السعوديون معفون من التأشيرة.", "Saudi citizens are visa-exempt.")),
          resident(130, 149, NATIONALITY_NOTE),
        ],
        requirements: [R.passport(6), R.photoDigital(), R.iqama(3), R.bank(3), R.flight(), R.hotel()],
      },
    ],
    faqs: [
      {
        q: t("ما بطاقة MDAC؟", "What is the MDAC?"),
        a: t(
          "بطاقة الوصول الرقمية الماليزية، تُعبّأ مجانًا عبر الإنترنت خلال 3 أيام قبل وصولك، وتُسرّع مرورك في المطار.",
          "Malaysia's digital arrival card — free to complete online within 3 days before you arrive, and it speeds you through the airport.",
        ),
      },
      {
        q: t("هل التأشيرة الإلكترونية متعددة الدخول؟", "Is the e-Visa multiple-entry?"),
        a: t(
          "لا، هي لدخول واحد وإقامة حتى 30 يومًا. إن كنت تخطط لزيارة سنغافورة أو تايلاند ثم العودة، أخبرنا لنرتّب التأشيرة المناسبة.",
          "No — it's single-entry for up to 30 days. If you plan to pop over to Singapore or Thailand and come back, let us know so we arrange the right visa.",
        ),
      },
      {
        q: t("هل يمكن تمديد الإقامة في ماليزيا؟", "Can I extend my stay in Malaysia?"),
        a: t(
          "التمديد ممكن من دائرة الهجرة الماليزية في حالات محدودة فقط، لذا الأفضل التخطيط للرحلة ضمن المدة المسموحة.",
          "Extensions are possible at the Immigration Department only in limited cases, so it's best to plan within the allowed stay.",
        ),
      },
    ],
  },

  // 17. Thailand --------------------------------------------------------------
  {
    slug: "thailand",
    iso2: "th",
    iata: "BKK",
    lat: 13.69,
    lon: 100.7501,
    name: t("تايلاند", "Thailand"),
    capital: t("بانكوك", "Bangkok"),
    region: "ASIA",
    schengen: false,
    popular: true,
    tagline: t("معابد ذهبية وجزر استوائية", "Golden temples and tropical islands"),
    overview: t(
      "بانكوك بأسواقها ومعابدها، وبوكيت وكرابي وجزر في في بشواطئها، وشيانغ ماي بطبيعتها الهادئة. يدخلها المواطن السعودي دون تأشيرة، مع تعبئة بطاقة الوصول الرقمية TDAC قبل السفر.",
      "Bangkok's markets and temples, the beaches of Phuket, Krabi and Phi Phi, and laid-back Chiang Mai. Saudi citizens enter visa-free after completing the TDAC digital arrival card.",
    ),
    imageId: "1528181304800-259b08848526",
    imageAlt: t("معبد مذهّب بطراز لانا وباغودا بيضاء تحت سماء زرقاء في شمال تايلاند", "Gilded Lanna-style temple and a white pagoda under blue sky in northern Thailand"),
    bestTime: t("نوفمبر–مارس", "November–March"),
    flightHours: 6.5,
    currency: "THB",
    insurance: "WORLDWIDE",
    visas: [
      {
        id: "th-tourism-visa-free",
        purpose: "TOURISM",
        kind: "VISA_FREE",
        name: t("دخول دون تأشيرة للمواطنين", "Visa-free entry for Saudi citizens"),
        entry: "MULTIPLE",
        validityDays: 180,
        maxStayDays: 60,
        processingDays: [1, 2],
        appointment: false,
        pricing: [
          citizen(0, 0, t(
              "لا تحتاج تأشيرة. ننصح بتأمين سفر — متاح كخدمة منفصلة.",
              "No visa needed. We recommend travel insurance — available as a separate service.",
            )),
          notFor(
            "RESIDENT",
            t("يعتمد الإعفاء على جنسيتك — اختر التأشيرة الإلكترونية وسنخبرك إن كنت معفى.", "Exemption depends on your nationality — choose the e-Visa and we'll tell you if you're exempt."),
          ),
        ],
        requirements: [
          R.passport(6),
          R.flight(),
          R.hotel(),
          R.other(t("بطاقة الوصول الرقمية TDAC", "TDAC digital arrival card"), t("مجانية وتُعبّأ خلال 3 أيام قبل الوصول.", "Free, completed within 3 days before arrival.")),
          R.bank(3, true),
        ],
      },
      {
        id: "th-tourism-evisa",
        purpose: "TOURISM",
        kind: "E_VISA",
        name: t("تأشيرة سياحية إلكترونية للمقيمين", "Tourist e-Visa for residents"),
        entry: "SINGLE",
        validityDays: 90,
        maxStayDays: 60,
        processingDays: [5, 10],
        appointment: false,
        pricing: [
          notFor("SAUDI_CITIZEN", t("المواطنون السعوديون معفون من التأشيرة.", "Saudi citizens are visa-exempt.")),
          resident(
            150,
            149,
            t(
              "تُقدَّم عبر منصة التأشيرة الإلكترونية التايلاندية الرسمية. تختلف المتطلبات حسب الجنسية — سنتحقق من أهليتك.",
              "Filed on Thailand's official e-Visa platform. Requirements vary by nationality — we'll confirm your eligibility.",
            ),
          ),
        ],
        requirements: [R.passport(6), R.photoDigital(), R.iqama(3), R.bank(3), R.salary(), R.flight(), R.hotel()],
      },
    ],
    faqs: [
      {
        q: t("ما بطاقة TDAC ومتى أعبئها؟", "What is the TDAC and when do I fill it in?"),
        a: t(
          "بطاقة الوصول الرقمية التايلاندية، وهي إلزامية لجميع الأجانب وتُعبّأ مجانًا خلال 3 أيام قبل الوصول. احذر المواقع غير الرسمية التي تطلب رسومًا.",
          "Thailand's digital arrival card — mandatory for all foreigners and free to complete within 3 days before arrival. Beware unofficial sites that charge a fee.",
        ),
      },
      {
        q: t("هل يجب أن تكون معي تذكرة عودة؟", "Do I need a return ticket?"),
        a: t(
          "نعم، قد يطلب موظف الجوازات أو شركة الطيران تذكرة عودة أو مغادرة خلال مدة الإقامة المسموحة، إضافة إلى ما يثبت قدرتك المالية.",
          "Yes — immigration or the airline may ask for a return or onward ticket within your permitted stay, as well as proof of funds.",
        ),
      },
      {
        q: t("هل أحتاج تأمين سفر؟", "Do I need travel insurance?"),
        a: t(
          "ليس شرطًا للدخول، لكنه مهم جدًا لأن المستشفيات الخاصة مكلفة، خاصة مع الأنشطة البحرية والدراجات النارية.",
          "It isn't an entry requirement, but it's important — private hospitals are expensive, especially if you're diving or riding scooters.",
        ),
      },
    ],
  },

  // 18. Indonesia -------------------------------------------------------------
  {
    slug: "indonesia",
    iso2: "id",
    iata: "DPS",
    lat: -8.7482,
    lon: 115.1675,
    name: t("إندونيسيا", "Indonesia"),
    capital: t("جاكرتا", "Jakarta"),
    region: "ASIA",
    schengen: false,
    popular: true,
    tagline: t("بالي: معابد على الماء وحقول أرز", "Bali's water temples and rice terraces"),
    overview: t(
      "بالي بشواطئها ومدرجات الأرز في أوبود، وجزر لومبوك وجيلي، وجاكرتا عاصمة أكبر بلد مسلم في العالم. تحصل على تأشيرة الوصول الإلكترونية قبل السفر لتختصر طوابير المطار.",
      "Bali's beaches and Ubud's rice terraces, the Lombok and Gili islands, and Jakarta, capital of the world's largest Muslim-majority country. Get the electronic visa on arrival before you fly and skip the airport queues.",
    ),
    imageId: "1537996194471-e657df975ab4",
    imageAlt: t("معبد أولون دانو براتان في بالي منعكسًا على مياه البحيرة", "Pura Ulun Danu Beratan temple in Bali reflected in the lake"),
    bestTime: t("أبريل–أكتوبر (الموسم الجاف)", "April–October (dry season)"),
    flightHours: 10,
    currency: "IDR",
    insurance: "WORLDWIDE",
    visas: [
      {
        id: "id-tourism-evoa",
        purpose: "TOURISM",
        kind: "VISA_ON_ARRIVAL",
        name: t("تأشيرة الوصول الإلكترونية (e-VOA)", "Electronic visa on arrival (e-VOA)"),
        entry: "SINGLE",
        validityDays: 90,
        maxStayDays: 30,
        processingDays: [1, 3],
        appointment: false,
        pricing: [
          citizen(
            120,
            99,
            t(
              "الرسوم 500,000 روبية، وقابلة للتمديد مرة واحدة 30 يومًا. ضريبة بالي السياحية تُدفع بشكل منفصل.",
              "The fee is IDR 500,000, extendable once for 30 days. Bali's tourist levy is paid separately.",
            ),
          ),
          resident(
            120,
            99,
            t(
              "متاحة لعدد كبير من الجنسيات وليس جميعها — سنتحقق من أهليتك. ضريبة بالي السياحية تُدفع بشكل منفصل.",
              "Available to many but not all nationalities — we'll confirm your eligibility. Bali's tourist levy is paid separately.",
            ),
          ),
        ],
        requirements: [
          R.passport(6),
          R.photoDigital(),
          R.flight(),
          R.hotel(),
          R.insurance(t("موصى به، خاصة للأنشطة البحرية.", "Recommended, especially for water sports."), true),
        ],
      },
    ],
    faqs: [
      {
        q: t("هل يمكن الحصول على التأشيرة في مطار بالي مباشرة؟", "Can I get the visa at Bali airport?"),
        a: t(
          "نعم، لكن التأشيرة الإلكترونية تُصدر قبل السفر وتتيح لك استخدام البوابات الآلية، فتوفر وقت الانتظار بعد رحلة طويلة.",
          "Yes, but the e-VOA is issued before you fly and lets you use the automated gates — saving a long wait after a long flight.",
        ),
      },
      {
        q: t("هل يمكن تمديد الإقامة؟", "Can I extend my stay?"),
        a: t(
          "نعم، مرة واحدة لمدة 30 يومًا إضافية، ويُطلب التمديد إلكترونيًا قبل انتهاء المدة الأولى.",
          "Yes, once for a further 30 days, applied for online before the first period ends.",
        ),
      },
      {
        q: t("ما ضريبة بالي السياحية؟", "What is the Bali tourist levy?"),
        a: t(
          "رسوم تفرضها حكومة بالي على الزوار الأجانب بقيمة 150,000 روبية (نحو 35 ريالًا) لكل زيارة، وتُدفع عبر الموقع الرسمي أو عند الوصول.",
          "A charge of IDR 150,000 (about SAR 35) per visit levied by Bali's government on foreign visitors, paid on the official website or on arrival.",
        ),
      },
    ],
  },

  // 19. Maldives --------------------------------------------------------------
  {
    slug: "maldives",
    iso2: "mv",
    iata: "MLE",
    lat: 4.1918,
    lon: 73.5291,
    name: t("جزر المالديف", "Maldives"),
    capital: t("ماليه", "Malé"),
    region: "ASIA",
    schengen: false,
    popular: false,
    tagline: t("فيلات فوق الماء وشعاب مرجانية", "Overwater villas and coral reefs"),
    overview: t(
      "جزر مرجانية ومياه فيروزية ومنتجعات خاصة — وجهة مثالية لشهر العسل والاسترخاء، على بُعد نحو 5 ساعات من الرياض. تُمنح تأشيرة سياحية مجانية عند الوصول لجميع الجنسيات.",
      "Coral atolls, turquoise water and private resorts — ideal for honeymoons and unwinding, about 5 hours from Riyadh. A free tourist visa is granted on arrival to every nationality.",
    ),
    imageId: "1514282401047-d79a71a590e8",
    imageAlt: t("منظر جوي لفيلات فوق الماء في بحيرة فيروزية بجزر المالديف", "Aerial view of overwater villas in a turquoise Maldives lagoon"),
    bestTime: t("نوفمبر–أبريل", "November–April"),
    flightHours: 5,
    currency: "MVR",
    insurance: "WORLDWIDE",
    visas: [
      {
        id: "mv-tourism-voa",
        purpose: "TOURISM",
        kind: "VISA_ON_ARRIVAL",
        name: t("تأشيرة سياحية مجانية عند الوصول", "Free tourist visa on arrival"),
        entry: "SINGLE",
        validityDays: 30,
        maxStayDays: 30,
        processingDays: [1, 1],
        appointment: false,
        pricing: [
          citizen(
            0,
            99,
            t(
              "التأشيرة مجانية؛ تشمل خدمتنا تعبئة إقرار IMUGA ومراجعة حجوزاتك وإصدار التأمين.",
              "The visa is free; our service covers the IMUGA declaration, a booking check and insurance.",
            ),
          ),
          resident(
            0,
            99,
            t(
              "التأشيرة مجانية لجميع الجنسيات؛ تشمل خدمتنا تعبئة إقرار IMUGA ومراجعة حجوزاتك وإصدار التأمين.",
              "The visa is free for all nationalities; our service covers the IMUGA declaration, a booking check and insurance.",
            ),
          ),
        ],
        requirements: [
          R.passport(6),
          R.flight(),
          R.hotel(),
          R.other(t("إقرار IMUGA الإلكتروني", "IMUGA traveller declaration"), t("يُعبّأ خلال 96 ساعة قبل الوصول.", "Completed within 96 hours before arrival.")),
          R.bank(3, true),
        ],
      },
    ],
    faqs: [
      {
        q: t("ما إقرار IMUGA؟", "What is the IMUGA declaration?"),
        a: t(
          "إقرار إلكتروني للصحة والجمارك يُعبّأ خلال 96 ساعة قبل الوصول وقبل المغادرة، وتحصل بعده على رمز QR يُعرض في المطار.",
          "An online health and customs declaration completed within 96 hours of arrival and of departure; you'll get a QR code to show at the airport.",
        ),
      },
      {
        q: t("هل أحتاج حجزًا مؤكدًا مسبقًا؟", "Do I need a confirmed booking in advance?"),
        a: t(
          "نعم، يُطلب حجز مؤكد في منتجع أو فندق مرخّص لكامل المدة، إضافة إلى تذكرة عودة أو مغادرة.",
          "Yes — a confirmed booking at a licensed resort or hotel for the whole stay, plus a return or onward ticket.",
        ),
      },
      {
        q: t("هل يمكن تمديد مدة الإقامة؟", "Can I extend my stay?"),
        a: t(
          "تُمنح 30 يومًا عند الوصول، ويمكن طلب التمديد من دائرة الهجرة المالديفية بشروط، منها إثبات الإقامة والقدرة المالية.",
          "You get 30 days on arrival; extensions can be requested from Maldives Immigration subject to conditions, including proof of accommodation and funds.",
        ),
      },
    ],
  },

  // 20. Australia -------------------------------------------------------------
  {
    slug: "australia",
    iso2: "au",
    iata: "SYD",
    lat: -33.9399,
    lon: 151.1753,
    name: t("أستراليا", "Australia"),
    capital: t("كانبرا", "Canberra"),
    region: "OCEANIA",
    schengen: false,
    popular: false,
    tagline: t("دار الأوبرا والحاجز المرجاني العظيم", "Sydney Harbour to the Great Barrier Reef"),
    overview: t(
      "سيدني وميناؤها الشهير، وملبورن بمقاهيها، والحاجز المرجاني العظيم في كوينزلاند. طلب تأشيرة الزائر إلكتروني بالكامل، وأستراليا من أبرز وجهات الابتعاث للطلاب السعوديين.",
      "Sydney and its famous harbour, Melbourne's café culture and Queensland's Great Barrier Reef. The visitor visa is fully online, and Australia is a leading destination for Saudi scholarship students.",
    ),
    imageId: "1506973035872-a4ec16b8e8d9",
    imageAlt: t("دار أوبرا سيدني والميناء مع العبّارات وأفق المدينة", "Sydney Opera House and harbour with ferries and the city skyline"),
    bestTime: t("سبتمبر–نوفمبر ومارس–مايو", "September–November and March–May"),
    flightHours: 16,
    currency: "AUD",
    insurance: "WORLDWIDE",
    visas: [
      {
        id: "au-tourism-600",
        purpose: "TOURISM",
        kind: "E_VISA",
        name: t("تأشيرة الزائر (الفئة 600)", "Visitor visa (subclass 600)"),
        entry: "MULTIPLE",
        validityDays: 365,
        maxStayDays: 90,
        processingDays: [15, 30],
        appointment: false,
        pricing: [
          citizen(
            490,
            349,
            t(
              "رسوم الطلب 200 دولار أسترالي وتتغير بالريال حسب سعر الصرف؛ قد تُطلب البصمة لاحقًا.",
              "The application fee is AUD 200, so the SAR amount moves with the exchange rate; biometrics may be requested later.",
            ),
          ),
          resident(490, 349, fxNote("رسوم الطلب 200 دولار أسترالي.", "The application fee is AUD 200.", true)),
        ],
        requirements: [
          R.passport(6),
          R.photoDigital(),
          R.nationalId(),
          R.iqama(6),
          R.bank(3),
          R.salary(),
          R.hotel(),
          R.familyRecord(),
        ],
      },
      {
        id: "au-study-500",
        purpose: "STUDY",
        kind: "E_VISA",
        name: t("تأشيرة الطالب (الفئة 500)", "Student visa (subclass 500)"),
        entry: "MULTIPLE",
        validityDays: 365,
        maxStayDays: 365,
        processingDays: [20, 60],
        appointment: false,
        pricing: [
          citizen(
            4900,
            499,
            t(
              "رسوم الطلب 2,000 دولار أسترالي، ويُشترط تأمين الطلاب الصحي (OSHC) طوال مدة الدراسة.",
              "The application fee is AUD 2,000, and Overseas Student Health Cover (OSHC) is required for the whole course.",
            ),
          ),
          resident(4900, 499, fxNote("رسوم الطلب 2,000 دولار أسترالي، ويُشترط تأمين OSHC.", "The application fee is AUD 2,000; OSHC is required.", true)),
        ],
        requirements: [
          R.passport(6),
          R.photoDigital(),
          R.iqama(6),
          R.university(t("تأكيد التسجيل (CoE)", "Confirmation of Enrolment (CoE)"), t("صادر عن مؤسسة تعليمية أسترالية مسجلة.", "Issued by a registered Australian provider.")),
          {
            doc: "BANK_STATEMENT",
            title: t("إثبات القدرة المالية", "Proof of funds"),
            details: t("يغطي الرسوم ونفقات المعيشة للسنة الأولى، أو خطاب ضمان من الجهة المبتعِثة.", "Covering first-year fees and living costs, or a sponsor's guarantee letter."),
          },
          R.insurance(t("تأمين الطلاب الصحي (OSHC) لكامل مدة التأشيرة.", "Overseas Student Health Cover (OSHC) for the full visa period.")),
          R.other(t("نتيجة اختبار اللغة الإنجليزية", "English test result"), t("مثل IELTS أو PTE حسب متطلبات الجامعة.", "Such as IELTS or PTE, as your provider requires.")),
          {
            doc: "MEDICAL_REPORT",
            title: t("الفحص الطبي", "Health examination"),
            details: t("لدى طبيب معتمد إذا طلبته دائرة الهجرة.", "With an approved panel physician if requested."),
            optional: true,
          },
        ],
      },
    ],
    faqs: [
      {
        q: t("هل أحتاج إلى مقابلة؟", "Do I need an interview?"),
        a: t(
          "عادة لا، فالطلب إلكتروني بالكامل. قد تُطلب البصمة في مركز VFS أو فحص طبي حسب حالتك، ونبلغك فورًا إن حدث ذلك.",
          "Usually not — it's entirely online. Biometrics at VFS or a medical exam may be requested in some cases, and we'll tell you straight away.",
        ),
      },
      {
        q: t("ما الذي يبحث عنه موظف الهجرة في طلبي؟", "What does the case officer look for?"),
        a: t(
          "أن زيارتك مؤقتة فعلًا: وظيفة مستقرة، وروابط عائلية في السعودية، وتمويل كافٍ، وخط سير واضح. نرتّب ملفك ليُظهر ذلك بوضوح.",
          "That your visit is genuinely temporary: stable employment, family ties in Saudi Arabia, enough funds and a clear itinerary. We organise your file to show that clearly.",
        ),
      },
      {
        q: t("هل التأمين الصحي إلزامي؟", "Is health insurance mandatory?"),
        a: t(
          "للطلاب نعم، يُشترط تأمين OSHC طوال مدة التأشيرة. أما للزوار فليس شرطًا، لكنه موصى به بشدة لارتفاع تكاليف العلاج.",
          "For students, yes — OSHC is required for the whole visa. For visitors it isn't required, but it's strongly recommended given treatment costs.",
        ),
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Nationalities (common resident nationalities in KSA)
// ---------------------------------------------------------------------------

export const NATIONALITIES: Nationality[] = [
  { iso2: "EG", name: t("مصري", "Egyptian") },
  { iso2: "IN", name: t("هندي", "Indian") },
  { iso2: "PK", name: t("باكستاني", "Pakistani") },
  { iso2: "BD", name: t("بنغلاديشي", "Bangladeshi") },
  { iso2: "PH", name: t("فلبيني", "Filipino") },
  { iso2: "JO", name: t("أردني", "Jordanian") },
  { iso2: "SY", name: t("سوري", "Syrian") },
  { iso2: "YE", name: t("يمني", "Yemeni") },
  { iso2: "SD", name: t("سوداني", "Sudanese") },
  { iso2: "LB", name: t("لبناني", "Lebanese") },
  { iso2: "ID", name: t("إندونيسي", "Indonesian") },
  { iso2: "NP", name: t("نيبالي", "Nepali") },
  { iso2: "LK", name: t("سريلانكي", "Sri Lankan") },
  { iso2: "US", name: t("أمريكي", "American") },
  { iso2: "GB", name: t("بريطاني", "British") },
];
