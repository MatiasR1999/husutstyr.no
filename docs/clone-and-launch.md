STATUS: Template launch remains blocked until every phase 7 launch-critical gate passes.
SCOPE: One independent content website per deployment; no cart, checkout or automatic network rollout.
SOURCE: docs/seo-template-spec.md is authoritative; docs/qa/phase7/requirements.md records evidence and limitations.
CLONE: Copy source, scripts, tests, drizzle, docs, site.config.ts, package.json, package-lock.json and root build configuration into a new directory.
EXCLUDE: Never copy .env files, .neon, .next, node_modules, work, browser profiles, QA response captures or local credentials into a new website.
IDENTITY: Set a unique site.id and complete identity.name, identity.url, niche and toneOfVoice in site.config.ts.
ORIGIN: identity.url must be the exact HTTPS origin without a path or trailing slash; SITE_URL must match it.
DESIGN: Choose home/article layouts and edit colors, fonts, spacing, radius and shadows only in site.config.ts.
TOKENS: npm run tokens regenerates src/app/site-tokens.css and the configured next/font module.
COPY: Replace home.title, home.description, content.home, content.category and content.footer TODO values with approved site-specific text.
COPY: Review all interface, disclosure and consent copy against the real operator and actual measurement use.
COPY: Keep trustPages.todo as editorial instructions if desired; the seven public trust documents must contain completed approved Postgres revisions.
EDITORIAL: Publish om-oss, kontakt, redaksjonell-policy, slik-tester-vi, personvern, cookies and annonsorinformasjon with verified ownership and contact details.
AUTHORS: Register actual names, biographies, expertise, licensed images and genuine sameAs references before approving articles.
REVIEW: A human editor must check language, sources, image rights, originality, commercial ties and reader value for each exact revision.
RESEARCH: Register method, responsible author, date and real supporting files or sources; a boolean or empty note does not count.
CONTENT: Never copy local QA identities, articles, products, review scores, prices or network peers into production.
INSTALL: Use Node 24.20.x and npm ci with the committed lockfile; do not use a force upgrade as part of cloning.
DATABASE: Provision an independent Neon project or explicitly isolated branch for the new website.
MIGRATIONS: Apply all drizzle migrations transactionally to an isolated test database first, including the empty-baseline and upgrade-preservation checks.
OWNER: DATABASE_URL_UNPOOLED belongs only in a protected migration/provisioning process; never provide the owner URL to the running Next app.
PUBLIC_ROLE: DATABASE_URL must authenticate as seo_public_reader and read only the approved public views.
EDITOR_ROLE: EDITOR_DATABASE_URL must authenticate as seo_editor_service and publish only through the authenticated revision procedures.
PROVISIONING: Use the migration owner to provision the site's locale, categories, real author records and allowed editor issuer/subject identities in the new database.
BOOTSTRAP: Create and approve initial content through the authorized editorial procedures before running a production build; do not bypass launch validation to seed a public deployment.
SECRET: SITE_URL is the exact completed public origin.
SECRET: DATABASE_URL is the public reader connection for this website.
SECRET: EDITOR_DATABASE_URL is the restricted editorial service connection for this website.
SECRET: OIDC_CLIENT_ID and OIDC_CLIENT_SECRET come from the site's Google Cloud web client.
OIDC: Register the exact SITE_URL/api/auth/callback URI and verify a real allowed Google identity in the target environment.
SECRET: PUBLICATION_WORKER_SECRET must contain at least 32 characters and protect the durable-job worker endpoint.
SECRET: INDEXNOW_KEY must contain 8-128 allowed characters and match the site's verification file.
BLOB: Provision the site's Vercel Blob store and retain BLOB_READ_WRITE_TOKEN only in the chosen protected upload process if that process needs it.
IMAGE_LCP: Set preload=true on at most one image block only after measuring that image as LCP for the selected layout and viewport; other images remain lazy, and text-LCP articles get no image preload.
BLOB: An upload integration is not supplied; upload authorized images, then register asset URL, dimensions, alternative text and rights before referencing the asset in a revision.
FLAGS: SEO_QA_MODE=false and OIDC_TEST_MODE=false are mandatory on hosted deployments.
FLAGS: NETWORK_LINKS_ENABLED=false is the delivered default, including when the variable is absent.
NETWORK: Leave network.sites empty at launch; later activation needs explicit reviewed configuration, relevant approved placements and the documented cache invalidation procedure.
ANALYTICS: measurement.enabled stays false until the actual Vercel setup, disclosures, processor arrangements and consent tests are complete.
ANALYTICS: Basic consent mode must produce no measurement requests before opt-in and must stop sending after withdrawal.
BUILD: Run npm run qa:launch with production environment variables; any BLOCKED line prevents launch.
BUILD: npm run build includes automated launch validation, except in explicitly local QA mode.
BUILD: Run npm run build, npm run typecheck, npm run lint and npm test from a clean npm ci installation.
QA_SETUP: Provision a separate QA branch for the clone, update qa.database project/branch/host guard values, and create new private QA credentials and fixtures; never point the runner at production.
QA: npm run ci:phase7 uses the existing isolated local QA credentials and fixtures; it is not a production seed or deployment command.
QA: Retest all three layout pairs with the locked mobile profile and the approved final 165000-byte initial-JS limit.
QA: npm run ci:phase7 -- --budget-only reevaluates the original 90 visits without replacing measurement timestamps or claiming a new browser run.
QA: Budget-only CI remains nonzero while any cold/warm LCP, TTFB, CLS, interaction or JS group exceeds its agreed limit.
QA: Cold and warm server-cache samples must each satisfy the agreed LCP, CLS, TTFB and interaction limits.
QA: Measure again with the new site's actual long articles, real images, fonts and approved third-party setup.
VERCEL: Link the independent Vercel project only after choosing its owner, project and production domain.
VERCEL: Configure separate Preview and Production secrets; Preview must not point to production writer credentials.
PREVIEW: Test a real hosted preview for X-Robots-Tag noindex on HTML, errors, redirects, feeds and OG responses; private editor routes must additionally require authentication.
PREVIEW: The local VERCEL_ENV header test is regression evidence and does not prove Vercel edge behavior.
PRODUCTION: Recheck raw HTML using curl against next start and the target deployment; body, exactly one canonical/title/description and valid JSON-LD must be in the response.
PRODUCTION: Check actual 301/302/404/410 responses, RSS XML, sitemap segments, OG image dimensions and revision hashes.
GOOGLE: Assess the actual Article/Review markup with current Google requirements and Rich Results Test, then inspect real URLs after launch.
WORKER: Configure an authenticated scheduler or queue to call GET /api/publication-jobs; confirm retry after process loss and immediate withdrawal of cached content.
DNS: Have the domain owner configure Vercel's records for the exact project and verify HTTPS before opening indexing.
SEARCH_CONSOLE: Add the domain property and its owner-provided DNS TXT record; record verification status and an ISO control timestamp in delivery.searchConsole.
SEARCH_CONSOLE: Submit the absolute sitemap index and inspect representative real URLs; an accepted submission is not proof of indexing.
INDEXNOW: Confirm the public verification file and one real eligible notification after launch; never submit localhost, preview or QA URLs.
BACKUP: Record the Neon project, source branch, last known good timestamp or LSN, migration count and retention available on the actual account.
RECOVERY: First restore to a disposable branch and compare published revision hashes, row counts and role privileges before switching any runtime connection.
RECOVERY: Changes to a real production branch or runtime connection require a separate explicit operational decision; the phase 7 test restores only a temporary QA child.
ROLLBACK: Retain the previous build and known good database state; revalidate affected routes and verify actual responses after rollback.
FIELD_DATA: LCP, CLS and INP field status stays NOT_RUN until the website has enough real traffic; lab interactions are not field INP.
GO_LIVE: The site owner records approval of real identity, editorial quality, legal disclosures and all launch-critical evidence before public release.
