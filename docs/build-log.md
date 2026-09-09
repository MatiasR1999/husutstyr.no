NAAVAERENDE STATUS: Fase 7 er implementert og lokalt testet, men BLOKKERT og ikke ferdig.
NAAVAERENDE BEGRENSNING: Kald TTFB/LCP over grensen og faktisk Vercel-preview ikke testet; JS 157993 bestaar godkjente 165000 gzip-bytes.

# BUILD-LOG: FASE 1

Dato: 2026-09-07.
Status: Fase 1 er ferdig og F1.A01-F1.A16 er verifisert med godkjent JS-grense paa 140000 gzip-bytes.
Naavaerende status: Neon-oppsett, config-deploy og separat testgren er verifisert; fase 2-implementasjon avventer konkret OIDC-leverandoer.
Godkjenning: Brukeren godkjente beslutning 1, 2, 3, 4 og 6 med svaret ja.
Godkjenning: Brukeren godkjente fase 1-budsjettet paa 140000 gzip-bytes med svaret godkjenner alt den 2026-09-07.
Omfang: Kun fase 1.
Bygget: Next.js App Router med strict TypeScript og Server Components.
Bygget: site.config.ts som kilde til branding, teknisk QA-innhold og genererte CSS-tokens.
Bygget: Norsk URL-/locale-abstraksjon, slug-normalisering og kollisjonsreservasjonskontrakt.
Bygget: Forside, kategori, artikkel og 404 med lokal QA-fixture.
Bygget: Metadata, canonical, robots og typed/validert Article-graf i src/lib/seo/.
Bygget: Eksplisitt 301-normalisering i src/proxy.ts.
Bygget: Loopback-/miljoesperre mot bruk av QA-fixture i produksjon og preview.
Bygget: Server-only-grense for innhold og fremtidig Neon-klient.
Bygget: ISR-tider og tag-navnekontrakt uten implementasjon av live publisering.
Bygget: Arkitekturkontroll, Vitest-tester, curl-bevis og Chromium-maalescript.
Bygget: Leverandoeruavhengig npm run ci:phase1 med feilstopp og lagrede resultater.
Avvik P00.2: Mappen har ikke Git-metadata; implementasjonen skjer lokalt i den opprettede prosjektmappen etter brukerens godkjenning, mens Git-oppsett fortsatt er overlatt til brukeren.
Avklaring L06/L10: Generert CSS er et uttrykkelig godkjent unntak fra literalverdier bare i site.config.ts.
Avklaring E16/E17: Merket lokal QA-testtekst og syntetisk testidentitet er godkjent i beslutning 4 og blir aldri registrert som en menneskelig redaksjonsgodkjenning.
Avklaring B06: Labinteraksjoner rapporteres separat fra utestet felt-INP etter beslutning 6.
Avgrensning B20: next/font og innholdsbilder fullfoeres i fase 4; fase 1 bruker systemfont fra config og har ingen innholdsbilder.
Avgrensning C10/D06: Dynamiske OG-bilder og Review/Product-grafer tilhoerer fase 4.
Avgrensning F1.12: Ingen live Neon-forbindelse, migrasjon, godkjenningstjeneste eller revalidateTag-publisering er verifisert i fase 1.
Avvik B09/F1.16/F1.A14: JS-grensen for fase 1 er godkjent endret fra 120000 til 140000 gzip-bytes fordi standard Next.js-runtime overstiger originalgrensen uten egne Client Components.
Gjenstaar fase 1: Ingen aapne akseptansekriterier.
Gjenstaar: Ferdig mal skal fortsatt oppfylle 120000 gzip-bytes etter B09.
Gjenstaar: Beslutning 5, 7 og 8 samt fase 2-7.
Git: Ingen init, add, commit, push, branch- eller remote-endringer er kjoert.


## VERIFIKASJON

Miljoe: SEO_QA_MODE=true og NETWORK_LINKS_ENABLED=false paa lokal loopback-server.
Sluttkontroll: npm run ci:phase1 returnerte 0 den 2026-09-07T14:26:02.377Z med Node v24.20.0.
Regresjonskontroll: npm run ci:phase1 returnerte 0 etter Neon-oppsett den 2026-09-07T14:53:03.503Z; docs/qa/ viser denne nyeste kjoeringen.
RESULTAT: npm run build exit=0; bevis=docs/qa/build.log.
RESULTAT: npm run typecheck exit=0; bevis=docs/qa/typecheck.log.
RESULTAT: npm run lint exit=0; bevis=docs/qa/lint.log.
RESULTAT: npm test exit=0; bevis=docs/qa/test.log.
RESULTAT: npm run qa:html exit=0; bevis=docs/qa/html.log.
RESULTAT: npm run qa:performance exit=0; bevis=docs/qa/performance.log.
Unit-/integrasjonstester: 26 tester passerte.
HTML: Synlig broedtekst er kontrollert utenfor script/template-elementer i raatt curl-innhold.
HTML: Noeyaktig en title, en meta description og en absolutt canonical er kontrollert i faktisk respons.
HTML: Article, Person, Organization og BreadcrumbList er runtime-validert fra JSON-LD i responsen.
HTTP: Vanlig curl-agent og nettleseragent passerte samme kontrakt.
HTTP: Feil kategori og ukjent slug returnerer ekte 404 uten canonical.
HTTP: Trailing slash og page=1 normaliseres med ett 301-hopp.
HTTP: Vanlig produksjonsmodus og preview blokkerer den bygde QA-fixturen for baade HTML og RSC.
HTTP: Preview sender X-Robots-Tag noindex.
Build-sperre: SEO_QA_MODE=false npm run build ble kjoert og avvist med exit 1 fordi produksjonsinnhold ikke er konfigurert.
Cache: Alle fem kalde proever viste MISS og alle fem varme proever viste HIT.
MAALING: {"mode":"cold","lcpMs":508,"cls":0,"ttfbMs":122.69999992847443,"menuMs":56,"contentMs":16,"jsGzipBytes":135748}
MAALING: {"mode":"warm","lcpMs":504,"cls":0,"ttfbMs":6.299999952316284,"menuMs":56,"contentMs":16,"jsGzipBytes":135748}
Ytelsesstatus: Alle labgrenser passerer; initialt JS er 135748 gzip-bytes mot godkjent fase 1-grense paa 140000.
Felt-INP: Ikke maalt; de oppgitte interaksjonstallene er syntetiske.
Samtykkeinteraksjon: Ikke aktuell i fase 1.
JS-definisjon: Unike moderne Chromium-chunks inkludert runtime samt gzip av inline JavaScript; nomodule-fallback som ikke lastes i Chromium er ikke med.
Tidligere JS-blokkering B09/F1.16/F1.A14: 135750 gzip-bytes mot opprinnelig tillatt 120000.
Undersoekt: Next.js-standardbundling med Turbopack og stoettet webpack uten egendefinerte Client Components.
Undersoekt: Webpack maalte 133055 gzip-bytes og oppfylte heller ikke budsjettet.
Valg: Standard Turbopack er beholdt; rammeverkskode er ikke fjernet eller modifisert.
Avklart: Fase 1-budsjettet paa 140000 gzip-bytes er godkjent og registrert i spec beslutning 6 og B09.1.
Avhengigheter: Eksakte laaste versjoner finnes i docs/qa/versions.txt og package-lock.json.
Avhengigheter: Fire moderate Drizzle Kit-verktoyfunn er dokumentert i docs/qa/dependency-audit.txt.

## AKSEPTANSESTATUS

F1.A01: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A02: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A03: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A04: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A05: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A06: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A07: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A08: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A09: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A10: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A11: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A12: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A13: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A14: PASS; fem kalde og fem varme proever oppfyller den godkjente fase 1-profilen; felt-INP er ikke maalt.
F1.A15: PASS; se kommando- og HTTP-bevis under docs/qa/.
F1.A16: PASS; se kommando- og HTTP-bevis under docs/qa/.
Fase 2-7 ved avsluttet fase 1: Ikke startet.

## FASE 2: FORUNDERSOEKELSE

Bestilling: Brukeren ba om aa starte fase 2 den 2026-09-07.
Status: Forundersoekelse er utfoert; implementasjon er ikke startet fordi F2.FORUTSETNING ikke er oppfylt.
Kontekst: Prosjektet er seo-site-template 0.1.0 med begge styringsdokumenter paa plass.
Kontekst: Prosjektmappen har fortsatt ingen Git-metadata; eksisterende avklaring P00.2 gjelder.
Kontroll: Ingen lokale .env-filer eller relevante database-/OIDC-variabler finnes i prosjektmiljoet.
Kontroll: Ingen Neon-connector eller neonctl er tilgjengelig i denne oppgaven.
Kontroll: Neon-konsollen i tilgjengelig nettleser viser innlogging.
Kontroll: Prosjektet er ikke koblet til et Vercel-prosjekt gjennom .vercel/project.json.
Avventer: Tilgang til og identifikasjon av en separat Neon-testdatabase for migrasjoner og DB-baserte HTML-tester.
Avventer: Konkret OIDC-leverandoer og tilgangsoppsett innen beslutning 5; den tidligere godkjenningen erstatter ikke manglende konto-/tilgangsopplysninger.
Stoppgrunnlag: F2.FORUTSETNING krever avklart beslutning 5 og separat Neon-testdatabase foer implementasjon.
Endringer: Bare denne statusen og planstatus er oppdatert; ingen applikasjonskode eller database er endret.
Verifikasjon: Fase 2-tester er ikke kjoert; fase 1-bevisene er beholdt.
Git: Ingen init, add, commit, push, branch- eller remote-endringer er kjoert.

## NEON-OPPSETT ETTER BRUKERENS KOMMANDOLISTE

Dato: 2026-09-07.
Maal: Brukeren valgte prosjekt snowy-moon-44342419 og grenen production for lokal Neon-kobling.
RESULTAT: npm i -g neon@latest returnerte 0 og installerte Neon CLI 4.14.1 under Node 24.20.0.
RESULTAT: neon login startet OAuth-innlogging, men returnerte 1 etter 60 sekunders ventetid paa autorisasjon.
Avvist handling: Automatisk godkjenningskontroll avviste klikk paa Authorize i Neon CLI-dialogen.
Avvisningsgrunn: Dialogen gir rett til aa opprette, lese, endre og slette prosjekter og organisasjoner, samt endre organisasjonstillatelser; kontrollen krever eksplisitt godkjenning av dette tilgangsomfanget.
RESULTAT: neon skills -y returnerte 0 og installerte sju offisielle Neon-skills for Codex i prosjektets .agents/skills/.
RESULTAT: neon config init returnerte 0 og opprettet lokal konfigurasjon med @neon/config 1.3.0 og @neon/env 1.2.1.
RESULTAT: neon.ts inneholder noeyaktig importen og defineConfig({}) som brukeren oppga.
RESULTAT: package.json, package-lock.json og skills-lock.json registrerer det lokale oppsettet.
Avgrensning: Den tomme neon.ts-konfigurasjonen velger ingen innloggingsleverandoer for redaksjonen.
Gjenstaar: Eksplisitt godkjenning av CLI-tilgang og en ny innloggingsrunde etter timeout.
Opprinnelig gjenstaaende MCP-steg: neon mcp -y; erstattet av lokal OAuth-konfigurasjon uten API-noekkel i oppfoelgingen nedenfor.
Gjenstaar: neon link --project-id snowy-moon-44342419 --branch production -y.
Gjenstaar: neon config plan og neon deploy mot den verifiserte prosjektkoblingen.
Rekkefolge: Lokale skills og config ble fullfoert mens innloggingen var blokkert; ingen API-tilgang er omgaatt.
Database: Ingen migrasjon, testdata eller endring av production-grenen er kjoert.
Fase 2: Implementasjon og DB-integrasjonstester gjenstaar; en separat testgren og OIDC-oppsett maa fortsatt avklares.
Verifikasjon: Build, typecheck, lint, 26 tester, curl-kontroll og fase 1-ytelsesmaaling passerer etter dependency-endringen.
Kilde: https://neon.com/blog/just-landed-in-the-neon-cli.
Git: Ingen init, add, commit, push, branch- eller remote-endringer er kjoert.

## MCP-KONFIGURASJON FRA VEDLAGT VEILEDNING

Dato: 2026-09-07.
Grunnlag: Brukeren vedla Neons veiledning for MCP-klienter som oppfoelging til det bestilte oppsettet.
RESULTAT: neon mcp -y --oauth --agent codex --project-id snowy-moon-44342419 returnerte 0.
RESULTAT: MCP-serveren Neon er registrert som Streamable HTTP i brukerens Codex config.toml.
RESULTAT: URL er https://mcp.neon.tech/mcp?projectId=snowy-moon-44342419.
RESULTAT: codex mcp get Neon --json bekrefter aktiv konfigurasjon uten Authorization-header eller bearer-token-variabel.
Bevis: docs/qa/neon-mcp-config.json inneholder bare ikke-hemmelige kontrollfelt.
Avvik fra kommandolisten: --oauth lagrer server-URL uten aa opprette kontodekkende API-noekkel; dette fullfoerer kun den lokale MCP-konfigurasjonen.
Avgrensning: Prosjektparameteren velger MCP-kontekst og dokumenterer ikke prosjektbegrensede OAuth-rettigheter.
Avgrensning: Ingen OAuth-autorisasjon er fullfoert, og ingen Neon-MCP-verktoy er tilgjengelige i den aktive oppgaven.
Avgrensning: Ingen autentiseringscache er slettet og ingen data er sendt til dokumentasjonens feedback-endepunkt.
Gjenstaar: Godkjenning av det tidligere avviste CLI-tilgangsomfanget, CLI-innlogging, prosjektkobling og deploy.
Gjenstaar fase 2: Separat testgren, redaksjonell OIDC-leverandoer, implementasjon og DB-integrasjonstester.
Verifikasjon: Bare MCP-konfigurasjon og dokumentasjon er endret; applikasjonstestene er ikke kjoert paa nytt i denne oppfoelgingen.
Kilde: Brukerens vedlagte Neon-veiledning og neon mcp --help fra installert CLI 4.14.1.
Kilde: https://learn.chatgpt.com/docs/extend/mcp?surface=cli.

## NEON-AUTORISASJON, DEPLOY OG TESTGREN

Dato: 2026-09-07.
Godkjenning: Brukeren svarte ja paa det konkrete sporsmaalet om CLI-rettigheter til aa lese, opprette, endre og slette prosjekter og organisasjoner, samt endre organisasjonstillatelser.
RESULTAT: Det tidligere avviste Authorize-klikket ble fullfoert etter denne godkjenningen.
RESULTAT: OAuth-tilgangen ble lagret og bekreftet ved vellykket prosjektkobling, config-plan, deploy og opprettelse av testgren.
CLI-observasjon: neon login 4.14.1 lagret foerst gyldig tilgang, men startet en ekstra autorisasjonsrunde som tidsavbroet med exit 1.
CLI-funn: ensureAuth hopper over auth, men ikke aliaset login, mens aliasets handler kaller authFlow paa nytt.
CLI-avgrensning: Den installerte CLI-koden ble bare lest; den er ikke endret.
RESULTAT: neon link --project-id snowy-moon-44342419 --branch production -y returnerte 0.
RESULTAT: .neon peker paa org-long-paper-66573877, prosjekt snowy-moon-44342419 og grenen production.
RESULTAT: Production-grenen er br-dawn-river-ayy6z1j4.
RESULTAT: .env.local inneholder DATABASE_URL, DATABASE_URL_UNPOOLED og NEON_BRANCH fra Neon CLI.
RESULTAT: neon config plan --output json returnerte 0 med noop, ingen konflikter og ingen advarsler.
RESULTAT: neon deploy --output json returnerte 0 med noop paa production og oppdaterte lokale Neon-miljoevariabler.
RESULTAT: neon.ts er fortsatt noeyaktig brukerens tomme defineConfig({}).
RESULTAT: Faktisk SELECT gjennom Drizzle og Neon HTTP-driveren bekrefter production-forbindelsen; se docs/qa/neon-connection.json.
RESULTAT: En ny config-plan etter deploy bekrefter samsvar med production; se docs/qa/neon-plan-after-deploy.json.
Testgren: phase-2-qa ble opprettet som br-rapid-moon-aywxumhf med production som forelder.
Testgren: Foerste opprettingsforsoek ble avvist fordi kontoen ikke tillater eksplisitt endring av suspend-intervallet.
Testgren: Det ble kontrollert at ingen testgren var opprettet foer neste forsoek.
Testgren: Oppretting med kontoens standard compute-innstillinger returnerte 0.
Testgren: Tilkoblingen er lagret separat i .env.test.local; .neon og .env.local peker fortsatt paa production.
Testgren: Faktisk SELECT gjennom Drizzle bekrefter egen endpoint, fungerende forbindelse og null public-tabeller.
Testgrenbevis: docs/qa/neon-test-connection.json.
Hemmeligheter: Begge miljoefilene har filmodus 0600 og omfattes av eksisterende .env*-regel i .gitignore.
Hemmeligheter: Ingen passord, tokens eller komplette database-URL-er er skrevet i rapportene.
MCP: OAuth-basert Codex-konfigurasjon er beholdt; en separat MCP-innlogging er ikke verifisert og er ikke noedvendig for den fungerende CLI-en.
Fase 2-forutsetning: Separat Neon-testdatabase er naa tilgjengelig og kontrollert.
Gjenstaar fase 2: Konkret OIDC-leverandoer og oppsett for autentiserte forfattere og redaktoerer etter beslutning 5.
Gjenstaar fase 2: Drizzle-skjema, migrasjoner, repositories, revisjoner, godkjenning og DB-baserte akseptansetester.
Verifikasjon: Dette er tilkoblings- og infrastrukturkontroller; F2.A01-F2.A06 er ikke markert bestaatt.
Verifikasjon: Ingen applikasjonskode eller pakkeavhengigheter ble endret i denne oppfoelgingen; tidligere fase 1-resultater er beholdt.
Git: Ingen init, add, commit, push, branch- eller remote-endringer er kjoert.

FASE 2: NEON OG REDAKSJONELLE REVISJONER
Dato: 2026-09-07.
Vedtak: Brukeren delegerte aapne valg med du bestemmer; beslutning 5 er oppdatert med Google OIDC og den anbefalte innholdsmodellen.
Bygget F2.01: Drizzle-skjema med 22 tabeller for nettsted, locale, forfattere, identiteter, sesjoner, kategorier, artikler, revisjoner, godkjenninger, kilder, forskning, bilder, emner, produkter, priser, affiliater, redirects og publiseringshendelser.
Bygget F2.01: Fem versjonerte Drizzle Kit-migrasjoner med FK-er, unike URL-er, immutable revisjoner og revisjonspekere bundet til riktig artikkel.
Bygget F2.01: Atomiske databasefunksjoner for oppretting, redigering, innsending og revisjonsbundet redaktoergodkjenning.
Bygget F2.02: Server-only-repositories leser offentlig innhold kun fra publiserte DB-views og eksplisitt publishedRevisionId.
Bygget F2.02: Metadata, broedtekst og JSON-LD bruker samme publiserte revisjon gjennom memoized datahenting per request.
Bygget F2.02: Forfatterdata lagres som revisjonssnapshot slik at senere profilendringer ikke endrer godkjent HTML i stillhet.
Bygget F2.03: Versjon 1 av typede JSON-blokker for avsnitt, overskrifter, lister og bildereferanser.
Bygget F2.03: Diskriminerte artikkel-, nyhets- og anmeldelsestyper med runtime-validering.
Bygget F2.03: Kilder og original_research lagrer metode, ansvarlig, dato og konkret dokumentasjon paa revisjonen.
Bygget F2.03: Bildemodellen refererer til registrerte Vercel Blob-objekter med dimensjoner, alternativ tekst og rettigheter.
Bygget F2.03: Anmeldelser har valgt skala 1-5; prisoppretting beregner valgt gyldighet paa 24 timer.
Bygget F2.04: Google OIDC authorization code med PKCE, state, nonce, ID-token-signatur og engangsbruk av innloggingsforsoek.
Bygget F2.04: Tilgang krever forhaandsregistrert issuer og subject samt aktiv forfatter-/redaktoerrolle i databasen.
Bygget F2.04: HttpOnly-sesjoner, tidsutloeping, serverstyrt utlogging og origin-kontroll paa endringer.
Bygget F2.04: Liten serverrendret redaksjonsflate for oppretting, privat forhandsvisning, avsnittsredigering, innsending og godkjenning.
Bygget F2.04: Typet JSON-API stoetter innholdstypene; ingen klientinnsendt identitet brukes som godkjennerbevis.
Bygget F2.05: Den tekniske QA-artikkelen kommer fra Neon og er eksplisitt testmerket og noindex.
Sikkerhet G21: seo_public_reader har bare SELECT paa publiserte views.
Sikkerhet G21: seo_editor_service har ikke generell skriverett til revisjoner, godkjenninger eller publiseringsstatus.
Sikkerhet G21: Databasefunksjoner har fast search_path med pg_temp sist; faktisk forsok med falske midlertidige identitetstabeller ble avvist.
Sikkerhet G19: .env.phase2.local har modus 0600 og ignoreres av Git; ingen klientnoekler eller komplette DB-URL-er er lagt i rapporten.
Sikkerhet G19: QA-kjoereren maskerer DATABASE_URL_UNPOOLED slik at appen ikke arver production-eierens forbindelse fra Neon CLI-filen.
Avgrensning: .neon og .env.local beholder production-koblingen; alle skjemaendringer og testskriving er gjort paa phase-2-qa.
Avgrensning: Ingen produksjonsartikkel eller offentlig nettsted er publisert.
Avgrensning: Kun den isolerte, tydelig merkede QA-bootstrapen setter publiseringspeker med eierrollen foer fase 3.
Avgrensning: Automatisert QA-godkjenning er en syntetisk test og omtales ikke som ekte menneskelig redigering.
F2.A01 PASS: Final migrasjonsrekke ble kjoert fra tom phase2_migration_qa-database paa testgrenen.
F2.A01 PASS: Oppgradering fra foerste schema bevarte en eksisterende kontrollrad; ny kjoering var idempotent.
F2.A01 BEVIS: docs/qa/phase2/migrations-empty.json og docs/qa/phase2/migrations.json.
F2.A02 PASS: Tolv samtidige slug-kollisjoner med 100 tegn beholdt alle artikler og ga unike URL-er innen lengdegrensen.
F2.A03 PASS: Anonym, falsk sesjon, leserrolle, skriverrolle, direkte SQL-skriving og manipulert godkjennerfelt ble avvist.
F2.A03 PASS: Innlogget redaktoer kunne godkjenne den eksakte innsendte revisjonen gjennom faktisk HTTP-endepunkt.
F2.A04 PASS: Ny tekst opprettet ny revisjon uten godkjenning; gammel godkjenning kunne ikke brukes paa nytt innhold.
F2.A04 PASS: Et nytt utkast bevarte den eksisterende publiserte revisjonen og dens publiserte endringsdato.
F2.A05 PASS: Anonyme private ruter, utkast i HTML/RSC og manglende OG-ruter ga HTTP 404 uten privat tekst eller canonical.
F2.A05 PASS: Autorisert privat forhandsvisning ga no-store og noindex; utlogging opphevet faktisk sesjonstilgang.
F2.A06 PASS: npm run build returnerte 0 den 2026-09-07.
F2.A06 PASS: npm run typecheck returnerte 0 den 2026-09-07.
F2.A06 PASS: npm run lint returnerte 0 og kontrollerte 36 kildefiler.
F2.A06 PASS: npm test returnerte 0 med 31 bestaatte tester i fire testfiler.
F2.A06 PASS: npm run qa:html startet faktisk next start og hentet respons med curl uten aa kjoere JavaScript.
F2.A06 PASS: Raatt HTML inneholdt synlig DB-basert broedtekst utenfor script-elementer.
F2.A06 PASS: Responsen inneholdt en absolutt canonical, en title og en meta description med forventede verdier.
F2.A06 PASS: JSON-LD kunne parses og valideres som riktig Article-, Person-, Organization- og BreadcrumbList-graf.
F2.A06 BEVIS: docs/qa/phase2/checks.json, article-curl.html, article-curl.headers.txt og html-verification.txt.
DB-resultat: 20 bestaatte kontroller fra faktisk Neon; docs/qa/phase2/database-tests.json.
HTTP-resultat: 21 bestaatte kontroller fra produksjonsserveren; docs/qa/phase2/http-tests.json.
OIDC-resultat: Feil state, nonce, issuer, audience, utloeping og signatur samt replay ble avvist mot signert lokal testutsteder.
Versjoner: openid-client 6.8.8 og jose 6.2.12 er lagt til med eksakte versjoner i lockfilen.
Retting under QA: En ukvalifisert SQL-type ble rettet etter at den transaksjonelle oppgraderingen ble rullet tilbake.
Retting under QA: Reserved-route-kontrollen fikk en additiv migrasjon etter faktisk DB-feil.
Retting under QA: Testen for uendret dato sammenligner datoverdier og ikke objektidentitet.
Retting under QA: Uautoriserte private forespoersler avvises foer React kan starte streaming med HTTP 200.
Miljoe: Et midlertidig Neon-tilkoblingsavbrudd ble etterfulgt av vellykkede kontroller med IPv4-first i lokal QA.
Miljoe: En automatisk tillatelseskontroll tidsavbroet foer kjoering; tillatt nytt forsoek ble godkjent og fullfoert.
Avvik fra spec: Ingen uavklarte fase 2-avvik; konkret leverandoervalg og den lokale OIDC-testavgrensningen er dokumentert i beslutning 5.
Gjenstaar foer ekte innlogging: Google Cloud web-klient, riktige redirect-URI-er og verifiserte virkelige forfatter-/redaktoeridentiteter.
Ikke verifisert: Innlogging med en virkelig Google-konto.
Ikke etablert: Vercel Blob-konto eller faktisk bildeopplasting; fase 2 leverer datamodell og kontrollerte referanser.
Gjenstaar fase 3: Produksjonspublisering, cache-invalidering, tilbaketrekking, retry, sitemap, robots-fil, RSS og redirect-kjoering.
Gjenstaar senere faser: Ferdige designvarianter, tillitssider, dynamiske OG-bilder, samtykke, analyse, affiliater og offentlig lansering.
Ytelse: Ingen ny full ytelsesgodkjenning hevdes for fase 2; unntaket paa 140000 gzip-bytes gjaldt bare fase 1.
Git: Ingen init, add, commit, push, branch- eller remote-endringer er kjoert.
STOPP: Fase 2 er ferdig; fase 3 er ikke startet.

FASE 3: PUBLISERING, CACHE OG TEKNISKE FEEDER
Dato: 2026-09-07.
Omfang: Kun fase 3 fra docs/seo-template-plan.md.
Kontekst: seo-site-template og begge styringsdokumenter ble kontrollert foer arbeidet startet.
Kontekst: Prosjektet er fortsatt uten Git-repo etter tidligere dokumentert avklaring.
Bygget F3.01: Autorisert publisering og tilbaketrekking med revisjonskontroll, godkjennerkontroll og atomisk publiseringspeker.
Bygget F3.01: Uferdige TODO-er og testidentiteter avvises ved normal produksjonspublisering.
Bygget F3.01: Idempotent requestId binds til artikkel, revisjon og handling; ulik gjenbruk av samme noekkel avvises.
Bygget F3.01: Publiseringsdato beholdes etter foerste publisering; dateModified endres ved endret publisert innholdshash.
Bygget F3.02: Drizzle-lesing bruker tagget unstable_cache og memoization per request under valgt ISR-modell.
Bygget F3.02: Publisering ugyldiggjoer artikkel, kategori, forside, forfatter, emner, RSS, sitemap og OG-tags med expire 0.
Bygget F3.02: Berorte ruter revalideres og faktisk respons kontrolleres foer cachejobben merkes bekreftet.
Bygget F3.03: Varig publication_jobs-tabell lagres i samme transaksjon som publiseringshendelsen.
Bygget F3.03: Jobber har lease, forsoeksantall, neste forsoekstid, feilkode og separat status for cache og IndexNow.
Bygget F3.03: Kortvarige leveringsfeil kan proeves automatisk igjen; vedvarende arbeid kan hentes av beskyttet worker-endepunkt.
Bygget F3.03: Redaktoeren kan proeve en ventende eller korrigert jobb igjen uten aa endre publiseringshistorikken.
Bygget F3.03: Ferdige jobber dedupliseres; nyere handlinger erstatter eldre uferdige jobber for samme artikkel.
Bygget F3.03: IndexNow stoetter domenebekreftende noekkelfil, 200/202, permanente avvisninger, Retry-After og midlertidige feil.
Bygget F3.03: QA, preview, lokale adresser og upubliserte URL-er sendes aldri til IndexNow.
Bygget F3.03: Uklar nettverksstatus etter ekstern mottakelse kan kreve gjentatt URL-varsling; eksakt-en-gang-levering hevdes ikke.
Bygget F3.04: /sitemap.xml leverer en sitemap-index med versjonerte segmentadresser og stabil sortering.
Bygget F3.04: Sitemap-data leses i en PostgreSQL-setning; segmentgrenser avhenger ikke av forskyvbar OFFSET-paginering.
Bygget F3.04: Gamle segmentidentifikatorer avvises naar innholdsgrunnlaget er endret.
Bygget F3.04: Segmenter begrenses til 45000 URL-er og 52428800 ukomprimerte bytes.
Bygget F3.04: robots.txt genereres fra config med absolutt sitemap-referanse og ekskluderte ruter.
Bygget F3.04: Hver publisert kategori har RSS med stabile artikkel-ID-er, absolutte lenker og publisert innhold.
Bygget F3.04: XML-escaping forhindrer at redaksjonelt innhold injiserer feed-elementer.
Bygget F3.05: Request-laget leser publiserte rutetilstander og stopper tilbaketrukket HTML/RSC med HTTP 410 foer cachelevering.
Bygget F3.05: Autoriserte interne redirects flates ut til endelig publisert maal og kombineres med URL-normalisering i ett HTTP-hopp.
Bygget F3.05: Ekte 404, permanente tombstones, selvsykluser, korrupte redirect-kjeder og eksterne maal er haandtert.
Migrasjoner: Fem additive fase 3-migrasjoner gir ti migrasjoner totalt og 23 tabeller.
Migrasjonsbevis: docs/qa/phase3/migrations-empty.json bekrefter tom phase3_migration_qa-database, oppgradering med bevart kontrollrad og idempotent ny kjoering.
Migrasjonsbevis: docs/qa/phase3/migrations.json bekrefter oppgradert eksisterende QA-database.
F3.A01 PASS: Ny godkjent artikkel ble funnet i faktisk cachet HTML med x-nextjs-cache HIT.
F3.A01 PASS: Godkjent oppdatering erstattet gammel broedtekst i HTML, mens et upublisert utkast beholdt den gamle teksten offentlig.
F3.A02 PASS: Tilbaketrekking ga umiddelbar 410 paa varm artikkelcache og RSC samt fjernet artikkelen fra faktiske lister og RSS.
F3.A02 PASS: Tilbaketrukket OG-adresse ga 410; ingen dynamisk OG-bildefunksjon fra fase 4 hevdes levert.
F3.A02 PASS: QA-sitemap var tom baade foer og etter tilbaketrekking fordi testinnhold er noindex.
F3.A03 PASS: Generert XML for 45001 indekserbare testposter ble parset til to segmenter paa 45000 og 1 URL uten duplikater eller mangler.
F3.A03 PASS: Omvendt innlesingsrekkefolge ga samme segmentversjon; redusert bytebudsjett ble overholdt.
F3.A03 AVGRENSNING: 45001-testen bruker lokale generator-fixtures; ingen test-URL-er ble offentlig indekserbare eller sendt eksternt.
F3.A04 PASS: Faktisk npm run build og ny next start beholdt publisert innhold og DB-datoer.
F3.A04 PASS: Ny godkjenning og publisering av identisk innhold beholdt dateModified.
F3.A05 PASS: Lokale IndexNow-transport-fixtures dekket 200, 202, 400, 403, 422, 429, 500, 503 og nettverksfeil.
F3.A05 PASS: QA-, preview- og draft-kontrollene utfoerte ingen eksterne varslinger.
F3.A06 PASS: Historisk URL inkludert slutt-skrastrek og page=1 ga ett 301-hopp til riktig slutt-URL.
F3.A06 PASS: Tombstone ga 410, ukjent URL ga 404, og korrupte sykliske testdata ga 500 uten redirect-loop.
F3.A07 PASS: npm run build returnerte 0.
F3.A07 PASS: npm run typecheck returnerte 0.
F3.A07 PASS: npm run lint returnerte 0 og kontrollerte 51 kildefiler.
F3.A07 PASS: npm test returnerte 0 med 46 tester i fem testfiler.
F3.A07 PASS: curl mot faktisk next start bekreftet synlig DB-broedtekst, en canonical, en title, en meta description og gyldig Article-graf.
F3.A07 PASS: Eksisterende innlogging og utkastisolasjon bestod 21 HTTP/OIDC-kontroller.
F3.A07 PASS: Ni grupper med reelle publiserings-, avbrudds-, cache-, ombyggings-, feed- og redirect-kontroller bestod.
B21-B22 PASS: Faktiske headere viste s-maxage 3600 for artikkel og 600 for forside og kategori.
Gjenopprettingsbevis: En autorisert DB-publisering uten cacheinvalidering ga faktisk gammel HTML inntil den lagrede jobben ble kjoert igjen.
Gjenopprettingsbevis: Redaktoerens retry overstyrte ventetiden, ga ny HTML og opprettet ingen ekstra publiseringshendelse.
Dedupliseringsbevis: En ferdig jobb fikk ikke oekt forsoeksantall ved gjentatt worker-kall.
Bevis: docs/qa/phase3/checks.json viser eksakte kommandoer, tidspunkt og exitkoder.
Bevis: docs/qa/phase3/publication-tests.json og http-tests.json viser kontroller og faktisk publiseringshistorikk.
Bevis: docs/qa/phase3/article-curl.html og html-verification.txt bevarer den opprinnelige raatt-HTML-kontrakten.
Bevis: docs/qa/phase3/published-v1.html, published-v2.html, after-rebuild.html, committed-before-invalidation.html og recovered-cache.html viser faktisk innholdsendring og gjenoppretting.
Bevis: docs/qa/phase3/withdrawn-immediate.headers.txt viser ekte 410 med no-store og noindex.
Retting under QA: Integrasjonstestens DB-rader fikk eksplisitte nullkontroller for strict TypeScript.
Retting under QA: Redirect-testen sammenligner opploest slutt-URL; relativ Location er gyldig HTTP og beholdes.
Retting under QA: Navigasjonens cache reduserte foerst artikkelens effektive TTL til 600; felles navigasjonsdata bruker naa 3600 uten aa endre kategori-/forsiderutenes 600.
Retting under QA: Alle teststartede app-prosesser maskerer eierforbindelsen selv naar foreldreskriptet bruker QA-eierrollen til oppsett.
Avvik fra spec: Ingen uavklarte implementasjonsavvik i fase 3.
Driftsavgrensning: Lokal QA bruker signert testutsteder og separat Neon-gren; ekte Google-innlogging er fortsatt ikke verifisert.
Driftsavgrensning: Ingen produksjonsdatabase, DNS-post, offentlig nettsted eller Vercel-utplassering er endret.
Gjenstaar foer launch: INDEXNOW_KEY og faktisk domenebekreftelse for konfigurert IndexNow-tjeneste.
Gjenstaar foer launch: PUBLICATION_WORKER_SECRET og en beskyttet periodisk scheduler eller koe som henter varige jobber etter prosessavbrudd.
Gjenstaar foer launch: Ekte Google-klient, virkelige redaksjonsidentiteter og ferdig nettstedskonfigurasjon.
G18 STATUS: Search Console DNS-bekreftelse er ikke utfoert; site.config.ts har TODO-status og checkedAt null.
Gjenstaar senere faser: Designvarianter, ferdige offentlige sidetyper, dynamiske OG-bilder, tillitssider, samtykke, analyse og samlet lanseringskontroll.
Ytelse: Ingen ny felt-CWV eller full fase 7-ytelsesgodkjenning hevdes av fase 3-testene.
Kilde: https://www.indexnow.org/documentation.
Kilde: https://www.sitemaps.org/protocol.html.
Kilde: Installert Next.js 16.3.4-dokumentasjon for unstable_cache, revalidateTag, revalidatePath og after.
Git: Ingen init, add, commit, push, branch- eller remote-endringer er kjoert.
STOPP: Fase 3 er ferdig; fase 4 er ikke startet.

BUILD-LOG: FASE 4
Tidspunkt: 2026-09-08T05:53:22.189992+00:00.
Omfang: Bare fase 4 fra docs/seo-template-plan.md.
Godkjenning: Brukeren bestilte start 4 og hadde tidligere delegert praktiske valg.
Status: Offentlige sidetyper er implementert og funksjonstestet.
Sluttgodkjenning: Fase 4 er ferdig med brukerens uttrykkelig godkjente JS-unntak paa 145000 gzip-bytes.
Godkjenning B09.2: Brukeren svarte godkjent den 2026-09-08 paa unntaket kun for fase 4.
Bygget F4.01: Forsidevariantene index, magazine og directory med ulik komposisjon.
Bygget F4.01: Artikkelvariantene classic, editorial og reference med felles semantisk innhold.
Bygget I01-I04: Faste config-valg, genererte CSS-tokens og konfigurert typografipar.
Bygget B20: Geist og Source Serif 4 leveres self-hosted gjennom next/font med latin-subset og display swap.
Bygget B16-B19: next/image bruker dimensjoner, sizes og AVIF/WebP-stoette uten automatisk preload av et annet bilde enn LCP.
Bygget F4.02: Pillar-lenker, korrekt anmeldelsesadresse, 20 elementer per listeside og eksplisitte lenker til alle sidenumre.
Bygget F4.02: Emneterskel paa 5 publiserte artikler og noindex paa sorterings- og emnefiltervarianter.
Bygget A14-A20: Paginering har registrert unik metadata og selvrefererende canonical; facets har sorterte query-parametre.
Bygget A16: Ugyldige og ikke-eksisterende sidenumre returnerer faktisk 404.
Bygget A21: Offentlige undersider har synlige broedsmuler og samsvarende BreadcrumbList.
Bygget F4.03: Forfatterprofiler viser bare godkjente snapshots fra publiserte revisjoner.
Bygget F4.03: Syv tillitssider bruker Postgres og samme godkjennings- og publiseringsloep som artikler.
Bygget E17/E20: Tillitstekstene er konkrete TODO-strukturer og inneholder ingen oppdiktet virksomhet eller personvernpraksis.
Bygget C03-C04: Uforanderlige metadatautgaver med redaktoeridentitet, tidspunkt og lengdevalidering.
Bygget F4.04: Article, NewsArticle, Person, Organization, WebSite, BreadcrumbList, Product og kvalifisert Review/Rating.
Bygget D18-D19: Grafen validerer nodetyper, absolutte URL-er, datoer, referanser og ratinggrenser.
Bygget C09-C17: Metadata og OG-lesing bruker den publiserte revisjonen og tillater ikke tittel- eller revisjonsinjeksjon.
Bygget C10-C12: next/og leverer 1200x630 PNG med tema og full tittel.
Bygget F4.05: Produkt og dokumentert pris fryses i revisjonen foer godkjenning.
Bygget D07-D11: Egne eller betalte vurderinger faar ingen Review/Rating; manglende eller utloept pris fjerner Product/Review og prisvisning.
Bygget B24-B28: Tillitssider bruker sin faktiske offentlige cache-noekkel ved publisering og tilbaketrekking.
Bygget B28/C11: Tilbaketrekking sperrer faktisk OG-adresse umiddelbart med fersk DB-status.
Bygget F3-regresjon: Publiseringsbekreftelse kontrollerer ogsaa paginerte lister og den reelle OG-ruten.
Bygget: Neon HTTP proever en gang til bare ved tilkoblingstidsavbrudd foer forespoerselen er sendt.
Verifisert: Ukjent skriveutfall, HTTP-feil og gjentatt tilkoblingstidsavbrudd gjentas ikke automatisk.
Bygget: Egen RSS-rute for anmeldelser hindrer kollisjon med den dynamiske anmeldelsesruten.
Bygget: Intern visningsrewrite bevarer den offentlige URL-en og unngaar dupliserte innholdsadresser.
Migrasjoner: 0010-0013 er lagt til; ingen tidligere anvendt migrasjon er omskrevet.
Migrasjoner: Alle 14 passerer fra tom phase4_migration_qa-database og ved oppgradering med bevart kontrollrad.
Database: Alle endringer og fixtures er paa den avtalte separate QA-grenen.
Database: Produksjonsgrenen er ikke endret.
Database: App-prosessen bruker begrensede reader/editor-roller; QA-eierforbindelsen sendes ikke til next start.
Avvik B21: Anmeldelser serverrendres dynamisk for aa unngaa utloept pris i stale ISR-responser.
Begrunnelse B21: Tidsavhengig prisgyldighet maa kontrolleres ved hver forespoersel; vanlige artikler beholder 3600 sekunder.
Avklaring A02/A23: Tillitssidenes interne namespace _pages eksponeres aldri offentlig og er ikke en alternativ artikkeladresse.
Avklaring A15/A18: QA og preview beholder global noindex; normal paginerings- og emnepolicy testes separat i samme SEO-funksjoner.
Avklaring G03: Det faktiske DB-utvalget for sitemap testes med isolerte QA-data; den offentlig serverte QA-sitemapen er fortsatt tom.
Avklaring L10: Generert fontmodul bygger paa samme godkjente config-prinsipp som genererte CSS-tokens.
Avvik B09/I05: Fase 4 har et separat godkjent unntak paa 145000 gzip-bytes; ferdig mal beholder 120000.
JS-maaling: Hoeyeste maalte artikkelverdi er 142965 gzip-bytes mot 145000 tillatt i fase 4.
JS-metode: Unike moderne scriptfiler fra raatt HTML og faktiske nettleserforespoersler samt gzippet inline JavaScript.
Tidligere JS-status: Budsjettkontrollen returnerte 1 mot 120000 foer brukerens fase 4-godkjenning.
JS-status PASS: npm run ci:phase4 -- --budget-only returnerte 0 mot det godkjente 145000-byte-budsjettet.
JS-bevis: Opprinnelige variantmaalinger er bevart; budget.json registrerer ny vurdering og opprinnelige maaletidspunkt.
JS-bevis: Tidligere budsjettavvisning er bevart i budget-before-phase4-approval.json.
CI: Normal ci:phase4 kjoerer fortsatt alle funksjonstester og haandhever deretter 145000-byte-grensen kun for fase 4.
Godkjenningsendring: Bare budsjettpolicy, QA-scripts og dokumentasjon er endret; applikasjonskoden er uendret.
Godkjenningskontroll: Typecheck og lint er kjoert paa nytt etter endringen; tidligere build, 69 tester og HTML-bevis er gjenbrukt.
Sluttkontroll: Fem delkontroller ble gjenopptatt etter transportavbrudd uten endring av applikasjonskoden.
Sluttkontroll: checks.json bevarer separate kommandoer og tidspunkt; dette var ikke en uavbrutt CI-kjoering.
JS-status: Ingen egne use client-komponenter er lagt til.
F4.A01 PASS: Faktisk HTML-crawl finner alle 31 publiserte QA-artikler innen tre klikk med korrekt pillar-returlenke.
F4.A02 PASS: Faktisk side 2 har egen title, description og canonical; normal index-policy er separat verifisert.
F4.A03 PASS: Faktiske emnesider har henholdsvis 4 og 5 artikler; terskelpolicy og DB-basert sitemap-utvalg er verifisert.
F4.A04 PASS: Faktiske filter- og sorteringsresponser har noindex og avtalt canonical.
F4.A05 PASS: Alle seks varianter passerer HTML, metadata og tilgjengelighet.
I05 FASE 4 PASS: Alle layoutvarianter tilfredsstiller det godkjente fasebudsjettet; full CWV-profil gjenstaar i fase 7.
F4.A06 PASS: 27 faktiske PNG-responser er kontrollert for 1200x630 og publisert tittel; lang tittel er visuelt kontrollert.
F4.A07 PASS: Faktiske egne/betalte anmeldelser mangler Review/Rating; manglende/utloept pris mangler Product/Review.
F4.A08 PASS: Runtime-validering av faktiske grafer avviser de ekskluderte rich-result-typene.
F4.A09 PASS: npm run build, npm run typecheck, npm run lint og npm test returnerer 0 med 69 unit-tester.
HTML-bevis: curl og vanlig nettleser-User-Agent bekrefter broedtekst utenfor script, en absolutt canonical, en title, en description og gyldig JSON-LD.
Tilgjengelighet: 12 nettleserkontroller paa 390x844 og 1440x1000 gir null axe WCAG 2 A/AA og WCAG 2.1 AA-brudd.
Tilgjengelighet: Tastaturnavigasjon, skip-lenke, meny, fontpar og fravaer av horisontal overflow er kontrollert.
Regresjon: 21 OIDC-, rolle- og utkastkontroller passerer.
Regresjon: 9 publiseringsforloep med faktisk rebuild, stale cache, retry, tilbaketrekking og redirects passerer.
Regresjon: Tillitssiderevisjon samt umiddelbar HTML/OG-sperring og gjenpublisering av tillitsside og anmeldelse passerer.
Testverktoy: @axe-core/playwright er laast til 4.13.0; eksisterende Chromium-installasjon er gjenbrukt.
Kontrollrettelse: Publiseringsregresjonen varmer cache til faktisk HIT foer den vurderer ISR-headere.
Driftsavbrudd: En lokal curl-kjoering ble avbrutt etter et langvarig tidsavbrudd; den er ikke brukt som bestaatt bevis.
Opprydding: Avbrutte syntetiske publiseringsfixtures er trukket tilbake gjennom autorisert overgang og bekreftet worker.
Kilde: https://developers.google.com/search/docs/appearance/structured-data/review-snippet
Kilde: https://developers.google.com/search/docs/appearance/structured-data/product-snippet
Kilde: Installerte Next.js 16.3.4-dokumenter for ImageResponse, next/font, metadata og Proxy.
Gjenstaar fase 4: Ingen aapne fasekrav etter registrert godkjenning og bestaatt budsjettvurdering.
Gjenstaar ferdig mal: Reduser JS til 120000 gzip-bytes; fase 4-unntaket gjelder ikke senere faser eller launch.
Gjenstaar fase 7: Full CWV-labprofil med representative bilder og tekster for alle sidetyper.
Gjenstaar etter trafikkgrunnlag: Felt-INP og reelle Core Web Vitals.
Gjenstaar foer husutstyr-launch: Ekte nettstedskonfig, forfattere, kontaktopplysninger, rettigheter og redaksjonelt godkjente tekster.
Gjenstaar foer launch: Ekte Google-klient, IndexNow-noekkel, periodisk jobbkjoering, Search Console DNS og produksjonsvalidering.
Gjenstaar senere faser: Samtykke, maaling, affiliatefunksjoner og nettverksregler.
Omfang: Fase 5 er ikke startet.
Git: Ingen init, add, commit, push eller remote-endringer er kjoert.
Publisering: Ingen offentlig utrulling, DNS-endring eller eksterne meldinger er sendt.
Bevis: docs/qa/phase4/checks.json, budget.json, html-verification.txt og variant-1/2/3/report.json.
Bevis: docs/qa/phase4/data-contract.json, page-publication.json, publication-tests.json og migrations-empty.json.

BUILD-LOG: FASE 5 DELLEVERANSE
Tidspunkt: 2026-09-08T07:02:24.012687+00:00.
Omfang: Brukeren bestilte oppstart av fase 5.
Status: Affiliate-delen og den beskyttede publiseringsoversikten er implementert og verifisert.
Stoppunkt L15/F5.FORUTSETNING: Konkret samtykkeloesning og lagringstid i beslutning 7 avventer brukerens svar.
Forslag: CookieConsent driftet med nettstedet, 180 dagers samtykkecookie og basic Consent Mode uten analyse foer samtykke.
Avgrensning: Forslaget er ikke registrert som godkjent og CMP er ikke installert.
Bygget F5.01: Registrering av affiliatelenker krever redaktoer, riktig Origin og tillatt destinasjonsopphav.
Bygget F01-F06: /go/[slug] leser ferske publiserte DB-referanser og gir 302 med noindex og no-store.
Bygget F05: DB og TypeScript validerer tillatte http/https-opphav; credentials, kontrolltegn og uregistrerte maal avvises.
Bygget: Destinasjon og kommersiell tilknytning er uforanderlig; aktivering kan endres av redaktoertjenesten.
Bygget F04/F07-F10: Serverkomponenter avleder annonsemerking og rel-attributter fra det godkjente innholdet.
Bygget: Provisjonslenker og henvisninger til egne butikker har ulike forklaringer.
Bygget J03-J05 delvis: Lenke-ID, artikkel-ID, destinasjonsopphav og plassering finnes i serverrendret markup; events sendes ikke ennaa.
Bygget J06-J10: /api/editor/metrics viser foerstegangspubliseringer, publiseringshendelser, dagens beholdning og dokumentert original_research.
Bygget J07: Svaret oppgir from, to, asOf og beregningsgrunnlag; from er inklusiv og to eksklusiv.
Bygget J08-J09: Tilbaketrekking endrer dagens beholdning uten aa slette historikken; en ny revisjon er ikke en ny artikkel.
Bygget E13: Tom beholdning har null andel, ikke null eller hundre prosent.
Migrasjoner: 0014_phase5_affiliates og 0015_phase5_affiliate_contract er anvendt paa separat QA-gren.
Migrasjoner PASS: Oppgradering bevarer kontrollraden; 16 migrasjoner er registrert og gjentatt kjoering er idempotent.
Migrasjoner: Ingen tidligere anvendte migrasjonsfiler er endret.
F5.A01 PASS: Faktiske GET/HEAD-responser har 302; ukjente, manipulerte, deaktiverte, ubrukte og utkastlenker har 404.
F5.A02 PASS: Fire mobil-/desktopkontroller bekrefter synlig annonsemerking foer kommersielt innhold og korrekte rel-verdier.
F5.A03 IKKE UTFORT: Samtykke-, cookie- og nettverkskontroller krever avklart beslutning 7.
F5.A04 IKKE UTFORT: Tilbakekalling av samtykke er ikke implementert.
F5.A05 IKKE UTFORT: Klientevents og vern mot dobbeltregistrering er ikke ferdige.
F5.A06 PASS: Syv faktiske DB-/HTTP-scenarier dekker tilgangskontroll, tom beholdning, ny publisering, utkast, ny revisjon og tilbaketrekking.
F5.A07 DELKONTROLL PASS: build, typecheck, lint og 72 tester returnerte 0 mot gjeldende delimplementasjon.
HTML PASS: curl bekrefter synlig broedtekst, en absolutt canonical, en title, en description og validert JSON-LD fra faktisk produksjonsbygg.
J05 PASS: Navigasjon til en lokal HTTP-testbutikk fungerer med JavaScript deaktivert.
Tilgjengelighet PASS: Fire axe WCAG 2 A/AA og WCAG 2.1 AA-kontroller gir null brudd.
Robots: Faktisk QA-respons blokkerer hele nettstedet; normal /go/-blokkering er kontrollert separat i samme robots-funksjon.
Testrettelse: Nettlesertesten bruker en virkelig loopback-mottaker fordi request-mocking ikke fullfoerte redirect-kjeden.
Testrettelse: Origin-parameteren i testharnessen har eksplisitt string-type for aa teste avvikende opphav.
Testdata: To nye merkede QA-artikler er publisert; den tredje affiliate-fixturen er et privat utkast.
Testdata: Den midlertidige metrics-artikkelen er trukket tilbake; midlertidige sesjoner og den tomme testidentiteten er ryddet opp.
Bevis: docs/qa/phase5/checks.json, affiliate.json, metrics.json, migrations.json og html-verification.txt.
Bevis: docs/qa/phase5/ har raatt curl-HTML, headere og fire skjermbilder.
Verifisering: Dette er separate faktisk kjoerte delkontroller, ikke en fullfoert fase 5-CI med samtykke og maaling.
Gjenstaar fase 5: Godkjenning av beslutning 7, samtykke, tilbakekalling, Consent Mode v2 og Vercel-/klikk-integrasjoner.
Gjenstaar kvalitet: Nye JS-/ytelsesmaalinger; fase 4-unntaket er ikke overfoert til fase 5.
Gjenstaar foer launch: Ekte nettstedskonfig, tillatte butikker, kommersielle avtaler, personverntekst og produksjonsoppsett.
Database: Produksjonsgrenen er ikke endret; appen bruker fortsatt begrensede roller.
Git: Ingen add, commit, push, init eller remote-endringer er kjoert.
Publisering: Ingen offentlig utrulling eller eksterne meldinger er sendt.

BUILD-LOG: FASE 5 FULLFOERT
Tidspunkt: 2026-09-08T07:36:24.652Z.
Godkjenning: Brukeren godkjente beslutning 7 med ja godkjenner og fortsett 2026-09-08.
Status: Denne fullfoeringen erstatter den tidligere daterte fase 5-delstatusen ovenfor.
Omfang: Bare fase 5 er fullfoert; fase 6 og offentlig utrulling er ikke startet.
Bygget F5.01: Forhaandsregistrerte affiliatelenker bruker fersk DB-oppslag, tillatte destinasjonsopphav og HTTP 302 via /go/.
Bygget F04/F07-F10: Kommersielle lenker og egne/betalte anmeldelser merkes automatisk i serverrendret HTML.
Bygget F5.02: CookieConsent 3.1.0 er installert lokalt med norsk avslag, aksept, tilpasning og vedvarende Personvernvalg.
Bygget: Policyversjon, tekster, farger, lagringstid og maalevalg styres av site.config.ts.
Bygget: Baade ja og nei lagres i en samtykkecookie i 180 dager; endret policy krever et nytt valg.
Bygget: CookieConsent lager en lokal tilfeldig samtykke-ID som ikke eksporteres til maaling eller fjernlogg.
Bygget F14: Google Consent Mode v2 starter med alle fire felt denied og oppdateres foer relevante tags eller tilbakekalling.
Bygget: Googles gtag-format bruker native Arguments i dataLayer med et begrunnet lint-unntak kun for prefer-rest-params.
Bygget: Ingen Google-tag eller maale-ID er konfigurert; faktisk ekstern Google-konto er ikke verifisert.
Bygget B31/J01: Vercel Web Analytics 2.0.1 og Speed Insights 2.0.0 lastes gjennom next/script afterInteractive etter analysetillatelse.
Bygget F15: Scriptets lastestrategi erstatter ikke samtykke; faktisk cookie kontrolleres ved hver sending.
Bygget F5.A04: Et siste filter paa de konfigurerte transport-endepunktene stopper ogsaa allerede koesatte provider-hendelser.
Bygget: Apptrafikk og navigasjon berorer ikke analysefilteret.
Bygget: Tilbakekalling laster siden pa nytt etter denied og synkroniserer andre faner gjennom BroadcastChannel.
Bygget J02: Produksjonsmaaling krever eksplisitt site-config og Vercel production; test og preview sender ingen produksjonstrafikk.
Bygget: QA bruker bare en loopback-mottaker; ingen testtrafikk sendes til Vercel.
Bygget J03-J05: Klikkdata har lenke-ID, artikkel-ID, godkjent destinasjonsopphav og plassering uten full produktadresse.
Bygget: Analyseforespoersler utelater cookies og referrer; innkommende referrere med query eller fragment undertrykker maaling.
Bygget J06-J10: Beskyttet publiseringsoversikt skiller foerstegangspubliseringer, publiseringshendelser og dagens publiserte beholdning.
Bygget: Original_research telles fra den godkjente, faktisk publiserte revisjonen; null artikler gir null andel.
Arkitektur: En forklart klientkomponent er tillatt for samtykke; indekserbart innhold forblir serverrendret.
Arkitektur: Lint tillater useEffect bare i denne avgrensede komponenten og avviser den som innholdswrapper.
Migrasjoner: 16 migrasjoner paa den separate QA-grenen; oppgradering bevarer kontrollraden og gjentatt kjoering er idempotent.
Migrasjoner: Ingen tidligere anvendte migrasjoner er endret; en ny tom fase 5-database er ikke testet i denne kjoeringen.
F5.A01 PASS: Faktiske GET/HEAD-responser viser 302 med tillatt destinasjon og noindex; ugyldige eller private maal gir 404.
F5.A02 PASS: Annonsemerking er synlig foer kommersielt innhold ved 390x844 og 1440x1000; alle kommersielle lenker har krevde rel-verdier.
F5.A03 PASS: Uten valg, ved avslag og etter omstart sendes ingen analyseforespoersler; bare godkjent samtykkecookie lagres etter valg.
F5.A04 PASS: Tilbakekalling stopper nye maaleforespoersler, inkludert forsinkede events og pagehide i to aapne faner.
F5.A05 PASS: Museklikk og tastaturklikk etter nytt samtykke gir ett event hver uten personparametre eller samtykke-ID.
F5.A06 PASS: Syv faktiske DB-/HTTP-scenarier bekrefter tellerne ved tom beholdning, ny publisering, utkast, revisjon og tilbaketrekking.
F5.A07 PASS: npm run build, npm run typecheck, npm run lint og npm test returnerte alle 0.
Tester: 76 tester i 8 filer passerer; arkitekturkontrollen omfatter 81 kildefiler.
CI PASS: npm run ci:phase5 fullfoerte 13 kommandogrupper med exitCode 0.
HTML PASS: curl fra next start bekrefter synlig broedtekst utenfor scripts, en absolutt canonical, en title og en meta description.
JSON-LD PASS: Den faktiske curl-responsen inneholder parsbar, validert Article/BreadcrumbList-graf.
Regresjon PASS: 21 reelle OIDC-/tilgangskontroller og 9 publiserings-/cache-/feedkontroller passerer etter endringen.
Nettleser PASS: 8 samtykke-/nettverksscenarier bruker Vercels uendrede offentlige produksjonsscripts mot en lokal HTTP-mottaker.
Nettleser PASS: Ingen eksterne nettleserforespoersler ble registrert i samtykketesten.
Nettleser PASS: Alle observerte maalesendinger hadde gyldig samtykke ved selve transportkallet.
Nettleser PASS: JavaScript deaktivert og blokkert analysescript hindrer ikke navigasjon til lokal testdestinasjon.
Tilgjengelighet PASS: Fire affiliate-kontroller og fire banner-/preferansekontroller gir null axe WCAG 2 A/AA og WCAG 2.1 AA-brudd.
Testavgrensning: Headless/webdriver-signalet ble deaktivert kun i testnettleseren fordi Vercel ellers ignorerer automatisk trafikk.
Testrettelse: Dialogens overgang fullfoeres foer kontrastkontroll; det ferdige grensesnittet har like tilgjengelige valg.
Testrettelse: Initialiseringskode sendes som JavaScript-tekst for aa unngaa TSX-hjelperen __name i Playwrights separate nettlesermiljoe.
Testrettelse: Samtykke ved faktisk transport skilles fra mottakstid, slik at forespoersler startet foer tilbakekalling ikke feilklassifiseres.
Testhendelse: En fullkjoering ble avbrutt av en lokal server som ikke svarte; samtykketesten og full CI ble deretter kjoert til groent.
Maalt B09: 152442 gzip-bytes eksterne initiale scripts pluss 4291 inline gir 156733 gzip-bytes foer samtykke.
Avvik B09: Sluttgrensen paa 120000 gzip-bytes er fortsatt ikke oppfylt; fase 4-unntaket er ikke overfoert til fase 5.
Avgrensning: Fase 5s F5.A01-F5.A07 er verifisert; full ytelsesprofil, felt-INP og sluttbudsjettet gjenstaar i fase 7 eller etter trafikkgrunnlag.
Avvik ellers: Ingen nye funksjonelle fase 5-avvik fra spec; eksisterende pris-/ISR-avvik fra fase 4 beholdes.
Bevis: docs/qa/phase5/checks.json, consent.json, provider-sources.json, affiliate.json, metrics.json, runtime.json og migrations.json.
Bevis: docs/qa/phase5/html-verification.txt, publication-tests.json, http-tests.json, javascript.json og faktiske HTML-/header-/bildefiler.
Gjenstaar: Beslutning 8 og fase 6, deretter fase 7 og reelt redaksjonelt innhold for det konkrete nettstedet.
Gjenstaar foer launch: Ekte nettstedskonfig, kontaktpersoner, personvern-/cookietekst, butikker, avtaler og forfatterprofiler.
Gjenstaar foer launch: Reell Google OIDC-klient, Vercel-kontoaktivering, eventuell eventkostnad og dokumentert retensjon.
Gjenstaar foer launch: IndexNow-noekkel, beskyttet periodisk jobbkjoering, Search Console DNS og maaling mot faktisk offentlig utrulling.
Database: Produksjonsgrenen er ikke endret; appen bruker fortsatt begrensede roller.
Git: Ingen add, commit, push, init eller remote-endringer er kjoert.
Publisering: Ingen offentlig utrulling eller eksterne meldinger er sendt.

BUILD-LOG: FASE 6 STARTET
Dato: 2026-09-08.
Godkjenning: Brukeren svarte ja til unik lenketekst per nettsted, maks to relevante godkjente lenker per artikkel og avslatt standard.
Bygget: En tom versjonert produksjonskonfigurasjon og separate syntetiske .invalid-testdestinasjoner i site.config.ts.
Bygget: Redaksjonelle nettverkslenker knyttes til eksakt godkjent revisjon og eksisterende avsnitt.
Bygget: DB kontrollerer forfatteromfang, menneskelig godkjenning, nisje, emne, destinasjon, antall, ankertekst og overlapp.
Bygget: Normalisert ankertekst reserveres til en artikkel per nettsted og kan godkjennes paa nytt i artikkelens senere revisjoner.
Bygget: Cache for artikler og nyheter skilles etter av/pa og konfigurasjonsfingeravtrykk med uendret canonical og 3600 sekunders ISR.
Bygget: Anmeldelser beholder dynamisk serverrendring av hensyn til tidligere vedtatt prisgyldighet.
Bygget: Beskyttet revalidering tommer alle moduser; publiseringsinvalidering inkluderer den nye interne artikkelruten.
Migrasjoner: 19 migrasjoner er anvendt og idempotent verifisert paa QA-grenen; tidligere anvendte migrasjoner er ikke omskrevet.
Status: Endelige F6.A01-F6.A05 er ikke erklaert bestaatt foer hele kjoeringen er fullfoert.

BUILD-LOG: FASE 6 FULLFOERT
Tidspunkt: 2026-09-08T09:34:03.724Z.
Godkjenning: Beslutning 8 ble eksplisitt godkjent med ja 2026-09-08.
Status: Denne fullfoeringen erstatter fase 6-startstatusen ovenfor.
Omfang: Fase 6 er ferdig; fase 7 er ikke startet.
Bygget H01-H04: Typesikkert env-flagg med default false og tom versjonert produksjonskonfigurasjon i site.config.ts.
Bygget H03: Soestersider beskrives med id, HTTPS-opphav, nisje og emner i en konfigurasjon som kopieres per utrulling.
Bygget: Ingen felles CMS eller sentral runtime-avhengighet er innfoert.
Bygget H05-H09: Godkjenning gjelder en eksakt revisjon, et eksisterende avsnitt og en konkret lenketekst med dokumentert relevans.
Bygget: Relevans krever samme nisje, et samsvarende revisjonsemne og en registrert destinasjon.
Bygget: Bare godkjente publiserte revisjoner eksponerer godkjente nettverkslenker gjennom en sikkerhetsavgrenset DB-visning.
Bygget: En redaktoer kan registrere og deaktivere lenker gjennom beskyttede endepunkter med Origin- og sesjonskontroll.
Bygget: Nettverkslenker lagres separat fra broedteksten slik at avslatt modus ikke maa hente lenkedata.
Bygget: Unik normalisert ankertekst reserveres til samme artikkel per kildenettsted; tekstens reservasjon beholdes ved deaktivering.
Bygget: Artikkelens senere revisjoner kan bruke egen reservert tekst etter ny godkjenning uten aa tillate gjenbruk i andre artikler.
Bygget: Databaselaas hindrer mer enn to lenker ved samtidige registreringer.
Bygget: Overlappende ankertekst, uregistrerte maal, query-parametre, falsk godkjenning og ukjente policyfelt avvises.
Bygget H07: Footer, sidebar, automatisk reciprocity og aktivering basert paa alder er ikke tillatt.
Bygget: Rene redaksjonelle nettverkslenker er en egen funksjon; kommersielle lenker bruker fortsatt affiliate-modellen.
Bygget F6.A04: Av/pa og konfigurasjonsfingeravtrykk bruker separate interne cacheidentiteter med uendret offentlig canonical.
Bygget: Artikkel og nyhet beholder 3600 sekunders ISR; anmeldelser beholder den eksisterende dynamiske prisbeskyttelsen.
Bygget: Nettverksendringer og vanlig publisering invaliderer ogsaa de nye interne artikkelrutene.
Bygget: POST /api/editor/network-links/revalidate krever redaktoer og invaliderer begge cachemoduser.
Bygget: Internrutene er avvist ved direkte HTTP-oppslag og brukes ikke som offentlige alternative URL-er.
Migrasjoner: 0016_phase6_network, 0017_phase6_network_contract og 0018_phase6_context_overlap er additive og anvendt paa isolert QA.
Migrasjoner PASS: 19 registrerte migrasjoner, bevart kontrollrad og idempotent gjentakelse.
Migrasjonsavgrensning: Ingen ny tom fase 6-database ble opprettet eller testet i denne kjoeringen.
F6.A01 PASS: False og udefinert flagg gir faktisk HTML og RSC uten nettverkslenker, partneropphav eller partner-ID-er.
F6.A01 PASS: Fersk HTML ble servert med cache MISS mens leseretten til nettverksvisningen var fjernet paa QA-grenen.
F6.A01 PASS: Den direkte DB-kontrollen bekreftet at leserretten faktisk var fjernet; appen forsokte ikke aa lese lenker i avslatt modus.
F6.A02 PASS: Eksplisitt true viser to godkjente lenker i artikkelavsnitt; varme HTML- og RSC-responser har cache HIT.
F6.A02 PASS: To samtidige registreringer av den siste ledige plassen gir en 201 og en 400, med totalt to publiserte lenker.
F6.A03 PASS: Forfalsket godkjenning, private utkast, manglende emne, duplikater, overlapp, footer/sidebar og automatiske gjensidighetsregler avvises.
F6.A03 PASS: Forside, kategori, forfatter, navigasjon, metadata og JSON-LD inneholder ingen nettverksdestinasjoner.
F6.A04 PASS: Det samme produksjonsbygget ble kjoert false, true, false, udefinert, true og false uten ombygging mellom modusene.
F6.A04 PASS: Tilbakestilling ga null lenker foer og etter beskyttet revalidering; RSC ble kontrollert separat.
F6.A04 PASS: Deaktivering av en lenke endrer det faktiske svaret fra to til en lenke, og ny aktivering gjenoppretter to.
F6.A04 PASS: Et utkast beholder publiserte lenker; en ny publisert revisjon viser ingen gamle lenker foer ny lenkegodkjenning.
F6.A05 PASS: npm run build, npm run typecheck, npm run lint og npm test returnerte 0.
Tester: 80 tester i 9 filer passerer; arkitekturkontrollen omfatter 91 kildefiler.
CI PASS: npm run ci:phase6 fullfoerte 13 kommandogrupper med exitCode 0.
HTTP PASS: Fem nettverksgrupper og 18 lagrede HTML-/RSC-kontroller med faktiske headere passerer.
HTML PASS: curl fra next start bekrefter synlig broedtekst utenfor scripts, en absolutt canonical, en title og en meta description.
JSON-LD PASS: Den faktiske artikkelresponsen inneholder parsbar, validert Article-, Person-, Organization- og BreadcrumbList-graf.
Regresjon PASS: Ni publiserings-/cache-/feedkontroller og 21 OIDC-/tilgangskontroller passerer med den nye cacherutingen.
Regresjon PASS: Tre affiliate-grupper, fire affiliate-tilgjengelighetskontroller og aatte samtykke-/nettverksscenarier passerer.
Regresjon PASS: Avslag og tilbakekalling sender ingen ikke-godkjente maaleforespoersler; Vercel-scripts bruker fortsatt lokal QA-mottaker.
Tilgjengelighet PASS: Nettverksavsnitt er kontrollert ved 390x844 og 1440x1000 med null axe WCAG 2 A/AA og WCAG 2.1 AA-brudd.
Tilgjengelighet PASS: Ingen horisontal overflow eller eksterne forespoersler ble registrert i nettverksnettlesertesten.
Testrettelse: RSC-kontrollen folger Next.js sin observerte normalisering til _rsc foer den faktiske text/x-component-responsen valideres.
Testrettelse: Origin i testharnessen har eksplisitt string-type for negative opphavskontroller.
Maalt B09: 152442 gzip-bytes eksterne initiale scripts og 4262 inline gir 156704 gzip-bytes foer samtykke.
Avvik B09: Sluttkravet paa 120000 gzip-bytes er ikke oppfylt; intet nytt fase 6-unntak er godkjent eller innfoert.
Avvik ellers: Ingen nye funksjonelle fase 6-avvik; cacheisoleringen beholder artikkelens avtalte ISR og offentlige SEO-kontrakt.
Bevis: docs/qa/phase6/checks.json, network.json, migrations.json, html-verification.txt og javascript.json.
Bevis: docs/qa/phase6/publication-tests.json, http-tests.json, affiliate.json, consent.json og provider-sources.json.
Bevis: docs/qa/phase6/ inneholder raatt curl-HTML, RSC, HTTP-headere og nettleserskjermbilder.
Levert: NETWORK_LINKS_ENABLED=false i eksempelmiljoet, udefinert flagg tolkes som false og produksjonsregisteret er tomt.
Driftsgrense: Ved utrulling maa alle appinstanser startes med false; allerede aapnede nettlesersider oppdateres ved ny navigasjon eller oppdatering.
Gjenstaar: Fase 7 med samlet kravmatrise, ren installasjon, alle layoutvarianter, ytelsesbudsjett og klone-/launch-instruks.
Gjenstaar: Ekte nettstedskonfig, egne tekster, reelle forfattere, bilder, butikker, kommersielle avtaler og driftskontoer foer launch.
Gjenstaar: Felt-INP og andre feltdata krever faktisk trafikk og er ikke verifisert med lokale tester.
Database: Ingen endringer paa produksjonsgrenen; appen bruker begrensede roller og testrettigheten ble gjenopprettet.
Git: Ingen add, commit, push, init eller remote-endringer er kjoert.
Publisering: Ingen offentlig utrulling, DNS-endring eller eksterne meldinger er sendt.

FASE 7: SAMLET QA OG KLARGJOERING FOR KLONING, 2026-09-08
Status: Fase 7 er BLOKKERT og er ikke erklaert ferdig eller klar for offentlig launch.
Omfang: Samlet kravmatrise, tre layouter, ytelsesprofil, negativ launch-kontroll, Neon-gjenoppretting og kloneinstruks.
Bygget: npm run ci:phase7 samler ren installasjon, faktiske produksjonsresponser, nettlesermaalinger og tidligere fasers regresjoner.
Bygget: Uavhengige kontrollgrupper fullfoeres selv om et ytelsesbudsjett feiler; samlet CI returnerer fortsatt nonzero.
Bygget: Produksjonsbygg avviser uferdig generisk config, testmoduser og uferdig publisert innhold foer Next-kompilering.
Bygget: npm run qa:launch tvinger produksjonskontrollen; bare eksplisitt lokal QA kan bygge de syntetiske fixturene.
Bygget: Launch-kontrollen bruker begrensede publiserte DB-visninger og krever reelle forfatteropplysninger og alle sju tillitssider.
Bygget: site.qa.database samler det eksisterende testprosjektet, grenen og tillatt host-prefiks i site.config.ts.
Bygget: Kloneinstruksen beskriver obligatoriske TODO-er, separate miljoer, secrets-navn, migrasjoner, DNS, Search Console og gjenoppretting.
Optimalisering: Bygget bruker den stoettede Next.js Webpack-modusen for lavere maalt initial JavaScript enn Turbopack i denne konfigurasjonen.
Optimalisering: Uavhengige innholdslesinger skjer parallelt uten endring i canonical, publiseringsregler eller ISR-kontrakter.
Optimalisering: Bare et eksplisitt identifisert LCP-bilde faar preload; publisert JSON-payload tillater maksimalt ett slikt bilde.
Optimalisering: Det andre bildet i den lange artikkelen forblir lazy og alle bilder beholder eksplisitte dimensjoner og sizes.
QA-fixture: Den lange syntetiske artikkelen har 65 ulike QA-avsnitt, 20296 teksttegn og to 1600x900 bildeblokker.
QA-fixture: De to bildeblokkene bruker samme deterministiske JPEG-kilde paa 360297 bytes, levert fra en lokal QA-opprinnelse.
QA-fixture: Lokal bildeadgang finnes bare i eksplisitt QA; virkelig Blob-lagring er ikke testet eller provisionert.
Testrettelse: QA-servere har separat prosessgruppe og logger baade forventet og uventet avslutning.
Testrettelse: Publiseringsregresjonen bruker unik SEO-tekst og trekker tilbake sin egen midlertidige artikkel ogsaa etter feil.
Testrettelse: En artikkel fra en avbrutt lokal test ble trukket tilbake via den godkjente publiseringsprosedyren.
Testrettelse: Crawleren skiller /go/-endepunkter fra innholdsruter og leser URL-kodede Webpack-filnavn korrekt.
F7.A01 PASS: Alle 225 krav-ID-er i specen har eksplisitt status og bevis i docs/qa/phase7/requirements.md.
Kravstatus: 203 PASS, 4 BLOCKED og 18 NOT_RUN; status gjelder det angitte omfanget og er ingen launch-godkjenning.
F7.A02 PASS: B05, B08, B09 og I05 er blokkert; eksterne driftskontroller og manglende feltdata er ikke merket bestaatt.
F7.A03 PASS: Siste rene npm ci med laast lockfile etterfulgt av build, typecheck, lint og test returnerte 0.
Tester: 85 tester i 11 filer passerer; arkitekturkontrollen omfatter 92 kildefiler.
Miljo: Node 24.20.0, Next.js 16.3.4, React 19.2.8 og Chromium 153.0.8010.12 paa Apple M4 og Darwin 25.6.0.
Proveniens: Siste QA-config-uttrekk og sidematrisen ble kontrollert separat etter hovedkjoeringen; supplemental-checks.json forklarer rekkefolgen.
F7.A04 PASS: Curl mot det siste rene produksjonsbygget bekrefter synlig broedtekst, en absolutt canonical, en title og en meta description.
JSON-LD PASS: Den faktiske artikkelresponsen har gyldig Article-, Person-, Organization- og BreadcrumbList-graf.
HTML PASS: Falsk Host og X-Forwarded-Host kan ikke erstatte nettstedets konfigurerte canonical-opprinnelse.
Sidematrise PASS: Aatte sidetyper ganger tre layouter gir 24 validerte faktiske HTML-responser med korrekte JSON-LD-typer.
Crawler PASS: Alle tre layouter naar de 37 publiserte QA-artiklene innen tre klikk fra forsiden.
OG PASS: Ni faktiske OG-bilder per layout er kontrollert; utvalgte mobil-, desktop- og OG-skjermbilder er ogsaa visuelt vurdert.
Regresjon PASS: Ni publiserings-, cache-, gjenoppbyggings-, feed- og redirectkontroller passerer.
Regresjon PASS: 21 innloggings-, tilgangs- og utkastkontroller passerer mot en signert lokal OIDC-testutsteder.
Regresjon PASS: Tillitssider og reviews invalideres, trekkes tilbake og gjenopprettes i baade HTML og OG-responser.
Regresjon PASS: Affiliate-, samtykke-, publiseringsstatistikk- og nettverkslenkekontrollene passerer.
Regresjon PASS: 20 reelle Neon-kontroller av roller, samtidighet og revisjoner samt publiserte sitemap-visninger passerer.
Neon PASS: En midlertidig undergren ble gjenopprettet fra QA-forelderen med 44 publiserte revisjonshasher bevart.
Neon PASS: Etterfoelgende testendring forsvant ved gjenoppretting; leser- og tjenesteroller kunne ikke skrive direkte til publiseringstabeller.
Migrasjoner PASS: Tom database, alle 19 migrasjoner, bevart testdata ved oppgradering og idempotent omkjoering er verifisert.
Neon PASS: Den midlertidige grenen ble slettet og fravaeret bekreftet; produksjonsgrenen ble ikke endret.
F7.A05 BLOCKED: 90 nettleserbesoek er maalt i 18 grupper, med fem besoek per kombinasjon av layout, sidetype og cachetilstand.
Maaleprofil: 390x844, 4x CPU, 150 ms RTT, 1.6 Mbps ned og 750 Kbps opp; naermeste-rang p75 beregnes separat per gruppe.
Maalt kald cache: Hoeyeste gruppe-p75 er LCP 2816 ms og TTFB 2306.4 ms, mot grensene 2000 ms og 600 ms.
Maalt varm cache: Hoeyeste gruppe-p75 er LCP 1064 ms og TTFB 210.4 ms; alle varme grupper bestaar disse grensene.
Maalt CLS: Hoeyeste gruppe-p75 er 0.02211810, under grensen 0.1 i alle kalde og varme grupper.
Maalt interaksjon: Hoeyeste gruppe-p75 er 104 ms, under labgrensen 200 ms; dette er ikke felt-INP.
Maalt JavaScript: Maksimum er 157993 initiale gzip-bytes inkludert unike moderne scripts og inline JavaScript, mot grensen 120000.
Avvik B05 og B08: Kald cache overskrider avtalte grenser; varme resultater brukes ikke som erstatning for kalde resultater.
Avvik B09: Sluttbudsjettet overskrides; tidligere fase 1- og fase 4-unntak gjelder ikke fase 7.
Eksperiment: En separat kopi uten den skrevne samtykkekomponenten maalte fortsatt 134683 gzip-bytes med Next/React-runtime.
Eksperimentgrense: Kopien er ikke levert, og resultatet beviser ikke en absolutt nedre grense for alle mulige Next.js-bygg.
Beslutning aapen: docs/qa/phase7/budget-proposal.md foreslaar 165000 gzip-bytes med uendret maaledefinisjon; ingen godkjenning eller endring er innfoert.
Avvik ellers: Ingen nye funksjonelle unntak; eksisterende dokumentert dynamisk review-rendring for presis prisutloepskontroll er beholdt.
F7.A06 PASS: Nettverksflagget leveres false med tomt register; avslag og tilbakekalling sender ingen ikke-godkjente analyseforespoersler.
Samtykke: Uendrede offentlige Vercel-scripts ble testet mot en lokal mottaker; dette er ikke bevis paa aktivert produksjonskonto.
Secrets PASS: Konfigurerte private legitimasjoner er ikke funnet i kildekode, migrasjoner, nettleserfiler eller fase 7-bevis.
Avhengigheter: npm audit --omit=dev rapporterer null kjente produksjonssaarbarheter paa kontrolldatoen.
Avhengigheter: Fire moderate utviklingsadvarsler gjenstaar i Drizzle Kit/esbuild-kjeden; foreslaatt tvungen nedgradering er ikke brukt.
CI: Hovedkjoeringen fullfoerte 26 grupper; bare de tre ytelsesgruppene returnerte 1, og samlet status er BLOCKED.
F7.04 NOT_RUN: Faktisk Vercel-preview er ikke opprettet eller testet; lokale preview-headere teller bare som lokal simulering.
Feltdata NOT_RUN: Felt-CWV og felt-INP krever faktisk trafikk og kan ikke godkjennes fra denne labkjoeringen.
Gjenstaar: Avklaring av JS-budsjett, loesning og ny maaling av kald responstid samt faktisk Vercel-miljo og preview-bevis.
Gjenstaar foer nettstedslansering: Ekte konfigurasjon, redaksjonsinnhold, forfattere, bilderettigheter, driftskontoer, DNS og Search Console.
Bevis: docs/qa/phase7/checks.json, supplemental-checks.json, clean-install.json og final-clean-html/html-verification.txt.
Bevis: docs/qa/phase7/requirements.md, page-type-matrix.json, performance-summary.txt, recovery.json og dependency-audit.json.
Instruks: docs/clone-and-launch.md beskriver selvstendig kloning uten lokale credentials, syntetiske DB-fixtures eller QA-artefakter.
Git: Ingen add, commit, push, init eller remote-endringer er kjoert.
Publisering: Ingen offentlig utrulling, DNS-endring eller eksterne meldinger er sendt.

FASE 7: GODKJENT JS-BUDSJETT OG VIDERE DIAGNOSTIKK, 2026-09-08
Status: Denne oppfoelgingen lukker det tidligere aapne JS-vedtaket; fase 7 er fortsatt BLOKKERT og ikke ferdig.
Godkjenning: Brukeren svarte godkjenner paa forslaget om 165000 initiale gzip-bytes med uendrede oevrige ytelseskrav.
Spec: B09 og beslutning 6 er oppdatert fra 120000 til 165000 gzip-bytes for ferdig mal.
Beholdt: Runtime, alle unike initiale scripts og inline JavaScript inngaar i samme total som foer.
Beholdt: LCP 2000 ms, TTFB 600 ms, CLS 0.1, labinteraksjoner 200 ms og separat kald/varm p75 er uendret.
Implementert: finalTemplateProfile styrer fase 7-maaling og samtykkeregresjonens vurdering av sluttbudsjettet.
Implementert: Fase 4 beholder sin egen historiske grense paa 145000 og rapporterer det nye sluttbudsjettet separat.
Implementert: npm run ci:phase7 -- --budget-only vurderer de opprinnelige 90 raamaalingene mot gjeldende krav.
Kontroll: Ny vurdering validerer profil, antall besoek, cachetilstand og p75 og beholder SHA-256 samt opprinnelige maaltidspunkter.
B09 PASS: Maksimum paa 157993 gzip-bytes er 7007 bytes under den godkjente grensen paa 165000.
Proveniens: Dette er ny budsjettvurdering, ikke 90 nye nettleserbesoek; opprinnelige maalinger og historiske CI-exitkoder er ikke omskrevet.
CI BLOCKED: Budsjettkommandoen returnerer fortsatt 1 for kald TTFB og enkelte LCP-grupper; JS er ikke lenger en blokker.
Kravstatus: 225 krav fordeles naa paa 204 PASS, 3 BLOCKED og 18 NOT_RUN.
Kontroll PASS: Ny ren npm ci, npm run build, npm run typecheck, npm run lint og npm test returnerte 0.
Tester PASS: 85 tester i 11 filer; arkitekturkontrollen omfatter fortsatt 92 kildefiler.
Diagnostikk: Seks ekstra kalde curl-besoek maaler databasekall uten nettleserthrottling og erstatter ikke den godkjente labprofilen.
Diagnostikk: Rutekontrollens foerste databaseforespoersel tok 396-1161 ms foer de parallelle renderingsspoerringene startet.
Diagnostikk: Den tregeste renderingsforespoerselen tok 446-620 ms per svar; parallelle varigheter skal ikke summeres som sekvensielt arbeid.
Diagnostikkgrense: Fetch-tid inkluderer nettverk, tilkobling og fjernarbeid; SQL-eksekvering er ikke isolert i disse tallene.
Vurdering: Plasseringen av app og database boer kontrolleres i faktisk Vercel-miljo; en bedre regionplassering er ikke rapportert som loest ytelse.
Vercel NOT_RUN: Ingen tilgjengelige Vercel MCP-verktoy, prosjektkobling eller preview-URL er funnet; konkret prosjekt eller URL er etterspurt.
Gjenstaar: Kald responstid under gjeldende krav, faktisk Vercel-preview og senere nettstedsspesifikke launch-kontroller.
Gjenstaar: Felt-CWV og felt-INP krever trafikk og forblir NOT_RUN.
Bevis: docs/qa/phase7/budget.json, approval-checks.json, approved-budget-html/html-verification.txt og clean-install.json.
Bevis: docs/qa/phase7/requirements.md og latency/diagnostic.json med credential-frie tidslogger.
Git: Ingen add, commit, push, init eller remote-endringer er kjoert.
Produksjon: Ingen databaseendring, regionflytting, betalt driftsendring, DNS-endring eller offentlig utrulling er utfoert.
HTML PASS etter godkjenning: Curl fra det nye rene produksjonsbygget viser faktisk broedtekst, en absolutt canonical, en title, en meta description og validert Article-JSON-LD.
Secrets PASS etter godkjenning: 891 filer inneholder ingen av de konfigurerte private legitimasjonene.

GITHUB: LOKAL REPOKOBLING, 2026-09-08
Godkjenning: Brukeren oppga https://github.com/MatiasR1999/husutstyr.no.git og ba om koble det opp.
Utfort: Git er initialisert i den eksisterende seo-site-template-mappen med standardbranch main.
Utfort: origin er satt til https://github.com/MatiasR1999/husutstyr.no.git.
Verifisert: GitHub oppgir main som standardbranch; repoet er offentlig og hadde ingen commits eller branch-referanser ved tilkobling.
Verifisert: git remote -v og git ls-remote origin bekrefter den faktiske remote-koblingen.
Verifisert: .env.local, .env.test.local, .env.phase3.local, .neon, node_modules, .next og work ignoreres av Git.
Avklaring L17/P00.2: Denne uttrykkelige bestillingen erstatter tidligere utsettelse av lokal Git-initialisering og remote-oppsett.
Beholdt L16: Ingen git add, git commit eller git push er kjoert; kildekoden er fortsatt lokal og GitHub-repoet er tomt.
Avgrensning: Dette kobler GitHub-repoet; faktisk Vercel-prosjekt, preview og offentlig lansering er fortsatt ikke opprettet.
Tester: Git-koblingen er kontrollert direkte; ingen appkode eller pakker er endret, og funksjonstestene er ikke kjoert paa nytt.

GITHUB: GODKJENT FOERSTE COMMIT OG PUSH, 2026-09-08
Godkjenning: Brukeren skrev godkjenner commit og push; dette erstatter det tidligere forbudet for foerste opplasting.
Maal: https://github.com/MatiasR1999/husutstyr.no.git paa main; repoet er offentlig og skrivetilgang er bekreftet.
Omfang: Appkode, konfigurasjon uten credentials, lockfile, migrasjoner, testkode, spec, plan og bygge-/kloneinstruks.
Utelatt: Private miljoefiler, .neon, .vercel, node_modules, .next, work, lokale agentpakker og genererte QA-opptak.
Bevisgrense: Lokale testbevis er bevart i arbeidsmappen; docs/qa/README.md forklarer at en fersk Git-klone ikke inneholder disse opptakene.
Validering: Siste rene appbygg, typecheck, lint, 85 tester og faktisk HTML-verifisering er uendret; publiseringsforberedelsen endrer bare Git-utvalg og dokumentasjon.
Status nettsted: Fase 7 er fortsatt blokkert paa kald responstid og faktisk Vercel-preview; GitHub-push er ikke en nettstedslansering.
Git-plan: Opprett foerste commit og vanlig push med upstream til origin/main etter kontroll av det faktiske Git-utvalget.
Git-utvalg PASS: 214 filer paa omtrent 1.96 MB er kontrollert direkte fra Git-indeksen uten treff paa konfigurerte private verdier eller credential-moennstre.
Regresjonsgrunnlag PASS: Staget appkode, scripts, tester, migrasjoner og pakkefiler har samme SHA-256 som den siste rene testkjoeringen.
Formatmerknad: Git sin whitespace-kontroll melder en eksisterende ekstra sluttlinje i 0012-migrasjonen; den allerede testede migrasjonsfilen er beholdt uendret.

FASE 7: ROTAARSAK FOR KALD RESPONSTID OG REDUSERTE DATABASERUNDTURER, 2026-09-09
Status: Fase 7 er fortsatt BLOKKERT; B05 og B08 er ikke lukket og kravene er uendret.
Bestilling: Brukeren ba om at ytelsesblokkeringen loeses foer nettstedsspesifikk konfigurasjon.
Maalt geografi: QA-databasen kjoerer i us-east-2 mens maaleprofilen kjoeres fra en maskin i Norge.
Maalt tilkobling: curl mot databasevertens HTTPS-endepunkt gir TCP-connect 139-245 ms og fullfoert TLS 271-377 ms.
Maalt rundtur: Et lesende probeskript maalte 1128 ms for foerste spoerring, 410 ms for enkeltspoerring paa ny tilkobling og 130 ms naar fire spoerringer sendes i samme forespoersel.
Maalt samtidighet: Fire samtidige spoerringer tok 502 ms fordi bare en gjenbruker den varme tilkoblingen mens de oevrige betaler ny TLS-handshake.
Rotaarsak: Kald TTFB domineres av avstand og TLS-oppsett mot databasen, ikke av rendringsarbeid eller antall spoerringer.
Konsekvens: Med maalt kald tilkobling paa 410-1128 ms overskrides TTFB-grensen paa 600 ms foer rendring starter; ingen kodeendring alene kan lukke B08 i denne topologien.
Implementert: getCategories, getTopics og getTrustPages henter naa samme data i en spoerring gjennom en felles siteChrome-cache.
Begrunnelse: De tre kildene hadde allerede sammenfallende revalidate og ble alltid invalidert samtidig, saa cache-taggene er en union uten tapt granularitet.
Beholdt: getArticle og getAllArticles er uendret, slik at en publisering ikke invaliderer datacachen for alle artikler.
Maalt effekt: Databaserundturer per kald forespoersel falt fra 5 til 3 for artikkel og lang artikkel, og fra 4 til 3 for forsiden.
Maalt effekt: Kald TTFB er uendret innenfor stoey; p75 foer var 1660/1196/1374 ms og etter 1638/1227/1410 ms for forside, artikkel og lang artikkel.
Vurdering: Endringen reduserer databasebelastning, men den loeser ikke B05 eller B08 og er ikke rapportert som en ytelsesforbedring.
Kontroll PASS: npm run lint, npm run typecheck og npm test returnerte 0 med 85 tester og 92 kontrollerte kildefiler.
Kontroll PASS: Rendret markup er byte-identisk foer og etter for forside, artikkel, lang artikkel, kategori, tillitsside, sitemap og RSS.
Kontrollgrense: Eneste forskjell i responsene er bygg-ID og en 43 byte forskjell i RSC-flushgrense paa artikkelruten med samme innhold.
Metode: Maalingene er kalde curl-forespoersler med samme nullstilling som fase 7 og egen port, ikke den godkjente nettleserprofilen.
Metodegrense: Disse tallene erstatter ikke de 90 godkjente nettleserbesoekene og er ikke ny p75-dokumentasjon for kravmatrisen.
Avgrensning: Bilrapport-prosjektets server holdt port 3100, saa maalingen brukte port 3110 og ingen fremmed prosess ble stoppet.
Sikkerhet: Ingen skriveoperasjon er kjoert mot databasen; probeskriptet leser bare select-uttrykk uten parametere.
Avvik: Under en env-innlasting tolket skallet et og-tegn i tilkoblingsstrengene, slik at QA-legitimasjonen ble skrevet til terminalloggen i denne oekten.
Tiltak: Senere kommandoer bruker en parseEnv-basert kjoerer uten skalltolkning; QA-legitimasjonen boer roteres av brukeren.
Gjenstaar B05 og B08: Databasen maa ligge naer applikasjonen, eller maaleprofilen maa kjoeres i et miljoe der de er samlokalisert.
Gjenstaar F7.04 og G10: Faktisk Vercel-preview er fortsatt ikke opprettet eller testet.
Gjenstaar: Ingen regionflytting, ny database, Vercel-prosjekt, utrulling eller DNS-endring er utfoert; dette krever brukerens beslutning.
Git: Ingen add, commit eller push er kjoert i denne oekten.

FASE 7: SAMLOKALISERT QA-DATABASE I EU, 2026-09-09
Godkjenning: Brukeren valgte aa flytte QA-databasen til EU foer eventuelt Vercel-arbeid.
Bakgrunn: Maalt rundtur var 123 ms til aws-us-east-2 og 34 ms til aws-eu-central-1 fra maalemaskinen.
Regionvalg: aws-eu-central-1 er eneste EU-region Neon CLI tilbyr for nye prosjekter paa denne kontoen.
Utfoert: Nytt Neon-prosjekt husutstyr-qa-eu med id raspy-leaf-06859059 er opprettet i aws-eu-central-1 med Postgres 18.
Utfoert: Isolert gren phase-2-qa med id br-rough-cake-b22qbr27 er opprettet; standardgrenen main er ikke brukt til QA.
Beholdt: Det opprinnelige prosjektet snowy-moon-44342419 i aws-us-east-2 er urort; ingen data er slettet eller flyttet derfra.
Oppdatert QA_SETUP: site.config.ts qa.database peker naa paa nytt projectId, branchId og hostPrefix etter kloneinstruksens prosedyre.
Migrasjon PASS: Alle 19 migrasjoner kjoerte fra tom baseline med bevart sentinel og idempotent ny kjoering.
Provisjonering PASS: seo_public_reader og seo_editor_service fikk nye tilfeldige passord og verifiserte begrensede tilkoblinger.
Fixtures PASS: Fase 2-fixturen og fase 7 sin lange artikkel med 65 avsnitt og to bildeblokker er publisert i den nye grenen.
Miljoe: .env.phase2.local, .env.phase3.local og .env.test.local peker paa EU-grenen; forrige us-east-2-versjon ligger i work/env-backup.
Maalt kald TTFB med curl, p75 av fem kalde besoek per rute:
Maalt forside: 1660 ms mot us-east-2 og 473 ms mot eu-central-1.
Maalt artikkel: 1196 ms mot us-east-2 og 403 ms mot eu-central-1.
Maalt lang artikkel: 1374 ms mot us-east-2 og 352 ms mot eu-central-1.
Vurdering: Alle tre rutene ligger naa under TTFB-grensen paa 600 ms i denne diagnostiske maalingen.
Maalegrense: Dette er curl uten nettleserthrottling og er ikke den godkjente labprofilen; B05 og B08 er fortsatt ikke lukket.
Gjenstaar: npm run ci:phase7 maa kjoeres for aa produsere gyldig p75-bevis for LCP, CLS, TTFB, interaksjon og JS paa alle tre layoutvarianter.
Blokkering: Den godkjente profilen krever port 3100, som holdes av en server fra et annet prosjekt paa maalemaskinen.
Kontroll PASS: npm run lint, npm run typecheck og npm test returnerte 0 etter konfigurasjonsendringen.
Git: Ingen add, commit eller push er kjoert.
Produksjon: Ingen Vercel-prosjekt, deploy, DNS-endring eller produksjonsdatabase er opprettet.

FASE 7: FULLSTENDIG LABKJOERING MOT EU-DATABASE, 2026-09-09
Status: npm run ci:phase7 fullfoerte 28 grupper med completeRun true og status PASS; ingen gruppe returnerte annet enn 0.
Kravmatrise: 225 krav har eksplisitt status; 207 PASS, 0 BLOCKED og 18 NOT_RUN.
B05 PASS: Hoeyeste kalde gruppe-p75 for LCP er 1300 ms mot grensen 2000 ms; hoeyeste varme er 1032 ms.
B08 PASS: Hoeyeste kalde gruppe-p75 for TTFB er 465.8 ms mot grensen 600 ms; hoeyeste varme er 123.0 ms.
I05 PASS: De delte ytelseskontraktene bestaar naa paa alle tre layoutvarianter.
Maalt CLS: Hoeyeste gruppe-p75 er 0.02211809 mot grensen 0.1.
Maalt interaksjon: Hoeyeste gruppe-p75 er 40 ms mot labgrensen 200 ms; dette er ikke felt-INP.
Maalt JavaScript: Maksimum er 157962 initiale gzip-bytes mot den godkjente grensen 165000.
Sammenligning: Forrige blokkerte kjoering maalte kald LCP 2816 ms og kald TTFB 2306.4 ms mot samme grenser.
Aarsak til endringen: QA-databasen ligger naa i aws-eu-central-1 i stedet for aws-us-east-2; applikasjonskoden er uendret bortsett fra den sammenslaatte listespoerringen.
Avvik funnet: Foerste forsoek feilet paa http-1 fordi den nye databasen bare hadde fase 2- og fase 7-fixturene.
Tiltak: scripts/phase4/seed.ts, phase5/seed.ts og phase6/seed.ts ble kjoert, som ga 37 publiserte artikler og all registrert sidemetadata.
Avvik funnet: Andre forsoek feilet fordi .next/cache/fetch-cache gjenbrukte et getAllArticles-resultat fra da EU-basen hadde to artikler, slik at kategorisiden manglet paginering.
Tiltak: .next ble fjernet foer bygg, og kontrollen ble kjoert paa et rent bygg.
Avvik funnet: qa:html feilet fordi scripts/verify-html.ts bygget forventet Article-graf uten forfatterens expertise, mens scripts/phase2/seed.ts registrerer den.
Vurdering: Den rendrede grafen var korrekt; knowsAbout skal foelge registrert expertise. Testen passerte tidligere bare fordi den gamle QA-databasen hadde en forfatterrad opprettet foer feltet ble sadd.
Tiltak: Forventningen i verify-html.ts speiler naa fixturen som faktisk sass; ingen produksjonskode er endret for aa faa testen til aa passere.
Maalt variansmerknad: I den foerste fullstendige kjoeringen maalte variant 1 forside kald TTFB p75 744 ms, mens variant 2 og 3 maalte 454 og 452 ms paa samme side og data.
Maalt variansmerknad: Ved ny kjoering maalte variant 1 forside kald TTFB p75 459.4 ms; utslaget var maalestoey tidlig i kjoeringen og ikke en egenskap ved layouten.
Bevis: Begge kjoeringene ligger i docs/qa/phase7/; requirements.md og performance-summary.txt er oppdatert fra den fullstendige kjoeringen.
Observasjon uten tiltak: getAllArticles henter hele payloaden for alle artikler og overfoerte 98.2 KB paa 189 ms mot 27.5 KB paa 68 ms for en ren listeprojeksjon.
Vurdering: Dette er en skaleringsrisiko for et nettsted med mange artikler, men ingen endring er gjort naa siden alle grenser bestaar.
Gjenstaar F7.04, G10 og L05: Faktisk Vercel-preview krever ferdig nettstedskonfigurasjon og ekte redaksjonsinnhold foer bygget passerer lanseringsporten.
Gjenstaar: Felt-CWV og felt-INP krever trafikk og forblir NOT_RUN.
Git: Ingen add, commit eller push er kjoert.
Produksjon: Ingen Vercel-prosjekt, deploy, DNS-endring eller produksjonsdatabase er opprettet.

NETTSTED: HUSUTSTYR.NO KONFIGURERT OG KOBLET TIL VERCEL, 2026-09-09
Godkjenning: Brukeren bestemte at dette repoet er nettstedet og ikke lenger en gjenbrukbar mal, og ba om at Vercel bygger fra Git.
Diagnose: Den feilede deployen 2026-09-08 stoppet paa lanseringsporten med 13 BLOCKED-linjer, ikke paa et byggproblem.
Diagnose: Innholdskontrollen ble aldri naadd fordi launchConfigIssues kortslutter foer databasen spoerres.
Funn: readRuntimeConfig kaster naar SEO_QA_MODE er true sammen med VERCEL, saa en hosted QA-deploy er umulig ved design.
Funn: Vercel-prosjektet hadde Framework Preset Other, som ville publisert public-mappen i stedet for Next-bygget.
Funn: Vercel-prosjektet kjoerte i iad1 mens databasen ligger i aws-eu-central-1.
Implementert: vercel.json setter framework nextjs og region fra1, slik at deploy-konfigurasjonen ligger i Git og funksjonene er samlokalisert med databasen.
Verifisert: Byggloggen melder naa Detected Next.js version 16.3.4; presetfeilen er borte.
Implementert: site.config.ts har id husutstyr, identitet, nisje, tone, forsidemetadata og seksjonstekst uten plassholdere.
Kontrollert: Forsidetittelen er 54 tegn og beskrivelsen 155 tegn, innenfor kontrakten paa 50-60 og 140-160.
Implementert: QA-identiteten flyttet til port 3140 fordi 3100 var opptatt av et annet prosjekt paa maskinen.
Implementert: QA-nettverksregisteret oekte til versjon 2, som databaseguarden krever naar origin endres.
Omskrevet: tests/launch.test.ts kontrollerer avvisning mot en eksplisitt uferdig klone og krever i tillegg at nettstedets egen konfigurasjon passerer med komplette secrets.
Omskrevet: scripts/phase7/launch-test.mjs tommer alle lanseringssecrets i det spawnede miljoeet, slik at avvisning bevises av porten selv og ikke av tilfeldig arvet miljoe.
Begrunnelse: Begge kontrollene hvilte paa at levert konfigurasjon var TODO; den forutsetningen gjelder ikke lenger naar repoet er nettstedet.
Implementert: scripts/provision-production.ts provisjonerer en uavhengig produksjonsdatabase, nekter i QA-modus og mot QA-verten, og skriver rollekoblinger til privat fil uten aa printe dem.
Utfoert: Neon-prosjekt husutstyr-prod-eu med id summer-surf-00665520 er opprettet i aws-eu-central-1 med 19 migrasjoner, begge roller og verifiserte begrensede tilkoblinger.
Implementert: content/categories.json definerer kjokken, rengjoring, oppbevaring og vedlikehold med egne introduksjoner og SEO-tekster.
Kontrollert: Alle fire kategorier har unike titler og beskrivelser innenfor kontrakten og provisjoneres gjennom validateSeoCopy.
Implementert: Designtokens er byttet til en varm redaksjonell palett med skarpe hjoerner; layoutene magazine og editorial er beholdt.
Maalt kontrast: Tekst 16.93:1, aksent 7.43:1 og dempet 6.97:1 mot sidefargen, alle AA eller bedre; skillelinjen er 1.92:1 mot 1.59:1 for forrige standard.
Miljoe: Aatte produksjonsvariabler er satt i Vercel; OIDC_CLIENT_ID og OIDC_CLIENT_SECRET mangler fordi de krever brukerens Google Cloud-klient.
Miljoe: Preview har ingen variabler; kloneinstruksen krever at Preview ikke faar produksjonens skrivetilgang og trenger en egen databasegren.
Kontroll PASS: npm run ci:phase7 fullfoerte 28 grupper med completeRun true og status PASS etter design- og kategoriendringen.
Maalt ytelse etter endring: Hoeyeste kalde gruppe-p75 er TTFB 474.2 ms og LCP 1288 ms; JS-maksimum er 157973 bytes.
Git: Fem commits er pushet og merget til main med fast-forward etter brukerens uttrykkelige bestilling.
Deploy: Produksjonsbygget fra main returnerer naa bare BLOCKED missing-secret OIDC_CLIENT_ID og OIDC_CLIENT_SECRET, mot 13 blokkeringer 2026-09-08.
Gjenstaar: Google OIDC-klient, deretter innholdskontrollen som krever minst en kategori, en publisert artikkel med fullstendig ekte forfatter og alle sju tillitssidene.
Avgrensning: Ingen forfatter, tillitsside eller artikkel er diktet opp; disse krever faktiske eier-, kontakt- og personopplysninger fra brukeren.
Avgrensning: Ingen DNS-endring, domenekobling eller offentlig publisering er utfoert; nettstedet serverer fortsatt ingen trafikk.

ROBUSTHET: RETRY MOT NEON OG HAANDHEVET NODE-VERSJON, 2026-09-09
Bakgrunn: En kjoering feilet paa recovery med ReferenceError WebSocket is not defined fordi prosessen kjoerte Node 20 i stedet for 24.
Bakgrunn: package.json krever node >=24.20.0 <25, men npm behandler avviket som en advarsel og bygger videre.
Bakgrunn: En senere kjoering feilet paa HTTP 500 Couldn't connect to compute node, som Neon selv merker med neon:retryable true.
Vurdering: Ingen av de to var kodefeil, men begge gjorde en triviell aarsak vanskelig aa se og ville rammet produksjon ulikt.
Implementert: src/lib/db/transport.ts proever paa nytt en gang naar Neon svarer 500 med neon:retryable true.
Begrunnelse: Flagget settes naar proxyen ikke naadde compute-noden, saa setningen provbart ikke ble kjoert.
Begrunnelse: Dette foelger samme sikkerhetsregel som den eksisterende connect timeout-regelen og utvider den ikke til ukjent skriveutfall.
Implementert: Responsen klones foer kroppen leses, slik at kalleren beholder original kropp naar feilen ikke er retryable.
Implementert: Et kort opphold paa 250 ms foer nytt forsoek, fordi en suspendert compute trenger tid paa aa starte.
Implementert: Avbrutt signal stopper nytt forsoek, som foer.
Implementert: scripts/check-node.mjs sammenligner kjoerende Node mot .nvmrc og stopper med en linje.
Implementert: scripts/ci-phase7.mjs kaller kontrollen foerst, foer alle grupper.
Avgrensning: Kontrollen er bevisst ikke lagt i npm run build, fordi Vercel kjoerer 24.19.0 og et slikt krav ville brutt deploy.
Kontrollert: Node 24.20.0 gir exit 0. Node 20.19.5 og 22.17.0 gir exit 1 med forklarende melding.
Kontrollert: npm run ci:phase7 under Node 20 stopper naa umiddelbart med en linje i stedet for en feil tre grupper uti.
Tester: Fire nye tester daekker retry ved retryable compute-feil, ingen retry uten flagget, ingen retry ved ugyldig JSON, bevart kropp etter oppgitt retry og ingen retry ved avbrutt signal.
Tester: Antall tester oekte fra 86 til 90.
Kontroll PASS: npm run typecheck, npm run lint og npm test returnerte 0.

VERCEL: PREVIEW-MILJOE SATT OPP, 2026-09-09
Bestilling: Brukeren ba om at Vercel preview settes opp.
Krav fra kloneinstruksen: Preview skal ikke peke paa produksjonens skrivetilgang.
Utfoert: Neon-gren preview med id br-rough-lab-b14zdgj8 er opprettet i prosjekt summer-surf-00665520.
Utfoert: Grenen er provisjonert med egne tilfeldige rollepassord, 19 migrasjoner, seks kategorier og forfatterraden.
Kontrollert: DATABASE_URL og EDITOR_DATABASE_URL for preview har annen vert og annet passord enn produksjon.
Kontrollert: Produksjonens miljoefil er uendret; en sikkerhetskopi ble tatt foer provisjoneringen.
Utfoert: Aatte miljoevariabler er satt paa Vercel Preview med egne secrets, ikke gjenbruk fra produksjon.
Merknad SITE_URL: Preview setter SITE_URL til https://husutstyr.no fordi lanseringsporten krever likhet med site.identity.url.
Merknad SITE_URL: Canonical paa preview peker derfor til produksjonsdomenet, som er riktig siden preview leveres noindex.
Gjenstaar OIDC: OIDC_CLIENT_ID og OIDC_CLIENT_SECRET mangler i begge miljoer og krever brukerens Google Cloud-klient.
Gjenstaar innhold: Preview-bygget naar ikke innholdskontrollen foer OIDC er paa plass.
Avgrensning: Ingen deploy er godkjent som lansering, og domenet er fortsatt ikke koblet.
