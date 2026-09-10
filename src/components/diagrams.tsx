import type {DiagramKey} from '@/lib/domain/diagrams';

// Diagrams are inline SVG rather than image files so they inherit the page's own colours. A raster would
// need one palette baked in, and no single tone clears 4.5:1 against both the light and the dark ground.
const ink='var(--color-ink)', muted='var(--color-muted)', line='var(--color-border)', accent='var(--color-accent)';
const label={fontSize:13,fill:muted,fontFamily:'var(--font-body)'} as const;
const value={fontSize:15,fill:ink,fontFamily:'var(--font-body)',fontWeight:600} as const;

function Frame({k,title,desc,viewBox,children}:{k:string;title:string;desc:string;viewBox:string;children:React.ReactNode}) {
 return <svg className="diagram-svg" viewBox={viewBox} role="img" aria-labelledby={`${k}-t ${k}-d`} preserveAspectRatio="xMidYMid meet">
  <title id={`${k}-t`}>{title}</title><desc id={`${k}-d`}>{desc}</desc>{children}</svg>;
}

/* Same outdoor air, heated indoors: the water content does not change, the relative humidity does.
   The percentage bars are per panel, so the water content gets its own bar on a shared scale — otherwise
   winter's 90% outdoors reads as more water than summer's 66% indoors, which is the whole misconception. */
function Luftfuktighet() {
 const panel=(x:number,season:string,outT:string,outRh:number,inRh:number,gram:number,gramTekst:string)=>{
  const h=(rh:number)=>Math.round(rh*1.1);
  return <g key={season} transform={`translate(${x},0)`}>
   <text x={0} y={14} style={{...value,fontSize:14}}>{season}</text>
   <text x={0} y={34} style={{...label,fontSize:11}}>RELATIV FUKTIGHET</text>
   <text x={0} y={54} style={label}>Ute {outT}</text>
   <rect x={0} y={62} width={54} height={132} fill="none" stroke={line}/>
   <rect x={0} y={62+132-h(outRh)} width={54} height={h(outRh)} fill={accent} opacity={0.25}/>
   <text x={27} y={62+132-h(outRh)-7} textAnchor="middle" style={value}>{outRh}%</text>
   <path d="M64 128 h30" stroke={muted} strokeWidth={1.5} fill="none" markerEnd="url(#arrow)"/>
   <text x={79} y={118} textAnchor="middle" style={{...label,fontSize:11}}>varmes</text>
   <text x={112} y={54} style={label}>Inne 21 °C</text>
   <rect x={104} y={62} width={54} height={132} fill="none" stroke={line}/>
   <rect x={104} y={62+132-h(inRh)} width={54} height={h(inRh)} fill={accent} opacity={0.6}/>
   <text x={131} y={62+132-h(inRh)-7} textAnchor="middle" style={value}>{inRh}%</text>
   <text x={0} y={224} style={{...label,fontSize:11}}>VANN I LUFTA — UENDRET AV OPPVARMINGEN</text>
   <rect x={0} y={232} width={240} height={14} fill="none" stroke={line}/>
   <rect x={0} y={232} width={Math.round(gram/15*240)} height={14} fill={accent} opacity={0.6}/>
   <text x={Math.round(gram/15*240)+8} y={243} style={{...value,fontSize:13}}>{gramTekst}</text>
  </g>;
 };
 return <Frame k="luftfuktighet-arsgang" viewBox="-8 -8 636 274"
  title="Samme uteluft, oppvarmet inne"
  desc="To panel. Om vinteren har uteluft på null grader 90 prosent relativ fuktighet, men bare 3,9 gram vann per kubikkmeter. Varmet til 21 grader inne faller den relative fuktigheten til 21 prosent, uten at vannmengden endrer seg. Om sommeren har uteluft på 20 grader og 70 prosent fuktighet 12,1 gram vann per kubikkmeter, og inne ved 21 grader blir den relative fuktigheten 66 prosent. Vannsøylene nederst deler skala og viser at vinterluft inneholder omtrent en tredjedel så mye vann som sommerluft.">
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
   <path d="M0 0 L10 5 L0 10 z" fill={muted}/></marker></defs>
  {panel(0,'Vinter','0 °C',90,21,3.9,'3,9 g/m³')}
  {panel(340,'Sommer','20 °C',70,66,12.1,'12,1 g/m³')}
  <line x1={306} y1={0} x2={306} y2={252} stroke={line} strokeDasharray="3 4"/>
 </Frame>;
}

/* Where the heat is actually produced, and what it has to pass through to reach the food. */
function Induksjon() {
 const stack=(x:number,name:string,coilLabel:string,glow:'panne'|'element',lines:string[])=>(
  <g transform={`translate(${x},0)`}>
   <text x={0} y={14} style={{...value,fontSize:14}}>{name}</text>
   <rect x={0} y={34} width={210} height={26} fill={glow==='panne'?accent:'none'} opacity={glow==='panne'?0.55:1} stroke={line}/>
   <text x={220} y={52} style={label}>Panne</text>
   <rect x={0} y={66} width={210} height={16} fill="none" stroke={line}/>
   <text x={220} y={79} style={label}>Glass</text>
   <rect x={0} y={88} width={210} height={26} fill={glow==='element'?accent:'none'} opacity={glow==='element'?0.55:1} stroke={line}/>
   <text x={220} y={106} style={label}>{coilLabel}</text>
   {lines.map((text,i)=><text key={text} x={0} y={144+i*19} style={{...label,fontSize:12}}>{text}</text>)}
  </g>);
 return <Frame k="induksjon-mot-keramisk" viewBox="-8 -8 716 214"
  title="Hvor varmen oppstår"
  desc="To lagdelte snitt. På induksjon lager spolen et magnetfelt, og varmen oppstår direkte i pannens bunn; glasset varmes bare av panna, og effekten endres nesten umiddelbart. På keramisk topp varmes elementet under glasset, og varmen må ledes opp gjennom glasset før den når panna, noe som gir treghet både opp og ned.">
  {stack(0,'Induksjon','Spole','panne',['Varmen oppstår i panna.','Glasset varmes bare indirekte.','Reagerer nesten umiddelbart.'])}
  {stack(390,'Keramisk','Element','element',['Varmen oppstår i elementet.','Må ledes opp gjennom glasset.','Treghet både opp og ned.'])}
 </Frame>;
}

/* Two properties that pull in opposite directions, which is why no single pan wins. */
function PanneVarme() {
 const rows=[
  {navn:'Støpejern',lagring:92,respons:25},
  {navn:'Karbonstål',lagring:58,respons:62},
  {navn:'Belagt aluminium',lagring:30,respons:88},
 ];
 return <Frame k="panne-varmefordeling" viewBox="-8 -8 636 254"
  title="Varmelagring mot responstid"
  desc="Tre pannetyper sammenlignet på to egenskaper. Støpejern lagrer mest varme, men reagerer tregest på endret effekt. Belagt aluminium reagerer raskest, men lagrer minst. Karbonstål ligger mellom de to.">
  <text x={200} y={16} style={{...label,fontSize:12}}>Lagrer varme</text>
  <text x={420} y={16} style={{...label,fontSize:12}}>Reagerer raskt</text>
  {rows.map((r,i)=>{const y=44+i*62;return <g key={r.navn}>
   <text x={0} y={y+4} style={{...value,fontSize:14}}>{r.navn}</text>
   <rect x={200} y={y-11} width={180} height={16} fill="none" stroke={line}/>
   <rect x={200} y={y-11} width={Math.round(r.lagring*1.8)} height={16} fill={accent} opacity={0.5}/>
   <rect x={420} y={y-11} width={180} height={16} fill="none" stroke={line}/>
   <rect x={420} y={y-11} width={Math.round(r.respons*1.8)} height={16} fill={accent} opacity={0.5}/>
  </g>;})}
  <text x={0} y={228} style={{...label,fontSize:12}}>Egenskapene trekker mot hverandre: masse som holder på varme, kan ikke også slippe den raskt.</text>
 </Frame>;
}

const registry: Record<DiagramKey, () => React.JSX.Element> = {
 'luftfuktighet-arsgang': Luftfuktighet,
 'induksjon-mot-keramisk': Induksjon,
 'panne-varmefordeling': PanneVarme,
};
export function Diagram({diagramKey,caption}:{diagramKey:DiagramKey;caption:string}) {
 const Body=registry[diagramKey];
 return <figure className="diagram"><Body /><figcaption>{caption}</figcaption></figure>;
}
