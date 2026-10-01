import { createHash } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { getAuth0Domain, isLocal } from './config';
import { inviteEntity, userEntity } from './data/entities';

export type Role = 'creator' | 'member' | 'admin';

export type UserStatus = 'active' | 'revoked';

export type AuthenticatedUser = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
};

// rows written before the status attribute existed count as active
export const toStatus = (value: string | undefined): UserStatus =>
  value === 'revoked' ? 'revoked' : 'active';

export type Claims = {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  nickname?: string;
};

const userInfoCache = new Map<string, Claims>();

// a warm lambda would otherwise grow this map for every distinct token it ever
// sees, which an authenticated caller can drive by rotating tokens
const userInfoCacheLimit = 500;

const decodeSegment = (
  segment: string,
): Record<string, unknown> | undefined => {
  try {
    return JSON.parse(
      Buffer.from(
        segment.replace(/-/g, '+').replace(/_/g, '/'),
        'base64',
      ).toString('utf8'),
    );
  } catch {
    return undefined;
  }
};

const bearerToken = (req: Request): string | undefined => {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return undefined;
  }
  return header.slice(7).trim();
};

const normaliseClaims = (raw: Record<string, unknown>): Claims => ({
  sub: typeof raw.sub === 'string' ? raw.sub : undefined,
  email: typeof raw.email === 'string' ? raw.email : undefined,
  email_verified:
    typeof raw.email_verified === 'boolean' ||
    typeof raw.email_verified === 'string'
      ? raw.email_verified
      : undefined,
  name:
    (typeof raw.name === 'string' ? raw.name : undefined) ||
    (typeof raw.nickname === 'string' ? raw.nickname : undefined),
});

const fetchUserInfo = async (token: string): Promise<Claims | undefined> => {
  const domain = getAuth0Domain();
  if (!domain) {
    return undefined;
  }
  const key = createHash('sha256').update(token).digest('hex');
  const cached = userInfoCache.get(key);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(`https://${domain}/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return undefined;
    }
    const claims = normaliseClaims(
      (await response.json()) as Record<string, unknown>,
    );
    if (userInfoCache.size >= userInfoCacheLimit) {
      const oldest = userInfoCache.keys().next();
      if (!oldest.done) {
        userInfoCache.delete(oldest.value);
      }
    }
    userInfoCache.set(key, claims);
    return claims;
  } catch {
    return undefined;
  }
};

export const clearUserInfoCache = (): void => {
  userInfoCache.clear();
};

export const claimsMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const gatewayClaims = (
    req.context as
      | {
          authorizer?: { jwt?: { claims?: Record<string, unknown> } };
        }
      | undefined
  )?.authorizer?.jwt?.claims;
  let claims = gatewayClaims ? normaliseClaims(gatewayClaims) : undefined;

  const token = bearerToken(req);

  if (!claims?.sub && isLocal() && token) {
    const payload = decodeSegment(token.split('.')[1] || '');
    claims = payload ? normaliseClaims(payload) : undefined;
  }

  if (!claims?.sub) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  if (!claims.email && token) {
    const userInfo = await fetchUserInfo(token);
    // the email is only adopted when /userinfo describes the same subject the
    // gateway authenticated, so a mismatched or cross-tenant response can never
    // attach someone else's invited address to this caller
    if (userInfo && userInfo.sub === claims.sub) {
      claims = {
        ...claims,
        email: userInfo.email ?? claims.email,
        email_verified: userInfo.email_verified ?? claims.email_verified,
        name: claims.name ?? userInfo.name,
      };
    }
  }

  req.claims = claims;
  next();
};

const isEmailVerified = (claims: Claims): boolean =>
  claims.email_verified === true || claims.email_verified === 'true';

export const userMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const claims = req.claims ?? {};
  const sub = claims.sub ?? '';
  if (!sub) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }

  const existing = await userEntity.get({ sub }).go();
  if (existing.data) {
    const status = toStatus(existing.data.status);
    if (status === 'revoked') {
      res.status(403).json({ error: 'revoked' });
      return;
    }
    req.user = {
      sub: existing.data.sub,
      email: existing.data.email,
      name: existing.data.name,
      role: existing.data.role as Role,
      status,
    };
    next();
    return;
  }

  const email = claims.email?.toLowerCase();
  if (!email || !isEmailVerified(claims)) {
    res.status(403).json({ error: 'not_invited' });
    return;
  }

  const invite = await inviteEntity.get({ email }).go();
  if (
    !invite.data ||
    (invite.data.claimedBy && invite.data.claimedBy.sub !== sub)
  ) {
    res.status(403).json({ error: 'not_invited' });
    return;
  }

  const name = claims.name || email;
  const role = invite.data.role as Role;

  const status = await userEntity
    .create({
      sub,
      email,
      name,
      role,
      status: 'active',
      createdAt: new Date().toISOString(),
    })
    .go()
    .then((): UserStatus => 'active')
    .catch(async () => {
      // a concurrent first request may have created it already
      const raced = await userEntity.get({ sub }).go();
      if (!raced.data) {
        throw new Error('could not create the user record');
      }
      return toStatus(raced.data.status);
    });

  if (status === 'revoked') {
    res.status(403).json({ error: 'revoked' });
    return;
  }

  await inviteEntity
    .patch({ email })
    .set({
      claimedBy: { sub, name },
      claimedAt: new Date().toISOString(),
    })
    .go()
    .catch(() => undefined);

  req.user = { sub, email, name, role, status };
  next();
};

export const requireCreator = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const role = req.user?.role;
  if (role !== 'creator' && role !== 'admin') {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  next();
};

export const canViewDrafts = (role?: string): boolean =>
  role === 'creator' || role === 'admin';

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  next();
};
