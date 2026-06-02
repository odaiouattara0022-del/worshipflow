import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";
import { sendEmail, emailTemplate } from "@/lib/notifications/email";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function POST() {
  const now = new Date();
  let totalSent = 0;

  // Load configured reminder days (default: 7,3,1)
  const setting = await prisma.appSettings.findFirst({ where: { key: "reminderDays" } });
  const REMINDER_DAYS = (setting?.value ?? "7,3,1")
    .split(",")
    .map((d: string) => parseInt(d.trim()))
    .filter((d: number) => !isNaN(d) && d > 0);

  for (const daysBefore of REMINDER_DAYS) {
    const targetDate = addDays(now, daysBefore);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // Find services happening on that target date
    const services = await prisma.service.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        status: { not: "DONE" },
      },
      include: {
        assignments: {
          where: { status: { not: "DECLINED" } },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    for (const service of services) {
      const dateStr = service.date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });

      for (const assignment of service.assignments) {
        const reminderKey = `reminder-${service.id}-${assignment.userId}-J${daysBefore}`;

        // Check if this reminder was already sent
        const existing = await prisma.notification.findFirst({
          where: {
            userId: assignment.userId,
            message: { contains: reminderKey },
          },
        });

        if (existing) continue;

        const message = `Rappel J-${daysBefore} : ${service.title} le ${dateStr} (rôle : ${assignment.role}) [${reminderKey}]`;

        // In-app notification
        await createNotification({
          userId: assignment.userId,
          type: "REMINDER",
          message,
        });

        // Email if user has email
        if (assignment.user.email) {
          const emailSubject = `Rappel : ${service.title} dans ${daysBefore} jour${daysBefore > 1 ? "s" : ""}`;
          const emailBody = emailTemplate(
            `<p>Bonjour <strong>${assignment.user.name}</strong>,</p>
             <p>Vous avez un service dans <strong>${daysBefore} jour${daysBefore > 1 ? "s" : ""}</strong> :</p>
             <table style="margin:16px 0;padding:16px;background:#f9fafb;border-radius:8px;width:100%;border:1px solid #e5e7eb;">
               <tr><td style="font-weight:600;font-size:16px;padding-bottom:8px;">${service.title}</td></tr>
               <tr><td style="color:#6b7280;">📅 ${dateStr}</td></tr>
               <tr><td style="color:#6b7280;padding-top:4px;">🎯 Rôle : ${assignment.role}</td></tr>
             </table>
             <p style="color:#6b7280;font-size:13px;">Connectez-vous à ProSendWorship pour voir les détails du service.</p>`,
            emailSubject
          );
          await sendEmail(assignment.user.email, emailSubject, emailBody);
        }

        totalSent++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    remindersSent: totalSent,
    checkedAt: now.toISOString(),
  });
}
