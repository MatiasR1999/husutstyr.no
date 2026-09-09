import {neon} from '@neondatabase/serverless';
import './neon-retry';
import {drizzle} from 'drizzle-orm/neon-http';
import {sql} from 'drizzle-orm';
import {z} from 'zod';
import site from '../site.config';
import {readRuntimeConfig,assertQaContentAllowed} from '../src/lib/config';
import {launchConfigIssues,launchContentIssues} from '../src/lib/domain/launch';

const forced=process.argv.includes('--production');
const runtime=readRuntimeConfig(process.env);
if(runtime.qa&&!forced){assertQaContentAllowed(runtime);console.log('PASS: Explicit loopback QA build; this is not production launch approval.');}
else {
 const issues=launchConfigIssues(site,process.env);
 if(!issues.length){
  const db=drizzle(neon(process.env.DATABASE_URL!));
  const records=await db.execute(sql`select slug,is_test,payload,author_snapshot from editorial.published_articles where site_id=${site.id} and locale=${site.locale} and is_test=false`);
  const categories=await db.execute(sql`select * from editorial.published_categories where site_id=${site.id} and locale=${site.locale}`);
  const articles=z.array(z.object({slug:z.string(),is_test:z.boolean(),payload:z.unknown(),author_snapshot:z.unknown()})).parse(records.rows);
  issues.push(...launchContentIssues(site,{articles,categories:categories.rows}));
 }
 if(issues.length){console.error(issues.map(issue=>`BLOCKED: ${issue}`).join('\n'));process.exitCode=1;}
 else console.log('PASS: Automated production prerequisites; documented human launch review is still required.');
}
