# SEO-SITE-TEMPLATE: IMPLEMENTASJONSPLAN

Dokumentversjon: 1.0, 2026-09-07.
Fasit: docs/seo-template-spec.md.
Status: Fase 1 er ferdig og F1.A01-F1.A16 er verifisert 2026-09-07 med godkjent JS-grense paa 140000 gzip-bytes.
Status fase 2: F2.A01-F2.A06 er verifisert 2026-09-07 med separat Neon QA, DB-basert HTML og signert lokal OIDC-testutsteder.
Status innlogging: Google er valgt; ekte Google Cloud-klient og virkelig konto er ikke konfigurert eller testet.
Status fase 3: F3.A01-F3.A07 er verifisert 2026-09-07 mot separat Neon QA og faktisk next start.
Status fase 4: F4.A01-F4.A09 er verifisert; fasen er ferdig 2026-09-08 med godkjent JS-grense paa 145000 gzip-bytes og maalt maksimum paa 142965.
Status fase 5: F5.A01-F5.A07 er verifisert 2026-09-08; samtykke, tilbakekalling og Vercel-/klikk-integrasjoner er ferdige mot isolert QA.
Status fase 6: F6.A01-F6.A05 er verifisert 2026-09-08; funksjonen leveres false med tom produksjonskonfigurasjon.
Status fase 7: Samlet lokal QA er kjoert 2026-09-08; fasen er BLOKKERT og ikke ferdig.
Status fase 7 kravmatrise: 225 krav har eksplisitt status; 204 PASS, 3 BLOCKED og 18 NOT_RUN med avgrenset bevisgrunnlag.
Status sluttbudsjett B09: Brukeren godkjente 165000 gzip-bytes 2026-09-08; opprinnelig maalt maksimum paa 157993 bestaar ny budsjettvurdering.
Status budsjettbevis: docs/qa/phase7/budget.json skiller opprinnelige maaltidspunkter fra ny vurdering; maalingene er ikke omskrevet.
Status fase 7 ytelse: Kald cache overskrider TTFB og enkelte LCP-grenser; CLS og maalte labinteraksjoner bestaar.
Status fase 7 drift: Faktisk Vercel-preview er ikke testet; lokal simulering teller ikke som Vercel-bevis.
Status fase 7 bevis: docs/qa/phase7/requirements.md, performance-summary.txt og checks.json beskriver resultatene.
Status drift: IndexNow-noekkel, beskyttet periodisk jobbkjoering og Search Console DNS skal konfigureres og verifiseres foer offentlig launch.
Godkjenningsregel: Aapne beslutninger er forslag inntil brukeren eksplisitt har avklart dem.
Stoppregel: En bestilling av fase 1 gir ikke fullmakt til aa implementere fase 2 eller senere.
Git-regel: Brukeren godkjente foerste commit og push til det oppgitte GitHub-repoet 2026-09-08; eksisterende historikk skal ikke overskrives.
Rapporteringsregel: docs/build-log.md opprettes ved implementasjonsstart og oppdateres med faktisk arbeid, avvik og gjenstaaende krav.
Bevisregel: Testresultater skal komme fra kjoerte kommandoer og faktiske responser, ikke antakelser fra kildekoden.

## FOER FASE 1: AVKLARING OG KONTEKST

P00.1: Brukeren avklarer beslutning 1, 2, 3, 4 og 6 i specen.
P00.2: Brukeren oppretter eller velger Git-repo, branch og remote for seo-site-template.
P00.3: Kontekstsjekken skal vise riktig prosjektmappe og begge dokumenter foer fasearbeidet starter.
P00.4: Eksisterende filer skal ikke overskrives for aa faa kontekstsjekken til aa passere.
P00.5: Ingen offentlig tjeneste, DNS-endring eller produksjonsdatabase er noedvendig for dokumentasjonsfasen.

## FASE 1: PROSJEKTGRUNNLAG OG VERIFISERBAR SERVERRENDRET ARTIKKEL

F1.OMFANG: Opprett et minimalt Next.js 16-prosjekt med de sentrale arkitekturreglene og en verifiserbar artikkelrute.
F1.01: Opprett package.json med navn seo-site-template, package-lock.json, strict TypeScript og npm-scripts for build, start, typecheck, lint og test.
F1.02: Dokumenter laaste Next.js-, React-, Node-, Tailwind-, Drizzle- og testverktoyversjoner i build-loggen.
F1.03: Opprett src/app/, src/lib/seo/, typesikker nettstedskonfigurasjon og tokenoppsett etter avklart beslutning 1.
F1.04: Etabler server-only-grense for innholds- og fremtidig DB-tilgang.
F1.05: Sett opp norsk routing uten locale-prefiks og en locale-abstraksjon som kan utvides senere.
F1.06: Implementer slug-normalisering og grunnleggende URL-/canonical-policy etter beslutning 2.
F1.07: Opprett en minimal forside, kategorirute og /[kategori]/[slug] uten ferdig redaksjonell fyllstofftekst.
F1.08: Bruk bare den eksplisitt godkjente QA-fixturen eller testdatabasen fra beslutning 4 til HTML-verifikasjon.
F1.09: Samle generateMetadata-hjelpere, robots-policy og typet Article/BreadcrumbList-graf i src/lib/seo/.
F1.10: Implementer sikker JSON-LD-serialisering og runtime-validering av grunnleggende Article-graf.
F1.11: Etabler revalidate 3600 for artikkel og 600 for forside/kategori samt en dokumentert tag-navnekontrakt.
F1.12: Det skal ikke hevdes at live Neon-publisering eller tag-invalidering er ferdig foer fase 2 og 3 er implementert.
F1.13: Etabler noindex for test/preview og steng testfixturen i vanlig produksjonsmodus.
F1.14: Konfigurer NETWORK_LINKS_ENABLED med default false og typesikker boolsk parsing.
F1.15: Innfoer lint-/arkitekturkontroller for any, ukommentert use client, SEO utenfor src/lib/seo/ og sidespesifikke literalverdier utenfor tillatte kilder.
F1.16: Etabler den godkjente maaleprofilen og en foerste automatisk kontroll av JS-budsjett og labytelse paa artikkelruten.
F1.17: Tailwind skal bruke tokenverdier; ferdige alternative magasinoppsett utsettes til fase 4.

F1.A01: npm run build returnerer 0 med det dokumenterte test-/produksjonsmiljoet.
F1.A02: npm run typecheck returnerer 0 uten any-unntak i domene, SEO eller schema.
F1.A03: npm run lint returnerer 0 og omfatter reglene i F1.15.
F1.A04: npm test returnerer 0 med reelle slug-, canonical-, metadata-, config- og JSON-LD-tester.
F1.A05: Det ferdige bygget startes lokalt med npm run start og svarer paa en valgt artikkelrute.
F1.A06: curl lagrer responsheadere og raatt HTML uten aa kjoere JavaScript.
F1.A07: Den synlige article-broedteksten finnes i den hentede HTML-en utenfor script-elementer.
F1.A08: HTML-en har noeyaktig en title, en meta description og en canonical-link.
F1.A09: Canonical er absolutt og lik forventet SITE_URL pluss den normaliserte artikkelstien.
F1.A10: JSON-LD i samme respons kan parses og valideres som riktig Article-graf med samsvarende URL og metadata.
F1.A11: En ukjent artikkel gir HTTP 404 i en faktisk request.
F1.A12: Normalisering av en trailing-slash-variant gir avtalt HTTP 301 og hoeyest ett hopp.
F1.A13: Fixturen er eksplisitt noindex i QA-modus og utilgjengelig i vanlig produksjonsmodus.
F1.A14: Den avklarte JS-/labprofilen med fase 1-grense paa 140000 gzip-bytes passerer og tallene er lagret uten aa hevde at felt-INP er verifisert.
F1.A15: docs/build-log.md inneholder hva som ble bygget, krav-ID for eventuelle avvik, eksakte testresultater og alt som gjenstaar.
F1.A16: docs/qa/ inneholder etterproevbare HTML-, header- og maaleresultater med tidspunkt.
F1.STOPP: Naar F1.A01-F1.A16 er verifisert, avsluttes arbeidet uten aa starte neste fase.

## FASE 2: NEON, MIGRASJONER OG REDAKSJONELLE REVISJONER

F2.FORUTSETNING: Beslutning 5 og tilgangen til en separat Neon-testdatabase er avklart.
F2.01: Implementer Drizzle-skjema, indekser, constraints og Drizzle Kit-migrasjoner for entitetene i K01-K04.
F2.02: Implementer server-only-repositories som bare eksponerer publisert revisjon til offentlig lesing.
F2.03: Implementer innholdsformat, kilde-/bildereferanser og original_research etter avklarte valg.
F2.04: Legg til autentiserte forfatter-/redaktoeridentiteter og revisjonsbundet godkjenning uten et eksternt headless CMS.
F2.05: Bytt QA-fixture til DB-basert integrasjonstest uten aa legge testinnhold i offentlig produksjon.
F2.A01: Migrasjon fra tom testdatabase og oppgradering fra forrige schema passerer.
F2.A02: Samtidige slug-kollisjoner loeses uten duplikat-URL eller tapt artikkel.
F2.A03: En uautorisert skriver kan ikke publisere eller registrere en menneskelig godkjenning.
F2.A04: Endring av godkjent tekst ugyldiggjoer den relevante godkjenningen.
F2.A05: Utkast er utilgjengelige i offentlig HTML, RSC, metadata og OG-responser.
F2.A06: De fire npm-kommandoene og raatt-HTML-kontrakten kjoeres mot faktisk DB-basert artikkel.
F2.DEKNING: L03-L04, E01-E20, G19-G21 og K01-K07.

## FASE 3: PUBLISERING, TAG-REVALIDERING OG TEKNISKE FEEDER

F3.01: Implementer draft -> in_review -> published med autorisert godkjenning og atomisk revisjonspeker.
F3.02: Implementer revalidateTag for alle beroerte innholds- og aggregattags.
F3.03: Implementer retry/deduplisering for publisering, cacheoppdatering og IndexNow.
F3.04: Implementer segmentert sitemap-index, konfigurasjonsstyrt robots.txt og RSS per kategori.
F3.05: Implementer redirect-map, 404/410 og publiseringshistorikk uten soft-404.
F3.A01: Ny og oppdatert artikkel finnes i faktisk cachet HTML etter bekreftet publisering.
F3.A02: Tilbaketrukket artikkel er fjernet fra HTML, lister, feeds, sitemap og OG-tilgang.
F3.A03: Sitemap med 45001 URL-er deles korrekt uten duplikater eller manglende URL-er.
F3.A04: lastmod endres ved faktisk publisert innholdsendring og ikke ved redeploy.
F3.A05: IndexNow-fixtures dekker suksess, avvisning, rate limit og midlertidig feil uten aa sende test-URL-er eksternt.
F3.A06: Ukjent URL gir 404, tombstone gir 410 og historisk URL gir ett korrekt redirect-hopp.
F3.A07: De fire npm-kommandoene og raatt-HTML-kontrakten passerer.
F3.DEKNING: B21-B29, E05-E10 og G01-G18.

## FASE 4: OFFENTLIGE SIDETYPER, DESIGNVARIANTER OG FULL SEO

F4.01: Implementer tre forsidevarianter og tre artikkelvarianter med felles semantisk kontrakt.
F4.02: Implementer pillar/cluster, review-ruter, paginering, emneterskel og facet-noindex.
F4.03: Implementer forfatter- og tillitssider med tomme TODO-strukturer til redaksjonen fyller inn ekte innhold.
F4.04: Fullfoer metadata, hreflang, alle avtalte JSON-LD-byggere og dynamiske OG-bilder.
F4.05: Implementer pris-/review-validering uten aa produsere markup for ikke-kvalifisert innhold.
F4.A01: En HTML-crawl finner hver publisert artikkel med hoeyest tre klikk og korrekt pillar-returlenke.
F4.A02: Hver pagineringsside har egen canonical/title/description og side 2+ er indekserbar.
F4.A03: Emnesider med 4 og 5 publiserte artikler gir ulike robots-policyer ved standardterskel.
F4.A04: Samtlige facets er noindex og foelger vedtatt canonical-policy.
F4.A05: Alle seks layoutvarianter bestaar samme HTML-/metadata- og tilgjengelighetskontrakt.
F4.A06: OG-responser er bilder paa 1200x630 med korrekt publisert tittel og tema.
F4.A07: Egne eller betalte produktvurderinger produserer ikke Review/Rating-markup.
F4.A08: Ingen av de ekskluderte rich-result-typene forekommer i generert JSON-LD.
F4.A09: De fire npm-kommandoene og raatt-HTML-kontrakten passerer.
F4.DEKNING: A01-A23, B16-B20, C01-C18, D01-D21 og I01-I10.

## FASE 5: AFFILIATE, SAMTYKKE OG MAALING

F5.FORUTSETNING: Beslutning 7 og faktisk samtykke-/maaleleverandoer er avklart.
F5.01: Implementer /go/-redirect, destinasjonsvalidering, rel-attributter og tvungen annonsemerking.
F5.02: Implementer samtykke, tilbakekalling, Consent Mode v2 og korrekt scriptlasting.
F5.03: Integrer Vercel Speed Insights, Web Analytics og samtykkestyrte affiliate-events.
F5.04: Implementer beskyttet endpoint for publiseringsvolum og dokumentert original_research.
F5.A01: /go/ gir 302 med korrekt destinasjon og X-Robots-Tag; manipulerte destinasjoner avvises.
F5.A02: Alle kommersielle lenker har de tre krevde rel-verdiene og synlig annonsemerking paa mobil og desktop.
F5.A03: Avslag og manglende samtykke setter ingen analyse-/marketingcookies og sender bare eventuelle eksplisitt godkjente kall.
F5.A04: Tilbakekalling stopper videre ikke-noedvendig sporing.
F5.A05: Klikk-events har plassering og godkjent destinasjon uten persondata eller dobbeltregistrering.
F5.A06: Dashboard-tall stemmer med DB-fixtures inkludert null artikler, ny revisjon og tilbaketrekking.
F5.A07: De fire npm-kommandoene og raatt-HTML-kontrakten passerer.
F5.DEKNING: F01-F22 og J01-J11.

## FASE 6: NETTVERKSLENKING LEVERT AV

F6.FORUTSETNING: Beslutning 8 er avklart.
F6.01: Implementer sentral soestersidekonfigurasjon og typesikker env-feature-flag.
F6.02: Implementer relevans-, antalls-, ankertekst- og godkjenningskontroll for kontekstuelle artikkellenker.
F6.03: Lever eksempel paa tom konfigurasjon uten faktiske nettverkslenker og med NETWORK_LINKS_ENABLED=false.
F6.A01: Udefinert eller false flagg gir ingen nettverksdata eller lenker i HTML, RSC eller metadata.
F6.A02: Eksplisitt true i isolert test viser hoeyest to relevante, godkjente lenker per artikkel.
F6.A03: Footer-/sidebar-blokk, automatisk reciprocity og duplikatanker avvises.
F6.A04: Tilbakerulling til false fjerner allerede cachede nettverkslenker etter kontrollert revalidering.
F6.A05: De fire npm-kommandoene og raatt-HTML-kontrakten passerer.
F6.DEKNING: H01-H12.

## FASE 7: SAMLET QA OG MAL KLAR FOR KLONING

F7.01: Kjoer alle krav-ID-er mot en samlet matrise av artikkel, nyhet, review, kategori, emne, forfatter og tillitsside.
F7.02: Kjoer den godkjente ytelsesprofilen paa alle layoutvarianter med representative lange tekster og bilder.
F7.03: Dokumenter maalte LCP-, CLS-, TTFB-, interaksjons- og JS-resultater samt hva som krever senere feltdata.
F7.04: Test Vercel preview-headere, prod-konfigurasjon, Neon-roller, migrasjoner og gjenoppretting paa avtalte testmiljoer.
F7.05: Skriv klone-/launch-instruks med alle obligatoriske TODO-er, secrets-navn, DNS/Search Console og avslag ved uferdig redaksjonsinnhold.
F7.06: Kontroller at malens generiske config ikke publiserer merkevare, eksempelpersoner eller testartikler paa et nytt domene.
F7.A01: Samtlige relevante krav har eksplisitt bestaatt, blokkert eller ikke-utfoert status med bevis.
F7.A02: Ingen blokkert launch-kritisk kontroll er feilaktig markert som bestaatt.
F7.A03: Alle fire npm-kommandoer passerer i ren installasjon med laast lockfile.
F7.A04: Produksjonsbyggets HTML, JSON-LD, redirects, feeds og OG-bilder er verifisert fra faktiske responser.
F7.A05: Alle ytelsesbudsjett bestaar den avklarte labprofilen; felt-CWV rapporteres som utestet til tilstrekkelig trafikk finnes.
F7.A06: NETWORK_LINKS_ENABLED leveres false og ingen maalescript aktiveres i strid med samtykkepolicy.
F7.STOPP: Malen overleveres for selvstendig kloning; ingen automatisk utrulling av 50 nettsteder.
F7.STATUS: Ikke ferdig; F7.A05 er blokkert og den faktiske Vercel-delen av F7.04 er ikke utfoert.
F7.STATUS: F7.A01-F7.A04 og F7.A06 har lokale bevis i docs/qa/phase7/; dette er ingen offentlig launch-godkjenning.

## EKSPLISITT UTENFOR MAL 1

UT01: Aktiv flerspraaklighet, oversatte artikler og flere offentlige locale-prefikser.
UT02: Et headless CMS eller en felles redaksjonsplattform for hele nettverket.
UT03: Automatisk AI-publisering uten menneskelig revisjonsgodkjenning.
UT04: Ferdige nettverkstekster, falske forfatterprofiler eller ferdigskrevet fyllstoff.
UT05: Aktiv krysslenking, lenkeutveksling og sitewide nettverksblokker.
UT06: Handlekurv, checkout, ordrebehandling eller lagerstyring for egne nettbutikker.
UT07: Brukergenererte anmeldelser, kommentarer, medlemskap, nyhetsbrev og leserkontoer.
UT08: Automatisk scraping av produktpriser eller masseimport av produsenttekster.
UT09: Implementasjon av de ekskluderte rich-result-funksjonene i D14.
UT10: Automatisk DNS-endring, domenehandel, kontoabonnement eller offentlig masseutrulling.
UT11: Garanti for rich results, indeksering, trafikk, CWV-feltresultater eller soekeposisjoner.
UT12: Faktiske produksjonstekster og lansering av husutstyr.no foer malen og nettstedets redaksjonsinnhold er godkjent.
