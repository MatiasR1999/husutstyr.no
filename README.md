# SEO-site-template

Dette er den generiske SEO-malen med grunnlag, redaksjon, publisering og offentlige sidetyper.
Offentlig produksjon er sperret frem til senere faser leverer ekte konfigurasjon og innhold fra Neon.
QA-fixturen inneholder bare merket teknisk kontrolltekst og er ikke en publisert artikkel eller en ekte forfatterprofil.

## Lokal kjoering

Bruk Node-versjonen i .nvmrc og installer avhengigheter med npm ci.
Start lokal utvikling med SEO_QA_MODE=true npm run dev.
Bygg lokalt med SEO_QA_MODE=true npm run build.
Start det bygde nettstedet med SEO_QA_MODE=true npm run start -- --port 3100.
Den kanoniske QA-opprinnelsen defineres bare i site.config.ts.
QA-serveren bindes til loopback og QA-modus avvises paa Vercel.
Uten SEO_QA_MODE=true skal produksjonsbygget avvise uferdig innholdsoppsett.
Uten SEO_QA_MODE=true ved next start skal et allerede bygget QA-dokument ikke serveres.

## Etterproevbar kontroll

Kjoer npm run ci:phase1 for build, typecheck, lint, test, curl-verifikasjon og ytelsesmaaling.
CI-kommandoen er uavhengig av Git-leverandoer og lagrer bevis under docs/qa/.
Port 3100 maa vaere ledig foer QA; testen skal ikke avslutte andre serverprosesser.
Installer den laaste nettleseren med PLAYWRIGHT_BROWSERS_PATH=work/playwright npx playwright install chromium --only-shell dersom den ikke finnes lokalt.
Ytelsesmaaling bruker fem kalde og fem varme servercache-proever med ny nettleserkontekst hver gang.
Fase 1 har et historisk godkjent JS-budsjett paa 140000 gzip-bytes; gjeldende sluttbudsjett er dokumentert i fase 7 nedenfor.
Syntetiske interaksjonstall dokumenterer ikke Googles felt-INP.
Neon-migrasjoner, ekte publisering, forfatterinnlogging, fulle designvarianter og eksterne tjenester tilhoerer senere faser.
Se docs/seo-template-plan.md for den bindende faseavgrensningen.

## Neon-oppsett

Neon CLI er koblet til det valgte prosjektets production-gren gjennom den lokale .neon-filen.
neon.ts inneholder brukerens tomme defineConfig({}) og er kjoert med neon deploy.
.env.local inneholder production-forbindelsen fra Neon CLI.
.env.test.local inneholder den separate phase-2-qa-forbindelsen for fase 2.
Begge miljoefilene er Git-ignorert og har filmodus 0600.
Testgrenen har en verifisert Drizzle-forbindelse og ingen public-tabeller foer migrasjoner.
MCP-serveren Neon er konfigurert med OAuth i Codex; MCP-innlogging er separat fra den verifiserte CLI-innloggingen.
Redaksjonell OIDC-leverandoer, rollebegrensede DB-brukere, migrasjoner og DB-basert innholdsadapter gjenstaar i fase 2.

## Phase 2: isolated Neon and editorial revisions

Run npm run ci:phase2 with Node 24 to execute the four required npm checks, real database tests, curl evidence and signed local OIDC tests.
The runner reads .env.phase2.local for restricted QA runtime credentials and .env.test.local only for the isolated database tests.
The runtime explicitly masks DATABASE_URL_UNPOOLED so Next cannot inherit the Neon CLI owner's connection from .env.local.
The QA branch is phase-2-qa; production .neon context and production data are not changed by these scripts.
Use node --env-file=.env.test.local --import tsx scripts/phase2/migrate.ts for the guarded QA migration runner.
Use MIGRATION_EMPTY_CHECK=true with that command only for the dedicated phase2_migration_qa database.
Use node --env-file=.env.test.local --import tsx scripts/phase2/seed.ts to provision clearly labeled QA content and rotate the two local restricted role passwords.
The seed is restricted to the known QA endpoint and writes .env.phase2.local with file mode 0600.
Seeded public QA content uses an owner-only technical bootstrap; phase 2 exposes no publishing endpoint.
Repeated integration tests append isolated test revisions and articles; they do not erase existing records.
Use npm run db:generate to produce schema changes; retain the custom SQL migrations and do not replace them with schema push.
The transactional Drizzle Neon WebSocket migrator handles migrations; server requests use Drizzle Neon HTTP and atomic PostgreSQL procedures.
The public reader can select only published views; the editorial role has no direct writes to revisions, approvals or publication status.
All rendered article content and author snapshots belong to the exact published revision.
The private editorial pages at /redaksjon use server rendering, ordinary forms and revision checks.
The create/edit forms handle paragraph articles; the authenticated JSON API accepts the typed article, news and review block formats.
Images reference registered Vercel Blob assets with dimensions, alternative text and rights; a Blob account and upload integration are not provisioned in phase 2.
Google is the selected OIDC provider; configure OIDC_CLIENT_ID and OIDC_CLIENT_SECRET from a Google Cloud web client before real login.
Register the configured HTTPS site origin plus /api/auth/callback as the Google redirect URI.
Provision genuine author profiles and principals with exact issuer, subject and writer/editor role using an authorized database administrator.
No user becomes an editor through an email address, submitted name or successful login alone.
The local test issuer is a separate script on loopback and never an application route or production fallback.
OIDC_TEST_MODE must be false in production and SEO_QA_MODE cannot run on Vercel.
Production requires a completed site.config.ts, matching SITE_URL and a seo_public_reader connection.
Configure EDITOR_DATABASE_URL with seo_editor_service; never deploy the Neon CLI owner credentials as app runtime credentials.
Google account login, Blob uploads, production publication, cache invalidation and public launch remain unverified or assigned to later phases.
Evidence is stored under docs/qa/phase2; the original phase 1 evidence is retained under docs/qa.

## Phase 3: publication and technical feeds

Run npm run ci:phase3 with Node 24 and the existing isolated QA environment.
The runner applies additive QA migrations, runs the four npm checks, captures raw curl HTML and tests real publication, recovery, withdrawal and redirects.
The publication test also performs an actual rebuild and restarts next start to verify unchanged published dates.
The QA app process never receives DATABASE_URL_UNPOOLED; only the guarded migration and test setup scripts use that owner connection.
Publication requires an enabled editor session and approval of the exact current revision.
The publication command and its durable job are written in the same transaction.
A repeated requestId returns the original event; reuse with a different operation or revision is rejected.
An edit leaves the existing published revision visible until the new revision is approved and published.
The API returns a pending event until actual public HTML, lists, RSS and sitemap have been checked.
Data caches use unstable_cache with explicit site, locale and content tags under the previously selected traditional ISR model.
Tag expiration uses revalidateTag with expire 0; the next request blocks for fresh data.
Withdrawal creates a tombstone and the request layer returns 410 before previously cached HTML or RSC can be served.
Redirect administration accepts registered internal destinations that resolve to published content and flattens chains to the final target.
The request layer also detects malformed or cyclic stored maps and fails closed.
RSS is available at /[kategori]/rss.xml and uses stable article identifiers and the published revision only.
The root /sitemap.xml is a sitemap index; its segment query URLs contain a digest of one consistent database result.
A segment for an obsolete digest returns 404 and requires refetching the current index.
Sitemap entries are sorted and read in one PostgreSQL statement; offset pagination cannot shift segment boundaries during generation.
Segments enforce 45000 URLs and 52428800 uncompressed bytes; QA and preview sitemaps contain no indexable test URLs.
robots.txt is generated from site.config.ts and includes an absolute sitemap URL and configured exclusions.
IndexNow notifications are attempted only for eligible public HTTPS publications with a configured INDEXNOW_KEY.
The public verification file is /indexnow-key.txt; it is unavailable in QA and preview.
HTTP 200/202 acknowledges receipt and does not prove indexing.
Completed jobs are deduplicated; transport ambiguity after a remote receipt can require repeated notification of the same URL.
Temporary failures and rate limits persist a next-attempt time; rejected notifications require correction and an authorized retry.
Short delivery failures trigger up to three automatic attempts while the local invocation remains available.
The editor can retry a pending job immediately without changing publication history or supplying arbitrary cache tags.
Set PUBLICATION_WORKER_SECRET before deployment and configure a protected scheduler or queue to call GET /api/publication-jobs for durable recovery after process loss.
The worker also accepts POST with an optional eventId and the same bearer credential.
No hosted scheduler, Vercel deployment, DNS record or IndexNow request was created by the local phase 3 verification.
Search Console DNS verification is recorded as pending with no checkedAt value in site.config.ts.
Before launch, supply real site identity, Google credentials, genuine editors, IndexNow key, worker scheduling and verified Search Console DNS status.
Evidence for phase 3 is in docs/qa/phase3; earlier phase evidence is retained in its existing directories.


## Fase 4: offentlige sidetyper

site.config.ts velger layouts.home blant index, magazine og directory.
site.config.ts velger layouts.article blant classic, editorial og reference.
QA_LAYOUT_VARIANT=1, 2 eller 3 velger et fast par kun i lokal QA og maa settes baade ved build og start.
Et nytt nettsted skal velge sin faktiske variant i config og beholde samme innhold for lesere og crawlere.
next/font henter de konfigurerte latin-fontene ved bygg og serverer dem lokalt med display swap.
Fontmodulen og CSS-tokenfilen genereres fra site.config.ts og skal ikke haandredigeres.
Artikler og nyheter bruker fortsatt 3600 sekunders ISR, mens forside og lister bruker 600 sekunder.
Anmeldelser bruker dynamisk serverrendring for aa hindre at priser og markup lever videre etter 24 timers gyldighet.
Dette er et dokumentert B21-avvik som prioriterer kravet om gyldig pris; det endrer ikke artikkelrutens ISR.
Vanlige innholdsbilder bruker next/image med registrerte dimensjoner, sizes og AVIF/WebP-stoette.
Ingen bildepreload legges til naar tekst er LCP.

## Registrering av metadata og tillitsinnhold

Paginering bruker 20 artikler per side og ?page=2, med 301 fra ?page=1 til grunnruten.
Hvert sidetall skal ha en egen redaksjonelt skrevet SEO-tittel og beskrivelse foer siden tas i bruk.
En autorisert redaktoer kan POST-e path, page og copy til /api/editor/page-metadata med gyldig sesjon og Origin.
copy inneholder title paa 50-60 tegn og description paa 140-160 tegn.
Registrering oppretter en uforanderlig metadatautgave med ansvarlig redaktoer og tidspunkt.
Dette endepunktet godkjenner den eksakte metadatautgaven og er ikke en generell cache-invalidering.
Forfatter- og emnesider trenger tilsvarende registrert metadata for hvert sidetall.
Forfatterprofilen leses fra siste publiserte forfattersnapshot, aldri fra et redigert, upublisert profilfelt.
En profil med bilde skal ha URL, alt-tekst, rettigheter, bredde og hoeyde.
Emneterskelen er minTopicArticles med standardverdi 5.
Sortering og emnefilter er noindex med sortert, selvrefererende canonical.
Alle gyldige sidenumre kan naas direkte fra pillar-sidens pagineringslenker.
Visninger er en intern rewrite-rute og skal ikke lenkes eller brukes som offentlig URL.
OG-ruter godtar bare kodede, eksisterende offentlige stier og aldri innsendt tittel eller revisjonsvalg.

Tillitssidene lagres som kind=page i samme revisjons-, godkjennings- og publiseringsloep som artikler.
page.slug maa tilsvare en av de syv konfigurerte tillitssidene.
Ved nettstedsklargjoering skal sites.trust_routes og sites.reserved_routes samsvare med config.
Det interne namespace _pages eksponeres aldri som en alternativ offentlig innholdsadresse.
Kontakt, eierskap, policy, testmetode, personvern, cookies og annonsoerinformasjon er konkrete TODO-er inntil ekte tekster er skrevet.
Produksjon kan ikke publisere TODO-innhold eller syntetiske QA-identiteter.
Produkt- og prisdata kopieres inn i den uforanderlige revisjonen foer redaksjonell godkjenning.
Egne og betalte vurderinger faar ingen Review/Rating-markup.
Manglende eller utloept pris utelater prisvisning og Product/Review-markup.

## Etterproevbar fase 4-QA

npm run ci:phase4 bruker .env.phase3.local for begrenset app-tilgang og .env.test.local kun til isolerte QA-kontroller.
Testharnessen bruker ikke eierforbindelsen i next start-prosessen.
Kjoer scripts/phase4/seed.ts med QA-eierforbindelsen for aa etablere de tydelig merkede fixturene ved foerste oppsett.
Migrasjonstesten med MIGRATION_EMPTY_CHECK=true krever den separate phase4_migration_qa-databasen paa QA-grenen.
CI lagrer raatt curl-HTML, headere, faktiske PNG-responser, nettleserskjermbilder og kontrollresultater under docs/qa/phase4/.
Alle QA-sider forblir noindex, og den offentlige QA-sitemapen er tom selv om normal emne- og pagineringspolicy tillater indeksering.
Normal indekseringspolicy testes separat med samme SEO-funksjoner og DB-utvalg i den isolerte testharnessen.
ci:phase4 returnerer feil dersom maalingene overskrider den godkjente fase 4-grensen paa 145000 gzip-bytes.
Unntaket ble godkjent 2026-09-08 og gjelder bare fase 4; det senere sluttvedtaket er dokumentert i fase 7 nedenfor.
npm run ci:phase4 -- --budget-only vurderer eksisterende maalinger mot gjeldende budsjett uten aa kjoere funksjonstestene paa nytt.
Budsjettrapporten skiller mellom tidspunktet for maalt HTML og tidspunktet for ny budsjettvurdering.
Full CWV-maaleprofil med representative produksjonsbilder og feltdata gjenstaar i fase 7 og etter launch.
Fase 5, samtykke, maaling, aktive affiliatelenker og utrulling inngaar ikke i fase 4.

Neon HTTP proever en gang til ved UND_ERR_CONNECT_TIMEOUT foer en SQL-forespoersel er sendt.
Socketfeil med ukjent skriveutfall, HTTP-feil og gjentatt connect-timeout avbrytes uten nye automatiske forsoek.

Fase 5: Affiliater, samtykke og publiseringsoversikt
Affiliate-blokker har type=affiliate, en registrert linkId og redaksjonell label.
POST /api/editor/affiliate-links krever redaktoersesjon, riktig Origin og slug, destination, relationship, disclosure samt valgfri productId.
relationship er commission eller owned; destinasjonsopphavet maa finnes i site.config.ts og i nettstedets provisionerte DB-liste.
Godkjent lenkeidentitet og kommersiell tilknytning er uforanderlig; en ny destinasjon krever en ny registrert lenke.
Bare lenker som brukes i en godkjent, publisert revisjon er tilgjengelige via /go/.
/go/ leser fersk aktiveringsstatus og gir 302 uten personsporing; ugyldige, ubrukte, deaktiverte og upubliserte lenker gir 404.
Annonsemerkingen avledes fra revisjonens affiliate-blokker og kommersielle anmeldelsesdata.
GET /api/editor/metrics krever redaktoersesjon og eksplisitte UTC-parametre from og to.
Tidsrommet er fra-og-med from til-men-ikke-med to.
firstPublishedInPeriod teller foerste publisering, og publicationEventsInPeriod teller alle publiseringshendelser i tidsrommet.
currentlyPublished teller dagens publiserte artikler, nyheter og anmeldelser, med tillitssider utelatt.
withOriginalResearch teller dokumentasjon i den faktisk godkjente publiserte revisjonen.
originalResearchShare er null dersom currentlyPublished er null artikler, ellers andelen mellom 0 og 1.
Metrics-svaret inkluderer asOf og basis og inneholder ikke titler, utkast, forfattere eller redaktoeridentiteter.
Fase 5-kontroller ligger i scripts/phase5/ og bevisene i docs/qa/phase5/.
Beslutning 7 ble godkjent 2026-09-08; CookieConsent 3.1.0 driftes lokalt med nettstedet.
site.config.ts styrer all samtykketekst, policyversjon, cookie-navn, 180 dagers lagring og maaleoppsett.
Begge valg varer i 180 dager; oekt policyversjon eller manglende cookie krever et nytt valg.
Bare nodvendig lagring og analyse tilbys; markedsfoering er ikke konfigurert og alle tre annonsefeltene forblir denied.
Consent Mode v2 bruker Googles gtag-Arguments-format med default denied foer relevante scripts og update ved valg eller tilbakekalling.
Ingen Google-tag eller maale-ID er konfigurert; kjoeren viser at samtykkekommandoene er klare, ikke at en ekstern Google-konto er koblet til.
CookieConsent lagrer ogsaa en lokal tilfeldig samtykke-ID; den eksporteres ikke til analysen eller en fjernlogg.
Vercel Web Analytics 2.0.1 og Speed Insights 2.0.0 lastes med next/script afterInteractive bare etter analysetillatelse.
Vercels samtykkefiltre og en avgrenset transportkontroll leser den faktiske cookien ved hver sending.
Bare de eksplisitt konfigurerte analyse-endepunktene har en ekstra transportkontroll; apptrafikk og /go/-navigasjon paavirkes ikke.
Analyseforespoersler bruker credentials omit og referrer-policy no-referrer.
Innkommende referrere med query eller fragment undertrykker maaling fordi leverandoerens filter ikke kan redigere referrerfeltet.
Tilbakekalling oppdaterer samtykkestatus foer siden lastes pa nytt, og andre aapne faner synkroniseres gjennom BroadcastChannel.
Ingen separat localStorage-, sessionStorage- eller analysecookie brukes av disse integrasjonene.
Personvernvalg-knappen i footeren er alltid tilgjengelig for aa endre valget.
Komponenten er en avgrenset klientdel; artikkeltekst, annonsemerking og lenker forblir serverrendret.
measurement.enabled er false inntil det virkelige nettstedets Vercel-oppsett og personverntekster er klare.
Produksjonsmaaling krever baade measurement.enabled og VERCEL_ENV=production; lokale besoek og previews aktiverer aldri produksjonsanalyse.
Lokal QA bruker bare 127.0.0.1:3103 som egen mottaker etter samtykke; den sender ingen testdata til Vercel.
Foer offentlig launch skal faktisk kontoaktivering, eventuell betaling for events, retensjon og personvern dokumenteres.
Registrer reelle eiere, godkjente butikker og kommersielle avtaler foer aapning av produksjon.
npm run ci:phase5 bruker .env.phase3.local til appen og .env.test.local kun til den isolerte QA-grenens administrasjon.
Ved foerste oppsett maa scripts/phase5/seed.ts kjoeres mot QA-grenen etter migrasjonene; fixturene forblir eksplisitt syntetiske.
CI henter Vercels offentlige scripts, lagrer SHA-256 og kjoerer dem uendret med en lokal HTTP-mottaker.
Nettlesertesten slaar kun av webdriver/Headless-signalet i testkonteksten fordi Vercels scripts ellers ignorerer automatisk nettlesertrafikk.
Faktiske nettverksdata, cookies, tilbakekalling, tastaturklikk og blokkert script testes etter neste produksjonsbygg.
Bevis lagres i docs/qa/phase5/ med raatt curl-HTML, headere, skjermbilder og maskinlesbare resultater.
ci:phase5 kontrollerer F5.A01-F5.A07 og rapporterer det uavklarte sluttbudsjettet for JavaScript separat.
Fase 4-unntaket gjelder ikke fase 5; senere kjoeringer vurderer JS mot det godkjente sluttvedtaket i fase 7.

Fase 6: Nettverkslenking levert avslatt
NETWORK_LINKS_ENABLED er false naar verdien mangler, og baade eksplisitt false og udefinert flagg er testet mot faktiske responser.
Ukjente flaggverdier avvises; bare true aktiverer funksjonen.
Produksjonskonfigurasjonen site.network i site.config.ts har version=1 og sites=[].
En sentral versjonert konfigurasjon kopieres inn i hvert selvstendig nettsteds site.config.ts; ingen felles runtime-tjeneste eller CMS innfoeres.
Hver soesterside beskrives med id, HTTPS-origin, niche og topics som emneslugger.
Foer bruk skal nettstedets network_registry, network_niche og network_origin provisioneres av databaseadministrasjonen fra samme konfigurasjon.
Ny konfigurasjon etter foerste provisionering krever oekt versjon; endrede konfigurasjoner faar ogsaa en ny cacheidentitet.
Bare en registrert soesterside med samme nisje og et relevant emne i den godkjente revisjonen kan brukes.
Konfigurasjonen godtar ingen footer, sidebar, automatisk reciprocity eller aktivering etter alder.
Godkjenning skjer per nettverkslenke gjennom en autentisert redaktoer, i tillegg til artikkelrevisjonens eksisterende godkjenning.
POST /api/editor/network-links krever gyldig redaktoersesjon, samme Origin og aktivert feature-flagg.
Innfeltene er articleId, revisionId, blockIndex, anchor, peerId, destination, topicSlug, justification, placement og relationship.
blockIndex er nullbasert og peker paa et eksisterende paragraph-element i den eksakte revisjonen.
anchor maa forekomme noeyaktig en gang i det avsnittet og faar ikke overlappe en annen lenke.
placement maa vaere body, og relationship maa vaere editorial; kommersielle henvisninger skal bruke den separate affiliate-funksjonen.
justification skal vaere minst 30 tegn med redaktoerens konkrete begrunnelse for relevansen.
Destinasjonen krever et tillatt HTTPS-opphav uten query, fragment eller innebygde brukernavn.
Nisje, emne, destinasjon, avsnitt, identitet, versjon og artikkelgodkjenning kontrolleres ogsaa i databasen.
En transaksjonslaas haandhever maksimalt to registrerte lenker per revisjon ogsaa ved samtidige forespoersler.
Lenketekst normaliseres med NFKC, sammenslaatte mellomrom og smaa bokstaver og reserveres per kildenettsted.
En reservert tekst kan bare brukes av den samme artikkelen og kan godkjennes paa nytt i artikkelens senere revisjoner.
Reservasjonen beholdes ved deaktivering og tilbaketrekking, slik at en annen artikkel ikke gjenbruker samme lenketekst.
Et upublisert utkast endrer ikke den aktive publiserte revisjonens lenker.
En ny publisert revisjon viser ingen gamle nettverkslenker foer lenkene har faatt ny eksplisitt godkjenning.
Godkjent lenkeidentitet, destinasjon, kontekst og begrunnelse er uforanderlig; PATCH /api/editor/network-links kan bare endre enabled for en registrert id.
Registrering og deaktivering invaliderer de berorte cachevisningene automatisk.
Bare sikkerhetsavgrensede publiserte nettverksvisninger kan leses av seo_public_reader; apptjenesten har ikke generell skriverett til tabellene.
Naar flagget er false, hentes ingen nettverkslenker og ingen nettverkskonfigurasjon sendes til klienten.
Teksten i det opprinnelige avsnittet bevares ogsaa naar en kontekstuell lenke er avslatt.
Artikler og nyheter bruker separate interne cacheidentiteter for off og on med versjonsfingeravtrykk, mens canonical og 3600 sekunders ISR beholdes.
Anmeldelser beholder dynamisk serverrendring og den eksisterende regelen om 24 timers prisgyldighet.
Internrutene under /visninger/artikkel/ kan ikke aapnes direkte som alternative offentlige adresser.
Ved tilbakestilling skal NETWORK_LINKS_ENABLED settes til false i alle appinstanser, og alle instanser skal starte med den nye verdien.
Kall deretter POST /api/editor/network-links/revalidate med tomt JSON-objekt, gyldig redaktoersesjon og samme Origin.
Endepunktet krever redaktoer og invaliderer baade av- og paa-visninger; HTML og RSC skal verifiseres etterpa.
En allerede aapnet nettleserside endres foerst ved ny navigasjon eller oppdatering; publiserte serverresponser bruker den aktuelle flaggverdien.
Cacheisoleringen hindrer at en instans som kjoerer false bruker et gammelt cachet on-svar foer revalideringskallet.
F6.A04 er testet paa samme produksjonsbygg med varm cache, uten ombygging mellom modusene true, false og udefinert.
F6.A01 er testet med leserett til nettverksvisningen midlertidig fjernet paa den isolerte QA-grenen.
Nettverkslenker vises bare inne i avsnittet og legges aldri til metadata, JSON-LD, navigasjon, footer eller sidebar.
QA bruker to syntetiske .invalid-opphav i site.qa.network; ingen faktisk nettverkspartner er registrert i produksjonskonfigurasjonen.
npm run ci:phase6 kjoerer additive migrasjoner, isolerte fixtures, de fire npm-kontrollene, nettverkstester og regresjoner for publisering, innlogging, affiliates og samtykke.
Samtykkeregresjonen bruker fortsatt en lokal HTTP-mottaker og sender ikke testdata til Vercel.
Bevis fra kjoeringen lagres i docs/qa/phase6/ med raatt HTML, RSC, headere, skjermbilder og maskinlesbare resultater.
Fase 6 endret ikke det davarende sluttbudsjettet paa 120000 gzip-bytes; senere fase 7-vedtak foelger nedenfor.

Fase 7: Samlet QA og klargjoering for kloning, fortsatt blokkert
npm run ci:phase7 kjoerer ren npm ci, alle fire npm-kontroller, isolert Neon-gjenoppretting, tre layoutvarianter og funksjonelle regresjoner.
Kjoeringen bruker den eksisterende separate QA-grenen og endrer ikke produksjonsgrenen.
Gjenoppretting oppretter en midlertidig QA-undergren, verifiserer roller og alle 19 migrasjoner og sletter bare den midlertidige grenen etterpaa.
site.qa.database samler prosjekt, testgren og host-prefiks; oppdater disse ved kloning til et eget QA-miljo.
Hver layout maales med fem kalde og fem varme besoek paa forside, vanlig artikkel og lang bildeartikkel.
Maaleprofilen er 390x844, 4x CPU, 150 ms RTT, 1.6 Mbps ned og 750 Kbps opp; p75 beregnes separat for hver gruppe.
CI returnerer nonzero ved budsjettbrudd, men fullfoerer uavhengige regresjoner for aa samle et komplett lokalt bevisgrunnlag.
Produksjonsbygg bruker Next.js sin stoettede Webpack-modus; Next.js- og React-versjonene er uendret.
Et bilde kan eksplisitt ha preload=true bare naar det er identifisert som faktisk LCP; payloaden tillater maksimalt ett slikt bilde.
Vanlige bilder er fortsatt lazy, og tekstdominerte sider faar ingen automatisk bildepreload.
npm run build kontrollerer uferdig konfigurasjon og publisert innhold foer kompilering; bare eksplisitt lokal QA kan bruke syntetiske fixtures.
npm run qa:launch tvinger produksjonskontrollen og skal avvise denne uferdige generiske malen.
Produksjonskontrollen krever det ferdige nettstedets miljoevariabler i prosessmiljoet; den leser ikke automatisk lokale .env-filer.
Kontrollen erstatter ikke menneskelig godkjenning av identitet, forfattere, innhold, rettigheter eller avtaler.
docs/clone-and-launch.md beskriver selvstendig oppsett, obligatoriske TODO-er, secrets-navn, DNS, Search Console og gjenoppretting.
docs/qa/phase7/requirements.md dekker alle 225 krav med PASS, BLOCKED eller NOT_RUN og konkrete bevisreferanser.
docs/qa/phase7/page-type-matrix.json validerer faktiske HTML-responser for aatte sidetyper i tre layouter.
docs/qa/phase7/performance-summary.txt oppsummerer alle 90 besoek uten aa blande kalde og varme resultater.
Brukeren godkjente 165000 initiale gzip-bytes for ferdig mal med svaret godkjenner 2026-09-08; maaleavgrensningen og oevrige grenser beholdes.
Maalt maksimum paa 157993 gzip-bytes bestaar den nye grensen; de opprinnelige 90 nettlesermaalingene og deres tidsstempler er bevart.
npm run ci:phase7 -- --budget-only beregner ny vurdering fra de lagrede raamaalingene og skriver docs/qa/phase7/budget.json.
Kun de aktuelle budsjettkontrollene vurderes paa nytt; den historiske hovedkjoeringens exit-koder omskrives ikke.
Kald cache overskrider TTFB og enkelte LCP-grenser; CLS og alle maalte labinteraksjoner bestaar.
Den samlede fase 7-kjoeringen er derfor BLOCKED selv om build, typecheck, lint, 85 tester og de funksjonelle regresjonene passerer.
Faktisk Vercel-preview, ekte driftskontoer og nettstedets launch-kontroller er ikke utfoert; lokale simuleringer holdes adskilt fra disse.
Felt-CWV og felt-INP er NOT_RUN inntil nettstedet har tilstrekkelig faktisk trafikk.
NETWORK_LINKS_ENABLED leveres false, nettverksregisteret er tomt og produksjonsmaaling forblir avslatt.
Malen er ikke erklaert ferdig eller offentlig publisert.
