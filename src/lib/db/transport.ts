// A connect timeout means no request was transmitted; other failures may have an unknown write outcome.
export function isConnectTimeout(error:unknown):boolean {
 return error instanceof Error&&typeof error.cause==='object'&&error.cause!==null&&'code' in error.cause&&error.cause.code==='UND_ERR_CONNECT_TIMEOUT';
}
export async function fetchWithConnectionRetry(input:Parameters<typeof fetch>[0],init?:Parameters<typeof fetch>[1],transport:typeof fetch=fetch):Promise<Response> {
 try{return await transport(input,init);}catch(error){if(!isConnectTimeout(error)||init?.signal?.aborted)throw error;return transport(input,init);}
}
