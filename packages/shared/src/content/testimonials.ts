import type { PublicTestimonial } from "../api/public";

/**
 * PLACEHOLDER testimonials. They seed the `Testimonial` table (flagged isPlaceholder) and are the
 * build-time fallback when the API is down. Replace them with real, consented reviews in the admin
 * before launch — publishing invented reviews would mislead customers.
 */
export const PLACEHOLDER_TESTIMONIALS: PublicTestimonial[] = [
  {
    id: "placeholder-1",
    name: { ar: "نورة العتيبي", en: "Noura A." },
    city: { ar: "الرياض", en: "Riyadh" },
    service: { ar: "شنغن · فرنسا", en: "Schengen · France" },
    quote: { ar: "أول مرة أعرف بالضبط كم دفعت للسفارة. الموعد انحجز خلال يومين والتأشيرة طلعت قبل الموعد المتوقع.", en: "For the first time I knew exactly what I paid the embassy. The slot was booked in two days and the visa came early." },
    rating: 5,
  },
  {
    id: "placeholder-2",
    name: { ar: "عبدالله القحطاني", en: "Abdullah Q." },
    city: { ar: "جدة", en: "Jeddah" },
    service: { ar: "المملكة المتحدة", en: "United Kingdom" },
    quote: { ar: "كنت متخوف من الرفض، الفريق راجع كشف الحساب ونبهني على نقطة كانت بتسبب مشكلة. شكراً لهم.", en: "I was worried about a refusal. The team caught an issue in my bank statement before submission. Grateful." },
    rating: 5,
  },
  {
    id: "placeholder-3",
    name: { ar: "محمد الشهري", en: "Mohammed S." },
    city: { ar: "الدمام", en: "Dammam" },
    service: { ar: "عائلة · تركيا", en: "Family · Turkey" },
    quote: { ar: "قدمت لعائلتي كلها في طلب واحد، والمتابعة على واتساب كانت ممتازة. ما احتجت أتصل ولا مرة.", en: "One application for my whole family, and the WhatsApp updates were excellent. I never had to call." },
    rating: 5,
  },
  {
    id: "placeholder-4",
    name: { ar: "سارة الدوسري", en: "Sara D." },
    city: { ar: "الخبر", en: "Khobar" },
    service: { ar: "دراسة · ألمانيا", en: "Study · Germany" },
    quote: { ar: "ملف الدراسة معقد، لكنهم رتبوه خطوة بخطوة. أنصح فيهم لأي طالب.", en: "Student files are complicated, but they organised it step by step. I recommend them to any student." },
    rating: 5,
  },
  {
    id: "placeholder-5",
    name: { ar: "أحمد المالكي", en: "Ahmed M." },
    city: { ar: "مكة", en: "Makkah" },
    service: { ar: "أمريكا", en: "USA" },
    quote: { ar: "حجزوا لي موعد المقابلة أبكر بشهر من اللي لقيته بنفسي. التجربة كانت راقية جدًا.", en: "They found me an interview slot a month earlier than I could. A genuinely premium experience." },
    rating: 5,
  },
  {
    id: "placeholder-6",
    name: { ar: "ريم الزهراني", en: "Reem Z." },
    city: { ar: "الرياض", en: "Riyadh" },
    service: { ar: "اليابان", en: "Japan" },
    quote: { ar: "التصميم سهل والأسعار واضحة، وجوازي رجع لي مع مندوب للبيت.", en: "Simple, clear prices, and my passport came back to my door with a courier." },
    rating: 5,
  },
];
