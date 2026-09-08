import type {Metadata} from 'next';
export const privacyMetadata:Metadata={referrer:'no-referrer'};
// Only a rendered public page with canonical metadata is eligible; errors and private previews have none.
export function renderedMeasurementPage(document:Document):string|null {
  return document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href??null;
}
