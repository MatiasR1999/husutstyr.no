import type {DiagramKey} from '@/lib/domain/diagrams';

// Diagrams are inline SVG rather than image files so they inherit the page's own colours. A raster would
// need one palette baked in, and no single tone clears 4.5:1 against both the light and the dark ground.
const ink='var(--color-ink)', muted='var(--color-muted)', line='var(--color-border)', accent='var(--color-accent)';
// Data sits in neutral ink; the accent is red and marks the one thing the diagram is arguing, the way a
// newspaper graphic does. Filling every bar red would read as a warning on all of them.
const fill=ink, fillOpacity=0.16, fillStrong=0.34;
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
   <rect x={0} y={62+132-h(outRh)} width={54} height={h(outRh)} fill={fill} opacity={fillOpacity}/>
   <text x={27} y={62+132-h(outRh)-7} textAnchor="middle" style={value}>{outRh}%</text>
   <path d="M64 128 h30" stroke={muted} strokeWidth={1.5} fill="none" markerEnd="url(#arrow)"/>
   <text x={79} y={118} textAnchor="middle" style={{...label,fontSize:11}}>varmes</text>
   <text x={112} y={54} style={label}>Inne 21 °C</text>
   <rect x={104} y={62} width={54} height={132} fill="none" stroke={line}/>
   <rect x={104} y={62+132-h(inRh)} width={54} height={h(inRh)} fill={fill} opacity={fillStrong}/>
   <text x={131} y={62+132-h(inRh)-7} textAnchor="middle" style={value}>{inRh}%</text>
   <text x={0} y={224} style={{...label,fontSize:11}}>VANN I LUFTA — UENDRET AV OPPVARMINGEN</text>
   <rect x={0} y={232} width={240} height={14} fill="none" stroke={line}/>
   <rect x={0} y={232} width={Math.round(gram/15*240)} height={14} fill={fill} opacity={fillStrong}/>
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
   <rect x={0} y={34} width={210} height={26} fill={glow==='panne'?accent:'none'} opacity={glow==='panne'?0.35:1} stroke={line}/>
   <text x={220} y={52} style={label}>Panne</text>
   <rect x={0} y={66} width={210} height={16} fill="none" stroke={line}/>
   <text x={220} y={79} style={label}>Glass</text>
   <rect x={0} y={88} width={210} height={26} fill={glow==='element'?accent:'none'} opacity={glow==='element'?0.35:1} stroke={line}/>
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
   <rect x={200} y={y-11} width={Math.round(r.lagring*1.8)} height={16} fill={fill} opacity={fillStrong}/>
   <rect x={420} y={y-11} width={180} height={16} fill="none" stroke={line}/>
   <rect x={420} y={y-11} width={Math.round(r.respons*1.8)} height={16} fill={fill} opacity={fillStrong}/>
  </g>;})}
  <text x={0} y={228} style={{...label,fontSize:12}}>Egenskapene trekker mot hverandre: masse som holder på varme, kan ikke også slippe den raskt.</text>
 </Frame>;
}


function Arrow({id}:{id:string}) {
 return <defs><marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
  <path d="M0 0 L10 5 L0 10 z" fill={muted}/></marker></defs>;
}

/* Where the air actually comes from, and what stops it. */
function Ventilasjonstyper() {
 const hus=(x:number,tittel:string,linjer:string[],mek:boolean)=>(
  <g transform={`translate(${x},0)`}>
   <text x={0} y={14} style={{...value,fontSize:14}}>{tittel}</text>
   <path d="M10 46 L150 46 L150 140 L10 140 Z" fill="none" stroke={line} strokeWidth={1.5}/>
   <path d="M0 46 L80 22 L160 46" fill="none" stroke={line} strokeWidth={1.5}/>
   {mek
    ? <><rect x={54} y={80} width={52} height={26} fill={fill} opacity={fillOpacity} stroke={line}/>
        <text x={80} y={97} textAnchor="middle" style={{...label,fontSize:10}}>gjenvinner</text>
        <path d="M172 120 h-58" stroke={muted} strokeWidth={1.6} fill="none" markerEnd="url(#a2)"/>
        <path d="M114 66 h58" stroke={muted} strokeWidth={1.6} fill="none" markerEnd="url(#a2)"/>
        <text x={178} y={124} style={{...label,fontSize:11}}>tilluft</text>
        <text x={178} y={70} style={{...label,fontSize:11}}>fraluft</text></>
    : <><path d="M-14 118 h44" stroke={muted} strokeWidth={1.6} fill="none" markerEnd="url(#a2)"/>
        <text x={-14} y={110} style={{...label,fontSize:11}}>ventiler</text>
        <path d="M132 44 v-22" stroke={muted} strokeWidth={1.6} fill="none" markerEnd="url(#a2)"/>
        <text x={142} y={32} style={{...label,fontSize:11}}>kanal</text></>}
   {linjer.map((t,i)=><text key={t} x={0} y={168+i*19} style={{...label,fontSize:12,fill:i===linjer.length-1&&!mek?accent:muted}}>{t}</text>)}
  </g>);
 return <Frame k="ventilasjonstyper" viewBox="-24 -8 724 236"
  title="Naturlig avtrekk mot balansert ventilasjon"
  desc="To husnitt. Naturlig avtrekk henter tilluft gjennom ventiler og utettheter og slipper den ut gjennom kanal, drevet av temperaturforskjell og vind. Tettes tilluften, stopper luftskiftet. Balansert ventilasjon har mekanisk til- og fraluft med varmegjenvinner, og gir jevnt luftskifte uavhengig av vær.">
  <Arrow id="a2"/>
  {hus(0,'Naturlig avtrekk',['Drives av temperaturforskjell og vind.','Virker best når det er kaldt og blåser.','Tettes tilluften, stopper luftskiftet.'],false)}
  {hus(400,'Balansert',['Mekanisk til- og fraluft.','Varmen gjenvinnes fra fraluften.','Jevnt luftskifte uavhengig av vær.'],true)}
 </Frame>;
}

/* Cleaning chemistry follows pH, not the room it is sold for. */
function VaskemiddelPh() {
 const X=(ph:number)=>Math.round(ph/14*620);
 const kol=[
  {tittel:'SURT',loser:'Løser kalk og såperester',hjemme:'Bad, vannkoker',skade:'Matter naturstein permanent'},
  {tittel:'NØYTRALT',loser:'Trygt på nesten alt',hjemme:'Daglig renhold',skade:''},
  {tittel:'ALKALISK',loser:'Løser fett og organisk smuss',hjemme:'Kjøkken, ovn',skade:'Matter aluminium'},
 ];
 const soner=[[0,6],[6.4,7.6],[8,14]] as const;
 return <Frame k="vaskemiddel-ph" viewBox="-30 -8 706 250"
  title="pH avgjør hva middelet kan brukes på"
  desc="En pH-skala fra 0 til 14. Sure midler under pH 6 løser kalk og såperester og hører hjemme på bad og i vannkokere, men matter naturstein permanent. Nøytrale midler rundt pH 7 er trygge på nesten alt og tilsvarende svakere. Alkaliske midler over pH 8 løser fett og organisk smuss og hører hjemme på kjøkken og i ovn, men matter aluminium. Klorholdige midler blandet med sure midler avgir klorgass.">
  {soner.map(([fra,til],i)=><g key={i}>
   <rect x={X(fra)} y={22} width={X(til)-X(fra)} height={26} fill={fill} opacity={fillOpacity} stroke={line}/>
   <text x={X(fra)+4} y={16} style={{...label,fontSize:11}}>{kol[i]!.tittel}</text>
  </g>)}
  <line x1={0} y1={54} x2={620} y2={54} stroke={line}/>
  {[0,7,14].map(t=><text key={t} x={X(t)} y={70} textAnchor={t===0?'start':t===14?'end':'middle'} style={{...label,fontSize:11}}>pH {t}</text>)}
  {kol.map((k,i)=><g key={k.tittel} transform={`translate(${i*212},0)`}>
   <text x={0} y={104} style={{...value,fontSize:13}}>{k.loser}</text>
   <text x={0} y={124} style={{...label,fontSize:12}}>{k.hjemme}</text>
   {k.skade&&<text x={0} y={146} style={{...label,fontSize:12,fill:accent}}>{k.skade}</text>}
  </g>)}
  <rect x={0} y={176} width={620} height={30} fill={accent} opacity={0.1} stroke={accent}/>
  <text x={12} y={195} style={{...value,fontSize:13,fill:accent}}>Klor + surt gir klorgass. Bland aldri, og aller minst på bad.</text>
 </Frame>;
}

/* The class describes the filter; the machine decides whether the air goes through it. */
function FilterForbigang() {
 return <Frame k="filter-forbigang" viewBox="-8 -8 660 214"
  title="Luft som går utenom filteret"
  desc="Et snitt gjennom en maskin. Mesteparten av luften går gjennom filteret og kommer ut renset. Er maskinen utett, går en del av luften rundt filteret i stedet for gjennom det, og finstøv slipper ut igjen uansett hvor god filterklassen er. Klassifiseringen beskriver filteret, ikke maskinen rundt det.">
  <Arrow id="a3"/>
  <rect x={90} y={30} width={380} height={120} fill="none" stroke={line} strokeWidth={1.5}/>
  <text x={90} y={22} style={{...label,fontSize:11}}>MASKINEN</text>
  <rect x={250} y={52} width={40} height={76} fill={fill} opacity={fillOpacity} stroke={line}/>
  <text x={270} y={144} textAnchor="middle" style={{...label,fontSize:11}}>filter</text>
  <path d="M20 90 h224" stroke={muted} strokeWidth={2} fill="none" markerEnd="url(#a3)"/>
  <path d="M296 90 h240" stroke={muted} strokeWidth={2} fill="none" markerEnd="url(#a3)"/>
  <text x={20} y={80} style={{...label,fontSize:12}}>skitten luft inn</text>
  <text x={430} y={80} style={{...label,fontSize:12}}>ren luft ut</text>
  <path d="M232 90 C 244 44, 296 44, 310 90" stroke={accent} strokeWidth={2} fill="none" strokeDasharray="4 3" markerEnd="url(#a3)"/>
  <text x={196} y={40} style={{...value,fontSize:12,fill:accent}}>lekkasje forbi filteret</text>
  <text x={0} y={182} style={{...label,fontSize:12}}>Klassen beskriver filteret. Den sier ingenting om hvor tett maskinen rundt det er.</text>
 </Frame>;
}

/* Temperature does two things at once, and they pull opposite ways. */
function VasketemperaturAvveining() {
 const X=(c:number)=>Math.round((c-20)/70*560);
 const merker=[[30,'Blod og egg'],[40,'Farget tøy'],[60,'Fett og svette'],[90,'Ved sykdom']] as const;
 return <Frame k="vasketemperatur-avveining" viewBox="-34 -8 700 262"
  title="Hva temperaturen løser og hva den koster"
  desc="En temperaturakse fra 20 til 90 grader. Evnen til å løse fett og redusere mikroorganismer stiger med temperaturen. Det gjør også slitasjen: farger blekner, fibre krymper og elastan mister spenst. Blod og egg vaskes kaldt fordi varme koagulerer proteinet, farget tøy så kaldt som mulig, fett og svette varmt, og høy temperatur er for hygiene ved sykdom. Lang tid ved lav temperatur gir ofte samme resultat som kort tid ved høy.">
  <polyline points={`${X(20)},128 ${X(40)},104 ${X(60)},64 ${X(90)},34`} fill="none" stroke={ink} strokeWidth={2}/>
  <text x={X(90)} y={22} textAnchor="end" style={{...value,fontSize:12}}>Løser fett og mikroorganismer</text>
  <polyline points={`${X(20)},134 ${X(40)},126 ${X(60)},98 ${X(90)},52`} fill="none" stroke={accent} strokeWidth={2} strokeDasharray="5 4"/>
  <text x={X(90)} y={100} textAnchor="end" style={{...value,fontSize:12,fill:accent}}>Slitasje på farge og fibre</text>
  <line x1={0} y1={150} x2={560} y2={150} stroke={line}/>
  {[20,40,60,90].map(c=><g key={c}><line x1={X(c)} y1={150} x2={X(c)} y2={156} stroke={line}/>
   <text x={X(c)} y={170} textAnchor="middle" style={{...label,fontSize:11}}>{c} °C</text></g>)}
  {merker.map(([c,t],i)=><text key={t} x={X(c as number)} y={192+(i%2)*18} textAnchor="middle" style={{...label,fontSize:12}}>{t}</text>)}
  <text x={0} y={238} style={{...label,fontSize:12}}>Tid kan erstatte temperatur: lange program kaldt gir ofte samme resultat som korte varmt.</text>
 </Frame>;
}

/* The shelf rating assumes the fixing holds. The wall decides. */
function HylleInnfesting() {
 const rader=[
  {vegg:'Gips alene',evne:8,note:'Plugger for hulrom. Lite vekt.',fare:true},
  {vegg:'Gips med treff i stender',evne:78,note:'Skru i stenderen, ikke i platen.',fare:false},
  {vegg:'Betong og tegl',evne:92,note:'Krever slagbor og riktig plugg.',fare:false},
  {vegg:'Trepanel',evne:12,note:'Kledning. Skru i bindingsverket bak.',fare:true},
 ];
 return <Frame k="hylle-innfesting" viewBox="-8 -8 716 250"
  title="Det er veggen som setter grensen"
  desc="Fire veggtyper sammenlignet. Gipsplate alene bærer svært lite og trepanel er kledning som ikke er ment å bære; i begge tilfeller må festet treffe bindingsverket bak. Gips med treff i stender og betong eller tegl bærer mye, forutsatt riktig plugg. En hylle belastes dessuten dynamisk: å dra en tung eske ut gir et rykk større enn den statiske vekten.">
  <text x={0} y={12} style={{...label,fontSize:11}}>HVA INNFESTINGEN TÅLER</text>
  {rader.map((r,i)=>{const y=40+i*44;return <g key={r.vegg}>
   <text x={0} y={y+4} style={{...value,fontSize:13,fill:r.fare?accent:ink}}>{r.vegg}</text>
   <rect x={210} y={y-10} width={180} height={15} fill="none" stroke={line}/>
   <rect x={210} y={y-10} width={Math.round(r.evne*1.8)} height={15} fill={r.fare?accent:fill} opacity={r.fare?0.35:fillStrong}/>
   <text x={402} y={y+3} style={{...label,fontSize:12}}>{r.note}</text>
  </g>;})}
  <text x={0} y={228} style={{...label,fontSize:12}}>Regn med rykk, ikke bare vekt: å dra en tung eske ut belaster festet mer enn esken veier.</text>
 </Frame>;
}

/* Both dry the same clothes; the difference is where the heat goes afterwards. */
function TrommelVarmevei() {
 const boks=(x:number,tittel:string,linjer:string[],gjenvinn:boolean)=>(
  <g transform={`translate(${x},0)`}>
   <text x={0} y={14} style={{...value,fontSize:14}}>{tittel}</text>
   <rect x={0} y={34} width={210} height={84} fill="none" stroke={line} strokeWidth={1.5}/>
   <text x={105} y={80} textAnchor="middle" style={{...label,fontSize:12}}>tøy</text>
   {gjenvinn
    ? <><path d="M210 60 C 250 60, 250 106, 210 106" stroke={muted} strokeWidth={1.8} fill="none" markerEnd="url(#a4)"/>
        <text x={238} y={140} textAnchor="middle" style={{...label,fontSize:11}}>varmen gjenbrukes</text></>
    : <><path d="M232 60 h44" stroke={accent} strokeWidth={1.8} fill="none" markerEnd="url(#a4)"/>
        <text x={224} y={50} style={{...label,fontSize:11,fill:accent}}>varme ut i rommet</text></>}
   {linjer.map((t,i)=><text key={t} x={0} y={162+i*19} style={{...label,fontSize:12}}>{t}</text>)}
  </g>);
 return <Frame k="trommel-varmevei" viewBox="-8 -8 716 244"
  title="Hvor varmen tar veien"
  desc="To tørketromler. Kondenstrommel varmer luften kraftig, feller ut vannet ved nedkjøling og avgir varmen til rommet den står i. Varmepumpetrommel gjenbruker varmen i et kretsløp og tørker ved lavere temperatur, bruker vesentlig mindre strøm og er skånsommere mot tekstilene, men bruker lengre tid.">
  <Arrow id="a4"/>
  {boks(0,'Kondens',['Høy temperatur, rask syklus.','Mer strøm, mer slitasje på fibrene.','Varmer opp rommet den står i.'],false)}
  {boks(390,'Varmepumpe',['Lavere temperatur, lengre syklus.','Vesentlig mindre strøm, skånsommere.','Avgir lite varme til rommet.'],true)}
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
