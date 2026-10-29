import type { z } from 'zod';
import { ApiErrorSchema } from '../../contracts/src/schemas.js';

export interface RequestOptions { version?: number; idempotencyKey?: string; csrfToken?: string; cursor?: string; limit?: number; signal?: AbortSignal }
export class ApiClientError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly correlationId?: string, public readonly fields?: {path:string;message:string}[]) { super(message); }
}
export class ClientTransport {
  constructor(private readonly baseUrl = '/api/v1', private readonly fetcher: typeof fetch = fetch) {}
  protected async request<T>(method: string, path: string, body: unknown, schema: z.ZodType<T>, options: RequestOptions): Promise<T> {
    const query = new URLSearchParams();
    if (options.cursor) query.set('cursor', options.cursor);
    if (options.limit !== undefined) query.set('limit', String(options.limit));
    const headers = new Headers({ Accept: 'application/json' });
    if (body !== undefined) headers.set('Content-Type','application/json');
    if (options.version !== undefined) headers.set('If-Match', `"${options.version}"`);
    if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey);
    if (options.csrfToken) headers.set('X-CSRF-Token', options.csrfToken);
    // Native browser fetch must not receive ClientTransport as its receiver.
    const fetcher = this.fetcher;
    const response = await fetcher(`${this.baseUrl}${path}${query.size ? `?${query}` : ''}`, { method, headers, credentials: 'same-origin', body: body === undefined ? undefined : JSON.stringify(body), signal: options.signal, redirect: 'error' });
    return this.read(response,schema);
  }
  protected async upload<T>(path:string,file:Blob,metadata:{fileName:string;mediaType:string;size:number},schema:z.ZodType<T>,options:RequestOptions):Promise<T>{
    const headers=new Headers({Accept:'application/json','Content-Type':metadata.mediaType,'X-File-Name':encodeURIComponent(metadata.fileName),'X-Upload-Size':String(metadata.size)});
    if(options.csrfToken)headers.set('X-CSRF-Token',options.csrfToken);
    if(options.idempotencyKey)headers.set('Idempotency-Key',options.idempotencyKey);
    const fetcher=this.fetcher;
    return this.read(await fetcher(`${this.baseUrl}${path}`,{method:'POST',headers,body:file,credentials:'same-origin',redirect:'error',signal:options.signal}),schema);
  }
  protected async download(path:string,options:RequestOptions):Promise<Blob>{
    const fetcher=this.fetcher,response=await fetcher(`${this.baseUrl}${path}`,{credentials:'same-origin',redirect:'error',signal:options.signal});
    if(!response.ok)await this.read(response,ApiErrorSchema);
    return response.blob();
  }
  private async read<T>(response:Response,schema:z.ZodType<T>):Promise<T>{
    let value: unknown;
    try { value = await response.json(); } catch { throw new ApiClientError(response.status,'invalid_response','The server returned an unreadable response.'); }
    if (!response.ok) {
      const parsed = ApiErrorSchema.safeParse(value);
      throw parsed.success ? new ApiClientError(response.status, parsed.data.error.code, parsed.data.error.message, parsed.data.error.correlationId,parsed.data.error.fields) : new ApiClientError(response.status,'request_failed','The request could not be completed.');
    }
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw new ApiClientError(response.status,'invalid_response','The response does not match the shared API contract.');
    return parsed.data;
  }
}
