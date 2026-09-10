import data from '../../content/lead-images.json';

// Lead images are site furniture, not editorial content: they carry no claim and are versioned with the
// code rather than bound to a revision hash. Articles without a usable photograph simply have none, and
// every template renders without one.
export type LeadImage = {readonly url:string; readonly alt:string; readonly fotograf:string; readonly kilde:string; readonly bredde:number; readonly hoyde:number};
const map = data as Record<string,{alt:string;fotograf:string;kilde:string;bredde:number;hoyde:number}>;
export function leadImage(slug:string): LeadImage|null {
  const entry = map[slug];
  return entry ? {url:`/bilder/${slug}.jpg`, ...entry} : null;
}
