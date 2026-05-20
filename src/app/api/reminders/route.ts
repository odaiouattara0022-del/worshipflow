import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";
import { sendEmail } from "@/lib/notifications/email";

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

const REMINDER_DAYS = [7, 3, 1]; // J-7, J-3, J-1

export async function POST() {
  const now = new Date();
  let totalSent = 0;

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
          await sendEmail(
            assignment.user.email,
            `Rappel : ${service.title} dans ${daysBefore} jour${daysBefore > 1 ? "s" : ""}`,
            `<p>Bonjour ${assignment.user.name},</p>
             <p>${message.replace(` [${reminderKey}]`, "")}</p>
             <p>— WorshipFlow</p>`
          );
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
