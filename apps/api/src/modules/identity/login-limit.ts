import { createHmac } from 'node:crypto';
import type { Pool } from 'pg';
import { ApiError } from '../../platform/errors.js';
/** Shared across API processes. Do not trust caller-supplied X-Forwarded-For. */
export async function limitLogin(pool:Pool,secret:string,source:string,limit=120){
  const sourceHash=createHmac('sha256',secret).update(`login:${source}`).digest('hex');
  await pool.query('DELETE FROM identity.login_limits WHERE expires_at<now()');
  const result=await pool.query<{attempts:number}>(`INSERT INTO identity.login_limits(source_hash,attempts,expires_at) VALUES($1,1,now()+interval '5 minutes')
    ON CONFLICT(source_hash) DO UPDATE SET attempts=identity.login_limits.attempts+1 RETURNING attempts`,[sourceHash]);
  if(result.rows[0].attempts>limit)throw new ApiError(429,'login_rate_limited','Too many sign-in requests. Wait five minutes before trying again.');
}
