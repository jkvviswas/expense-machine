/**
 * ============================================================================
 *  EMAIL SERVICE — integration point for a future SMTP/provider
 * ============================================================================
 * Expense Machine is currently a fully client-side app with no backend, so
 * there is nowhere to actually send email from. This module defines the
 * interface the auth flow depends on, plus a "console" implementation that
 * logs the would-be email (and the reset link, since there's no inbox to
 * deliver to in this environment).
 *
 * Swapping to a real provider later is a one-file change: implement
 * `EmailService` against your backend/SMTP/provider (e.g. SES, Postmark,
 * SendGrid) and swap the export below. No other code needs to change.
 */

export interface PasswordResetEmailPayload {
  to: string;
  /** Full URL the user should click, including the one-time token. */
  resetUrl: string;
  /** ISO timestamp the link expires at. */
  expiresAt: string;
}

export interface EmailService {
  sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void>;
}

/**
 * Default implementation: no real delivery. Logs the reset link so it's
 * discoverable during development/testing of the flow end-to-end.
 */
class ConsoleEmailService implements EmailService {
  async sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<void> {
    // eslint-disable-next-line no-console
    console.info(
      `[email:password-reset] To: ${payload.to}\nReset link (expires ${payload.expiresAt}):\n${payload.resetUrl}`,
    );
  }
}

export const emailService: EmailService = new ConsoleEmailService();
