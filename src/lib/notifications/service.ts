import { prisma } from "@/lib/db";

export type NotificationType = "ASSIGNMENT" | "REMINDER" | "UPDATE";
export type NotificationChannel = "IN_APP" | "EMAIL" | "WHATSAPP";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  message: string;
  channel?: NotificationChannel;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      channel: input.channel || "IN_APP",
    },
  });
}

export async function createBulkNotifications(
  inputs: CreateNotificationInput[]
) {
  return Promise.all(inputs.map((input) => createNotification(input)));
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

/**
 * Notify all team members assigned to a service about an update.
 */
export async function notifyServiceTeam(
  serviceId: string,
  message: string,
  type: NotificationType = "UPDATE"
) {
  const assignments = await prisma.teamAssignment.findMany({
    where: { serviceId },
    select: { userId: true },
  });

  const uniqueUserIds = Array.from(new Set<string>(assignments.map((a: any) => a.userId as string)));

  return createBulkNotifications(
    uniqueUserIds.map((userId) => ({ userId, type, message }))
  );
}
