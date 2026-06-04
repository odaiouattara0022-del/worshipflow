import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";
import { sendEmail, emailTemplate } from "@/lib/notifications/email";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: serviceId, itemId } = await params;
  const body = await request.json();
  // Distinguish "field omitted" (don't touch) from "field set to null" (clear it):
  // checking presence of the key, so an assignee/song/notes can actually be removed.
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);

  const existing = await prisma.serviceItem.findFirst({ where: { id: itemId } });
  const prevAssignee = existing ? (existing as any).assigneeId ?? null : null;

  const item = await prisma.serviceItem.update({
    where: { id: itemId },
    data: {
      type: body.type ?? undefined,
      title: body.title ?? undefined,
      order: body.order ?? undefined,
      duration: body.duration ?? undefined,
      songId: has("songId") ? body.songId : undefined,
      arrangementId: has("arrangementId") ? body.arrangementId : undefined,
      notes: has("notes") ? body.notes : undefined,
      assigneeId: has("assigneeId") ? body.assigneeId : undefined,
    },
    include: { song: true, arrangement: true, assignee: true },
  });

  // Notify a newly assigned person (in-app, plus best-effort email).
  const newAssignee = (item as any).assigneeId ?? null;
  if (newAssignee && newAssignee !== prevAssignee) {
    try {
      const service = await prisma.service.findFirst({ where: { id: serviceId } });
      const when = service?.date
        ? new Date(service.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
        : "";
      const label = (item as any).song?.title ?? (item as any).title;
      const message = `Tu es responsable de « ${label} » pour ${service?.title ?? "un service"}${when ? ` le ${when}` : ""}.`;
      await createNotification({ userId: newAssignee, type: "ASSIGNMENT", message });
      const user = await prisma.user.findFirst({ where: { id: newAssignee } });
      if (user && (user as any).email) {
        sendEmail((user as any).email, "Nouvelle assignation", emailTemplate(`<p>${message}</p>`, "Nouvelle assignation")).catch(() => {});
      }
    } catch { /* notification is best-effort — never block the save */ }
  }

  return NextResponse.json(item);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await params;
  await prisma.serviceItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
