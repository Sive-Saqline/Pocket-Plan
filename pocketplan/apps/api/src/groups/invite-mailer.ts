import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MailResult =
  | { sent: true }
  | { sent: false; reason: 'rate_limited' | 'already_registered' | 'failed' };

/** Sends the "you're invited" email to someone who has no PocketPlan account yet. */
export abstract class InviteMailer {
  /** `redirectTo` is where the email's link lands after Supabase signs them in. */
  abstract inviteNewUser(
    email: string,
    redirectTo: string,
  ): Promise<MailResult>;
}

/**
 * Supabase Auth's own invite email (Authentication → Emails → "Invite user"),
 * sent through Supabase's default mailer. It creates the account (the sign-up
 * trigger adds the profile, 9 categories and a Cash wallet) and emails a link
 * that signs the person in and lands on `redirectTo`, where they choose a
 * name and password, then join the group.
 *
 * Supabase's default mailer only sends auth emails, so people who already
 * have an account see their invite in the app instead (Groups page).
 * It is also rate-limited (a few emails per hour on the free plan).
 */
@Injectable()
export class SupabaseInviteMailer extends InviteMailer {
  private readonly url: string;
  private readonly key: string;
  private readonly log = new Logger('InviteMailer');

  constructor(config: ConfigService) {
    super();
    this.url = (config.get<string>('SUPABASE_URL') ?? '').replace(/\/+$/, '');
    this.key = config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  }

  async inviteNewUser(email: string, redirectTo: string): Promise<MailResult> {
    if (!this.url || !this.key) {
      this.log.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
      return { sent: false, reason: 'failed' };
    }
    let res: Response;
    try {
      res = await fetch(
        `${this.url}/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.key}`,
            apikey: this.key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
          signal: AbortSignal.timeout(15_000),
        },
      );
    } catch (err) {
      this.log.error(`Invite email request failed: ${String(err)}`);
      return { sent: false, reason: 'failed' };
    }
    if (res.ok) return { sent: true };

    const body = (await res.json().catch(() => ({}))) as {
      error_code?: string;
      code?: string;
      msg?: string;
      message?: string;
    };
    const code = body.error_code ?? body.code ?? '';
    const text = `${body.msg ?? body.message ?? ''}`.toLowerCase();
    if (res.status === 429 || code.includes('rate_limit')) {
      return { sent: false, reason: 'rate_limited' };
    }
    if (code === 'email_exists' || text.includes('already been registered')) {
      return { sent: false, reason: 'already_registered' };
    }
    this.log.error(`Invite email failed (${res.status}): ${code} ${text}`);
    return { sent: false, reason: 'failed' };
  }
}
