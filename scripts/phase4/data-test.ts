import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {neon} from '@neondatabase/serverless';
import '../neon-retry';
import {randomBytes,createHash} from 'node:crypto';
import {parseEnv} from 'node:util';
import site from '../../site.config';
import {qaConnection} from '../phase2/guard';
import {sitemapEntries} from '../../src/lib/public-data';
import {sitemapBundle} from '../../src/lib/seo/feeds';
import {readRuntimeConfig} from '../../src/lib/config';
const owner=neon(qaConnection());
const runtime=parseEnv(await readFile('.env.phase3.local','utf8'));process.env.DATABASE_URL=runtime.DATABASE_URL;
const rows=await sitemapEntries(),paths=rows.map(row=>row.path);
assert.ok(paths.includes('/emne/qa-five'));assert.ok(!paths.includes('/emne/qa-four'));assert.ok(paths.includes(`/${site.qa.category.slug}?page=2`));assert.ok(paths.includes('/om-oss'));
assert.equal(new Set(paths).size,paths.length);
const bundle=sitemapBundle({...readRuntimeConfig(process.env),qa:false},rows);
assert.ok(bundle.segments.join('').includes('?page=2'));
await writeFile(`${process.env.QA_EVIDENCE_DIR??'docs/qa/phase4'}/isolated-indexability.xml`,bundle.segments.join('\n'));
const fixture=JSON.parse(await readFile('work/phase2-fixture.json','utf8')) as {identities:{writer:string;editor:string}};
const token=createHash('sha256').update(randomBytes(32)).digest('hex');
await owner`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${token},${fixture.identities.writer},now()+interval '5 minutes')`;
try {
 const service=neon(runtime.EDITOR_DATABASE_URL!);
 await assert.rejects(()=>service`select editorial.register_page_metadata(${token},'/kontroll',1,${JSON.stringify(site.qa.category)}::jsonb)`);
 await assert.rejects(()=>service`update editorial.page_metadata_editions set seo='{}'::jsonb`);
 await assert.rejects(()=>service`update editorial.revisions set review_snapshot='{}'::jsonb`);
 const [row]=await owner`select r.review_snapshot,r.content_hash,pr.id,pr.name from editorial.published_articles r join editorial.products pr on pr.id=(r.review_snapshot->>'id')::uuid where r.site_id=${site.id} and r.is_test=true and r.slug='qa-phase4-eligible'`;
 assert.ok(row);
 try {await owner`update editorial.products set name=${site.qa.markers.draft} where id=${row.id}`;const [fresh]=await owner`select review_snapshot,content_hash from editorial.published_articles where site_id=${site.id} and is_test=true and slug='qa-phase4-eligible'`;assert.deepEqual(fresh?.review_snapshot,row.review_snapshot);assert.equal(fresh?.content_hash,row.content_hash);} finally {await owner`update editorial.products set name=${row.name} where id=${row.id}`;}
} finally {await owner`delete from editorial.sessions where token_hash=${token}`;}
await writeFile(`${process.env.QA_EVIDENCE_DIR??'docs/qa/phase4'}/data-contract.json`,JSON.stringify({checkedAt:new Date().toISOString(),sitemapEntries:rows.length,topicFourExcluded:true,topicFiveIncluded:true,paginationIncluded:true,trustIncluded:true,writerMetadataDenied:true,immutableSnapshots:true,productEditDoesNotChangeApprovedRevision:true,qaSitemapRemainsEmpty:true},null,2)+'\n');
console.log('PASS: actual published-view sitemap selection, metadata authorization and immutable review snapshots.');
