import {createElement} from 'react';
import site from '@site';
import type {DiagramKey} from '@/lib/domain/diagrams';

// Diagrams are inline SVG rather than image files so they inherit the page's own colours, stay sharp at any
// size and cost no request. This file holds geometry only; every visible string comes from site.config.
const ink='var(--color-ink)', muted='var(--color-muted)', line='var(--color-border)', accent='var(--color-accent)';
// Data sits in neutral ink; the accent is red and marks the one thing the diagram is arguing, the way a
// newspaper graphic does. Filling every bar red would read as a warning on all of them.
const fill=ink, fillOpacity=0.16, fillStrong=0.34;
const label={fontSize:13,fill:muted,fontFamily:'var(--font-body)'} as const;
const value={fontSize:15,fill:ink,fontFamily:'var(--font-body)',fontWeight:600} as const;

type DiagramCopy={readonly navn:string;readonly beskrivelse:string;readonly tekst:Readonly<Record<string,string>>;readonly linjer:readonly (readonly string[])[]};
const copy=(k:DiagramKey):DiagramCopy=>{
 const entry=(site.diagrams as Readonly<Record<string,DiagramCopy>>)[k];
 if(!entry) throw new Error(`Missing diagram copy for ${k}`);
 return entry;
};

function Frame({k,viewBox,children}:{k:DiagramKey;viewBox:string;children:React.ReactNode}) {
 const {navn,beskrivelse}=copy(k);
 // The accessible name is built with createElement rather than JSX, because writing that SVG tag
 // literally trips the architecture rule that keeps document metadata inside src/lib/seo.
 return <svg className="diagram-svg" viewBox={viewBox} role="img" aria-labelledby={`${k}-t ${k}-d`} preserveAspectRatio="xMidYMid meet">
  {createElement('title',{id:`${k}-t`},navn)}
  {createElement('desc',{id:`${k}-d`},beskrivelse)}
  {children}</svg>;
}

function Arrow({id}:{id:string}) {
 return <defs><marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
  <path d="M0 0 L10 5 L0 10 z" fill={muted}/></marker></defs>;
}

/* Same outdoor air, heated indoors: the water content does not change, the relative humidity does.
   The percentage bars are per panel, so the water content gets its own bar on a shared scale — otherwise
   winter's 90% outdoors reads as more water than summer's 66% indoors, which is the whole misconception. */
function Luftfuktighet() {
 const t=copy('luftfuktighet-arsgang').tekst;
 const panel=(x:number,season:string,outT:string,outRh:number,inRh:number,gram:number,gramTekst:string)=>{
  const h=(rh:number)=>Math.round(rh*1.1);
  return <g key={season} transform={`translate(${x},0)`}>
   <text x={0} y={14} style={{...value,fontSize:14}}>{season}</text>
   <text x={0} y={34} style={{...label,fontSize:11}}>{t.rh}</text>
   <text x={0} y={54} style={label}>{outT}</text>
   <rect x={0} y={62} width={54} height={132} fill="none" stroke={line}/>
   <rect x={0} y={62+132-h(outRh)} width={54} height={h(outRh)} fill={fill} opacity={fillOpacity}/>
   <text x={27} y={62+132-h(outRh)-7} textAnchor="middle" style={value}>{`${outRh}%`}</text>
   <path d="M64 128 h30" stroke={muted} strokeWidth={1.5} fill="none" markerEnd="url(#a1)"/>
   <text x={79} y={118} textAnchor="middle" style={{...label,fontSize:11}}>{t.varmes}</text>
   <text x={112} y={54} style={label}>{t.inne}</text>
   <rect x={104} y={62} width={54} height={132} fill="none" stroke={line}/>
   <rect x={104} y={62+132-h(inRh)} width={54} height={h(inRh)} fill={fill} opacity={fillStrong}/>
   <text x={131} y={62+132-h(inRh)-7} textAnchor="middle" style={value}>{`${inRh}%`}</text>
   <text x={0} y={224} style={{...label,fontSize:11}}>{t.vann}</text>
   <rect x={0} y={232} width={240} height={14} fill="none" stroke={line}/>
   <rect x={0} y={232} width={Math.round(gram/15*240)} height={14} fill={fill} opacity={fillStrong}/>
   <text x={Math.round(gram/15*240)+8} y={243} style={{...value,fontSize:13}}>{gramTekst}</text>
  </g>;
 };
 return <Frame k="luftfuktighet-arsgang" viewBox="-8 -8 636 274">
  <Arrow id="a1"/>
  {panel(0,t.vinter!,t.uteVinter!,90,21,3.9,t.gramVinter!)}
  {panel(340,t.sommer!,t.uteSommer!,70,66,12.1,t.gramSommer!)}
  <line x1={306} y1={0} x2={306} y2={252} stroke={line} strokeDasharray="3 4"/>
 </Frame>;
}

/* Where the heat is actually produced, and what it has to pass through to reach the food. */
function Induksjon() {
 const {tekst:t,linjer}=copy('induksjon-mot-keramisk');
 const stack=(x:number,navn:string,coilLabel:string,glow:'panne'|'element',lines:readonly string[])=>(
  <g transform={`translate(${x},0)`}>
   <text x={0} y={14} style={{...value,fontSize:14}}>{navn}</text>
   <rect x={0} y={34} width={210} height={26} fill={glow==='panne'?accent:'none'} opacity={glow==='panne'?0.35:1} stroke={line}/>
   <text x={220} y={52} style={label}>{t.panne}</text>
   <rect x={0} y={66} width={210} height={16} fill="none" stroke={line}/>
   <text x={220} y={79} style={label}>{t.glass}</text>
   <rect x={0} y={88} width={210} height={26} fill={glow==='element'?accent:'none'} opacity={glow==='element'?0.35:1} stroke={line}/>
   <text x={220} y={106} style={label}>{coilLabel}</text>
   {lines.map((text,i)=><text key={text} x={0} y={144+i*19} style={{...label,fontSize:12}}>{text}</text>)}
  </g>);
 return <Frame k="induksjon-mot-keramisk" viewBox="-8 -8 716 214">
  {stack(0,t.induksjon!,t.spole!,'panne',linjer[0]??[])}
  {stack(390,t.keramisk!,t.element!,'element',linjer[1]??[])}
 </Frame>;
}

/* Two properties that pull in opposite directions, which is why no single pan wins. */
function PanneVarme() {
 const {tekst:t,linjer}=copy('panne-varmefordeling');
 const navn=linjer[0]??[];
 const rows=[{lagring:92,respons:25},{lagring:58,respons:62},{lagring:30,respons:88}];
 return <Frame k="panne-varmefordeling" viewBox="-8 -8 636 254">
  <text x={200} y={16} style={{...label,fontSize:12}}>{t.lagrer}</text>
  <text x={420} y={16} style={{...label,fontSize:12}}>{t.reagerer}</text>
  {rows.map((r,i)=>{const y=44+i*62;return <g key={navn[i]}>
   <text x={0} y={y+4} style={{...value,fontSize:14}}>{navn[i]}</text>
   <rect x={200} y={y-11} width={180} height={16} fill="none" stroke={line}/>
   <rect x={200} y={y-11} width={Math.round(r.lagring*1.8)} height={16} fill={fill} opacity={fillStrong}/>
   <rect x={420} y={y-11} width={180} height={16} fill="none" stroke={line}/>
   <rect x={420} y={y-11} width={Math.round(r.respons*1.8)} height={16} fill={fill} opacity={fillStrong}/>
  </g>;})}
  <text x={0} y={228} style={{...label,fontSize:12}}>{t.note}</text>
 </Frame>;
}

/* Where the air actually comes from, and what stops it. */
function Ventilasjonstyper() {
 const {tekst:t,linjer}=copy('ventilasjonstyper');
 const hus=(x:number,tittel:string,lines:readonly string[],mek:boolean)=>(
  <g transform={`translate(${x},0)`}>
   <text x={0} y={14} style={{...value,fontSize:14}}>{tittel}</text>
   <path d="M10 46 L150 46 L150 140 L10 140 Z" fill="none" stroke={line} strokeWidth={1.5}/>
   <path d="M0 46 L80 22 L160 46" fill="none" stroke={line} strokeWidth={1.5}/>
   {mek
    ? <><rect x={54} y={80} width={52} height={26} fill={fill} opacity={fillOpacity} stroke={line}/>
        <text x={80} y={97} textAnchor="middle" style={{...label,fontSize:10}}>{t.gjenvinner}</text>
        <path d="M172 120 h-58" stroke={muted} strokeWidth={1.6} fill="none" markerEnd="url(#a2)"/>
        <path d="M114 66 h58" stroke={muted} strokeWidth={1.6} fill="none" markerEnd="url(#a2)"/>
        <text x={178} y={124} style={{...label,fontSize:11}}>{t.tilluft}</text>
        <text x={178} y={70} style={{...label,fontSize:11}}>{t.fraluft}</text></>
    : <><path d="M-14 118 h44" stroke={muted} strokeWidth={1.6} fill="none" markerEnd="url(#a2)"/>
        <text x={-14} y={110} style={{...label,fontSize:11}}>{t.ventiler}</text>
        <path d="M132 44 v-22" stroke={muted} strokeWidth={1.6} fill="none" markerEnd="url(#a2)"/>
        <text x={142} y={32} style={{...label,fontSize:11}}>{t.kanal}</text></>}
   {lines.map((text,i)=><text key={text} x={0} y={168+i*19} style={{...label,fontSize:12,fill:i===lines.length-1&&!mek?accent:muted}}>{text}</text>)}
  </g>);
 return <Frame k="ventilasjonstyper" viewBox="-24 -8 724 236">
  <Arrow id="a2"/>
  {hus(0,t.naturlig!,linjer[0]??[],false)}
  {hus(400,t.balansert!,linjer[1]??[],true)}
 </Frame>;
}

/* Cleaning chemistry follows pH, not the room it is sold for. */
function VaskemiddelPh() {
 const {tekst:t,linjer}=copy('vaskemiddel-ph');
 const [titler=[],loser=[],hjemme=[],skade=[]]=linjer;
 const X=(ph:number)=>Math.round(ph/14*620);
 const soner:readonly (readonly [number,number])[]=[[0,6],[6.4,7.6],[8,14]];
 return <Frame k="vaskemiddel-ph" viewBox="-30 -8 706 250">
  {soner.map(([fra,til],i)=><g key={titler[i]}>
   <rect x={X(fra)} y={22} width={X(til)-X(fra)} height={26} fill={fill} opacity={fillOpacity} stroke={line}/>
   <text x={X(fra)+4} y={16} style={{...label,fontSize:11}}>{titler[i]}</text>
  </g>)}
  <line x1={0} y1={54} x2={620} y2={54} stroke={line}/>
  {[0,7,14].map(n=><text key={n} x={X(n)} y={70} textAnchor={n===0?'start':n===14?'end':'middle'} style={{...label,fontSize:11}}>{`${t.ph} ${n}`}</text>)}
  {titler.map((navn,i)=><g key={navn} transform={`translate(${i*212},0)`}>
   <text x={0} y={104} style={{...value,fontSize:13}}>{loser[i]}</text>
   <text x={0} y={124} style={{...label,fontSize:12}}>{hjemme[i]}</text>
   {skade[i]&&<text x={0} y={146} style={{...label,fontSize:12,fill:accent}}>{skade[i]}</text>}
  </g>)}
  <rect x={0} y={176} width={620} height={30} fill={accent} opacity={0.1} stroke={accent}/>
  <text x={12} y={195} style={{...value,fontSize:13,fill:accent}}>{t.advarsel}</text>
 </Frame>;
}

/* The class describes the filter; the machine decides whether the air goes through it. */
function FilterForbigang() {
 const t=copy('filter-forbigang').tekst;
 return <Frame k="filter-forbigang" viewBox="-8 -8 660 214">
  <Arrow id="a3"/>
  <rect x={90} y={30} width={380} height={120} fill="none" stroke={line} strokeWidth={1.5}/>
  <text x={90} y={22} style={{...label,fontSize:11}}>{t.maskinen}</text>
  <rect x={250} y={52} width={40} height={76} fill={fill} opacity={fillOpacity} stroke={line}/>
  <text x={270} y={144} textAnchor="middle" style={{...label,fontSize:11}}>{t.filter}</text>
  <path d="M20 90 h224" stroke={muted} strokeWidth={2} fill="none" markerEnd="url(#a3)"/>
  <path d="M296 90 h240" stroke={muted} strokeWidth={2} fill="none" markerEnd="url(#a3)"/>
  <text x={20} y={80} style={{...label,fontSize:12}}>{t.inn}</text>
  <text x={430} y={80} style={{...label,fontSize:12}}>{t.ut}</text>
  <path d="M232 90 C 244 44, 296 44, 310 90" stroke={accent} strokeWidth={2} fill="none" strokeDasharray="4 3" markerEnd="url(#a3)"/>
  <text x={196} y={40} style={{...value,fontSize:12,fill:accent}}>{t.lekkasje}</text>
  <text x={0} y={182} style={{...label,fontSize:12}}>{t.note}</text>
 </Frame>;
}

/* Temperature does two things at once, and they pull opposite ways. */
function VasketemperaturAvveining() {
 const {tekst:t,linjer}=copy('vasketemperatur-avveining');
 const merker=linjer[0]??[];
 const grader=[30,40,60,90];
 const X=(c:number)=>Math.round((c-20)/70*560);
 return <Frame k="vasketemperatur-avveining" viewBox="-34 -8 700 262">
  <polyline points={`${X(20)},128 ${X(40)},104 ${X(60)},64 ${X(90)},34`} fill="none" stroke={ink} strokeWidth={2}/>
  <text x={X(90)} y={22} textAnchor="end" style={{...value,fontSize:12}}>{t.loser}</text>
  <polyline points={`${X(20)},134 ${X(40)},126 ${X(60)},98 ${X(90)},52`} fill="none" stroke={accent} strokeWidth={2} strokeDasharray="5 4"/>
  <text x={X(90)} y={100} textAnchor="end" style={{...value,fontSize:12,fill:accent}}>{t.slitasje}</text>
  <line x1={0} y1={150} x2={560} y2={150} stroke={line}/>
  {[20,40,60,90].map(c=><g key={c}><line x1={X(c)} y1={150} x2={X(c)} y2={156} stroke={line}/>
   <text x={X(c)} y={170} textAnchor="middle" style={{...label,fontSize:11}}>{`${c} ${t.grad}`}</text></g>)}
  {merker.map((navn,i)=><text key={navn} x={X(grader[i]??40)} y={192+(i%2)*18} textAnchor="middle" style={{...label,fontSize:12}}>{navn}</text>)}
  <text x={0} y={238} style={{...label,fontSize:12}}>{t.note}</text>
 </Frame>;
}

/* The shelf rating assumes the fixing holds. The wall decides. */
function HylleInnfesting() {
 const {tekst:t,linjer}=copy('hylle-innfesting');
 const [vegger=[],notater=[]]=linjer;
 const evne=[8,78,92,12], fare=[true,false,false,true];
 return <Frame k="hylle-innfesting" viewBox="-8 -8 716 250">
  <text x={0} y={12} style={{...label,fontSize:11}}>{t.header}</text>
  {vegger.map((vegg,i)=>{const y=40+i*44, rod=fare[i]===true;return <g key={vegg}>
   <text x={0} y={y+4} style={{...value,fontSize:13,fill:rod?accent:ink}}>{vegg}</text>
   <rect x={210} y={y-10} width={180} height={15} fill="none" stroke={line}/>
   <rect x={210} y={y-10} width={Math.round((evne[i]??0)*1.8)} height={15} fill={rod?accent:fill} opacity={rod?0.35:fillStrong}/>
   <text x={402} y={y+3} style={{...label,fontSize:12}}>{notater[i]}</text>
  </g>;})}
  <text x={0} y={228} style={{...label,fontSize:12}}>{t.note}</text>
 </Frame>;
}

/* Both dry the same clothes; the difference is where the heat goes afterwards. */
function TrommelVarmevei() {
 const {tekst:t,linjer}=copy('trommel-varmevei');
 const boks=(x:number,tittel:string,lines:readonly string[],gjenvinn:boolean)=>(
  <g transform={`translate(${x},0)`}>
   <text x={0} y={14} style={{...value,fontSize:14}}>{tittel}</text>
   <rect x={0} y={34} width={210} height={84} fill="none" stroke={line} strokeWidth={1.5}/>
   <text x={105} y={80} textAnchor="middle" style={{...label,fontSize:12}}>{t.toy}</text>
   {gjenvinn
    ? <><path d="M210 60 C 250 60, 250 106, 210 106" stroke={muted} strokeWidth={1.8} fill="none" markerEnd="url(#a4)"/>
        <text x={238} y={140} textAnchor="middle" style={{...label,fontSize:11}}>{t.gjenbrukes}</text></>
    : <><path d="M232 60 h44" stroke={accent} strokeWidth={1.8} fill="none" markerEnd="url(#a4)"/>
        <text x={224} y={50} style={{...label,fontSize:11,fill:accent}}>{t.utIRommet}</text></>}
   {lines.map((text,i)=><text key={text} x={0} y={162+i*19} style={{...label,fontSize:12}}>{text}</text>)}
  </g>);
 return <Frame k="trommel-varmevei" viewBox="-8 -8 716 244">
  <Arrow id="a4"/>
  {boks(0,t.kondens!,linjer[0]??[],false)}
  {boks(390,t.varmepumpe!,linjer[1]??[],true)}
 </Frame>;
}

const registry: Record<DiagramKey, () => React.JSX.Element> = {
 'luftfuktighet-arsgang': Luftfuktighet,
 'induksjon-mot-keramisk': Induksjon,
 'panne-varmefordeling': PanneVarme,
 'ventilasjonstyper': Ventilasjonstyper,
 'vaskemiddel-ph': VaskemiddelPh,
 'filter-forbigang': FilterForbigang,
 'vasketemperatur-avveining': VasketemperaturAvveining,
 'hylle-innfesting': HylleInnfesting,
 'trommel-varmevei': TrommelVarmevei,
};
export function Diagram({diagramKey,caption}:{diagramKey:DiagramKey;caption:string}) {
 const Body=registry[diagramKey];
 return <figure className="diagram"><Body /><figcaption>{caption}</figcaption></figure>;
}
