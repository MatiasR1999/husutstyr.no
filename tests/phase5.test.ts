import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {affiliateDestination,affiliateEvent} from '../src/lib/domain/affiliate';
import {parseContent} from '../src/lib/domain/content';
import {robotsText} from '../src/lib/seo/feeds';
import site from '../site.config';

describe('approved commercial destinations',()=>{
 const origin=site.qa.phase5.destinationOrigin;
 it('rejects origin tricks, credentials, scripts and URL control characters',()=>{
  for(const value of [`${origin}.invalid/path`,`${origin}/#fragment`,`${origin.replace('//','//user:password@')}/`,`${origin}\\path`,`${origin}/\r\nnext`,'javascript:alert(1)','//outside.invalid/'])expect(()=>affiliateDestination(value,[origin])).toThrow();
  expect(affiliateDestination(site.qa.phase5.destination,[origin]).origin).toBe(origin);
  expect(()=>affiliateDestination(site.qa.phase5.destination,[])).toThrow();
  expect(robotsText({qa:false,preview:false,networkLinks:false,identity:site.qa.identity})).toContain('Disallow: /go/');
 });
 it('sends only the approved origin and stable IDs, never the destination query or path',()=>{
  const link={id:randomUUID(),slug:'registered',destination:`${origin}/private/person?email=example&token=secret`,relationship:'commission' as const,disclosure:site.qa.phase5.disclosure};
  const event=affiliateEvent(link,randomUUID(),3);
  expect(event.destination).toBe(origin);expect(event.placement).toBe('body-3');expect(JSON.stringify(event)).not.toMatch(/email|token|person|secret/);
 });
 it('requires a registered link reference instead of accepting a URL in an article block',()=>{
  const base={version:1,kind:'article',title:site.qa.article.title,summary:site.qa.article.summary,section:site.qa.article.section,seo:site.qa.article.seo,sources:[],research:[],topicIds:[]};
  expect(parseContent({...base,blocks:[{type:'affiliate',linkId:randomUUID(),label:site.qa.phase5.link}]}).blocks).toHaveLength(1);
  expect(()=>parseContent({...base,blocks:[{type:'affiliate',linkId:randomUUID(),label:site.qa.phase5.link,destination:site.qa.phase5.destination}]})).toThrow();
 });
});
