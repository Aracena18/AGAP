import {ZodError} from 'zod';
import {ApiError,notFound} from '../../platform/errors.js';

export async function supportOperation<T>(work:()=>Promise<T>){try{return await work();}catch(error){
 if(error instanceof ApiError)throw error;
 if(error instanceof ZodError)throw new ApiError(422,'invalid_support','Check the support fields.',error.issues.map(i=>({path:i.path.join('.'),message:i.message})));
 const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
 if(code==='42501')throw new ApiError(403,'support_forbidden','This request is outside your support assignment.');
 if(code==='P0412')throw new ApiError(412,'stale_version','This record changed. Reload before saving.');
 if(code==='P0409')throw new ApiError(409,'follow_up_completed','This follow-up is already completed.');
 if(code==='PC409')throw new ApiError(409,'correction_exists','This request already has a correction. Correct its latest successor.');
 if(code==='PA409')throw new ApiError(409,'draft_conflict','This draft changed or a pending draft already exists. Reload before continuing.');
 if(code==='PA422')throw new ApiError(422,'invalid_draft_cursor','Reload the draft list before loading more.');
 if(code==='23514')throw new ApiError(422,'invalid_support','Check the officer, follow-up date and action details.');
 if(code==='P0002')throw notFound();
 throw new ApiError(503,'support_unavailable','The result could not be confirmed. Retry the same submission.');
}}
