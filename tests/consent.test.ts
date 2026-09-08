import {expect,it} from 'vitest';
import {analyticsConsent,clickProperties,googleConsent,publicMeasurementUrl} from '../src/lib/measurement/policy';
import site from '../site.config';
import {randomUUID} from 'node:crypto';
const now=Date.now(),policy=site.consent;
const consent={categories:['necessary','analytics'],revision:policy.revision,consentTimestamp:new Date(now-1000).toISOString(),lastConsentTimestamp:new Date(now-1000).toISOString()};
const cookie=(value:unknown)=>`${policy.cookieName}=${encodeURIComponent(JSON.stringify(value))}`;
it('requires an actual unexpired matching policy and rejects denial, deletion, malformed and future-dated consent',()=>{
 expect(analyticsConsent(cookie(consent),policy,now)).toBe(true);
 for(const value of [{...consent,categories:['necessary']},{...consent,revision:0},{...consent,consentTimestamp:'bad'},null,[],{...consent,lastConsentTimestamp:new Date(now+1000).toISOString()},{...consent,consentTimestamp:new Date(now-181*86400000).toISOString(),lastConsentTimestamp:new Date(now-180*86400000).toISOString()}])expect(analyticsConsent(cookie(value),policy,now)).toBe(false);
 expect(analyticsConsent('',policy,now)).toBe(false);expect(analyticsConsent(`${policy.cookieName}=%broken`,policy,now)).toBe(false);
});
it('keeps advertising denied and strips URL parameters while excluding private and unrelated origins',()=>{
 expect(Object.values(googleConsent(false))).toEqual(['denied','denied','denied','denied']);
 expect(googleConsent(true)).toEqual({analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 expect(publicMeasurementUrl(`${site.qa.identity.url}/kontroll/test?email=private#secret`,site.qa.identity.url,site.measurement.excludedPaths)).toBe(`${site.qa.identity.url}/kontroll/test`);
 for(const raw of [`${site.qa.identity.url}/redaksjon/preview/id`,`${site.qa.identity.url}/api/editor/metrics`,`${site.qa.phase5.destinationOrigin}/outside`])expect(publicMeasurementUrl(raw,site.qa.identity.url,site.measurement.excludedPaths)).toBeNull();
});
it('whitelists only four non-personal affiliate properties and rejects tampered DOM destinations',()=>{
 const data={affiliateId:randomUUID(),articleId:randomUUID(),placement:'body-3',destination:site.qa.phase5.destinationOrigin,email:'private'};
 expect(clickProperties(data,[data.destination])).toEqual({linkId:data.affiliateId,articleId:data.articleId,placement:data.placement,destination:data.destination});
 for(const changed of [{destination:site.qa.phase5.destination},{articleId:'person@example.test'},{placement:'private'},{destination:'javascript:alert(1)'}])expect(clickProperties({...data,...changed},[data.destination])).toBeNull();
});
