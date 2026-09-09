// A connect timeout means no request was transmitted; other failures may have an unknown write outcome.
export function isConnectTimeout(error:unknown):boolean {
 return error instanceof Error&&typeof error.cause==='object'&&error.cause!==null&&'code' in error.cause&&error.cause.code==='UND_ERR_CONNECT_TIMEOUT';
}
// Neon answers 500 and marks the body retryable when its proxy never reached the compute node, so the statement provably did not run.
// The response is cloned because the caller still needs the original body when the error turns out not to be retryable.
export async function isRetryableComputeError(response:Response):Promise<boolean> {
 if(response.status!==500) return false;
 try {
  const body:unknown=await response.clone().json();
  return typeof body==='object'&&body!==null&&Reflect.get(body,'neon:retryable')===true;
 } catch { return false; }
}
export async function fetchWithConnectionRetry(input:Parameters<typeof fetch>[0],init?:Parameters<typeof fetch>[1],transport:typeof fetch=fetch,computeStartMs=250):Promise<Response> {
 let response:Response;
 try{response=await transport(input,init);}catch(error){if(!isConnectTimeout(error)||init?.signal?.aborted)throw error;return transport(input,init);}
 if(init?.signal?.aborted||!await isRetryableComputeError(response)) return response;
 // A suspended compute needs a moment before it can accept the retry; an immediate one would hit the same closed door.
 await new Promise(resolve=>setTimeout(resolve,computeStartMs));
 return transport(input,init);
}
