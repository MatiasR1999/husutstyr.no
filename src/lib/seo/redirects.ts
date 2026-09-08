import {z} from 'zod';
import {normalizedRequestUrl} from './urls';
const path=z.string().regex(/^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/).refine(value=>!/^\/(api|go|redaksjon)(\/|$)/.test(value));
export const redirectInput=z.discriminatedUnion('status',[z.strictObject({source:path,destination:path,status:z.literal(301)}),z.strictObject({source:path,destination:z.null(),status:z.literal(410)})]);
export function redirectTarget(request:URL,destination:string) {
 const target=new URL(request);target.pathname=path.parse(destination);
 return normalizedRequestUrl(target)??target;
}
export const goneHeaders={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'};
