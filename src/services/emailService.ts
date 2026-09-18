import { Resend } from "resend";
import { env } from "../config/env";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

export async function sendPasswordResetEmail(
  recipient: string,
  resetUrl: string,
) {
  if (env.emailProvider !== "resend" || !resend || !env.emailFrom) {
    return { sent: false };
  }

  const result = await resend.emails.send({
    from: env.emailFrom,
    to: recipient,
    subject: "Reset your Social Media Manager password",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #102a43;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your Social Media Manager password.</p>
        <p>This link expires in one hour and can only be used once.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#102a43;color:#ffffff;text-decoration:none;border-radius:8px;">Reset password</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return { sent: true, id: result.data?.id };
}
