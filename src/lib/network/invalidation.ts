import 'server-only';
import {revalidatePath} from 'next/cache';
import {networkArticlePattern} from '../seo/network-cache';
export function invalidateNetworkViews(){revalidatePath(networkArticlePattern,'page');revalidatePath('/','layout');}
