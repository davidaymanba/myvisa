/**
 * Legal documents (Terms, Refund Policy, Privacy Policy), bilingual AR/EN.
 *
 * DRAFT CONTENT: pending review by a Saudi-licensed legal advisor before launch.
 * Do not treat this text as final legal advice. Placeholders in square brackets
 * (CR number, VAT number, contact addresses) must be replaced before publishing.
 *
 * Arabic is the primary language; English mirrors its meaning.
 */
import type { L10n } from "../catalog/types";
import type { LegalDocument } from "./legal-types";

const t = (ar: string, en: string): L10n => ({ ar, en });

const UPDATED_AT = "2026-10-27";
const VERSION = "1.0";

/* -------------------------------------------------------------------------- */
/*                               Terms of Service                              */
/* -------------------------------------------------------------------------- */

const TERMS: LegalDocument = {
  slug: "terms",
  title: t("الشروط والأحكام", "Terms and Conditions"),
  updatedAt: UPDATED_AT,
  version: VERSION,
  summary: [
    t(
      "نحن وسيط نجهّز طلب التأشيرة ونحجز الموعد ونتابع مع السفارة أو مركز التأشيرات نيابةً عنك.",
      "We are an intermediary: we prepare your visa application, book your appointment, and follow up with the embassy or visa centre on your behalf.",
    ),
    t(
      "قرار منح التأشيرة أو رفضها يعود للسفارة وحدها، ولا نضمن نتيجة أي طلب.",
      "The decision to grant or refuse a visa belongs to the embassy alone; we do not guarantee the outcome of any application.",
    ),
    t(
      "عليك تقديم معلومات صحيحة ومستندات أصلية، وحضور البصمة أو المقابلة عند طلبها.",
      "You must provide accurate information and genuine documents, and attend biometrics or interviews when required.",
    ),
    t(
      "يُعرض السعر دائمًا مقسّمًا: رسوم حكومية بالتكلفة دون أي زيادة، ورسوم خدمتنا مضافًا إليها ضريبة القيمة المضافة 15%.",
      "Prices are always shown in two parts: government fees at cost with no markup, and our service fee plus 15% VAT.",
    ),
    t(
      "تخضع هذه الشروط لأنظمة المملكة العربية السعودية، وتختص محاكم الرياض بأي نزاع.",
      "These terms are governed by the laws of the Kingdom of Saudi Arabia, and the courts of Riyadh have jurisdiction over any dispute.",
    ),
  ],
  sections: [
    {
      id: "introduction",
      title: t("مقدمة ومن نحن", "Introduction and Who We Are"),
      body: [
        t(
          "مرحبًا بك في ماي فيزا. تقدّم هذه الخدمات شركة ماي فيزا لخدمات السفر، سجل تجاري رقم [رقم السجل التجاري]، الرقم الضريبي [الرقم الضريبي]، وعنوانها: الرياض، المملكة العربية السعودية (ويُشار إليها في هذه الشروط بـ«ماي فيزا» أو «نحن»).",
          "Welcome to myvisa. These services are provided by myvisa Travel Services Co., Commercial Registration No. [CR number], VAT No. [VAT number], located in Riyadh, Kingdom of Saudi Arabia (referred to in these terms as 'myvisa', 'we' or 'us').",
        ),
        t(
          "باستخدامك لموقعنا أو تطبيقنا أو إنشاء طلب لدينا، فإنك توافق على هذه الشروط والأحكام، وعلى سياسة الاسترداد وسياسة الخصوصية، وهي جزء لا يتجزأ من هذه الشروط. إن لم توافق عليها، فنرجو عدم استخدام خدماتنا.",
          "By using our website or app, or by placing an order with us, you agree to these Terms and Conditions together with our Refund Policy and Privacy Policy, which form an integral part of these terms. If you do not agree, please do not use our services.",
        ),
      ],
    },
    {
      id: "our-role",
      title: t("طبيعة خدمتنا", "The Nature of Our Service"),
      body: [
        t(
          "ماي فيزا جهة وسيطة مستقلة، ولسنا سفارة ولا قنصلية ولا جهة حكومية، ولا نتبع أي مركز تأشيرات مثل VFS أو TLS أو BLS. يقتصر دورنا على مساعدتك في إنجاز إجراءات التأشيرة نيابةً عنك.",
          "myvisa is an independent intermediary. We are not an embassy, consulate or government body, and we are not affiliated with any visa centre such as VFS, TLS or BLS. Our role is limited to helping you complete visa procedures on your behalf.",
        ),
        t(
          "قرار قبول التأشيرة أو رفضها، ومدة دراسة الطلب، ونوع التأشيرة ومدتها، كلها قرارات تعود للسفارة أو الجهة المختصة وحدها. لذلك لا نضمن الحصول على التأشيرة ولا نضمن موعدًا محددًا لصدور القرار.",
          "The decision to approve or refuse a visa, the processing time, and the type and validity of the visa are decided solely by the embassy or competent authority. We therefore do not guarantee that a visa will be issued, nor a specific date for a decision.",
        ),
      ],
      bullets: [
        t("مراجعة مستنداتك والتأكد من اكتمالها وفق متطلبات السفارة.", "Reviewing your documents and checking they are complete against the embassy's requirements."),
        t("تعبئة نماذج الطلب وتجهيز الملف.", "Filling in application forms and preparing your file."),
        t("حجز موعد تقديم الطلب أو البصمة متى توفرت المواعيد.", "Booking your submission or biometrics appointment when slots are available."),
        t("متابعة حالة الطلب مع السفارة أو مركز التأشيرات وإبلاغك بالمستجدات.", "Following up on your application with the embassy or visa centre and keeping you informed."),
        t("ترتيب استلام الجواز وتوصيله عبر شركة شحن عند طلبك لذلك.", "Arranging collection and delivery of your passport by courier when you request it."),
      ],
    },
    {
      id: "eligibility",
      title: t("الأهلية واستخدام الحساب", "Eligibility and Your Account"),
      body: [
        t(
          "يجب أن يكون عمرك 18 عامًا أو أكثر لإنشاء حساب أو تقديم طلب. وإذا كان الطلب لقاصر، فيجب أن يقدّمه وليّ أمره أو من يمثله نظامًا، ويتحمل مسؤولية صحة بياناته.",
          "You must be 18 or older to create an account or place an order. Applications for minors must be submitted by their parent, guardian or legal representative, who is responsible for the accuracy of the minor's information.",
        ),
        t(
          "إذا قدّمت طلبًا نيابةً عن شخص آخر، فأنت تؤكد أن لديك موافقته وتفويضه بمشاركة بياناته معنا. وأنت مسؤول عن سرية بيانات الدخول إلى حسابك وعن أي نشاط يتم من خلاله.",
          "If you apply on behalf of someone else, you confirm that you have their consent and authorisation to share their information with us. You are responsible for keeping your account login details confidential and for any activity carried out through your account.",
        ),
      ],
    },
    {
      id: "customer-responsibilities",
      title: t("التزاماتك", "Your Responsibilities"),
      body: [
        t(
          "نجاح الطلب يعتمد بدرجة كبيرة على صحة ما تقدّمه. ولهذا تلتزم بالالتزامات الموضحة أدناه.",
          "The success of an application depends heavily on what you provide. You therefore agree to the commitments listed below.",
        ),
        t(
          "يحق لنا إيقاف الخدمة أو رفض الطلب إذا تبيّن لنا تقديم معلومات أو مستندات غير صحيحة أو مزوّرة، ولا يُسترد في هذه الحالة ما أُنجز من عمل. وقد نلتزم نظامًا بإبلاغ الجهات المختصة.",
          "We may stop the service or decline an order if we find that false or forged information or documents have been provided; in that case, work already completed is not refunded. We may also be legally required to report it to the competent authorities.",
        ),
      ],
      bullets: [
        t("تقديم معلومات صحيحة وكاملة ومحدّثة، وإبلاغنا فورًا بأي تغيير.", "Provide accurate, complete and up-to-date information, and tell us promptly about any change."),
        t("تقديم مستندات أصلية وغير معدّلة، وعدم تقديم أي مستند مزوّر أو مضلل.", "Provide genuine, unaltered documents, and never submit forged or misleading documents."),
        t("التأكد من صلاحية جواز سفرك للمدة التي تشترطها السفارة.", "Make sure your passport is valid for the period required by the embassy."),
        t("حضور موعد البصمة أو المقابلة شخصيًا في الوقت المحدد، وإحضار الأصول المطلوبة.", "Attend biometrics or interview appointments in person and on time, bringing any original documents required."),
        t("الرد على طلباتنا واستفساراتنا في الوقت المناسب حتى لا يتأخر ملفك.", "Respond to our requests and questions in good time so your file is not delayed."),
        t("الالتزام بشروط التأشيرة الممنوحة وأنظمة الدولة التي تسافر إليها.", "Comply with the conditions of the visa granted and the laws of the country you travel to."),
      ],
    },
    {
      id: "our-responsibilities",
      title: t("التزاماتنا", "Our Responsibilities"),
      body: [
        t(
          "نلتزم بتقديم خدماتنا بعناية ومهنية، وفق متطلبات السفارة المعلنة وقت تجهيز طلبك. ونحرص على ما يلي:",
          "We commit to providing our services with care and professionalism, in line with the embassy's published requirements at the time your application is prepared. In particular, we will:",
        ),
      ],
      bullets: [
        t("إبلاغك بقائمة المستندات المطلوبة بوضوح قبل البدء.", "Tell you clearly which documents are required before we start."),
        t("مراجعة ملفك وتعبئة النماذج بدقة اعتمادًا على المعلومات التي قدّمتها.", "Review your file and fill in forms accurately based on the information you provided."),
        t("إبلاغك بمستجدات طلبك عبر لوحة التحكم أو الرسائل النصية أو واتساب أو البريد الإلكتروني.", "Keep you updated on your application through your dashboard, SMS, WhatsApp or email."),
        t("حماية بياناتك ومستنداتك وفق سياسة الخصوصية.", "Protect your data and documents in line with our Privacy Policy."),
        t("تحمّل مسؤولية أخطائنا وفق ما توضحه سياسة الاسترداد.", "Take responsibility for our own mistakes as set out in the Refund Policy."),
      ],
    },
    {
      id: "fees-and-payment",
      title: t("الأسعار والدفع والاسترداد", "Fees, Payment and Refunds"),
      body: [
        t(
          "يُعرض السعر دائمًا بشكل واضح ومقسّم إلى جزأين: (1) الرسوم الحكومية أو رسوم السفارة ومركز التأشيرات، وتُحصَّل بالتكلفة الفعلية دون أي زيادة ودون ضريبة قيمة مضافة من جهتنا. (2) رسوم خدمة ماي فيزا، ويُضاف إليها ضريبة القيمة المضافة بنسبة 15% على رسوم الخدمة فقط. ونصدر لك فاتورة إلكترونية وفق متطلبات هيئة الزكاة والضريبة والجمارك.",
          "Prices are always shown clearly in two parts: (1) government, embassy or visa-centre fees, passed through at actual cost with no markup and no VAT added by us; and (2) the myvisa service fee, plus 15% VAT charged on the service fee only. We issue you an e-invoice in line with the requirements of the Zakat, Tax and Customs Authority (ZATCA).",
        ),
        t(
          "تُحدد السفارات رسومها وقد تغيّرها دون إشعار مسبق. إذا تغيّرت الرسوم الحكومية قبل دفعها للجهة المختصة، فسنبلغك بالفرق قبل المتابعة. يتم الدفع عبر بوابة دفع مرخّصة، وتخضع حالات الإلغاء والاسترداد لسياسة الاسترداد المنشورة.",
          "Embassies set their own fees and may change them without notice. If a government fee changes before it is paid to the authority, we will tell you about the difference before proceeding. Payments are made through a licensed payment gateway, and cancellations and refunds are governed by our published Refund Policy.",
        ),
      ],
    },
    {
      id: "appointments-and-delivery",
      title: t("المواعيد ومدة المعالجة وتوصيل الجواز", "Appointments, Processing Times and Passport Delivery"),
      body: [
        t(
          "تتحكم السفارات ومراكز التأشيرات في توفر المواعيد، وقد تكون محدودة في مواسم الذروة. نبذل جهدنا لحجز أقرب موعد مناسب، لكننا لا نضمن توفر موعد في تاريخ معين. وأي مدة معالجة نذكرها هي تقدير مبني على خبرتنا وليست التزامًا من السفارة.",
          "Appointment availability is controlled by embassies and visa centres and may be limited in peak seasons. We do our best to book the earliest suitable slot, but we cannot guarantee availability on any particular date. Any processing time we mention is an estimate based on our experience, not a commitment from the embassy.",
        ),
        t(
          "عند طلبك خدمة التوصيل، يُسلَّم الجواز عبر شركة شحن معتمدة إلى العنوان الذي تحدده، وقد يُطلب إثبات الهوية عند الاستلام. تأكد من صحة العنوان ورقم الجوال. ونزوّدك برقم تتبّع الشحنة، ونساعدك في متابعة أي تأخير أو مطالبة مع شركة الشحن.",
          "If you choose delivery, your passport is sent by an approved courier to the address you provide, and proof of identity may be required on receipt. Please make sure your address and mobile number are correct. We will give you a tracking number and help you follow up on any delay or claim with the courier.",
        ),
      ],
    },
    {
      id: "liability",
      title: t("حدود المسؤولية", "Limitation of Liability"),
      body: [
        t(
          "لا نتحمل المسؤولية عن الأمور الخارجة عن سيطرتنا، ومنها الأمور الموضحة أدناه.",
          "We are not responsible for matters outside our control, including those listed below.",
        ),
        t(
          "وفي جميع الأحوال، وبالقدر الذي يسمح به النظام، لا تتجاوز مسؤوليتنا الإجمالية عن أي طلب قيمة رسوم الخدمة التي دفعتها لنا عن ذلك الطلب. ولا يحدّ هذا البند من مسؤوليتنا في حالات الغش أو الخطأ الجسيم أو أي حالة لا يجوز فيها تحديد المسؤولية نظامًا.",
          "In all cases, and to the extent permitted by law, our total liability for any order will not exceed the service fee you paid us for that order. This does not limit our liability for fraud, gross negligence, or any case where liability cannot be limited by law.",
        ),
      ],
      bullets: [
        t("قرارات السفارات بقبول التأشيرة أو رفضها أو تأخيرها.", "Embassy decisions to approve, refuse or delay a visa."),
        t("عدم توفر المواعيد أو إلغاؤها أو تغييرها من قِبل السفارة أو مركز التأشيرات.", "Appointments being unavailable, cancelled or changed by the embassy or visa centre."),
        t("أي ضرر ناتج عن معلومات أو مستندات غير صحيحة أو ناقصة قدّمتها أنت.", "Any loss resulting from incorrect or incomplete information or documents you provided."),
        t("تكاليف الحجوزات غير المستردة كتذاكر الطيران والفنادق قبل صدور التأشيرة؛ وننصحك بعدم الحجز النهائي قبل استلامها.", "Non-refundable bookings such as flights or hotels made before the visa is issued; we advise against final bookings until you have your visa."),
        t("الظروف القاهرة كالكوارث أو الأوبئة أو تعطل الأنظمة الحكومية أو تغيّر الأنظمة والقرارات الرسمية.", "Force majeure events such as disasters, pandemics, outages of government systems, or changes in official rules and decisions."),
      ],
    },
    {
      id: "intellectual-property",
      title: t("الملكية الفكرية", "Intellectual Property"),
      body: [
        t(
          "جميع محتويات الموقع والتطبيق، من نصوص وتصاميم وشعارات وبرمجيات وأدلة إرشادية، مملوكة لماي فيزا أو مرخّصة لها، ومحمية بموجب الأنظمة المعمول بها. يُسمح لك باستخدامها للاستفادة من خدماتنا لأغراضك الشخصية فقط.",
          "All content on our website and app, including text, designs, logos, software and guides, is owned by or licensed to myvisa and is protected by applicable law. You may use it only to access our services for your personal purposes.",
        ),
        t(
          "لا يجوز نسخ المحتوى أو إعادة نشره أو بيعه أو استخدامه تجاريًا، أو استخراج البيانات من الموقع بأدوات آلية، دون موافقة كتابية مسبقة منا. وتبقى مستنداتك وبياناتك الشخصية ملكًا لك.",
          "You may not copy, republish, sell or commercially use our content, or scrape data from our website using automated tools, without our prior written consent. Your own documents and personal data remain yours.",
        ),
      ],
    },
    {
      id: "governing-law",
      title: t("النظام الواجب التطبيق وتسوية النزاعات", "Governing Law and Disputes"),
      body: [
        t(
          "تخضع هذه الشروط وتُفسَّر وفقًا لأنظمة المملكة العربية السعودية. ونحرص على حل أي خلاف وديًا أولًا، لذا نرجو التواصل مع خدمة العملاء قبل اللجوء إلى أي إجراء آخر.",
          "These terms are governed by and interpreted in accordance with the laws of the Kingdom of Saudi Arabia. We aim to resolve any disagreement amicably first, so please contact our customer service before taking any other step.",
        ),
        t(
          "إذا تعذّر الحل الودي، تختص المحاكم المختصة في مدينة الرياض بالنظر في النزاع، دون الإخلال بحقك في تقديم شكوى إلى وزارة التجارة أو الجهات الرقابية المختصة. وفي حال وجود اختلاف بين النص العربي والنص الإنجليزي، يُعتمد النص العربي.",
          "If an amicable solution is not possible, the competent courts in Riyadh will have jurisdiction, without prejudice to your right to file a complaint with the Ministry of Commerce or other competent regulators. If there is any difference between the Arabic and English texts, the Arabic text prevails.",
        ),
      ],
    },
    {
      id: "changes",
      title: t("التعديلات على الشروط", "Changes to These Terms"),
      body: [
        t(
          "قد نحدّث هذه الشروط من وقت لآخر لتعكس تغييرات في خدماتنا أو في الأنظمة. سننشر النسخة المحدّثة مع تاريخ آخر تحديث، ونبلغك بالتغييرات الجوهرية عبر البريد الإلكتروني أو الإشعارات قبل سريانها.",
          "We may update these terms from time to time to reflect changes in our services or in the law. We will publish the updated version with its last-updated date, and notify you of material changes by email or notification before they take effect.",
        ),
        t(
          "تسري على كل طلب الشروطُ النافذة وقت إنشائه. واستمرارك في استخدام خدماتنا بعد سريان التعديلات يعني موافقتك عليها.",
          "Each order is governed by the terms in force when it was placed. Continuing to use our services after changes take effect means you accept them.",
        ),
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*                                Refund Policy                                */
/* -------------------------------------------------------------------------- */

const REFUND_POLICY: LegalDocument = {
  slug: "refund-policy",
  title: t("سياسة الإلغاء والاسترداد", "Cancellation and Refund Policy"),
  updatedAt: UPDATED_AT,
  version: VERSION,
  summary: [
    t(
      "قبل بدء مراجعة مستنداتك: نسترد لك رسوم الخدمة كاملة.",
      "Before we start reviewing your documents: full refund of the service fee.",
    ),
    t(
      "بعد بدء المراجعة وقبل تقديم الطلب للسفارة: نسترد لك 50% من رسوم الخدمة.",
      "After review starts but before submission to the embassy: 50% of the service fee is refunded.",
    ),
    t(
      "بعد تقديم الطلب للسفارة: رسوم الخدمة غير قابلة للاسترداد.",
      "After submission to the embassy: the service fee is non-refundable.",
    ),
    t(
      "الرسوم الحكومية تُسترد فقط إذا لم تُدفع بعد للجهة المختصة.",
      "Government fees are refunded only if they have not yet been paid to the authority.",
    ),
    t(
      "إذا رُفض الطلب بسبب خطأ منا: نسترد رسوم الخدمة كاملة أو نعيد التقديم مجانًا، حسب اختيارك.",
      "If a refusal is caused by our mistake: full service fee refund or a free re-application, your choice.",
    ),
  ],
  sections: [
    {
      id: "overview",
      title: t("نظرة عامة", "Overview"),
      body: [
        t(
          "هدفنا أن تكون سياسة الاسترداد عادلة وواضحة. يتكوّن كل طلب من جزأين يُعاملان بشكل مختلف عند الإلغاء: رسوم خدمة ماي فيزا (مع ضريبة القيمة المضافة عليها)، والرسوم الحكومية أو رسوم السفارة ومركز التأشيرات التي ندفعها نيابةً عنك بالتكلفة.",
          "We want our refund policy to be fair and clear. Every order has two parts that are treated differently on cancellation: the myvisa service fee (with VAT on it), and the government, embassy or visa-centre fees that we pay on your behalf at cost.",
        ),
        t(
          "يعتمد مبلغ الاسترداد على المرحلة التي وصل إليها طلبك وقت استلامنا لطلب الإلغاء. ويمكنك دائمًا معرفة مرحلة طلبك الحالية من لوحة التحكم.",
          "The refund amount depends on the stage your order has reached when we receive your cancellation request. You can always see your order's current stage in your dashboard.",
        ),
      ],
    },
    {
      id: "refund-by-stage",
      title: t("الاسترداد حسب مرحلة الطلب", "Refunds by Order Stage"),
      body: [
        t(
          "تُحسب نسبة الاسترداد من رسوم الخدمة كما يلي، ويُرد معها الجزء المقابل من ضريبة القيمة المضافة، ونصدر لك إشعارًا دائنًا إلكترونيًا بذلك:",
          "The refundable share of the service fee is calculated as follows. The matching portion of VAT is refunded with it, and we issue you an electronic credit note:",
        ),
      ],
      bullets: [
        t(
          "قبل بدء مراجعة المستندات: استرداد رسوم الخدمة كاملة (100%).",
          "Before document review starts: full refund of the service fee (100%).",
        ),
        t(
          "بعد بدء المراجعة وقبل تقديم الطلب للسفارة أو مركز التأشيرات: استرداد 50% من رسوم الخدمة.",
          "After review starts but before submission to the embassy or visa centre: 50% of the service fee is refunded.",
        ),
        t(
          "بعد تقديم الطلب للسفارة أو مركز التأشيرات: رسوم الخدمة غير قابلة للاسترداد، لأن العمل يكون قد اكتمل.",
          "After submission to the embassy or visa centre: the service fee is non-refundable, as the work has been completed.",
        ),
      ],
    },
    {
      id: "government-fees",
      title: t("الرسوم الحكومية ورسوم السفارة", "Government and Embassy Fees"),
      body: [
        t(
          "ندفع الرسوم الحكومية ورسوم السفارة ومراكز التأشيرات نيابةً عنك بالتكلفة الفعلية. إذا ألغيت طلبك قبل دفع هذه الرسوم للجهة المختصة، نردّها لك كاملة.",
          "We pay government, embassy and visa-centre fees on your behalf at actual cost. If you cancel before these fees have been paid to the authority, we refund them in full.",
        ),
        t(
          "أما بعد دفعها للجهة المختصة، فهي غير قابلة للاسترداد من جهتنا، لأن قواعد استردادها تحددها السفارة أو مركز التأشيرات وليس ماي فيزا. وإذا كانت الجهة تسمح بالاسترداد في حالة معينة، فسنساعدك في تقديم الطلب ونرد لك ما نستلمه منها.",
          "Once paid to the authority, they cannot be refunded by us, because their refund rules are set by the embassy or visa centre, not by myvisa. If the authority allows a refund in a particular case, we will help you apply and pass on to you whatever we receive.",
        ),
      ],
    },
    {
      id: "visa-refusal",
      title: t("في حال رفض التأشيرة", "If Your Visa Is Refused"),
      body: [
        t(
          "قرار التأشيرة يعود للسفارة وحدها. لذلك إذا رُفض الطلب لأسباب تقديرية من السفارة أو لأسباب تتعلق بملفك أو بمعلومات قدّمتها، فلا تُسترد رسوم الخدمة لأن الخدمة قُدّمت كاملة، ولا تُسترد الرسوم الحكومية المدفوعة.",
          "The visa decision belongs to the embassy alone. If an application is refused at the embassy's discretion, or for reasons related to your profile or information you provided, the service fee is not refunded because the service was fully delivered, and government fees already paid are not refunded.",
        ),
        t(
          "ومع ذلك، يسعدنا مساعدتك في فهم أسباب الرفض المذكورة في خطاب السفارة وتقديم طلب جديد إن رغبت.",
          "We are still happy to help you understand the reasons given in the embassy's refusal letter and to prepare a new application if you wish.",
        ),
      ],
    },
    {
      id: "our-errors",
      title: t("إذا كان الخطأ منّا", "If the Mistake Is Ours"),
      body: [
        t(
          "إذا رُفض طلبك أو أُعيد بسبب خطأ نتحمل مسؤوليته، مثل استخدام نموذج خاطئ، أو خطأ في تعبئة البيانات التي قدّمتها لنا بشكل صحيح، أو نقص مستند كان من مسؤوليتنا التنبيه إليه أو تجهيزه، فلك أن تختار أحد الخيارين الموضحين أدناه.",
          "If your application is refused or returned because of a mistake we are responsible for, such as using the wrong form, an error in entering information you gave us correctly, or a missing document we were responsible for flagging or preparing, you can choose either of the two options below.",
        ),
        t(
          "نراجع كل حالة بإنصاف ونبلغك بنتيجة المراجعة كتابيًا.",
          "We review every case fairly and let you know the outcome in writing.",
        ),
      ],
      bullets: [
        t("استرداد رسوم الخدمة كاملة مع ضريبتها.", "A full refund of the service fee, including its VAT."),
        t("أو إعادة تقديم الطلب مجانًا دون رسوم خدمة جديدة (تُدفع الرسوم الحكومية الجديدة إن طلبتها السفارة).", "Or a free re-application with no new service fee (any new government fees required by the embassy still apply)."),
      ],
    },
    {
      id: "refund-method-and-timing",
      title: t("طريقة الاسترداد ومدته", "Refund Method and Timing"),
      body: [
        t(
          "نعيد المبلغ إلى وسيلة الدفع الأصلية نفسها التي استخدمتها، خلال 7 إلى 14 يوم عمل من تاريخ الموافقة على الاسترداد.",
          "Refunds are returned to the same original payment method you used, within 7 to 14 working days of the refund being approved.",
        ),
        t(
          "قد يستغرق ظهور المبلغ في حسابك وقتًا إضافيًا حسب إجراءات البنك أو جهة إصدار البطاقة، وهذا خارج عن سيطرتنا.",
          "Your bank or card issuer may take additional time to show the amount in your account, which is outside our control.",
        ),
      ],
    },
    {
      id: "how-to-request",
      title: t("كيف تطلب الإلغاء أو الاسترداد", "How to Request a Cancellation or Refund"),
      body: [
        t(
          "يمكنك طلب الإلغاء أو الاسترداد بأي من الطرق التالية، مع ذكر رقم الطلب. وتُحتسب مرحلة الطلب بحسب وقت استلامنا لطلبك.",
          "You can request a cancellation or refund in any of the following ways, quoting your order number. The order stage is determined by the time we receive your request.",
        ),
      ],
      bullets: [
        t("من لوحة التحكم: افتح الطلب واختر «إلغاء الطلب».", "From your dashboard: open the order and choose 'Cancel order'."),
        t("عبر واتساب: راسل فريق خدمة العملاء على رقمنا المعتمد.", "Via WhatsApp: message our customer service team on our official number."),
        t("عبر البريد الإلكتروني: أرسل طلبك إلى بريد خدمة العملاء.", "By email: send your request to our customer service email."),
      ],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*                                Privacy Policy                               */
/* -------------------------------------------------------------------------- */

const PRIVACY: LegalDocument = {
  slug: "privacy",
  title: t("سياسة الخصوصية", "Privacy Policy"),
  updatedAt: UPDATED_AT,
  version: VERSION,
  summary: [
    t(
      "نجمع فقط البيانات اللازمة لإنجاز طلب التأشيرة، ونلتزم بنظام حماية البيانات الشخصية في المملكة.",
      "We collect only the data needed to complete your visa application, and we comply with the Saudi Personal Data Protection Law.",
    ),
    t(
      "نشارك بياناتك مع السفارة أو مركز التأشيرات لأن ذلك جوهر الخدمة، وبموافقتك الصريحة.",
      "We share your data with the embassy or visa centre because that is the core of the service, and only with your explicit consent.",
    ),
    t(
      "لا نبيع بياناتك، ولا نحتفظ برقم بطاقتك الكامل.",
      "We never sell your data, and we never store your full card number.",
    ),
    t(
      "نحذف مستندات الطلب بعد 90 يومًا من إغلاقه، إلا إذا حفظتها في خزنتك المشفّرة.",
      "We delete application documents 90 days after your order is closed, unless you save them to your encrypted vault.",
    ),
    t(
      "يمكنك الاطلاع على بياناتك أو تصحيحها أو حذفها أو سحب موافقتك في أي وقت.",
      "You can access, correct or delete your data, or withdraw your consent, at any time.",
    ),
  ],
  sections: [
    {
      id: "introduction",
      title: t("مقدمة", "Introduction"),
      body: [
        t(
          "توضح هذه السياسة كيف تجمع شركة ماي فيزا لخدمات السفر (سجل تجاري رقم [رقم السجل التجاري])، ومقرها الرياض، المملكة العربية السعودية، بياناتك الشخصية وتستخدمها وتحميها. ونحن الجهة المسؤولة عن معالجة بياناتك لأغراض هذه السياسة.",
          "This policy explains how myvisa Travel Services Co. (Commercial Registration No. [CR number]), based in Riyadh, Kingdom of Saudi Arabia, collects, uses and protects your personal data. We are the controller responsible for processing your data for the purposes of this policy.",
        ),
        t(
          "نلتزم بنظام حماية البيانات الشخصية في المملكة العربية السعودية ولوائحه التنفيذية الصادرة عن الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا). وتنطبق هذه السياسة على موقعنا وتطبيقنا وجميع قنوات تواصلنا معك.",
          "We comply with the Saudi Personal Data Protection Law (PDPL) and its implementing regulations issued by the Saudi Data and Artificial Intelligence Authority (SDAIA). This policy applies to our website, app and all channels through which we communicate with you.",
        ),
      ],
    },
    {
      id: "data-we-collect",
      title: t("البيانات التي نجمعها", "Data We Collect"),
      body: [
        t(
          "نجمع البيانات التي تقدّمها لنا مباشرة، أو التي تنتج عن استخدامك لخدماتنا، أو التي نستلمها من السفارة أو مركز التأشيرات بخصوص حالة طلبك. وتشمل هذه البيانات ما هو موضح أدناه.",
          "We collect data you give us directly, data generated when you use our services, and updates we receive from the embassy or visa centre about your application. The main categories are listed below.",
        ),
        t(
          "قد تطلب بعض السفارات معلومات تُصنَّف بيانات حساسة نظامًا، مثل البيانات الائتمانية أو الصحية. لا نطلب هذه المعلومات إلا إذا كانت السفارة تشترطها، ونعالجها بضوابط حماية إضافية.",
          "Some embassies require information that the law classifies as sensitive, such as credit or health data. We only request it where the embassy requires it, and we handle it with additional safeguards.",
        ),
      ],
      bullets: [
        t("بيانات الهوية وجواز السفر: الاسم، تاريخ الميلاد، الجنسية، رقم الهوية أو الإقامة، وبيانات الجواز.", "Identity and passport data: name, date of birth, nationality, national ID or iqama number, and passport details."),
        t("الصور الشخصية المطلوبة للطلب.", "Personal photos required for the application."),
        t("بيانات التواصل: رقم الجوال، البريد الإلكتروني، والعنوان.", "Contact details: mobile number, email address and postal address."),
        t("تفاصيل السفر: الوجهة، التواريخ، الحجوزات، وبيانات العمل أو الدراسة عند الحاجة.", "Travel details: destination, dates, bookings, and employment or study details where needed."),
        t("المستندات المالية: مثل كشوف الحساب البنكية وخطابات التعريف بالراتب.", "Financial documents: such as bank statements and salary certificates."),
        t("بيانات الدفع: مثل مبلغ العملية وتاريخها وآخر أرقام البطاقة. تتولى بوابة دفع مرخّصة ومتوافقة مع معيار PCI-DSS معالجة بيانات البطاقة، ولا نخزّن رقم البطاقة الكامل أبدًا.", "Payment metadata: such as transaction amount, date and the last digits of your card. Card data is handled by a licensed, PCI-DSS compliant payment gateway, and we never store full card numbers."),
        t("بيانات تقنية: مثل نوع الجهاز والمتصفح وسجلات الدخول، لأغراض الأمان وتحسين الخدمة.", "Technical data: such as device type, browser and login records, for security and service improvement."),
      ],
    },
    {
      id: "purposes",
      title: t("أغراض استخدام البيانات", "How We Use Your Data"),
      body: [
        t(
          "نستخدم بياناتك للأغراض المحددة التالية فقط، ولا نستخدمها لغرض لا يتوافق معها دون إبلاغك وأخذ موافقتك عند الحاجة:",
          "We use your data only for the following specific purposes, and we will not use it for an incompatible purpose without telling you and obtaining your consent where required:",
        ),
      ],
      bullets: [
        t("تجهيز طلب التأشيرة وتقديمه، وحجز المواعيد، ومتابعته مع السفارة أو مركز التأشيرات.", "Preparing and submitting your visa application, booking appointments, and following up with the embassy or visa centre."),
        t("الوفاء بالالتزامات النظامية، مثل إصدار الفواتير الإلكترونية وفق متطلبات هيئة الزكاة والضريبة والجمارك.", "Meeting legal obligations, such as issuing e-invoices under the requirements of the Zakat, Tax and Customs Authority (ZATCA)."),
        t("التواصل معك بشأن طلبك عبر الرسائل النصية وواتساب والبريد الإلكتروني.", "Communicating with you about your order via SMS, WhatsApp and email."),
        t("منع الاحتيال وحماية حسابك وخدماتنا.", "Preventing fraud and protecting your account and our services."),
        t("تحسين خدماتنا وتجربة الاستخدام، باستخدام بيانات مجمّعة قدر الإمكان.", "Improving our services and user experience, using aggregated data wherever possible."),
      ],
    },
    {
      id: "legal-bases",
      title: t("الأسس النظامية للمعالجة", "Legal Bases for Processing"),
      body: [
        t(
          "نعالج بياناتك بناءً على أحد الأسس النظامية الموضحة أدناه.",
          "We process your data on one of the legal bases listed below.",
        ),
        t(
          "يمكنك سحب موافقتك في أي وقت، ولن يؤثر ذلك على مشروعية المعالجة التي تمت قبل السحب. لكن قد يتعذر علينا إكمال طلبك إذا سحبت موافقتك على معالجة بيانات ضرورية له.",
          "You can withdraw your consent at any time; this does not affect processing carried out before withdrawal. However, we may be unable to complete your application if you withdraw consent for data it requires.",
        ),
      ],
      bullets: [
        t("موافقتك: مثل مشاركة بياناتك مع السفارة، ومعالجة البيانات الحساسة، وملفات تعريف الارتباط التحليلية.", "Your consent: for example sharing your data with the embassy, processing sensitive data, and analytics cookies."),
        t("تنفيذ العقد: لتقديم الخدمة التي طلبتها والوفاء بالتزاماتنا تجاهك.", "Performance of a contract: to deliver the service you requested and meet our obligations to you."),
        t("الالتزام النظامي: مثل متطلبات الفوترة الإلكترونية والضريبة وطلبات الجهات المختصة.", "Legal obligation: such as e-invoicing and tax requirements and requests from competent authorities."),
      ],
    },
    {
      id: "sharing",
      title: t("مشاركة البيانات", "Sharing Your Data"),
      body: [
        t(
          "لا نبيع بياناتك الشخصية ولا نؤجرها لأي طرف. نشاركها فقط بالقدر اللازم مع الجهات الموضحة أدناه.",
          "We never sell or rent your personal data. We share it only as far as necessary with the parties listed below.",
        ),
        t(
          "نلزم مقدّمي الخدمات بعقود تفرض عليهم حماية بياناتك وعدم استخدامها لأي غرض آخر.",
          "Our service providers are bound by contracts requiring them to protect your data and not use it for any other purpose.",
        ),
      ],
      bullets: [
        t("السفارات والقنصليات ومراكز التأشيرات (مثل VFS وTLS وBLS) لتقديم طلبك.", "Embassies, consulates and visa centres (such as VFS, TLS and BLS) to submit your application."),
        t("بوابة الدفع المرخّصة لمعالجة المدفوعات.", "Our licensed payment gateway to process payments."),
        t("شركات الشحن المعتمدة لتوصيل الجواز والمستندات.", "Approved courier companies to deliver passports and documents."),
        t("مزوّدي خدمات الرسائل والاستضافة السحابية والدعم التقني.", "Messaging, cloud hosting and technical support providers."),
        t("الجهات الحكومية المختصة عندما يُلزمنا النظام بذلك.", "Competent government authorities where the law requires us to."),
      ],
    },
    {
      id: "cross-border-transfer",
      title: t("نقل البيانات خارج المملكة", "Transfers Outside Saudi Arabia"),
      body: [
        t(
          "بطبيعة خدمة التأشيرات، يتطلب تقديم طلبك نقل بياناتك إلى سفارة الدولة التي تقصدها أو إلى مركز التأشيرات المعتمد لديها، وقد تُعالَج هذه البيانات خارج المملكة. ولن نقوم بذلك إلا بعد الحصول على موافقتك الصريحة عند إنشاء الطلب.",
          "By the nature of visa services, submitting your application requires transferring your data to the embassy of your destination country or its authorised visa centre, and this data may be processed outside the Kingdom. We only do this with your explicit consent, given when you create your order.",
        ),
        t(
          "تخضع البيانات بعد استلامها من السفارة لأنظمة الخصوصية في تلك الدولة. وفي غير ذلك من حالات النقل، نلتزم بالضوابط التي يحددها نظام حماية البيانات الشخصية ولوائحه، ونقتصر على الحد الأدنى من البيانات اللازمة.",
          "Once received by the embassy, the data is subject to that country's privacy laws. For any other transfers, we follow the safeguards set out in the PDPL and its regulations, and transfer only the minimum data necessary.",
        ),
      ],
    },
    {
      id: "retention",
      title: t("مدة الاحتفاظ بالبيانات", "How Long We Keep Your Data"),
      body: [
        t(
          "نحذف مستندات الطلب (مثل صور الجواز والصور الشخصية والكشوف البنكية) بعد 90 يومًا من إغلاق الطلب، إلا إذا اخترت حفظها في خزنتك المشفّرة لاستخدامها في طلبات لاحقة. ويمكنك حذفها من الخزنة في أي وقت.",
          "We delete application documents (such as passport copies, photos and bank statements) 90 days after your order is closed, unless you choose to save them to your encrypted vault for future applications. You can delete them from your vault at any time.",
        ),
        t(
          "نحتفظ بالفواتير وسجلات المعاملات المالية للمدة التي تفرضها أنظمة الضريبة، ونحتفظ ببيانات حسابك طالما كان الحساب نشطًا. وبعد انتهاء الحاجة، نُتلف البيانات بشكل آمن أو نجعلها مجهولة الهوية.",
          "We keep invoices and financial transaction records for the period required by tax laws, and your account data for as long as your account is active. When it is no longer needed, we securely destroy the data or anonymise it.",
        ),
      ],
    },
    {
      id: "security",
      title: t("أمن البيانات", "Data Security"),
      body: [
        t(
          "نطبّق تدابير تقنية وتنظيمية لحماية بياناتك من الوصول غير المصرّح به أو الفقدان أو التعديل، ومنها التدابير الموضحة أدناه.",
          "We apply technical and organisational measures to protect your data from unauthorised access, loss or alteration, including those listed below.",
        ),
        t(
          "في حال وقوع حادثة تسرّب تمس بياناتك، سنبلغ الجهة المختصة ونبلغك وفق ما يتطلبه النظام، ونتخذ الإجراءات اللازمة للحد من أثرها.",
          "If a data breach affects your data, we will notify the competent authority and you as required by law, and take the necessary steps to limit its impact.",
        ),
      ],
      bullets: [
        t("تشفير البيانات أثناء التخزين وأثناء النقل.", "Encryption of data at rest and in transit."),
        t("صلاحيات وصول محدودة لمن يحتاجها من الموظفين لأداء عملهم فقط.", "Access controls limiting access to staff who need it for their work."),
        t("سجلات تدقيق توثّق الوصول إلى البيانات والتعديلات عليها.", "Audit logs recording access to and changes in data."),
        t("التزام الموظفين بالسرية وتدريبهم على حماية البيانات.", "Staff confidentiality obligations and data-protection training."),
      ],
    },
    {
      id: "your-rights",
      title: t("حقوقك", "Your Rights"),
      body: [
        t(
          "يكفل لك نظام حماية البيانات الشخصية الحقوق التالية، ويمكنك ممارستها بالتواصل معنا. وهي موضحة أدناه.",
          "The PDPL gives you the following rights, which you can exercise by contacting us. They are listed below.",
        ),
        t(
          "نرد على طلبك خلال المدة التي يحددها النظام، وقد نطلب التحقق من هويتك أولًا. وقد لا نتمكن من حذف بعض البيانات إذا كان النظام يُلزمنا بالاحتفاظ بها (مثل الفواتير)، أو إذا سبق تقديمها للسفارة. وإن لم تكن راضيًا عن ردّنا، يحق لك تقديم شكوى إلى الهيئة السعودية للبيانات والذكاء الاصطناعي (سدايا).",
          "We will respond within the period set by law and may first ask you to verify your identity. We may be unable to delete certain data if the law requires us to keep it (such as invoices) or if it has already been submitted to the embassy. If you are not satisfied with our response, you have the right to complain to the Saudi Data and Artificial Intelligence Authority (SDAIA).",
        ),
      ],
      bullets: [
        t("حق العلم بكيفية جمع بياناتك ومعالجتها.", "The right to be informed about how your data is collected and processed."),
        t("حق الوصول إلى بياناتك والحصول على نسخة منها.", "The right to access your data and obtain a copy of it."),
        t("حق تصحيح البيانات غير الدقيقة أو استكمالها.", "The right to correct inaccurate data or complete it."),
        t("حق طلب حذف بياناتك أو إتلافها عند انتهاء الحاجة إليها.", "The right to request deletion or destruction of your data when it is no longer needed."),
        t("حق سحب موافقتك في أي وقت.", "The right to withdraw your consent at any time."),
        t("حق نقل بياناتك بالحصول عليها بصيغة واضحة ومقروءة آليًا.", "The right to data portability, receiving your data in a clear, machine-readable format."),
      ],
    },
    {
      id: "cookies",
      title: t("ملفات تعريف الارتباط", "Cookies"),
      body: [
        t(
          "نستخدم ملفات تعريف ارتباط أساسية لتشغيل الموقع، مثل تسجيل الدخول وحفظ اللغة وحماية الجلسة، ولا يمكن تعطيلها لأن الموقع لا يعمل بدونها.",
          "We use essential cookies to run the website, for example to keep you signed in, remember your language and secure your session. These cannot be turned off, as the site does not work without them.",
        ),
        t(
          "ولا نستخدم ملفات تعريف الارتباط التحليلية التي تساعدنا على فهم استخدام الموقع وتحسينه إلا بعد موافقتك، ويمكنك تغيير اختيارك في أي وقت من إعدادات ملفات تعريف الارتباط.",
          "We only use analytics cookies, which help us understand and improve how the site is used, with your consent, and you can change your choice at any time in the cookie settings.",
        ),
      ],
    },
    {
      id: "minors",
      title: t("بيانات القاصرين", "Children's Data"),
      body: [
        t(
          "لا نقدم خدماتنا مباشرة لمن هم دون 18 عامًا. وعند التقديم لتأشيرة طفل، يقدّم وليّ الأمر أو الممثل النظامي بياناته ويوافق على معالجتها نيابةً عنه، ونعاملها بالعناية ذاتها التي نعامل بها بقية البيانات.",
          "We do not provide our services directly to anyone under 18. When applying for a child's visa, the parent, guardian or legal representative provides the child's data and consents to its processing on the child's behalf, and we handle it with the same care as all other data.",
        ),
      ],
    },
    {
      id: "contact-and-changes",
      title: t("التواصل معنا والتحديثات", "Contact Us and Updates"),
      body: [
        t(
          "لأي استفسار أو طلب يتعلق ببياناتك الشخصية، تواصل معنا على البريد الإلكتروني: privacy@myvisa.sa، أو بالمراسلة على عنواننا: شركة ماي فيزا لخدمات السفر، الرياض، المملكة العربية السعودية.",
          "For any question or request about your personal data, contact us at privacy@myvisa.sa, or write to us at: myvisa Travel Services Co., Riyadh, Kingdom of Saudi Arabia.",
        ),
        t(
          "قد نحدّث هذه السياسة من وقت لآخر. سننشر النسخة المحدّثة مع تاريخ آخر تحديث، ونبلغك بالتغييرات الجوهرية قبل سريانها. وفي حال وجود اختلاف بين النص العربي والنص الإنجليزي، يُعتمد النص العربي.",
          "We may update this policy from time to time. We will publish the updated version with its last-updated date and notify you of material changes before they take effect. If there is any difference between the Arabic and English texts, the Arabic text prevails.",
        ),
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalDocument["slug"], LegalDocument> = {
  terms: TERMS,
  "refund-policy": REFUND_POLICY,
  privacy: PRIVACY,
};
