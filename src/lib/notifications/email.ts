import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Wrap any HTML body in a proper UTF-8 email template
// ---------------------------------------------------------------------------
export function emailTemplate(content: string, title?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title ?? "ProSendWorship"}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#4f46e5;padding:20px 32px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.5px;">✦ ProSendWorship</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;color:#111827;font-size:15px;line-height:1.6;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:12px;">
            Vous recevez cet email car vous êtes membre d'une équipe sur ProSendWorship.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getSmtpSettings() {
  // Keys match what the settings page saves (camelCase without dot)
  const keys = ["smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpFrom"];
  const rows = await prisma.appSettings.findMany({ where: { key: { in: keys } } });
  const map = Object.fromEntries((rows as any[]).map((r: any) => [r.key, r.value]));
  return {
    host: map["smtpHost"] ?? "",
    port: parseInt(map["smtpPort"] ?? "587"),
    user: map["smtpUser"] ?? "",
    pass: map["smtpPass"] ?? "",
    from: map["smtpFrom"] ?? map["smtpUser"] ?? "",
  };
}

// ---------------------------------------------------------------------------
// Send via SMTP (Nodemailer)
// ---------------------------------------------------------------------------
async function sendViaSmtp(
  smtp: Awaited<ReturnType<typeof getSmtpSettings>>,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    // Dynamic import so the module is only loaded when SMTP is configured
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
      connectionTimeout: 8_000,
      greetingTimeout: 5_000,
    });
    await transporter.sendMail({
      from: smtp.from || smtp.user,
      to,
      subject,
      html,
    });
    console.log(`[Email SMTP] Envoyé à ${to}`);
    return true;
  } catch (err: any) {
    console.error("[Email SMTP] Erreur:", err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Send via Resend
// ---------------------------------------------------------------------------
async function getResendKey(): Promise<string | null> {
  // Prefer DB-stored key over env var
  const row = await prisma.appSettings.findFirst({ where: { key: "resendApiKey" } });
  return row?.value?.trim() || process.env.RESEND_API_KEY || null;
}

async function getFromAddress(): Promise<string> {
  const row = await prisma.appSettings.findFirst({ where: { key: "smtpFrom" } });
  return row?.value?.trim() || process.env.FROM_EMAIL || "onboarding@resend.dev";
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const key = await getResendKey();
  if (!key) return false;

  try {
    const from = await getFromAddress();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (res.ok) {
      console.log(`[Email Resend] Envoyé à ${to} depuis ${from}`);
      return true;
    }

    const errBody = await res.text();
    console.error("[Email Resend] Erreur:", errBody);
    return false;
  } catch (err: any) {
    console.error("[Email Resend] Erreur:", err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Public API — uses SMTP if configured, falls back to Resend, then no-op
// ---------------------------------------------------------------------------
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  // 1. SMTP if fully configured
  const smtp = await getSmtpSettings();
  if (smtp.host && smtp.user && smtp.pass) {
    return sendViaSmtp(smtp, to, subject, html);
  }

  // 2. Resend (DB key or env var) — simpler, recommended
  const resendKey = await getResendKey();
  if (resendKey) {
    return sendViaResend(to, subject, html);
  }

  console.log(`[Email] Aucun service configuré — allez dans Paramètres → Email pour activer l'envoi`);
  return false;
}

// ---------------------------------------------------------------------------
// Test connection (called from settings)
// ---------------------------------------------------------------------------
export async function testEmailConnection(to: string): Promise<{ ok: boolean; error?: string }> {
  const subject = "Test d'envoi — ProSendWorship";
  const html = emailTemplate(
    `<p>Bonjour,</p>
     <p>Ce message confirme que votre configuration email fonctionne correctement sur <strong>ProSendWorship</strong>.</p>
     <p>Les rappels de services et notifications seront envoyés à cette adresse.</p>`,
    subject
  );

  // Try Resend first (simpler)
  const resendKey = await getResendKey();
  if (resendKey) {
    const from = await getFromAddress();
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, html }),
      });
      const data = await res.json();
      if (res.ok) return { ok: true };
      // Return the exact Resend error so the user can see it
      return { ok: false, error: `Resend: ${data.message ?? data.name ?? JSON.stringify(data)}` };
    } catch (e: any) {
      return { ok: false, error: `Réseau: ${e.message}` };
    }
  }

  // Try SMTP
  const smtp = await getSmtpSettings();
  if (smtp.host && smtp.user && smtp.pass) {
    try {
      const nodemailer = await import("nodemailer");
      const t = nodemailer.createTransport({
        host: smtp.host, port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
        connectionTimeout: 8_000,
      });
      await t.verify();
      await t.sendMail({ from: smtp.from || smtp.user, to, subject, html });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  return { ok: false, error: "Aucun service email configuré. Allez dans Paramètres → Email." };
}
