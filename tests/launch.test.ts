import {describe,it,expect} from 'vitest';
import site from '../site.config';
import {launchConfigIssues,launchContentIssues} from '../src/lib/domain/launch';

describe('launch refuses unfinished clones',()=>{
 // The refusal contract is checked against an explicitly unfinished clone, so it stays meaningful once this site's own config is complete.
 const unfinishedClone={...site,identity:{name:'TODO: Skriv eget nettstedsnavn',url:''},niche:'TODO: Velg nisje',toneOfVoice:'TODO: Beskriv stemmen',home:{title:'TODO: Skriv forsidetittel',description:'TODO: Skriv forsidebeskrivelse'},content:{home:'TODO: Skriv introduksjon',category:'TODO: Skriv pillar-introduksjon',footer:'TODO: Skriv footer'}};
 const completeEnv={SITE_URL:site.identity.url,DATABASE_URL:'postgresql://seo_public_reader:secret@host/db',EDITOR_DATABASE_URL:'postgresql://seo_editor_service:secret@host/db',OIDC_CLIENT_ID:'client',OIDC_CLIENT_SECRET:'secret',PUBLICATION_WORKER_SECRET:'w'.repeat(32),INDEXNOW_KEY:'k'.repeat(32)};
 it('rejects an unfinished clone identity and missing runtime secrets',()=>{
  const issues=launchConfigIssues(unfinishedClone,{});
  expect(issues).toContain('unfinished-config:identity');expect(issues).toContain('invalid-production-origin');expect(issues).toContain('invalid-role:DATABASE_URL');
 });
 it('accepts this site own configuration once every runtime secret is present',()=>{
  expect(launchConfigIssues(site,completeEnv)).toEqual([]);
 });
 it('refuses QA, OIDC test mode and network activation at first launch',()=>{
  const issues=launchConfigIssues(site,{SEO_QA_MODE:'true',OIDC_TEST_MODE:'true',NETWORK_LINKS_ENABLED:'true'});
  expect(issues).toContain('test-mode-enabled');expect(issues).toContain('network-must-start-disabled');
 });
 it('does not count fixtures or an empty inventory as approved production content',()=>{
  const empty=launchContentIssues(site,{articles:[],categories:[]});expect(empty).toContain('no-published-articles');
  for(const page of site.trustPages)expect(empty).toContain(`missing-trust-page:${page.slug}`);
  const test=launchContentIssues(site,{articles:[{slug:site.qa.article.slug,is_test:true,payload:{kind:'article'},author_snapshot:{}}],categories:[]});
  expect(test).toContain('published:0:test-or-todo');expect(test).toContain('no-published-articles');
 });
 it('rejects incomplete public author snapshots and TODO bodies even when test flags are false',()=>{
  const payload={version:1,kind:'article',title:site.qa.article.title,summary:site.qa.article.summary,section:site.qa.article.section,blocks:[{type:'paragraph',text:'TODO: Skriv broedteksten for denne artikkelen.'}],seo:site.qa.article.seo,sources:[],research:[],topicIds:[]};
  const issues=launchContentIssues(site,{articles:[{slug:site.qa.article.slug,is_test:false,payload,author_snapshot:{}}],categories:[{intro:'TODO: Skriv kategoriens introduksjon.'}]});
  expect(issues).toContain('published:0:test-or-todo');expect(issues).toContain('unfinished-category');
 });
});
