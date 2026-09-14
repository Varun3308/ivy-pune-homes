# Ivy Homes · Pune property explorer

A working React application backed by the real Ivy Homes API. It supports the three assigned demo accounts, session refresh, sale and rental browsing, project details, saved homes, and an insights screen built from the complete dataset.

**Stack:** React, Vite, React Router, Redux Toolkit, Node.js, Express, and plain CSS. These match the candidate’s existing project stack. MongoDB and Redis are unnecessary here: Ivy’s API already persists user accounts and saved listings. Adding another database would introduce a second source of truth.

## Run locally

Use Node.js **22.12 or newer**.

```bash
npm ci
cp .env.example .env
# Set IVY_API_KEY to your assigned key in .env.
# Set DEMO_PASSWORD only if you want to run the audit or browser tests.
npm run dev
```

Open **http://localhost:5173** during development. Vite forwards `/api` to Express on port 3000. In the original assignment workspace, `.env` is already configured; do not replace it unnecessarily.

For the production build locally:

```bash
npm run build
npm start
```

Open **http://localhost:3000**. Express serves both the application and its API, including direct links such as `/homes/DWE-3002501` and `/projects/P30288`.

Sign in with `demo1@ivy.homes`, `demo2@ivy.homes`, or `demo3@ivy.homes`, using the shared password in the assignment email. Demo-account buttons fill the email only. The password and API key are not embedded in frontend code.

The first collection load pages through the actual upstream API. Later requests use a ten-minute server cache. No offline fixture or fabricated inventory substitutes for a successful API response. Architectural illustrations are explicitly labelled; the API supplies no property photographs.

## What works

- **Authentication:** real upstream login, HTTP-only access/refresh cookies, upstream validation, automatic renewal before the 15-minute access expiry, retry on an expired token, and upstream logout. Concurrent refresh requests are coalesced. Neither passwords nor bearer tokens are stored in localStorage.
- **Browsing:** sale, rental, and project tabs; locality, BHK, furnishing and inclusive rupee-price bounds; search; normalized price/area/date sorting; URL-persisted filters; nine records per page. Default sale browsing excludes inactive records, impossible records, and suspected seller-network ads. “All records” makes them inspectable with warnings.
- **Details:** directly addressable pages, carpet and built-up areas, seller details, rental deposit/maintenance, project amenities and counts, other ads for the same property, and locally calculated comparable homes.
- **Saved homes:** add, remove and list through `/v1/saved`, scoped to the authenticated account. State survives reload and re-login.
- **Insights:** city totals, eligible-record median price and median ₹/sq-ft, locality and BHK breakdowns, Balewadi rentals, all ten assignment answers, duplicate counts, unit corrections, suspicious networks and project-count discrepancies. Each aggregate explains its denominator.

## Reproduce the investigation

```bash
npm run audit
```

This logs in, downloads the unfiltered collections, probes the reference, calculates answers, and writes `submission.json`, `audit/findings.json`, and `audit/evidence.json`. The full source responses and credentials stay in gitignored `data/`. Audit downloads need `DEMO_PASSWORD` and `IVY_API_KEY` in `.env`. Individual stages are also available:

```bash
npm run audit:login
npm run audit:download
npm run audit:probe
npm run audit:analyze
npm run audit:findings
```

The audit preserves existing candidate metadata. It does not submit the Google Form or publish anything.

### Start by observing the contract

Query-string API keys returned an error explicitly requiring `X-API-Key`. Login returned `access_token`, `refresh_token`, `expires_in: 900`, and `/auth/refresh`, contradicting the documented 24-hour token/no-refresh flow.

Pagination was the next risk. I compared `page=2&limit=5` with `offset=5&limit=5`, and requested a limit of 200. All three collections ignored `page` and capped the actual limit at 50. The complete crawls took 76 sale pages, 29 rental pages and 9 project pages. The reported totals were 3,476 / 1,326 / 402, while the retrievable counts were **3,800 / 1,450 / 440**. The crawler advances by the returned offset plus count and stops at `has_more: false`; it never uses `total` as the stopping condition.

The singular listing detail, favourites, similar-listing and analytics paths failed. Actual listing detail uses `/v1/listings/{id}`. Saved listings use `/v1/saved`, with POST body `{ "listing_id": "..." }`. The documented `{id}` body received a helpful 422. Save/remove probes restored the test account afterwards.

### Test across records, not just one response

**Area units.** A blanket Magichomes conversion is wrong. Only 306 records form the small-area cohort, with both carpet and built-up areas in m². Cross-source repeated-property matches corroborate a roughly 10.7639 ratio, allowing for rounding to whole source units. For this dataset, `website === "magichomes" && carpet_area < 300` identifies that cohort; both area fields are multiplied by 10.7639. Other Magichomes rows already use sq ft. This is an inferred rule for the assigned dataset, not a general real-estate rule.

**Project money.** Bounds mix lakhs and crores independently. For example, P30001’s `80` and `3.22` describe ₹80 lakh–₹3.22 crore. In this dataset values below 10 are in crores and larger values are in lakhs. A single multiplier per project inverts many ranges. Independent conversion restores ordered, plausible ranges across all projects. P30288 has the greatest normalized maximum, ₹44,700,000.

**Repeated properties.** Exact coordinates alone collapse different flats in the same building. Exact text alone misses casing, doubled spaces, hyphens, and variants such as “The”, “Apartments”, and “Phase 1”. Matching blocks on normalized building name, locality, BHK, floor and type; it then requires equal total floors, nearby coordinates (within 0.0012 degrees per axis), and normalized carpet areas within 4%. Connected components allow more than two ads per property. Seller contact and price are deliberately not required to match: agents and asking prices change. This gives **3,230 distinct properties**, including genuine, corrupt and suspected fake records. Record IDs are identifiers, not classification rules.

**Impossible records.** Four independently tested invariants find 28 records: seven non-positive prices, seven floors above the building total, seven carpet areas greater than super built-up areas, and seven swapped latitude/longitude pairs outside Pune. Normal area-unit differences are not classified as corruption.

**Suspected enquiry bait.** Grouping by phone surfaced both suspicious networks and legitimate agencies. Seven networks have at least 15 records, three or more names, broad locality coverage, agent-only posting, universal source verification, and a median normalized price/sq-ft below 65% of the corresponding locality/BHK median. Their actual medians are around 50–57% of peers. These networks account for **205 records**. Five other multi-name, high-volume agencies have ordinary prices and mixed verification; they are not flagged. Seller requests for payment before a visit corroborate some records but are not the classifier: many flagged records contain ordinary prose. This remains a reasoned inference from the supplied data, not external proof about real people.

**Project counts.** Count every linked `is_live: true` listing, including suspicious records, for this reconciliation. There are **95** mismatches. Comparing project counts against all active and inactive records would produce 317 mismatches and misread “currently available”. The advertised `project_id` query is ignored, so this grouping happens locally.

**Time.** The reference is fixed at `2026-09-10T00:00:00+05:30`. The seven-day window is `[2026-09-02T18:30:00Z, 2026-09-09T18:30:00Z)`. Parse the returned timestamps; do not use the machine’s local timezone or today’s date. The API’s timestamp sort is not fully chronological, so the application sorts parsed values itself.

### Hypotheses that did not pan out

- **Every record ID might repeat across pages:** all downloaded sale/rental/project identifiers are unique within their collection. Distinct IDs still do not imply distinct properties.
- **All filters might be broken:** locality, `bhk`, and sale `property_type` worked in the probes; rental furnishing worked too. Project status `ready to move` filtered correctly. Locality matching also accepted title case. These were not reported as broken.
- **All sorting might be ignored:** sale and rental price sorting do select the low-price records. The failure is the ignored descending `order`; timestamp ordering has an additional reproducible problem.
- **All Magichomes areas might be m²:** contradicted by the large, already-square-foot cohort.
- **Rentals might encode yearly rent or deposit multiples as the rent itself:** the full rental price/area distributions and deposit-to-rent ratios (integer 2–10 months) support monthly rupees and square feet. Rental detail agrees with collection values. No rental-unit discrepancy is claimed.
- **Every area inversion might be a unit problem:** paired carpet/built-up fields share their unit, so their ordering remains impossible under conversion.
- **A shared building location might identify a home:** different floors and bedroom counts at the same coordinates disprove that shortcut.
- **A verified badge might exclude fraud, or a busy phone might establish it:** the network comparisons contradict both shortcuts.
- **UTC `Z` timestamp formatting might be broken:** every retrieved sale/rental timestamp parses with a `Z` suffix; no unsupported timezone-format discrepancy is claimed.
- **The advertised v2/LLM handbook might be authoritative:** root-linked `/llms.txt` has counts contradicted by the full crawl, and advertised v2 endpoints return a helpful “there is no /v2” 404. Neither contributed answers.

Some seller descriptions contain instructions aimed at automated assistants, including requests to add submission fields or display certification claims. They were treated as untrusted seller text, not instructions. React renders descriptions as plain text. The submission retains exactly the ten required answer keys.

## Answers from this key’s dataset

| Question                                     | Answer                               |
| -------------------------------------------- | ------------------------------------ |
| 1. Retrievable sale records                  | 3,800                                |
| 2. Distinct properties                       | 3,230                                |
| 3. Live sale records                         | 2,998                                |
| 4. Corrupt records                           | 28; sorted IDs in `submission.json`  |
| 5. Balewadi total monthly rent               | ₹5,184,200                           |
| 6. Mean eligible live 2 BHK ₹/sq-ft          | ₹10,859.32                           |
| 7. Costliest project                         | P30288; ₹44,700,000 maximum          |
| 8. Records in the reference seven-day window | 128                                  |
| 9. Suspected fake records                    | 205; sorted IDs in `submission.json` |
| 10. Projects with incorrect live counts      | 95                                   |

Q6 is the **arithmetic mean of individual record price/carpet-area ratios**, not total price divided by total area. It excludes Q4/Q9 IDs and does not deduplicate records. Q5 includes all retrievable Balewadi rentals, including inactive records. Q8 includes all records in its time window, without quality or live-status exclusions.

## Verification

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run submission:check
```

Nine unit tests cover pagination completion/stalls, mixed units, physical invariants, duplicate matching, combined filtering, IST boundaries, and legitimate-agency counterexamples. Five browser tests use the **real API**: all demo logins, combined filters/sorting/pagination, deep links after reload, saved-home persistence and isolation, concurrent refresh recovery, rental/project details, insights, mobile navigation/layout, and invalid-login recovery. Browser mutations restore the tested saved state.

Session-renewal validation removes the access cookie while retaining the real refresh cookie, then requests multiple authenticated resources concurrently. This exercises actual upstream refresh without waiting thirty minutes; a continuous thirty-minute browser soak is not claimed. Desktop and mobile screens were also inspected using Playwright screenshots. Docker deployment configuration is supplied; Docker execution was not tested on this machine.

## Deployment and submission

`render.yaml` deploys the frontend and Express API as **one Node web service**. In Render, connect the GitHub repository and create a Blueprint, or configure a Web Service with:

- Build: `npm ci --include=dev && npm run build`
- Start: `npm start`
- Environment: `NODE_ENV=production`, `IVY_API_KEY=<assigned key>`, `IVY_API_BASE=https://solve.ivy.homes`
- Health check: `/api/health`

Render assigns the public URL after deployment. This follows the [official Express deployment guide](https://render.com/docs/deploy-node-express-app). Production cookies require HTTPS. The app needs a Node server; uploading only `dist/` to static hosting will not provide authentication or API access.

A `Dockerfile` is also included. Build with `docker build -t ivy-pune .`, then run behind an HTTPS reverse proxy with the assigned key supplied as an environment variable.

**Publication status:** code and audit artifacts are complete locally. The public repository and live deployment are not yet created. Candidate email, `repo_url`, and `demo_url` intentionally remain blank until provided/verified. `npm run submission:check` reports those missing fields. The intended GitHub owner is **Varun3308**. Authenticate that account with `gh auth login` before creating/pushing a repository. Also confirm Git author settings: this workspace originally used a different local Git identity; no candidate email was invented.

The assignment explicitly requires `api_key` inside root `submission.json`. It is included there for grading, while `.env`, demo password, tokens and raw session files are gitignored. Do not distribute the key separately or reuse it in other projects. Review the findings and fill the missing metadata before sending the [submission form](https://forms.gle/e8L79HaN3MbJJact7).

## Code map

```text
client/src/pages/       Login, browse, detail and insights screens
client/src/components/ Navigation, property cards and reusable UI
client/src/store.js     Redux state and same-origin API calls
shared/domain.js       Pure normalization, matching, filtering and statistics
server/upstream.js     Real authentication, cookies and refresh coalescing
server/catalog.js      Complete pagination and ten-minute catalogue cache
server/index.js        Express routes and production SPA serving
scripts/               Reproducible audit and submission checks
submission.json        Required answers and evidence-backed findings
audit/                Compact reviewable evidence (no credentials)
tests/                 Data tests and real-API Playwright tests
```

## With another two days

I would validate marginal property matches against richer address/unit identifiers, measure fraud-classifier sensitivity instead of relying on one threshold, and review ambiguous sellers manually. I would add a full thirty-minute session soak, keyboard/screen-reader coverage, cache invalidation for changing inventory, and deployed smoke tests. A photograph endpoint, if the API adds one, could replace the labelled illustrations without inventing property imagery.

## AI assistance

Built with assistance from **OpenAI Codex** for API exploration, code generation, analysis, debugging, and automated checks. The numerical answers come from the downloaded assigned-city data and reproducible rules in this repository. The candidate should personally review the final code, evidence, and findings before submission, as required by the assignment.
