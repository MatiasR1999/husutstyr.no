import {expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import site from '../site.config';
import {networkInput,registrySchema,normalizedAnchor,validatePlacement,networkWhenEnabled} from '../src/lib/network/policy';
import {parseBoolean} from '../src/lib/config';
const fixture=site.qa.phase6,input={articleId:randomUUID(),revisionId:randomUUID(),blockIndex:0,anchor:fixture.firstAnchor,peerId:site.qa.network.sites[0].id,destination:`${fixture.origin}/guide`,topicSlug:fixture.topic,justification:fixture.justification,placement:'body' as const,relationship:'editorial' as const},blocks=[{type:'paragraph' as const,text:fixture.paragraph}];
it('defaults off, rejects ambiguous env and does not invoke the network reader when off',async()=>{
 expect(parseBoolean(undefined,'NETWORK_LINKS_ENABLED')).toBe(false);expect(parseBoolean('false','NETWORK_LINKS_ENABLED')).toBe(false);expect(()=>parseBoolean('yes','NETWORK_LINKS_ENABLED')).toThrow();
 const read=vi.fn(async()=>[input]);expect(await networkWhenEnabled(false,read)).toEqual([]);expect(read).not.toHaveBeenCalled();expect(await networkWhenEnabled(true,read)).toEqual([input]);expect(read).toHaveBeenCalledTimes(1);
});
it('requires a strict copied registry without footer blocks, reciprocal rules or automatic activation',()=>{
 expect(registrySchema.parse(site.network)).toEqual({version:1,sites:[]});
 for(const extra of [{footer:true},{sidebar:[]},{reciprocity:true},{activateAfterDays:30}])expect(()=>registrySchema.parse({...site.network,...extra})).toThrow();
 expect(()=>registrySchema.parse({...site.qa.network,sites:[site.qa.network.sites[0],site.qa.network.sites[0]]})).toThrow();
 for(const extra of [{placement:'footer'},{placement:'sidebar'},{relationship:'reciprocal'},{reciprocity:true},{approvedBy:randomUUID()}])expect(()=>networkInput.parse({...input,...extra})).toThrow();
});
it('checks exact paragraph context, matching topic/niche and an approved HTTPS origin',()=>{
 expect(()=>validatePlacement(input,site.qa.network,fixture.niche,site.qa.identity.url,blocks,[fixture.topic],true)).not.toThrow();
 for(const extra of [{destination:`${fixture.origin}.attacker.invalid/guide`},{destination:`${fixture.origin}/guide?person=private`},{destination:`${fixture.origin}/guide#hidden`},{destination:'javascript:alert(1)'},{blockIndex:1},{anchor:'missing'},{topicSlug:'unrelated'}])expect(()=>validatePlacement({...input,...extra},site.qa.network,fixture.niche,site.qa.identity.url,blocks,[fixture.topic],true)).toThrow();
 expect(()=>validatePlacement(input,site.qa.network,'wrong-niche',site.qa.identity.url,blocks,[fixture.topic])).toThrow();expect(()=>validatePlacement(input,site.qa.network,fixture.niche,site.qa.identity.url,blocks,[])).toThrow();
 expect(()=>validatePlacement(input,site.qa.network,fixture.niche,site.qa.identity.url,[{type:'heading',text:fixture.paragraph}],[fixture.topic])).toThrow();
});
it('normalizes Norwegian letter case, compatibility characters and repeated spaces for site-wide uniqueness',()=>{
 expect(normalizedAnchor(`  ${fixture.firstAnchor.toLocaleUpperCase('nb').replaceAll(' ','\u00a0\u00a0')} `)).toBe(normalizedAnchor(fixture.firstAnchor));
 expect(normalizedAnchor('ＳＡＭＭＥ\tanker')).toBe('samme anker');
});
