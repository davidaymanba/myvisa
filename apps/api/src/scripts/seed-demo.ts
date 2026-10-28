import "reflect-metadata";
import type { OrderStatus, TravelerData } from "@myvisa/shared";
import { createApp } from "../app.factory";
import type { RequestUser } from "../common/auth.types";
import { loadEnv } from "../config/env";
import { PrismaService } from "../infra/prisma.service";
import { StorageService } from "../infra/storage.service";
import { InvoicesService } from "../modules/invoices/invoices.service";
import { NotificationsService } from "../modules/notifications/notifications.service";
import { OrdersService } from "../modules/orders/orders.service";

/**
 * Demo customer for client reviews: a family with orders at different stages (appointment booked,
 * action required, delivered, draft), a conversation with an agent, in-app notifications and
 * ZATCA invoices. Sign in as 0500000002 with the dev code. Runs once; re-running is a no-op.
 *
 *   pnpm db:seed-demo
 */
const CUSTOMER_PHONE = "+966500000002";
const AGENT_PHONE = "+966500000003";
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

const DAY = 86_400_000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000);

const noura: TravelerData = { relationship: "SELF", givenNameEn: "NOURA", surnameEn: "ALOTAIBI", fullNameAr: "نورة العتيبي", gender: "FEMALE", dateOfBirth: "1991-03-14", nationalityIso2: "SA", applicantType: "SAUDI_CITIZEN", passportNumber: "N4829173", passportExpiry: "2031-06-30" };
const faisal: TravelerData = { relationship: "SPOUSE", givenNameEn: "FAISAL", surnameEn: "ALOTAIBI", fullNameAr: "فيصل العتيبي", gender: "MALE", dateOfBirth: "1988-11-02", nationalityIso2: "SA", applicantType: "SAUDI_CITIZEN", passportNumber: "F7716205", passportExpiry: "2030-01-20" };
const lana: TravelerData = { relationship: "CHILD", givenNameEn: "LANA", surnameEn: "ALOTAIBI", fullNameAr: "لانا العتيبي", gender: "FEMALE", dateOfBirth: "2016-08-21", nationalityIso2: "SA", applicantType: "SAUDI_CITIZEN", passportNumber: "L3390418", passportExpiry: "2027-03-15" };

interface Step {
  to: OrderStatus;
  at: Date;
  note?: string;
}

async function main() {
  const env = loadEnv();
  const app = await createApp(env, { logger: false });
  await app.init();
  const prisma = app.get(PrismaService);
  const storage = app.get(StorageService);
  const orders = app.get(OrdersService);
  const invoices = app.get(InvoicesService);
  const notifications = app.get(NotificationsService);

  try {
    // Demo promotions (idempotent by code): one live, one fixed-amount, one already over.
    const coupons = [
      { code: "WINTER25", kind: "PERCENT" as const, value: 25, maxDiscountHalalas: 15_000, endsAt: new Date(Date.now() + 60 * DAY), maxRedemptions: 200 },
      { code: "WELCOME50", kind: "FIXED" as const, value: 5_000, maxDiscountHalalas: null, endsAt: null, maxRedemptions: null },
      { code: "SUMMER10", kind: "PERCENT" as const, value: 10, maxDiscountHalalas: null, endsAt: ago(20), maxRedemptions: 500 },
    ];
    for (const c of coupons) await prisma.coupon.upsert({ where: { code: c.code }, create: { ...c, startsAt: ago(90) }, update: {} });

    const existing = await prisma.user.findUnique({ where: { phone: CUSTOMER_PHONE }, include: { _count: { select: { orders: true } } } });
    if (existing && existing._count.orders > 0) {
      console.log(`demo customer ${CUSTOMER_PHONE} already has orders — nothing to do`);
      return;
    }

    const customer = await prisma.user.upsert({
      where: { phone: CUSTOMER_PHONE },
      create: { phone: CUSTOMER_PHONE, phoneVerified: new Date(), fullNameAr: "نورة العتيبي", fullNameEn: "Noura Alotaibi", email: "noura.demo@myvisa.sa", createdAt: ago(40) },
      update: { fullNameAr: "نورة العتيبي", fullNameEn: "Noura Alotaibi" },
    });
    const agent = await prisma.user.upsert({
      where: { phone: AGENT_PHONE },
      create: { phone: AGENT_PHONE, role: "AGENT", fullNameAr: "ريم القحطاني", fullNameEn: "Reem Alqahtani" },
      update: { role: "AGENT", fullNameAr: "ريم القحطاني", fullNameEn: "Reem Alqahtani" },
    });
    const user: RequestUser = { id: customer.id, phone: customer.phone, role: "CUSTOMER", fullNameAr: customer.fullNameAr, fullNameEn: customer.fullNameEn, sessionFamily: "seed" };

    /** Creates the order through the real service (pricing, encryption, saved travellers), then plays its history. */
    const play = async (serviceSlug: string, travelers: TravelerData[], steps: Step[], opts: { review?: "APPROVED" | "PENDING"; reject?: { type: string; reason: string }; decision?: "APPROVED"; travelFrom?: string; travelTo?: string } = {}) => {
      const draft = await orders.createDraft(user, { serviceSlug, purpose: null, travelFrom: opts.travelFrom ?? null, travelTo: opts.travelTo ?? null, travelers, preferredCity: "RIYADH", preferredDateFrom: null, preferredDateTo: null, appointmentNotes: null, email: null, locale: "ar" });
      const created = steps[0]?.at ?? new Date();
      await prisma.order.update({ where: { id: draft.id }, data: { createdAt: created } });
      await prisma.orderStatusEvent.updateMany({ where: { orderId: draft.id }, data: { createdAt: created } });

      const paidStep = steps.find((s) => s.to === "RECEIVED");
      if (opts.review) {
        // One file per required slot, stored for real so "view" works.
        for (const r of draft.requirements.filter((x) => x.isRequired)) {
          const slots = r.perTraveler ? draft.travelers.filter((t) => !r.applicantType || r.applicantType === t.applicantType) : [null];
          for (const slot of slots) {
            const key = `orders/${draft.id}/seed-${r.id}-${slot?.id ?? "order"}.pdf`;
            await storage.put(key, PDF, "application/pdf");
            const rejected = opts.reject && r.documentType === opts.reject.type;
            const saved = slot ? await prisma.orderTraveler.findUnique({ where: { id: slot.id }, select: { travelerId: true } }) : null;
            const doc = await prisma.document.create({
              data: { ownerId: customer.id, travelerId: saved?.travelerId ?? null, type: r.documentType, storageKey: key, originalName: `${r.title.en.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.pdf`, mimeType: "application/pdf", sizeBytes: PDF.length, scanStatus: "CLEAN", uploadedAt: created, createdAt: created, inVault: r.documentType === "PASSPORT" || r.documentType === "PERSONAL_PHOTO" },
            });
            await prisma.orderDocument.create({
              data: { orderId: draft.id, documentId: doc.id, requirementId: r.id, orderTravelerId: slot?.id ?? null, reviewStatus: rejected ? "REJECTED" : opts.review, rejectionReason: rejected ? opts.reject!.reason : null, reviewerId: opts.review === "APPROVED" || rejected ? agent.id : null, reviewedAt: opts.review === "APPROVED" || rejected ? created : null },
            });
          }
        }
      }

      let from: OrderStatus = "DRAFT";
      for (const s of steps.slice(1)) {
        await prisma.orderStatusEvent.create({ data: { orderId: draft.id, fromStatus: from, toStatus: s.to, customerNote: s.note ?? null, actorId: s.to === "PENDING_PAYMENT" ? customer.id : s.to === "RECEIVED" ? null : agent.id, createdAt: s.at } });
        from = s.to;
      }
      const last = steps[steps.length - 1]!;
      await prisma.order.update({
        where: { id: draft.id },
        data: { status: last.to, submittedAt: paidStep?.at ?? null, decision: opts.decision ?? null, closedAt: last.to === "DELIVERED" ? last.at : null, assigneeId: paidStep ? agent.id : null, refundPolicyVersion: paidStep ? "2026-10" : null },
      });
      if (paidStep) {
        await prisma.payment.create({ data: { orderId: draft.id, provider: "MOCK", providerPaymentId: `mock_seed_${draft.number}`, method: "MADA", amountHalalas: draft.price.total, status: "PAID", idempotencyKey: `seed:${draft.id}`, cardLast4: "4242", paidAt: paidStep.at, createdAt: paidStep.at } });
        await invoices.issueForOrder(draft.id);
      }

      // The in-app notifications the customer would have received along the way.
      const destination = draft.service.destination ? { ar: draft.service.destination.name.ar, en: draft.service.destination.name.en } : null;
      for (const s of steps.filter((x) => !["DRAFT", "PENDING_PAYMENT"].includes(x.to))) {
        const rows =
          s.to === "RECEIVED"
            ? await notifications.notify({ userId: customer.id, template: "order.received", channels: ["IN_APP"], payload: { orderId: draft.id, orderNumber: draft.number, destination, service: draft.service.name, totalHalalas: draft.price.total } })
            : await notifications.notify({ userId: customer.id, template: "order.update", channels: ["IN_APP"], payload: { orderId: draft.id, orderNumber: draft.number, status: s.to, destination, service: draft.service.name, note: s.note ?? null, decision: opts.decision ?? null } });
        await prisma.notification.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { createdAt: s.at, status: "DELIVERED", sentAt: s.at } });
      }
      return draft;
    };

    // 1 · Delivered last month: Japan e-visa for Faisal.
    const japan = await play(
      "jp-tourism-evisa",
      [faisal],
      [
        { to: "DRAFT", at: ago(34) },
        { to: "PENDING_PAYMENT", at: ago(34, -1) },
        { to: "RECEIVED", at: ago(34, -1) },
        { to: "DOCUMENTS_REVIEW", at: ago(33) },
        { to: "SUBMITTED_TO_EMBASSY", at: ago(32) },
        { to: "DECISION_ISSUED", at: ago(27), note: "صدرت التأشيرة الإلكترونية. أرسلناها إلى بريدك، واطبعها قبل السفر." },
        { to: "DELIVERED", at: ago(27, -2) },
      ],
      { review: "APPROVED", decision: "APPROVED", travelFrom: "2026-10-05", travelTo: "2026-10-15" },
    );
    await prisma.shipment.create({ data: { orderId: japan.id, direction: "DELIVERY", carrier: "Email (e-visa)", status: "DELIVERED", createdAt: ago(27), updatedAt: ago(27) } });

    // 2 · In progress: France (Schengen) for Noura and Faisal, appointment booked.
    const france = await play(
      "fr-tourism-schengen",
      [noura, faisal],
      [
        { to: "DRAFT", at: ago(9, 3) },
        { to: "PENDING_PAYMENT", at: ago(9, 2) },
        { to: "RECEIVED", at: ago(9, 2) },
        { to: "DOCUMENTS_REVIEW", at: ago(8, 20) },
        { to: "APPOINTMENT_BOOKED", at: ago(3), note: "حجزنا موعد البصمة في مركز VFS بالرياض. أحضروا الجوازات الأصلية وصورة شخصية حديثة." },
      ],
      { review: "APPROVED", travelFrom: "2026-12-18", travelTo: "2027-01-02" },
    );
    await prisma.appointment.create({ data: { orderId: france.id, center: "VFS_GLOBAL", city: "Riyadh", scheduledAt: new Date(new Date(Date.now() + 5 * DAY).setUTCHours(7, 30, 0, 0)), reference: "FRA-RUH-482915" } });
    const thread = [
      { kind: "CUSTOMER" as const, body: "مرحبًا، هل يكفي حجز فندق مبدئي قابل للإلغاء أم نحتاج حجزًا مدفوعًا؟", at: ago(8, 18), read: true },
      { kind: "STAFF" as const, body: "أهلًا نورة 👋 الحجز المبدئي القابل للإلغاء يكفي تمامًا للسفارة الفرنسية، ورفعتموه بشكل صحيح.", at: ago(8, 17), read: true },
      { kind: "CUSTOMER" as const, body: "ممتاز، شكرًا ريم 🙏", at: ago(8, 16), read: true },
      { kind: "STAFF" as const, body: "حجزنا لكم موعد البصمة في VFS الرياض. التفاصيل في صفحة الطلب، وسأرسل لكم تذكيرًا قبل الموعد بيوم.", at: ago(3), read: false },
    ];
    for (const m of thread) {
      await prisma.message.create({ data: { orderId: france.id, senderId: m.kind === "STAFF" ? agent.id : customer.id, senderKind: m.kind, body: m.body, createdAt: m.at, readAt: m.read ? m.at : null } });
    }
    const unreadMsg = await notifications.notify({ userId: customer.id, template: "message.received", channels: ["IN_APP"], payload: { orderId: france.id, orderNumber: france.number, agent: "ريم", preview: thread[3]!.body } });
    await prisma.notification.updateMany({ where: { id: { in: unreadMsg.map((r) => r.id) } }, data: { createdAt: ago(3), status: "DELIVERED" } });

    // 3 · Needs the customer: US visitor visa, bank statement rejected.
    await play(
      "us-tourism-b1b2",
      [noura],
      [
        { to: "DRAFT", at: ago(4, 5) },
        { to: "PENDING_PAYMENT", at: ago(4, 4) },
        { to: "RECEIVED", at: ago(4, 4) },
        { to: "DOCUMENTS_REVIEW", at: ago(3, 20) },
        { to: "ACTION_REQUIRED", at: ago(1, 2), note: "كشف الحساب المرفوع يغطي 3 أشهر فقط، والسفارة الأمريكية تطلب آخر 6 أشهر مختومة من البنك." },
      ],
      { review: "APPROVED", reject: { type: "BANK_STATEMENT", reason: "يغطي 3 أشهر فقط — نحتاج آخر 6 أشهر مختومة من البنك" }, travelFrom: "2027-02-10", travelTo: "2027-02-20" },
    );

    // 4 · Started yesterday, not finished: Italy for Lana and Noura.
    await play("it-tourism-schengen", [lana, noura], [{ to: "DRAFT", at: ago(1) }], { travelFrom: "2027-04-01", travelTo: "2027-04-09" });

    // Older notifications are read; the last few stay unread.
    await prisma.notification.updateMany({ where: { userId: customer.id, channel: "IN_APP", createdAt: { lt: ago(2) }, template: { not: "message.received" } }, data: { readAt: new Date(), status: "READ" } });

    console.log(`demo customer ready: ${CUSTOMER_PHONE} (sign in with 0500000002 and the dev code)`);
  } finally {
    // Queue workers can hold the event loop open for a while; a one-off script doesn't need to wait.
    await Promise.race([app.close(), new Promise((r) => setTimeout(r, 3000))]);
  }
}

await main();
process.exit(0);
