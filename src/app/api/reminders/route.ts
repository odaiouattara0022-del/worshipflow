import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";
import { sendEmail, emailTemplate } from "@/lib/notifications/email";
import { requireSession } from "@/lib/security";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
function startOfDay(date: Date): Date { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; }
function endOfDay(date: Date): Date { const d = new Date(date); d.setHours(23, 59, 59, 999); return d; }

// Sends service reminders to the people actually responsible (item assignees),
// J-N days before each service. Idempotent: the same reminder isn't sent twice
// the same day. Returns a summary.
async function runReminders() {
  const now = new Date();
  const today = startOfDay(now);
  let totalSent = 0;

  const setting = await prisma.appSettings.findFirst({ where: { key: "reminderDays" } });
  const REMINDER_DAYS = (setting?.value ?? "7,3,1")
    .split(",")
    .map((d: string) => parseInt(d.trim()))
    .filter((d: number) => !isNaN(d) && d > 0);

  for (const daysBefore of REMINDER_DAYS) {
    const targetDate = addDays(now, daysBefore);

    const services = await prisma.service.findMany({
      where: { date: { gte: startOfDay(targetDate), lte: endOfDay(targetDate) }, status: { not: "DONE" } },
      include: { items: true },
    });

    for (const service of services) {
      const dateStr = new Date(service.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

      // The people actually assigned to this service = distinct item assignees.
      const assigneeIds = [...new Set(
        (service.items as any[]).map((i) => i.assigneeId).filter(Boolean)
      )];
      if (assigneeIds.length === 0) continue;

      const users = await prisma.user.findMany({ where: { id: { in: assigneeIds } } });

      for (const u of users) {
        const message = `Rappel J-${daysBefore} : « ${service.title} » le ${dateStr}`;

        // Dedup: skip if the same reminder already went out today.
        const existing = await prisma.notification.findFirst({
          where: { userId: u.id, type: "REMINDER", message, sentAt: { gte: today.toISOString() } },
        });
        if (existing) continue;

        await createNotification({ userId: u.id, type: "REMINDER", message });

        if ((u as any).email) {
          const subject = `Rappel : ${service.title} dans ${daysBefore} jour${daysBefore > 1 ? "s" : ""}`;
          await sendEmail(
            (u as any).email,
            subject,
            emailTemplate(
              `<p>Bonjour <strong>${u.name}</strong>,</p>
               <p>Vous êtes attendu pour un service dans <strong>${daysBefore} jour${daysBefore > 1 ? "s" : ""}</strong> :</p>
               <table style="margin:16px 0;padding:16px;background:#f9fafb;border-radius:8px;width:100%;border:1px solid #e5e7eb;">
                 <tr><td style="font-weight:600;font-size:16px;padding-bottom:8px;">${service.title}</td></tr>
                 <tr><td style="color:#6b7280;">📅 ${dateStr}</td></tr>
               </table>
               <p style="color:#6b7280;font-size:13px;">Connectez-vous à ProSendWorship pour voir les détails.</p>`,
              subject
            )
          );
        }
        totalSent++;
      }
    }
  }

  return { success: true, remindersSent: totalSent, checkedAt: now.toISOString() };
}

// Automatic trigger (Vercel Cron hits this with GET). Guarded by CRON_SECRET when set.
export async function GET(request: NextRequest) {
  // Now publicly routable (proxy), so it MUST carry the cron secret. If CRON_SECRET
  // isn't configured, refuse outright rather than run unguarded.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runReminders());
}

// Manual trigger from Settings (logged-in admins).
export async function POST() {
  try { await requireSession(); } catch (e) { return e as Response; }
  return NextResponse.json(await runReminders());
}
