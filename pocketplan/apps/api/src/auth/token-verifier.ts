import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/** Turns a sign-in token into the user's id, or throws if it isn't valid. */
export abstract class TokenVerifier {
  abstract verify(token: string): Promise<string>;
}

/**
 * Checks Supabase Auth access tokens. This project signs them with
 * asymmetric keys (ES256), so the API only needs the public key list (JWKS)
 * and no secret. Keys are fetched once and cached; a rotated key is picked up
 * automatically.
 */
@Injectable()
export class SupabaseTokenVerifier extends TokenVerifier {
  private readonly issuer: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(config: ConfigService) {
    super();
    const url = config.get<string>('SUPABASE_URL')?.replace(/\/+$/, '');
    if (!url) throw new Error('SUPABASE_URL must be set (see .env.example)');
    this.issuer = `${url}/auth/v1`;
    this.jwks = createRemoteJWKSet(
      new URL(`${this.issuer}/.well-known/jwks.json`),
    );
    new Logger('Auth').log(`Checking Supabase tokens from ${this.issuer}`);
  }

  async verify(token: string) {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: 'authenticated',
    });
    if (!payload.sub) throw new Error('Token has no subject');
    return payload.sub;
  }
}
