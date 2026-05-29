const APP_NAME = 'SAST Integration';

export function resetPasswordTemplate(name: string, resetUrl: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;color:#1e293b">
    <h2 style="color:#0f766e">${APP_NAME}</h2>
    <p>Hi ${name},</p>
    <p>You requested a password reset. Click the button below to set a new password:</p>
    <p style="margin:24px 0"><a href="${resetUrl}" style="background:#0f766e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Reset Password</a></p>
    <p style="font-size:13px;color:#64748b">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  </body></html>`;
}

export function verifyEmailTemplate(name: string, verifyUrl: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;color:#1e293b">
    <h2 style="color:#0f766e">${APP_NAME}</h2>
    <p>Hi ${name},</p>
    <p>Please verify your email address by clicking the button below:</p>
    <p style="margin:24px 0"><a href="${verifyUrl}" style="background:#0f766e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Verify Email</a></p>
    <p style="font-size:13px;color:#64748b">This link expires in 24 hours.</p>
  </body></html>`;
}
