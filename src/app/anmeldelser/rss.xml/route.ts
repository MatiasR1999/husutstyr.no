import {GET as categoryFeed} from '../../[kategori]/rss.xml/route';
export const dynamic='force-dynamic';
export function GET(request:Request){return categoryFeed(request,{params:Promise.resolve({kategori:'anmeldelser'})});}
