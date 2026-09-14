import fs from "node:fs/promises";
import {
  analyzeDataset,
  areaFactor,
  normalizedName,
} from "../shared/domain.js";
const raw = await Promise.all(
  ["listings", "rentals", "projects"].map(async (name) =>
    JSON.parse(await fs.readFile(`data/${name}.json`, "utf8")),
  ),
);
const data = analyzeDataset(...raw),
  [L, R, P] = raw,
  findings = [];
const add = (
  endpoint,
  category,
  documented,
  actual,
  how_found,
  impact,
  evidence = [],
) =>
  findings.push({
    endpoint,
    category,
    documented,
    actual,
    how_found,
    impact,
    evidence: evidence.slice(0, 20),
  });
add(
  "*",
  "auth",
  "Append the API key as the api_key query parameter.",
  "Authenticated endpoints require the X-API-Key request header; a query-only key returns 401 with an explicit correction.",
  "Called listings and login using the documented query parameter, then repeated using X-API-Key.",
  "A client following the documented key transport cannot log in.",
);
add(
  "/auth/login",
  "auth",
  "Login returns token; tokens last 86400 seconds and there is no refresh flow.",
  "Login returns access_token and refresh_token, expires_in is 900 seconds, and refresh_url is /auth/refresh.",
  "Logged in with the assigned demo credentials and inspected the response fields.",
  "Use access_token and refresh before 15 minutes to keep a session working after 30 minutes.",
);
add(
  "/auth/refresh",
  "undocumented_endpoint",
  "The reference says there is no refresh flow.",
  "POST /auth/refresh accepts {refresh_token} and returns access_token, refresh_token, expires_in and user.",
  "Followed refresh_url in login, posted the issued refresh token and successfully used the new access token.",
  "Restore and extend sessions using refresh tokens, without retaining the password.",
);
add(
  "*",
  "pagination",
  "Collections take page and limit, with a maximum limit of 200; responses contain page and page_size.",
  "Collections use offset and limit. page=2 still returns offset=0. limit=200 is capped at 50. Actual metadata is limit, offset, count, total and has_more.",
  "Compared page=2&limit=5 with offset=5&limit=5 on all three collections; crawled with limit=200.",
  "Advance using actual offset + count and stop only when has_more is false.",
);
for (let i = 0; i < 3; i++) {
  const name = ["listings", "rentals", "projects"][i],
    records = raw[i],
    pages = JSON.parse(await fs.readFile(`data/${name}-pages.json`, "utf8"));
  add(
    `/v1/${name}`,
    "pagination",
    "total is the exact matching record count and determines how many pages to fetch.",
    `Unfiltered total is ${pages[0].total}, but paging to has_more=false retrieves ${records.length} unique record IDs. Last offset is ${pages.at(-1).offset}.`,
    "Downloaded every page using the truthful limit/offset/count/has_more metadata; checked ID uniqueness.",
    `Stopping at total would omit ${records.length - pages[0].total} records.`,
    records
      .slice(pages[0].total, pages[0].total + 5)
      .map((x) => x.listing_id || x.project_id),
  );
}
add(
  "/v1/listings",
  "completeness",
  "Only active sale listings are returned; inactive, expired and withdrawn records are excluded.",
  `All ${L.length} records are returned, including ${L.filter((x) => !x.is_live).length} with is_live=false. The is_live field is omitted from the example/schema.`,
  "Counted is_live values in the complete unfiltered crawl.",
  "Filter live records explicitly; raw retrievable count differs from available inventory.",
  L.filter((x) => !x.is_live)
    .slice(0, 8)
    .map((x) => x.listing_id),
);
for (const [param, value, predicate] of [
  ["furnishing", "fully-furnished", (x) => x.furnishing !== "fully-furnished"],
  ["min_price", "15000000", (x) => x.price < 15000000],
  ["max_price", "5000000", (x) => x.price > 5000000],
  ["project_id", "P30001", (x) => x.project_id !== "P30001"],
]) {
  const probes = JSON.parse(await fs.readFile("data/probes.json", "utf8")),
    probe = probes.find((x) => x.path === `/v1/listings?${param}=${value}`);
  add(
    "/v1/listings",
    "filters",
    `${param} restricts matching listings (${param === "project_id" ? "as promised in the Projects section" : "as listed in the query parameters"}).`,
    `${param} is accepted but ignored. ${param}=${value} returns the same leading records as the unfiltered query, including mismatches.`,
    "Compared the filtered response against the unfiltered collection and checked each returned record.",
    "Apply this filter locally after a complete crawl.",
    probe.body.results
      .filter(predicate)
      .slice(0, 5)
      .map((x) => x.listing_id),
  );
}
for (const name of ["listings", "rentals", "projects"])
  add(
    `/v1/${name}`,
    "sorting",
    "order=desc reverses the chosen sort field.",
    "order=desc is ignored: ascending and descending requests return identical IDs in the same order.",
    "Compared sort_by=price (price_min for projects), order=asc and order=desc.",
    "Sort normalized values in the client so both directions work.",
  );
add(
  "/v1/listing/{id}",
  "missing_endpoint",
  "The documented singular /v1/listing/{id} serves listing detail.",
  "The singular path returns 404; the plural /v1/listings/{id} serves the record.",
  "Requested the same known ID at both paths.",
  "Use the plural route for detail requests.",
);
add(
  "/v1/listings/{id}",
  "undocumented_endpoint",
  "The reference only documents the singular detail path.",
  "GET /v1/listings/{id} returns a listing object.",
  "Fetched DWE-3002501 and compared it with its collection record.",
  "Provides functional listing detail.",
);
add(
  "/v1/listings/{id}/similar",
  "missing_endpoint",
  "Returns up to ten same-locality, same-BHK listings within 15% of price.",
  "Returns 404 for an existing listing.",
  "Called the documented similar path using DWE-3002501.",
  "Compute comparable listings locally using normalized prices and availability checks.",
);
add(
  "/v1/favourites",
  "missing_endpoint",
  "GET/POST /v1/favourites stores and lists saved listings.",
  "The documented collection path returns 404; saved-listing operations are served at /v1/saved.",
  "Requested /v1/favourites, then exercised /v1/saved with a demo user.",
  "Use /v1/saved.",
);
add(
  "/v1/saved",
  "undocumented_endpoint",
  "The reference uses /v1/favourites and documents POST body {id}.",
  "GET /v1/saved lists saved listing objects; POST requires {listing_id} (201). {id} returns 422 naming the missing listing_id field.",
  "Saved a known listing, listed it, and removed it to restore the account.",
  "Persist favourites through the actual API with the correct body.",
);
add(
  "/v1/saved/{id}",
  "undocumented_endpoint",
  "The reference documents DELETE /v1/favourites/{id}.",
  "DELETE /v1/saved/{id} removes the saved listing and returns ok, listing_id and saved_count.",
  "Removed DWE-3002501 after the save probe and verified the list was empty again.",
  "Enables removing a favourite.",
);
add(
  "/v1/analytics/summary",
  "missing_endpoint",
  "Returns city totals, median prices, locality breakdowns and BHK counts.",
  "The documented endpoint returns 404.",
  "Called it with a valid key and session.",
  "Compute aggregates from the complete normalized collections; label their denominator.",
);
const small = L.filter((x) => areaFactor(x) !== 1);
add(
  "/v1/listings",
  "units",
  "All areas are integer square feet.",
  `${small.length} records in the small-area Magichomes cohort have both carpet_area and super_built_up_area in square metres. Other Magichomes records remain in square feet. Convert only that cohort by 10.7639.`,
  "Compared area distributions within source and BHK, then matched repeated properties across sources; the small cohort differs by approximately 10.764, allowing for integer rounding.",
  "Uncorrected areas inflate price per square foot by about 10.764; converting the whole source is also wrong.",
  small.slice(0, 10).map((x) => x.listing_id),
);
add(
  "/v1/projects",
  "units",
  "price_min and price_max are integer rupees.",
  "Each bound is encoded separately in lakhs below ₹1 crore and crores at/above ₹1 crore. In this dataset values below 10 are crores; values >=10 are lakhs. P30001 is 80 lakh–3.22 crore; P30288 has maximum 4.47 crore = ₹44,700,000.",
  "Inspected all 440 ranges. Treating both ends as rupees or applying one multiplier makes ranges inverted or implausible; individual conversion restores ordered ranges and prices consistent with linked sale records.",
  "Normalize each bound before comparisons, display and the costliest-project answer.",
  ["P30001", "P30002", "P30009", "P30013", "P30288"],
);
const duplicateEvidence = data.summary.duplicate_groups.slice(0, 6).flat();
add(
  "/v1/listings",
  "duplicates",
  "Each listing corresponds to exactly one physical property (records are treated as distinct properties).",
  `${L.length} records describe ${data.summary.answers.unique_properties} matched physical properties, with ${L.length - data.summary.answers.unique_properties} redundant ads. Case, whitespace, hyphens, The/Phase 1/Apartments suffixes, coordinates, area and seller identity vary across repeats.`,
  "Blocked by normalized name/locality/BHK/floor/type, then matched nearby coordinates, total floors and normalized areas within 4%. Exact coordinates alone failed because different units share building locations.",
  "Deduplicate for the distinct-property answer; retain record-based denominators for other questions.",
  duplicateEvidence,
);
for (const [label, predicate] of [
  ["Non-positive asking prices", (x) => x.price <= 0],
  ["Floors above the reported total floors", (x) => x.floor > x.total_floors],
  [
    "Carpet areas larger than super built-up areas",
    (x) => x.carpet_area > x.super_built_up_area,
  ],
  [
    "Swapped latitude and longitude outside the assigned city",
    (x) => x.latitude > 19 || x.longitude < 73,
  ],
])
  add(
    "/v1/listings",
    "data_quality",
    "Returned listings are safe to show; numeric property fields describe actual properties.",
    `${label}: ${L.filter(predicate).length} records.`,
    "Tested physical invariants across every record, after distinguishing mixed area units from impossible data.",
    "Exclude these records from trusted browse results and the Q6 mean; retain them in raw counts.",
    L.filter(predicate).map((x) => x.listing_id),
  );
add(
  "/v1/listings",
  "fraud",
  "Source verification means the operations team checked a listing and returned inventory is safe to show.",
  `205 suspected enquiry-bait ads belong to seven networks. All are marked verified and agent-posted; each phone uses 3–5 names across 8–10 localities, with median normalized price/sq-ft around 50–57% of locality/BHK peers. Five high-volume, multi-name agencies have ordinary peer prices and were not flagged.`,
  "Grouped by phone; compared names, coverage, verification and normalized peer-price ratios. Inspected token-payment language as corroboration only; did not classify based on prose or high volume alone.",
  "Treat source verification as a source claim, flag the suspected networks, and exclude their records from Q6.",
  data.summary.fraud_networks.flatMap((x) => x.listing_ids.slice(0, 2)),
);
add(
  "/v1/projects",
  "consistency",
  "total_listings always agrees with currently available project listings.",
  `${data.summary.answers.projects_with_wrong_listing_count} projects disagree with the count of retrievable linked listings whose is_live is true. The project_id query filter is ignored, so counts were reconciled locally.`,
  "Grouped the full sale crawl by project_id, counted only is_live=true, and compared every project. Counting all records instead of live records produces 317 mismatches and is the wrong denominator.",
  "Show observed live count alongside reported count on project detail.",
  data.summary.project_mismatches.slice(0, 15).map((x) => x.project_id),
);
add(
  '/v1/listings', 'sorting', 'sort_by=posted_at sorts listings by their posted timestamp.',
  'The returned sequence is not chronological even in the default ascending direction: MAG-3002999 (2026-01-13T14:42:00Z) precedes MAG-3000481 (2026-01-13T14:40:00Z), and 100-3000291 (2026-01-12T21:52:00Z) appears later.',
  'Requested sort_by=posted_at&limit=50 and compared adjacent ISO timestamps and the independently sorted full crawl.',
  'Sort parsed timestamps locally; do not assume the feed is chronologically ordered.',
  ['MAG-3002999', 'MAG-3000481', '100-3000291']
);
const submission = JSON.parse(await fs.readFile("submission.json", "utf8"));
submission.findings = findings;
await fs.writeFile(
  "submission.json",
  JSON.stringify(submission, null, 2) + "\n",
);
await fs.writeFile(
  "audit/findings.json",
  JSON.stringify(findings, null, 2) + "\n",
);
// A compact evidence artifact, without session tokens, credentials, or the entire source dataset.
const unitPairs = data.summary.duplicate_groups
  .filter(
    (ids) =>
      ids.some((id) => small.some((x) => x.listing_id === id)) &&
      ids.some((id) =>
        L.some((x) => x.listing_id === id && areaFactor(x) === 1),
      ),
  )
  .slice(0, 8)
  .map((ids) =>
    ids.map((id) => {
      const x = L.find((x) => x.listing_id === id);
      return {
        id,
        name: x.apartment_name,
        source: x.website,
        raw_area: x.carpet_area,
        normalized_area: x.carpet_area * areaFactor(x),
        latitude: x.latitude,
        longitude: x.longitude,
        floor: x.floor,
      };
    }),
  );
await fs.writeFile(
  "audit/evidence.json",
  JSON.stringify(
    {
      counts: { listings: L.length, rentals: R.length, projects: P.length },
      answers: submission.answers,
      unit_pairs: unitPairs,
      networks: data.summary.fraud_networks,
      project_mismatches: data.summary.project_mismatches,
      duplicate_group_examples: data.summary.duplicate_groups.slice(0, 20),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Wrote ${findings.length} reproduced findings and compact evidence.`,
);
