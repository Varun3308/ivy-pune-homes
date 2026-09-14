// Rules are inferred from the complete city dataset, not seller-written descriptions.
export const REFERENCE = '2026-09-10T00:00:00+05:30';
export const SQM_TO_SQFT = 10.7639;
export const median = values => {
  const a = values.filter(Number.isFinite).toSorted((a, b) => a - b);
  return a.length ? (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2 : 0;
};
export const sum = values => values.reduce((a, b) => a + b, 0);
export function areaFactor(record) {
  // Only the small-area cohort from this source is in m². Converting the whole source is wrong.
  return record.website === 'magichomes' && record.carpet_area < 300 ? SQM_TO_SQFT : 1;
}
export function projectPrice(value) {
  // This feed uses lakhs below one crore, and crores above it, separately for each bound.
  return Math.round(value * (value < 10 ? 10_000_000 : 100_000));
}
export function corruptReasons(x) {
  const reasons = [];
  if (x.price <= 0) reasons.push('Non-positive asking price');
  if (x.floor > x.total_floors) reasons.push('Floor exceeds the building’s total floors');
  if (x.carpet_area > x.super_built_up_area) reasons.push('Carpet area exceeds super built-up area');
  if (x.latitude < 18 || x.latitude > 19 || x.longitude < 73 || x.longitude > 75) reasons.push('Coordinates fall outside Pune (latitude/longitude swapped)');
  return reasons;
}
export function normalizeListing(x, kind = 'sale') {
  const factor = kind === 'sale' ? areaFactor(x) : 1;
  return { ...x, kind, price_inr: x.price, carpet_area_sqft: x.carpet_area * factor,
    built_up_area_sqft: (x.super_built_up_area ?? x.super_builtup_area) * factor,
    area_unit_corrected: factor !== 1, corrupt_reasons: kind === 'sale' ? corruptReasons(x) : [] };
}
export function normalizedName(name) {
  return name.toLowerCase().replace(/\b(the|phase\s*\d+|apartments?|residences?|society)\b/g, '').replace(/[^a-z0-9]/g, '');
}
export function groupProperties(listings) {
  const parent = listings.map((_, i) => i);
  function root(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
  const blocks = new Map();
  listings.forEach((x, i) => {
    const key = [normalizedName(x.apartment_name), x.locality, x.bedroom, x.floor, x.property_type].join('|');
    const block = blocks.get(key) || [];
    for (const j of block) {
      const y = listings[j], a = x.carpet_area * areaFactor(x), b = y.carpet_area * areaFactor(y);
      if (Math.abs(a - b) / Math.max(a, b) <= 0.04 && Math.abs(x.latitude - y.latitude) <= 0.0012 && Math.abs(x.longitude - y.longitude) <= 0.0012 && x.total_floors === y.total_floors) parent[root(i)] = root(j);
    }
    block.push(i); blocks.set(key, block);
  });
  const groups = new Map();
  listings.forEach((x, i) => { const key = root(i); const a = groups.get(key) || []; a.push(x.listing_id); groups.set(key, a); });
  return [...groups.values()].map(a => a.sort());
}
export function detectFraud(listings) {
  const groups = new Map(), peers = new Map();
  for (const x of listings) {
    const a = groups.get(x.posted_by_contact) || []; a.push(x); groups.set(x.posted_by_contact, a);
    if (!corruptReasons(x).length) { const key = `${x.locality}|${x.bedroom}`; const p = peers.get(key) || []; p.push(x.price / (x.carpet_area * areaFactor(x))); peers.set(key, p); }
  }
  const benchmarks = new Map([...peers].map(([k, a]) => [k, median(a)]));
  const networks = [...groups].map(([phone, records]) => ({ phone, records,
    names: new Set(records.map(x => x.posted_by_name)).size,
    localities: new Set(records.map(x => x.locality)).size,
    relative_price: median(records.map(x => x.price / (x.carpet_area * areaFactor(x)) / benchmarks.get(`${x.locality}|${x.bedroom}`))),
  })).filter(g => g.records.length >= 15 && g.names >= 3 && g.localities >= 5 && g.relative_price < 0.65 && g.records.every(x => x.is_verified && x.posted_by === 'agent'));
  return { ids: networks.flatMap(g => g.records.map(x => x.listing_id)).sort(), networks: networks.map(({ records, ...g }) => ({ ...g, count: records.length, listing_ids: records.map(x => x.listing_id).sort() })) };
}
export function analyzeDataset(rawListings, rawRentals, rawProjects) {
  const fraud = detectFraud(rawListings), fake = new Set(fraud.ids), groups = groupProperties(rawListings), groupById = new Map();
  for (const group of groups) for (const id of group) groupById.set(id, group);
  const listings = rawListings.map(x => ({ ...normalizeListing(x), suspected_fake: fake.has(x.listing_id), property_group: groupById.get(x.listing_id) }));
  const rentals = rawRentals.map(x => normalizeListing(x, 'rental'));
  const liveCounts = new Map();
  for (const x of listings) if (x.is_live && x.project_id) liveCounts.set(x.project_id, (liveCounts.get(x.project_id) || 0) + 1);
  const projects = rawProjects.map(x => ({ ...x, kind: 'project', price_min_inr: projectPrice(x.price_min), price_max_inr: projectPrice(x.price_max), actual_live_listings: liveCounts.get(x.project_id) || 0, count_mismatch: x.total_listings !== (liveCounts.get(x.project_id) || 0) }));
  const corrupt = listings.filter(x => x.corrupt_reasons.length).map(x => x.listing_id).sort();
  const clean = listings.filter(x => x.is_live && !x.suspected_fake && !x.corrupt_reasons.length);
  const bhk2 = clean.filter(x => x.bedroom === 2);
  const costliest = projects.toSorted((a, b) => b.price_max_inr - a.price_max_inr)[0];
  const reference = Date.parse(REFERENCE);
  const answers = {
    total_listing_records: listings.length, unique_properties: groups.length,
    active_listings: listings.filter(x => x.is_live).length, corrupt_listing_ids: corrupt,
    total_monthly_rent: sum(rentals.filter(x => x.locality === 'balewadi').map(x => x.price_inr)),
    avg_price_per_sqft_2bhk: Number((sum(bhk2.map(x => x.price_inr / x.carpet_area_sqft)) / bhk2.length).toFixed(2)),
    costliest_project: { project_id: costliest.project_id, price_max_inr: costliest.price_max_inr },
    listings_last_7_days: listings.filter(x => Date.parse(x.posted_at) >= reference - 7 * 86400000 && Date.parse(x.posted_at) < reference).length,
    fake_listing_ids: fraud.ids, projects_with_wrong_listing_count: projects.filter(x => x.count_mismatch).length,
  };
  const summary = {
    city: 'Pune', reference: REFERENCE, total_listings: listings.length, eligible_listings: clean.length,
    median_price: median(clean.map(x => x.price_inr)), median_price_per_sqft: median(clean.map(x => x.price_inr / x.carpet_area_sqft)),
    by_locality: [...new Set(listings.map(x => x.locality))].sort().map(locality => { const a = clean.filter(x => x.locality === locality); return { locality, count: a.length, median_price: median(a.map(x => x.price_inr)), median_price_per_sqft: median(a.map(x => x.price_inr / x.carpet_area_sqft)) }; }),
    by_bhk: [...new Set(clean.map(x => x.bedroom))].sort((a,b)=>a-b).map(bedroom => ({ bedroom, count: clean.filter(x=>x.bedroom===bedroom).length })),
    answers, fraud_networks: fraud.networks, duplicate_groups: groups.filter(a => a.length > 1), corrected_area_records: listings.filter(x => x.area_unit_corrected).length,
    project_mismatches: projects.filter(x => x.count_mismatch).map(x=>({project_id:x.project_id,name:x.apartment_name,reported:x.total_listings,observed:x.actual_live_listings})),
  };
  return { listings, rentals, projects, summary };
}
export function filterRecords(records, filters = {}) {
  const { query = '', locality = '', bedroom = '', furnishing = '', minPrice = '', maxPrice = '', status = 'live', sort = 'newest', projectId = '' } = filters;
  const a = records.filter(x => {
    const price = x.price_inr ?? x.price_min_inr;
    return (!query || `${x.apartment_name} ${x.locality} ${x.listing_id || x.project_id}`.toLowerCase().includes(query.toLowerCase())) &&
      (!locality || x.locality === locality) && (bedroom === '' || String(x.bedroom) === String(bedroom)) && (!furnishing || x.furnishing === furnishing) &&
      (minPrice === '' || price >= Number(minPrice)) && (maxPrice === '' || (x.price_inr ?? x.price_max_inr) <= Number(maxPrice)) &&
      (!projectId || x.project_id === projectId) &&
      (x.kind === 'project' || status === 'all' || (x.is_live && !x.suspected_fake && !x.corrupt_reasons?.length));
  });
  return a.toSorted((x, y) => {
    if (sort === 'price-asc') return (x.price_inr ?? x.price_min_inr) - (y.price_inr ?? y.price_min_inr);
    if (sort === 'price-desc') return (y.price_inr ?? y.price_max_inr) - (x.price_inr ?? x.price_max_inr);
    if (sort === 'area-desc') return (y.carpet_area_sqft ?? y.max_area_sqft) - (x.carpet_area_sqft ?? x.max_area_sqft);
    return Date.parse(y.posted_at ?? y.launch_date) - Date.parse(x.posted_at ?? x.launch_date);
  });
}
