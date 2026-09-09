SITE SETUP: HUSUTSTYR.NO
Skrevet 2026-09-09 etter prompt 3, personalisering.

IDENTITET
Merkenavn er Husutstyr.
Domene er husutstyr.no.
Nisje er hus.
site.id er husutstyr.
Utgiver og ansvarlig redaktoer er Matias Raedergaard som privatperson, ikke et selskap.
Behandlingsansvarlig etter personvernforordningen er samme person.

LAYOUT OG DESIGN
Forsidevariant er magazine.
Artikkelvariant er editorial.
Fargepaletten er varm redaksjonell og erstatter malens blaa standard.
Radius er satt til null for et skarpere redaksjonelt uttrykk.
Kontrast er maalt foer commit: tekst 16.93 til 1, aksent 7.43 til 1, dempet 6.97 til 1 mot sidefargen.
Alle tekstpar bestaar WCAG AA eller bedre.
Skillelinjen er 1.92 til 1 mot malens standard paa 1.59 til 1.

KATEGORIER
Seks kategorier er definert i content/categories.json og provisjonert i produksjonsdatabasen.
kjokken, rengjoring, vask-og-toy, oppbevaring, vedlikehold, inneklima.
Hver har egen introduksjon og egen SEO-tekst innenfor 50 til 60 og 140 til 160 tegn.
Alle titler og beskrivelser er unike.

TILLITSSIDER
Alle sju er skrevet i content/trust-pages.json.
Ingen av dem er publisert, fordi kontakt-e-posten mangler og staar som TODO fire steder.
Siden slik-tester-vi sier eksplisitt at nettstedet ikke driver fysisk produkttesting.
Dette er skrevet slik fordi det er sant, ikke for aa fylle plassen.

FORFATTER
Forfatter er Matias Raedergaard, oppgitt av brukeren selv.
Bilde med rettigheter mangler og skal leveres av brukeren.
sameAs skal peke til brukerens LinkedIn-profil, URL er ikke mottatt enda.
Ingen person er diktet opp.

INFRASTRUKTUR
Produksjonsdatabase er Neon-prosjekt summer-surf-00665520 i aws-eu-central-1.
QA-database er Neon-prosjekt raspy-leaf-06859059 i aws-eu-central-1, isolert gren phase-2-qa.
Vercel-prosjekt er husutstyr-no under matiads-projects, koblet til GitHub.
vercel.json setter framework nextjs og region fra1, samlokalisert med databasen.
Aatte produksjonsvariabler er satt i Vercel.
NETWORK_LINKS_ENABLED er false.

GJENSTAAENDE FOER BYGGET PASSERER
OIDC_CLIENT_ID og OIDC_CLIENT_SECRET fra en Google Cloud web-klient.
Offentlig kontakt-e-post til tillitssidene.
Forfatterbilde med rettighetsnotat.
LinkedIn-URL til sameAs.
Minst en publisert artikkel.
De sju tillitssidene publisert som godkjente revisjoner.

IKKE UTFOERT
Ingen DNS-endring, domenekobling eller offentlig publisering.
Ingen artikler er skrevet.
Ingen forfatterprofil er registrert i databasen.
