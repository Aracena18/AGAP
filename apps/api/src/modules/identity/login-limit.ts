import { createHmac } from 'node:crypto';
import type { Pool } from 'pg';
import { ApiError } from '../../platform/errors.js';
import type { Config } from '../../platform/config.js';
import { loginSource } from './login-source.js';
export class LoginRateLimitError extends ApiError {
  constructor(readonly retryAfterSeconds:number){super(429,'login_rate_limited','Too many sign-in requests. Try again after the indicated wait.');}
}
/** Shared across API processes; expiry reset and increment are one atomic write. */
export async function limitLogin(pool:Pool,secret:string,source:string,limit=120,windowSeconds=300){
  if(!Number.isInteger(limit)||limit<1||limit>10000||!Number.isInteger(windowSeconds)||windowSeconds<1||windowSeconds>3600)throw new Error('Invalid login rate-limit configuration.');
  const sourceHash=createHmac('sha256',secret).update(`login:${source}`).digest('hex');
  await pool.query('DELETE FROM identity.login_limits WHERE expires_at<now()');
  const result=await pool.query<{attempts:number;retry_after_seconds:number}>(`INSERT INTO identity.login_limits(source_hash,attempts,expires_at)
    VALUES($1,1,statement_timestamp()+$2*interval '1 second') ON CONFLICT(source_hash) DO UPDATE SET
    attempts=CASE WHEN identity.login_limits.expires_at<=statement_timestamp() THEN 1 ELSE identity.login_limits.attempts+1 END,
    expires_at=CASE WHEN identity.login_limits.expires_at<=statement_timestamp() THEN EXCLUDED.expires_at ELSE identity.login_limits.expires_at END
    RETURNING attempts,GREATEST(1,ceil(extract(epoch FROM expires_at-statement_timestamp())))::integer AS retry_after_seconds`,[sourceHash,windowSeconds]);
  if(result.rows[0].attempts>limit)throw new LoginRateLimitError(result.rows[0].retry_after_seconds);
}
export function limitLoginRequest(pool:Pool,config:Config,request:Parameters<typeof loginSource>[0]){
  return limitLogin(pool,config.SESSION_SECRET,loginSource(request,config.LOGIN_TRUSTED_PROXY_CIDRS),config.LOGIN_RATE_LIMIT_MAX,config.LOGIN_RATE_LIMIT_WINDOW_SECONDS);
}
