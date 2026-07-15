import { getMailTransporter } from "@/lib/mail/transporter";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailOptions) {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.warn("[mail] SMTP yapılandırılmamış, e-posta gönderilmedi:", subject);
    return false;
  }

  const fromName = process.env.SMTP_FROM_NAME ?? "Kaçkarlı Tur";
  const fromEmail = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER;

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });

  return true;
}
