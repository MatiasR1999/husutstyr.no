import {z} from 'zod';
import {NextResponse} from 'next/server';
import {workerAuthorized,queueDelivery} from '@/lib/editorial/delivery';
import {dueJobs} from '@/lib/editorial/publication';
import {privateError} from '@/lib/auth/http';
import {privateHeaders} from '@/lib/seo/private';
export const maxDuration=60;
export async function POST(request:Request) {if(!workerAuthorized(request)) return privateError();try {const input=z.strictObject({eventId:z.uuid().optional()}).parse(await request.json());const ids=input.eventId?[input.eventId]:await dueJobs();for(const id of ids) await queueDelivery(id);return NextResponse.json({scheduled:ids.length},{status:202,headers:privateHeaders});}catch{return privateError();}}
export async function GET(request:Request) {if(!workerAuthorized(request)) return privateError();for(const id of await dueJobs()) await queueDelivery(id);return NextResponse.json({accepted:true},{headers:privateHeaders});}
