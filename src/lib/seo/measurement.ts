import type {Metadata} from 'next';
// Search Console verification is a deployment fact, not editorial content, so it comes from the
// environment. The token is validated before it reaches the document: Google issues 43 characters of
// URL-safe base64, and anything else is a misconfiguration worth failing loudly on rather than emitting.
const verificationToken=(()=>{
 const raw=process.env.GOOGLE_SITE_VERIFICATION?.trim();
 if(!raw) return null;
 if(!/^[A-Za-z0-9_-]{20,128}$/.test(raw)) throw new Error('GOOGLE_SITE_VERIFICATION is not a valid Search Console token');
 return raw;
})();
export const privacyMetadata:Metadata={referrer:'no-referrer',...(verificationToken?{verification:{google:verificationToken}}:{})};
// Only a rendered public page with canonical metadata is eligible; errors and private previews have none.
export function renderedMeasurementPage(document:Document):string|null {
  return document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href??null;
}
