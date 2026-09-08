STATUS: Phase 7 remains blocked on cold TTFB/LCP and actual Vercel preview verification.
SCOPE: The repository includes source, QA scripts, unit tests, migrations, specification and build log.
LOCAL_EVIDENCE: Generated response captures, headers, screenshots, database fixtures and per-run reports remain in the original local workspace and are excluded from Git.
LOCAL_EVIDENCE: References to these files in docs/build-log.md and the plan describe actual local runs; the files are not included in a fresh Git clone.
REPRODUCE: Configure a separate QA database and private environment files following docs/clone-and-launch.md before running the phase-specific scripts.
BASELINE: The last clean install passed build, typecheck, lint and all 85 unit tests; actual HTML was checked afterward.
PERFORMANCE: The 90 recorded browser visits measured a maximum of 157993 initial gzip bytes, within the approved 165000-byte limit.
PERFORMANCE: Cold latency remains over budget; this repository is not a production-launch approval.
PRIVACY: Do not commit environment files, authentication cookies, local browser profiles, private database access or raw run captures.
