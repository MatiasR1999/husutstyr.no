# SEO-SITE-TEMPLATE: KRAVSPESIFIKASJON

Dokumentversjon: 1.0, 2026-09-07.
Status: Beslutning 1-6 er godkjent eller delegert; beslutning 7 er godkjent 2026-09-08; beslutning 8 er godkjent 2026-09-08.
Fase 1-unntak: Brukeren godkjente 140000 gzip-bytes som JS-grense med svaret godkjenner alt den 2026-09-07.
Fase 4-unntak: Brukeren godkjente 145000 gzip-bytes kun for fase 4 med svaret godkjent den 2026-09-08.
Omfang: Gjenbrukbar mal for omtrent 50 selvstendige norske innholdssider innen bolig, hus og bil.
Dette dokumentet erstatter ikke den tidligere husutstyr-spesifikasjonen; det definerer den generiske malen som senere kan brukes til husutstyr.no.
Alle krav med ID er obligatoriske innen ferdig mal 1 med mindre en aapen beslutning eksplisitt avklarer to motstridende krav.
Linjer merket VEDTAK er godkjent; gjenvaerende ANBEFALING-linjer er fortsatt forslag.
Rapporter og dokumentasjon skal vaere ASCII med en fakta eller ett krav per linje.
Norsk produksjonsinnhold skal fortsatt stoette UTF-8 og norske bokstaver; ASCII-kravet gjelder rapportene.

## 0. LAASTE VALG OG ARBEIDSREGLER

L01: Rammeverket skal vaere Next.js 16.x med App Router og Server Components som standard.
L02: TypeScript skal kjoeres med strict og uten any i domene-, SEO- eller schema-kode.
L03: Innhold skal lagres i Neon Postgres og aksesseres gjennom Drizzle ORM.
L04: Drizzle Kit skal brukes til versjonerte og etterproevbare migrasjoner.
L05: Hosting skal vaere Vercel med ISR og on-demand revalidering via cache tags.
L06: Tailwind skal bruke CSS-variabler for alle designverdier fra en token-fil per nettsted.
L07: Malen skal ikke integrere et headless CMS.
L08: Norsk skal ikke ha locale-prefiks; rutingen skal vaere forberedt for [locale].
L09: All SEO-logikk skal ligge i src/lib/seo/ og importeres av rutene.
L10: Alle sidespesifikke innstillinger skal defineres i site.config.ts.
L11: Domener, merkenavn, farger og sidespesifikke tekster skal ikke hardkodes i komponenter.
L12: Konflikten mellom L06 og den bokstavelige tolkningen av L10-L11 maa avklares i beslutning 1.
L13: Hvert use client-direktiv skal ha en kodekommentar rett over som forklarer det konkrete behovet for klientkjoering.
L14: Avvik fra godkjent spec skal foeres i docs/build-log.md med krav-ID og begrunnelse.
L15: Nye valg uten dekning i godkjent spec skal stoppe den avhengige implementasjonen og legges frem for brukeren.
L16: Brukeren godkjente uttrykkelig foerste commit og push til MatiasR1999/husutstyr.no 2026-09-08; dette erstatter det tidligere forbudet for denne opplastingen.
L17: Git-initialisering og origin paa main er opprettet etter brukerens bestilling koble det opp 2026-09-08; ingen historikk skal overskrives.
L18: Ingen offentlig utrulling eller domeneendring inngaar i dokumentasjonsleveransen eller fase 1.
L19: Package manager er npm, siden verifikasjonskontrakten krever npm-kommandoer.
L20: En vedlikeholdt 16.x-patch og kompatible dependency-versjoner skal kontrolleres ved implementasjonsstart og laases i package-lock.json.

## A. INFORMASJONSARKITEKTUR OG URL

A01: Artikler skal ha URL /[kategori]/[slug] uten dato eller database-ID.
A02: Anmeldelser skal ha URL /anmeldelser/[slug] og skal ikke samtidig publiseres paa en alternativ kategoribasert URL.
A03: En artikkels kategori og slug skal valideres samlet slik at feil kategori ikke gir en duplikatartikkel med status 200.
A04: Slugs skal inneholde bare smaa ASCII-bokstaver, eventuelle tall som del av tittelen, og enkeltstaaende bindestreker.
A05: U+00E6 og U+00C6 skal translittereres til ae; U+00F8 og U+00D8 til o; U+00E5 og U+00C5 til a.
A06: Normaliseringen skal fjerne ytre mellomrom, normalisere Unicode og komprimere skilletegn uten aapne bindestreker i starten eller slutten.
A07: Den samme innstrengen skal alltid gi samme base-slug, uavhengig av maskinens locale.
A08: Kollisjoner skal loeses med suffiks under en unik DB-constraint; valg av startverdi og maksimal lengde staar i beslutning 2.
A09: Tester skal dekke store og smaa norske bokstaver, dekomponert Unicode, tegnsetting, tomt resultat og samtidige kollisjoner.
A10: Trailing-slash-policy skal vaere konsekvent og haandheves med HTTP 301 i request-laget; retningen staar i beslutning 2.
A11: Hver kategori skal ha en pillar-side som lenker til alle publiserte clusterartikler i kategorien med vanlige href-lenker.
A12: Hver clusterartikkel skal ha en synlig lenke tilbake til sin pillar-side.
A13: En crawler basert paa faktiske HTML-lenker skal finne alle publiserte artikler med hoeyest tre klikk fra forsiden.
A14: Paginering skal ha selvrefererende canonical og egen title og description paa hver gyldig side.
A15: Paginering fra side 2 og utover skal vaere index,follow og skal ikke bruke rel=next eller rel=prev.
A16: Ugyldig, negativ eller ikke-eksisterende sidenummer skal ikke produsere en tom indekserbar side.
A17: Tagg- og emnesider skal bare vaere indekserbare naar de har minst config.minTopicArticles publiserte artikler; standardverdien er 5.
A18: Tagg- og emnesider under terskelen skal returnere noindex,follow og utelates fra sitemap.
A19: Alle filter- og sorteringsvarianter skal ha noindex,follow uansett om grunnruten ellers er indekserbar.
A20: Canonical for facet-varianter maa avklares mot kravet om alltid selvrefererende canonical i beslutning 2.
A21: Alle offentlige HTML-undersider skal vise broedsmuler med samsvarende BreadcrumbList.
A22: API-responser, redirect-responser, XML-feeder og selve 404/410-feilresponsen er ikke innholdssider som krever BreadcrumbList.
A23: Reserverte ruter som anmeldelser, api, go og tillitssider skal ikke kunne opprettes som kolliderende kategorier.

## B. RENDRING, CACHE OG YTELSE

B01: Artikkelens broedtekst skal finnes som vanlig synlig HTML i foerste serverrespons og ikke bare som tekst i RSC-script eller JSON-LD.
B02: Artikkelbroedteksten skal ikke ligge bak en Suspense-grense eller en loading.tsx-grense som sender et skall foer teksten.
B03: Indekserbart hovedinnhold skal ikke lastes inn med useEffect eller annen klientbasert datahenting.
B04: HTML-kontrakten skal testes med curl mot next start etter et faktisk produksjonsbygg.
B05: LCP-budsjettet er maksimalt 2.0 sekunder.
B06: INP-budsjettet er maksimalt 200 millisekunder.
B07: CLS-budsjettet er maksimalt 0.1.
B08: TTFB-budsjettet er maksimalt 600 millisekunder.
B09: Initial JavaScript paa artikkelruten skal vaere maksimalt 165000 gzip-bytes; noyaktig maaleavgrensning staar i beslutning 6.
B09.1: Fase 1 hadde et godkjent unntak paa 140000 gzip-bytes; dette historiske unntaket er adskilt fra det senere sluttvedtaket i beslutning 6.
B09.2: Bare fase 4 har et eget godkjent unntak paa 145000 gzip-bytes; dette utvider ikke unntaket til senere faser eller ferdig mal.
B10: CI skal feile naar et verifiserbart labbudsjett overskrides under den godkjente maaleprofilen.
B11: INP fra reelle besoek og labmaaling av utvalgte interaksjoner skal rapporteres separat; manglende feltdata skal aldri rapporteres som bestaatt.
B12: Googles Core Web Vitals bruker feltdata ved 75. persentil og grupper av lignende brukeropplevelser; relevante Search Console-maalinger dekker de siste 28 dagene.
B13: En ytelsesfeil i en felles mal kan forplante seg til alle de omtrent 50 nettstedene som bruker den samme implementasjonen.
B14: Dette betyr ikke at Google beregner en felles CWV-score paa tvers av alle 50 domener eller at alle vil faa identiske resultater.
B15: Kilde for B12-B14: [Google Core Web Vitals](https://support.google.com/webmasters/answer/9205520?hl=en).
B16: Vanlige innholdsbilder skal bruke next/image med eksplisitt width, height og sizes.
B17: Bildeoppsettet skal stoette AVIF og WebP, med dimensjoner som reserverer plassen foer lasting.
B18: Bare det faktiske LCP-bildet kan gis priority/preload; valg av Next.js 16-API staar i beslutning 3.
B19: Naar LCP er tekst, skal et annet bilde ikke gis priority bare fordi det er foerste bilde.
B20: next/font skal levere self-hosted skrifter med display swap og bare noedvendige subset.
B21: Artikkelsider skal ha revalidate 3600.
B22: Forside og kategorisider skal ha revalidate 600.
B23: Cachede Drizzle-spoerringer skal ha tags som identifiserer nettsted, locale, innhold og relevante aggregater.
B24: Publisering skal kalle revalidateTag etter vellykket DB-transaksjon for artikkel, kategori/pillar, forside, forfatter, emner, RSS, sitemap og berorte OG-data.
B25: Cache Components og den eldre ISR-modellen skal ikke blandes uten et dokumentert valg; forslag til kompatibel modell staar i beslutning 3.
B26: Revalideringsendepunktet skal autentisere og validere avsender, og klienten skal ikke kunne ugyldiggjoere vilkaarlige tags.
B27: Publiseringsjobben skal vaere idempotent og kunne gjenta cacheoppdatering etter en delvis feil uten aa duplisere publisering.
B28: Tilbaketrekking skal bekreftes mot faktisk respons slik at en stale cache ikke fortsetter aa servere det fjernede innholdet.
B29: Valgt utloepsmodus og akseptert ferskhetsvindu etter publisering staar i beslutning 3.
B30: Tredjepartsscript skal ikke vaere en del av den kritiske rendringsstien.
B31: Eksterne analytics- og consent-script skal bruke next/script med afterInteractive eller senere og i tillegg respektere faktisk samtykke.
B32: Cachefeil og databasefeil skal ikke erstattes med oppdiktede artikler eller tomme sider med HTTP 200.
B33: Kilde for caching: [Next.js revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag).

## C. METADATA

C01: Hver offentlig HTML-rute skal implementere generateMetadata som delegerer til src/lib/seo/.
C02: Layout skal ikke hardkode sidespesifikk metadata eller introdusere en ekstra title/canonical paa underruter.
C03: Tittelmaler for hver sidetype skal ligge i site.config.ts og produsere unike titler paa 50-60 tegn.
C04: Meta description skal vaere unik, 140-160 tegn og registrert redaksjonelt; den skal ikke tas automatisk fra foerste avsnitt.
C05: Lengdekontroll er et prosjektkrav og er ikke en garanti for hvordan Google viser eller omskriver et utdrag.
C06: Canonical skal vaere absolutt og bygges fra en enkelt validert SITE_URL avledet fra site.config.ts.
C07: Host-, forwarded- og preview-headere skal ikke kunne endre produksjonens canonical-opphav.
C08: Hver normal indekserbar side skal ha noeyaktig en selvrefererende canonical; unntak for facet- og feilruter staar i beslutning 2.
C09: Open Graph og Twitter Card skal settes for alle offentlige innholdssider og samsvare med sidens faktiske tittel og beskrivelse.
C10: OG-bilder skal genereres med next/og ImageResponse i 1200x630 og bruke nettstedets tema og sidens tittel.
C11: OG-ruten skal ha tilgang til samme publiserte revisjon som siden og ikke eksponere utkast via URL-parametre.
C12: SEO-tester skal hente OG-bildet, verifisere dimensjonene og bekrefte at lange titler ikke kuttes feil.
C13: Robots-meta og X-Robots-Tag skal bestemmes av en samlet policy i src/lib/seo/.
C14: Norsk locale skal vaere nb uten offentlig prefiks.
C15: Hreflang-infrastruktur skal gi self-referencing nb og x-default til den eksisterende norske siden.
C16: Hreflang skal aldri annonsere en oversettelse som ikke er publisert.
C17: Metadata skal beregnes fra samme innholdsrevisjon som HTML og JSON-LD.
C18: Generiske og vanlige User-Agent-responser skal begge sjekkes for metadata slik at streaming ikke skjuler manglende tags i testen.

## D. STRUCTURED DATA

D01: JSON-LD skal bygges av typede funksjoner i ett samlet modul under src/lib/seo/ og aldri settes sammen som inline JSON-strenger i komponenter.
D02: JSON-LD skal serialiseres sikkert slik at blant annet en avsluttende script-tag i innhold ikke kan bryte ut av elementet.
D03: Artikler skal bruke Article eller NewsArticle etter faktisk innholdstype.
D04: Artikkelgrafen skal inneholde author som Person, datePublished, dateModified og publisher som Organization.
D05: dateModified skal endres bare ved en faktisk endring av publisert innhold, aldri ved deploy, sidevisning eller cachefornyelse.
D06: Anmeldelser skal kunne bruke Review med en synlig og dokumentert Rating og en faktisk, egnet itemReviewed-node.
D07: Malen skal ikke sette Review/Rating paa anmeldelser av egne produkter eller vurderinger redaksjonen har mottatt vederlag for.
D08: D07 er prosjektets strengere publiseringspolicy; den skal ikke omtales som en universell ordrett Google-regel for alle produkttyper.
D09: Ingen aggregerte karakterer skal oppfinnes eller utledes av en enkelt redaksjonell vurdering.
D10: Product skal bare brukes naar det finnes et konkret produkt med dokumentert pris, valuta, kilde og kontrolltidspunkt.
D11: En omtale uten dokumentert pris kan publiseres uten Product/Review-markup; den skal ikke faa oppdiktet pris for aa passere validering.
D12: BreadcrumbList, Organization, WebSite og Person med ekte sameAs-lenker skal brukes der opplysningene faktisk finnes.
D13: Gyldig markup gir ikke garanti for rich results; Organization, WebSite og Person er ogsaa entitetsbeskrivelser.
D14: Malen skal ikke implementere FAQPage, Vehicle Listing, Course Info, Claim Review, Estimated Salary, Book Actions, Learning Video, Special Announcement eller Practice Problem som rich-result-funksjoner.
D15: Google dokumenterer at FAQ rich results sluttet aa vises 2026-05-07 og at review-retningslinjer om falske og uopplyste insentiver ble lagt til 2026-07-24.
D16: Kilde for D15: [Google Search-dokumentasjonens endringslogg](https://developers.google.com/search/updates).
D17: Den ekskluderte listen i D14 er et laast prosjektkrav; hver historisk avviklingsdato skal ikke omtales som separat verifisert uten en kilde.
D18: CI skal validere baade TypeScript-typene og runtime-formen til den faktiske JSON-LD-en hentet fra HTML.
D19: Runtime-kontroll skal sjekke obligatoriske egenskaper, absolutte URL-er, ISO-datoer, rating-grenser og koblinger mellom @id-noder.
D20: Schema.org-validering alene beviser ikke kvalifisering til Googles resultater; launch-QA skal ogsaa vurdere gjeldende Google-krav.
D21: Kilde for review-kvalifisering: [Google Review snippet](https://developers.google.com/search/docs/appearance/structured-data/review-snippet).

## E. INNHOLD, E-E-A-T OG REDAKSJON

E01: Forfattere skal vaere egne DB-entiteter med ekte navn, bio, bilde, ekspertiseomraader og sameAs-lenker.
E02: Hver side skal ha egne forfatterprofiler; faktisk samme person kan beskrives sannferdig paa flere sider uten oppdiktede identiteter.
E03: Foelgende tillitssider er obligatoriske foer offentlig lansering: om oss, kontakt, redaksjonell policy, slik tester og vurderer vi, personvern, cookies og annonsoerinformasjon.
E04: Kontaktinformasjon, eierskap og redaksjonelt ansvar skal vaere reelle og verifiserte.
E05: Publiseringsstatus skal vaere draft, in_review eller published.
E06: Ingenting skal publiseres uten en registrert menneskelig godkjenner i databasen.
E07: Godkjenningen skal referere til noeyaktig revisjon eller innholdshash samt godkjenner-ID og tidspunkt.
E08: En godkjenner skal ha en autentisert og autorisert identitet; et klientinnsendt navn eller en avkrysset boks er ikke bevis paa godkjenning.
E09: Endring av en godkjent revisjon skal kreve ny godkjenning foer den nye revisjonen kan publiseres.
E10: Offentlig lesing skal bruke en eksplisitt publishedRevisionId slik at et nytt utkast ikke overskriver allerede publisert innhold.
E11: original_research skal kunne dokumentere egne tester, egne tall og egne bilder med kilder/filer, metode, ansvarlig og dato.
E12: QA skal rapportere antall publiserte artikler, antall med godkjent original_research og andelen mellom dem.
E13: Tom publiseringsmengde skal rapporteres som ikke beregnbar andel, ikke som 0 prosent eller 100 prosent.
E14: Bare publiserte revisjoner med reell dokumentasjon teller som original_research; et tomt felt eller en boolsk markering alene teller ikke.
E15: Sist oppdatert skal bare vises naar dateModified faktisk er nyere enn datePublished.
E16: Oppdiktede tester, forfattere, ratings, priser og ekspertpaastander er ikke tillatt.
E17: Sideunik tekst skal ha en konkret TODO-markoer i malen frem til den er skrevet og godkjent.
E18: Offentlig launch-validering skal avvise obligatoriske TODO-markoerer og testdata.
E19: Spraak, kilder, rettigheter, originalitet og konkret lesernytte skal inngaa i redaksjonens vurdering.
E20: Tillitssider skal lagres i Postgres som innhold, ikke hardkodes som lange tekster i React-komponenter; presis grense mot config staar i beslutning 1.

## F. AFFILIATE OG NORSK COMPLIANCE

F01: Alle affiliatelenker skal gaa via /go/[slug] og gi HTTP 302 til en forhandsregistrert destinasjon.
F02: /go/ skal disallowes i robots.txt, og redirect-responsen skal ha X-Robots-Tag: noindex.
F03: Robots-blokkering kan hindre en crawler i aa se en noindex-header; de to tiltakene skal ikke omtales som en garanti for fjerning av tidligere indekserte URL-er.
F04: Alle kommersielle lenkekomponenter, inkludert lenken til intern /go/, skal sette rel="sponsored nofollow noopener".
F05: Redirect-destinasjonen skal slaas opp fra DB og valideres mot tillatte http/https-maal, slik at query-parametre ikke lager en aapen redirect.
F06: Ukjent /go/-slug skal gi 404 og ikke redirecte til forsiden.
F07: Sider med affiliateinnhold eller annen reklame skal automatisk vise tydelig annonsemerking foer kommersielt innhold og innen foerste skjermbilde ved avtalte testbredder.
F08: Annonsemerkingen skal vaere et obligatorisk komponentkrav avledet fra innholdsmodellen og skal ikke kunne glemmes av redaktoeren.
F09: Merkingen skal bruke et klart norsk reklamebegrep fra nettstedets konfigurasjon og forklare relevant kommersiell tilknytning.
F10: Henvisninger til egne nettbutikker skal ha sannferdig eierskaps-/reklamemerking der innholdet er kommersielt.
F11: Kilde for tydelig reklamemerking og annonselenker: [Forbrukertilsynets veileder](https://www.forbrukertilsynet.no/wp-content/uploads/2017/12/Forbrukertilsynets-veileder-om-merking-av-reklame-i-sosiale-medier.pdf).
F12: Ingen analyse- eller markedsfoeringscookies skal settes foer gyldig samtykke.
F13: Samtykkegrensesnittet skal ha tilgjengelige valg for avvisning, aksept og tilpasning samt en vedvarende mulighet til aa trekke samtykket tilbake.
F14: Google Consent Mode v2 skal starte med analytics_storage, ad_storage, ad_user_data og ad_personalization satt til denied foer relevante tags kjoeres.
F15: afterInteractive er bare lastetidspunkt og skal ikke brukes som erstatning for samtykkekontroll.
F16: Beslutning 7 velger CookieConsent, basic Consent Mode og ingen analyse-/marketing-kall foer samtykke.
F17: Nye og tilbaketrukne samtykker skal testes mot cookies, lokal lagring og faktiske nettverkskall.
F18: Priser skal bare vises med kilde, kontrolltidspunkt og valuta; utilgjengelig pris skal utelates.
F19: Hvor lenge en pris kan vises uten ny kontroll staar i beslutning 5.
F20: Kravene skal vurderes mot baade ekomloven og personvernreglene; en teknisk bannerkomponent alene dokumenterer ikke juridisk etterlevelse.
F21: Kilde for forhaandssamtykke: [Datatilsynet](https://www.datatilsynet.no/personvern-pa-ulike-omrader/internett-og-apper/bruk-av-informasjonskapsler-og-andre-sporingsteknologier/).
F22: Kilde for basic/advanced og consent-status: [Google Consent Mode](https://developers.google.com/tag-platform/security/concepts/consent-mode).

## G. TEKNISK HYGIENE

G01: /sitemap.xml skal vaere en sitemap-index med segmenter paa maksimalt 45000 URL-er hver.
G02: Segmentene skal ogsaa overholde gjeldende bytegrense for ukomprimert sitemap; grensen skal inngaa i valideringen.
G03: Sitemap skal bare inneholde publiserte, kanoniske og indekserbare URL-er med faktisk lastmod fra DB.
G04: Sitemap-generering skal vaere stabil ved paginering av data og ikke miste eller duplisere URL-er ved segmentgrenser.
G05: robots.txt skal genereres fra konfigurasjon med absolutt sitemap-referanse og Disallow for /go/ og /api/.
G06: Ukjente URL-er skal returnere ekte 404; URL-er markert permanent fjernet skal returnere ekte 410.
G07: Slettet innhold skal ikke redirectes til forsiden uten en faktisk innholdsmessig erstatning.
G08: Et redirect-map i request-laget skal kontrollere historiske URL-er og bare tillate ett hopp til endelig URL.
G09: Tester skal dekke redirect-kjeder, sykluser, slutt-URL, statuskode og samspill med trailing slash.
G10: Vercel preview-deployments skal sende X-Robots-Tag: noindex; private utkast skal i tillegg tilgangsbeskyttes.
G11: Robots-policy er ikke tilgangskontroll for redaksjonsdata.
G12: Hver kategori skal ha en gyldig RSS-feed med bare publiserte revisjoner, stabile identifikatorer og absolutte lenker.
G13: XML, RSS og JSON-LD skal escapes slik at brukerinnhold ikke kan injisere markup.
G14: Publisering skal sende IndexNow-varsel for den offentlige URL-en til en konfigurert deltakende tjeneste etter vellykket publisering.
G15: IndexNow skal ha domenebekreftende noekkelfil, retry ved midlertidig feil og deduplisering av hendelser.
G16: IndexNow skal ikke sende localhost-, preview-, noindex- eller draft-URL-er, og en mottatt 200/202 er ikke bevis paa indeksering.
G17: Kilde for IndexNow-protokollen: [IndexNow](https://www.indexnow.org/documentation).
G18: Search Console-bekreftelse via DNS skal dokumenteres per nettsted med status og kontrolltidspunkt.
G19: Hemmeligheter skal ligge i miljoevariabler og aldri i config som sendes til klienten, kildekoden eller build-loggen.
G20: DB-migrasjoner skal proeves mot en separat database foer produksjon, og destruktive endringer krever eksplisitt autorisasjon.
G21: Produksjonsappen skal ikke ha generell skriverett til redaksjonsgodkjenning eller publiseringsstatus.

## H. NETTVERKSLENKING

H01: NETWORK_LINKS_ENABLED skal leses fra env og vaere false naar den ikke er satt.
H02: Strengen false skal ikke tolkes som truthy; ukjente verdier skal avvises av konfigurasjonsvalideringen.
H03: En sentral, versjonert konfigurasjon skal kunne beskrive soestersider med domene, nisje og emner uten aa innfoere et felles CMS.
H04: Naar funksjonen er av, skal det ikke hentes eller rendres nettverkslenker i HTML, RSC-payload, metadata, JSON-LD eller navigasjon.
H05: Naar funksjonen er paa, skal lenker vaere kontekstuelle, redaksjonelt vurderte og plassert i artikkelteksten.
H06: Maksimalt to nettverkslenker er tillatt per artikkel.
H07: Sitewide footer-/sidebar-blokker, automatisk gjensidig lenking og automatisk aktivering basert paa alder eller autoritet er forbudt.
H08: Samme ankertekst skal ikke brukes to ganger innen det avklarte omfanget i beslutning 8.
H09: Valideringen skal sjekke ankertekst, relevant emne, destinasjon, antall og menneskelig godkjenning.
H10: Automatisk sitewide krysslenking mellom egne domener for aa manipulere rangeringer kan vaere link spam etter Googles regler.
H11: Paastanden om at dette er den vanligste aarsaken til samlet nettverksfall er ikke dokumentert av de kontrollerte primaerkildene og skal ikke presenteres som verifisert fakta.
H12: Kilde for H10-H11: [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies).

## I. DIFFERENSIERING

I01: Hvert nettsted skal ha site.config.ts med navn, domene, nisje, tone of voice, tema-token-sett og valgte layoutvarianter.
I02: Token-settet skal dekke fargeskala, typografi-par, radius, spacing-skala og skygger gjennom CSS-variabler.
I03: Mal 1 skal inneholde minst tre fungerende forsidevarianter og tre fungerende artikkelvarianter.
I04: Variantene skal variere komposisjon og innholdspresentasjon, ikke bare fargenavn.
I05: Alle varianter skal tilfredsstille samme semantiske HTML-, tilgjengelighets-, metadata- og ytelseskontrakt.
I06: Om oss, footer-tekst, redaksjonell policy og kategoriintro skal ha tom struktur med konkrete TODO-markoerer i malen.
I07: Ferdig fyllstoff og delte ferdigskrevne redaksjonelle tekster skal ikke foelge med i nye sider.
I08: Launch-QA skal kreve manuelt kontrollert egen tekst og ekte forfatterprofiler for nettstedet som lanseres.
I09: Differensiering er et prosjektkrav for egen verdi og identitet, men er ikke en teknikk som garanterer omgaaelse av spamregler.
I10: Samme innhold skal serveres til vanlige lesere og crawlere; ingen tilfeldig variasjon eller cloaking.

## J. MAALING

J01: Mal 1 skal ha integrasjonspunkter for Vercel Speed Insights og Vercel Web Analytics.
J02: Integrasjonene skal respektere valgt samtykkepolicy og ikke aktiveres paa private testdata eller previews som produksjonstrafikk.
J03: Klikk paa affiliatelenker skal kunne registrere godkjent destinasjon, lenke-ID, artikkel-ID og plassering.
J04: Eventet skal ikke sende full URL med persondata eller identifiserende query-parametre.
J05: Et blokkert maalescript skal ikke hindre /go/-navigasjon eller selve kjopshenvisningen.
J06: Ett beskyttet dashboard-endepunkt skal rapportere publiseringsvolum og andel publisert innhold med original_research.
J07: Endepunktet skal oppgi tidsrom, antall og beregningsgrunnlag slik at tallene kan gjenskapes fra DB.
J08: Historisk publiseringsvolum og dagens publiserte beholdning skal vaere separate maal.
J09: En ny revisjon av en eksisterende artikkel skal ikke telles som en ny artikkel i volumet for foerstegangspublisering.
J10: Aggregeringen skal ikke lekke upubliserte titler, redaktoerdata eller persondata til uautoriserte brukere.
J11: API-/pakkevalg kontrolleres ved implementasjon mot [Vercel Speed Insights](https://vercel.com/docs/speed-insights) og [Vercel Web Analytics](https://vercel.com/docs/analytics).

## K. DOMENEMODELL OG PRODUKSJONSKONTRAKT

K01: Datamodellen skal ha entiteter for forfattere, kategorier, artikler, revisjoner, godkjenninger, emner, produkter, priser, affiliate-lenker, original_research, redirects og publiseringshendelser.
K02: Nyheter og anmeldelser skal modelleres som diskriminerte innholdstyper med typesikre, typespesifikke felt.
K03: Publiseringsstatus skal bare endres gjennom en autorisert tjeneste som validerer revisjon og godkjenner i samme transaksjon.
K04: Locale, kategori og offentlig URL-identitet skal ha noedvendige fremmednoekler og unike constraints.
K05: Paa privat forhandsvisning skal baade datahenting, metadata og OG-generering ha samme tilgangskontroll.
K06: Manglende SITE_URL, databaseforbindelse eller obligatorisk nettstedskonfig skal stoppe produksjonsmodus.
K07: En eksplisitt testmodus kan bare brukes etter avklaringen i beslutning 4 og maa aldri bli stille fallback ved produksjonsfeil.
K08: Alle fire kommandoer npm run build, npm run typecheck, npm run lint og npm test skal returnere exitkode 0 foer en implementert fase erklaeres ferdig.
K09: Deretter skal next start brukes til curl-kontroll av en faktisk artikkelrute med broedtekst, en absolutt canonical, en title, en meta description og riktig gyldig JSON-LD.
K10: Testen skal inspisere vanlig HTML i responsen og ikke anse treff i script-tekst som bevis paa synlig artikkelinnhold.
K11: Raatt HTML-bevis, headere, eksakt kommando, rute, tidspunkt og kontrollresultat skal lagres som ASCII-kompatibel dokumentasjon under docs/qa/.
K12: En fase med utestet database, blokkert kommando eller manglende HTML-verifikasjon skal rapporteres som ufullfoert.

## AAPNE BESLUTNINGER

1. GODKJENT BESLUTNING: Avklar autoritativ kilde for tokens, tekster og innhold.
1. VEDTAK: site.config.ts eier nettstedets merkevare, korte grensesnitttekster og konkrete tokenverdier; bygg genererer en CSS-tokenfil per nettsted fra disse verdiene; artikler og tillitstekster ligger i Postgres.
1. KONSEKVENS: Ingen manuell dobbeltfoering av farger, men generert CSS og databaseinnhold maa eksplisitt unntas fra et bokstavelig forbud mot verdier utenfor site.config.ts.
1. GATE: Godkjent av brukeren med svaret ja den 2026-09-07.
2. GODKJENT BESLUTNING: Velg trailing slash, paginerings-URL, slug-grenser og canonical for ikke-indekserbare varianter.
2. VEDTAK: Bruk URL uten slutt-skrastrek, 301 fra motsatt variant, ?page=2 for paginering, 20 elementer per listeside, suffiks -2/-3 og maksimalt 100 tegn for en ferdig slug.
2. VEDTAK: Bruk sorterte, selvrefererende facet-URL-er med noindex,follow for aa beholde det eksplisitte canonical-kravet; 404/410/API har ikke canonical.
2. VEDTAK: Side 1 og utelatt page skal samles med 301 til grunnruten; tom base-slug skal avvises og kreve redaksjonelt valgt slug.
2. GATE: Godkjent av brukeren med svaret ja den 2026-09-07.
3. GODKJENT BESLUTNING: Avklar Next.js 16-navn og API-detaljer mot ordene middleware og priority i bestillingen.
3. VEDTAK: Bruk src/proxy.ts som middleware-ekvivalent, eksplisitt 301 med deaktivert innebygd trailing-slash-redirect, preload paa faktisk LCP-bilde og vanlig ISR uten cacheComponents.
3. VEDTAK: Bruk tagget ORM-cache og revalidateTag med umiddelbar utloeping ved publisering/tilbaketrekking, og bekreft nye responser foer jobben markeres som ferdig.
3. KILDE: [Next.js Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [Next.js Image](https://nextjs.org/docs/app/api-reference/components/image), [Next.js revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag).
3. GATE: Godkjent av brukeren med svaret ja den 2026-09-07.
4. GODKJENT BESLUTNING: Velg hvordan fase 1 kan verifisere en artikkel foer ekte innhold og Neon-tilgang foreligger.
4. VEDTAK: Tillat en eksplisitt, lokal QA-fixture med teknisk testtekst fra site.config.ts, noindex og egen miljoesperre; produksjon skal aldri bruke den som fallback.
4. VEDTAK: Bruk Vitest til unit-/integrasjonstester og Playwright til avtalte nettlesertester; raatt HTML skal fortsatt hentes med curl fra next start.
4. IKKE VALGT ALTERNATIV: Krev en separat Neon-testdatabase og en reell godkjent testartikkel foer fase 1 kan fullfoeres.
4. GATE: Godkjent av brukeren med svaret ja den 2026-09-07.
5. AVKLART BESLUTNING: Velg redaksjonell autentisering, brodtekstformat, bildelagring, vurderingsskala og prisens holdbarhet.
5. VEDTAK: Bruk en liten egen redaksjonsflate med OIDC-innlogging og roller, versjonerte typede JSON-blokker i Postgres, Vercel Blob for bilder, en synlig 1-5-skala og 24 timers prisgyldighet.
5. VEDTAK: Google OIDC med authorization code, PKCE, state, nonce og signaturvalidering; autorisasjon bruker forhaandsregistrert issuer og subject samt DB-rolle.
5. GATE: Brukeren delegerte valgene med du bestemmer 2026-09-07; Google og anbefalt innholds-/bildemodell er valgt.
5. TEST: Signert lokal OIDC-testutsteder verifiserer protokollen paa isolert testgren; ekte Google Cloud-klient og virkelige identiteter kreves foer launch.
6. GODKJENT BESLUTNING: Definer hvordan CI-budsjettene skal maales uten aa forveksle laboratoriedata med Googles feltdata.
6. VEDTAK: Bruk en laast Chromium-versjon, 390x844 viewport, CPU-throttling 4x, 1.6 Mbps ned, 750 Kbps opp og 150 ms RTT paa en dokumentert CI-runner.
6. VEDTAK: Kjoer fem besoek per testtilfelle og beregn lab-p75 med nearest-rank, separat for kald og varm servercache og med tom nettlesercache ved hvert besoek.
6. VEDTAK: Bruk 165000 gzip-bytes som JS-grense inkludert runtime og alle unike initiale artikkelchunks; dokumenter inline JavaScript separat og ta det med i totalen.
6. VEDTAK FERDIG MAL: Brukeren godkjente 165000 gzip-bytes med svaret godkjenner den 2026-09-08 etter maalt maksimum paa 157993 gzip-bytes i fase 7.
6. VEDTAK FERDIG MAL: Dette erstatter den opprinnelige sluttgrensen paa 120000; LCP 2000 ms, TTFB 600 ms, CLS 0.1 og labinteraksjoner 200 ms beholdes.
6. VEDTAK FERDIG MAL: Maaleavgrensning, fem besoek per tilfelle og separat kald/varm cache beholdes; dette godkjenner ikke fase 7 eller offentlig launch.
6. VEDTAK FASE 1: Brukeren godkjente 140000 gzip-bytes med svaret godkjenner alt den 2026-09-07 etter maalt Next.js-runtime paa 135750 gzip-bytes uten egne Client Components.
6. VEDTAK FASE 1: Maaleavgrensningen og oevrige labgrenser beholdes; unntaket endrer ikke budsjettet for ferdig mal.
6. VEDTAK FASE 4: Brukeren godkjente 145000 gzip-bytes kun for fase 4 med svaret godkjent den 2026-09-08 etter maalt maksimum paa 142965 gzip-bytes.
6. VEDTAK FASE 4: Maaleavgrensningen og oevrige labgrenser ble beholdt; sluttgrensen var da 120000, foer det senere vedtaket for ferdig mal.
6. VEDTAK: La CI teste menyaapning, innholdslenke og tilgjengelig samtykkevalg mot 200 ms som syntetiske interaksjonsindikatorer; en funksjon som ikke finnes i fasen rapporteres som ikke aktuell.
6. VEDTAK: Maal reelt INP og CWV per nettsted etter trafikkgrunnlag; TBT og syntetiske interaksjoner skal ikke omtales som felt-INP.
6. KONSEKVENS: Bare JS-grensen er endret som uttrykkelig godkjent; feltdata kan ikke dokumenteres av en lokal byggejobb.
6. GATE: Godkjent av brukeren med svaret ja den 2026-09-07.
7. GODKJENT BESLUTNING: CookieConsent fra Orest Bida driftet med nettstedet og basic Consent Mode uten pings foer samtykke.
7. VEDTAK: Opt-in, like tilgjengelig avslag/aksept/tilpasning og vedvarende tilbakekalling.
7. VEDTAK: Samtykke lagres lokalt i cookie i 180 dager for baade ja og nei; policyendring krever nytt valg.
7. VEDTAK: Ingen fjernlogg eller eksport av samtykkeidentifikator; Vercel Web Analytics, Speed Insights og godkjente klikk-events krever samtykke.
7. GATE: Brukeren godkjente forslaget med ja godkjenner og fortsett 2026-09-08; se docs/qa/phase5/consent-proposal.md.
8. GODKJENT BESLUTNING: Unik normalisert ankertekst gjelder per kildenettsted.
8. VEDTAK: Haandhev unik normalisert ankertekst per kildenettsted for nettverkslenker, med hoeyest to lenker per artikkel og manuelt dokumentert relevans.
8. VEDTAK: Bruk en sentral versjonert konfigurasjon som kopieres til hver selvstendige utrulling; runtime skal ikke avhenge av en ny felles nettverkstjeneste.
8. GATE: Brukeren svarte ja til anbefalingen 2026-09-08; maks to relevante, redaksjonelt godkjente lenker per artikkel og funksjonen avslatt som standard.
