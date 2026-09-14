import test from "node:test";
import assert from "node:assert/strict";
import {
  areaFactor,
  corruptReasons,
  detectFraud,
  filterRecords,
  groupProperties,
  normalizeListing,
  projectPrice,
  REFERENCE,
} from "../shared/domain.js";
import { fetchCollection } from "../server/catalog.js";
const home = {
  listing_id: "A",
  apartment_name: "The Garden Apartments",
  locality: "balewadi",
  bedroom: 2,
  bathroom: 2,
  floor: 5,
  total_floors: 12,
  property_type: "apartment",
  website: "100acres",
  carpet_area: 900,
  super_built_up_area: 1200,
  price: 9000000,
  latitude: 18.5,
  longitude: 73.8,
  is_live: true,
  furnishing: "semi-furnished",
  posted_at: "2026-09-05T10:00:00Z",
  posted_by: "owner",
  posted_by_name: "A",
  posted_by_contact: "1",
  is_verified: true,
};
test("pagination ignores understated total, advances by actual count, and reaches the final page", async () => {
  const seen = [];
  const records = await fetchCollection(async (path) => {
    seen.push(path);
    const offset = Number(
      new URL("https://example.com" + path).searchParams.get("offset"),
    );
    return {
      offset,
      limit: 2,
      count: offset === 4 ? 1 : 2,
      total: 3,
      has_more: offset < 4,
      results: offset === 4 ? [4] : [offset, offset + 1],
    };
  }, "listings");
  assert.deepEqual(records, [0, 1, 2, 3, 4]);
  assert.match(seen[2], /offset=4/);
});
test("stalled pagination fails instead of silently delivering incomplete data", async () => {
  await assert.rejects(
    fetchCollection(
      async () => ({ offset: 0, count: 0, has_more: true, results: [] }),
      "listings",
    ),
    /stopped returning/,
  );
});
test("mixed area cohort is normalized without changing already-square-foot Magichomes records", () => {
  const metric = normalizeListing({
    ...home,
    website: "magichomes",
    carpet_area: 84,
    super_built_up_area: 112,
  });
  assert.ok(Math.abs(metric.carpet_area_sqft - 904.1676) < 1e-6);
  assert.ok(Math.abs(metric.built_up_area_sqft - 1205.5568) < 1e-6);
  assert.equal(areaFactor({ ...home, website: "magichomes" }), 1);
  assert.equal(
    normalizeListing(
      { ...home, website: "magichomes", carpet_area: 84 },
      "rental",
    ).carpet_area_sqft,
    84,
  );
});
test("project bounds cross the lakh/crore boundary independently", () => {
  assert.equal(projectPrice(80), 8000000);
  assert.equal(projectPrice(3.22), 32200000);
  assert.equal(projectPrice(4.47), 44700000);
  assert.equal(projectPrice(96.2), 9620000);
});
test("physical invariants flag corruption without mistaking metric areas for corruption", () => {
  assert.deepEqual(corruptReasons(home), []);
  assert.equal(
    corruptReasons({
      ...home,
      price: -1,
      floor: 15,
      carpet_area: 1400,
      latitude: 73.8,
      longitude: 18.5,
    }).length,
    4,
  );
  assert.deepEqual(
    corruptReasons({
      ...home,
      website: "magichomes",
      carpet_area: 84,
      super_built_up_area: 112,
    }),
    [],
  );
});
test("property matching handles spelling and metric units, while retaining different flats at the same coordinates", () => {
  const records = [
    home,
    {
      ...home,
      listing_id: "B",
      apartment_name: "Garden Phase 1",
      website: "magichomes",
      carpet_area: 84,
      latitude: 18.5003,
      longitude: 73.8003,
      price: 4500000,
      posted_by_contact: "2",
    },
    { ...home, listing_id: "C", floor: 6 },
    { ...home, listing_id: "D", bedroom: 3, carpet_area: 1250 },
  ];
  const groups = groupProperties(records);
  assert.equal(groups.length, 3);
  assert.ok(groups.some((g) => g.includes("A") && g.includes("B")));
});
test("combined filters, both price bounds, furnishing, zero-bedroom and normalized sorting work", () => {
  const records = [
    normalizeListing(home),
    normalizeListing({ ...home, listing_id: "B", price: 8000000 }),
    normalizeListing({ ...home, listing_id: "C", furnishing: "unfurnished" }),
    normalizeListing({ ...home, listing_id: "D", is_live: false }),
    normalizeListing({ ...home, listing_id: "E", bedroom: 0, price: 5000000 }),
  ];
  assert.deepEqual(
    filterRecords(records, {
      locality: "balewadi",
      bedroom: "2",
      furnishing: "semi-furnished",
      minPrice: "8000000",
      maxPrice: "9000000",
      sort: "price-asc",
    }).map((x) => x.listing_id),
    ["B", "A"],
  );
  assert.deepEqual(
    filterRecords(records, { bedroom: "0" }).map((x) => x.listing_id),
    ["E"],
  );
  assert.equal(filterRecords(records, { status: "all" }).length, 5);
});
test("IST reference window is half-open and not tied to the machine timezone", () => {
  const end = Date.parse(REFERENCE),
    start = end - 7 * 86400000;
  assert.equal(new Date(start).toISOString(), "2026-09-02T18:30:00.000Z");
  const stamps = [
    "2026-09-02T18:29:59Z",
    "2026-09-02T18:30:00Z",
    "2026-09-09T18:29:59Z",
    "2026-09-09T18:30:00Z",
  ];
  assert.deepEqual(
    stamps.filter((s) => Date.parse(s) >= start && Date.parse(s) < end),
    stamps.slice(1, 3),
  );
});
test("large multi-name agencies are not automatically fraud; cheap rotating-identity networks are", () => {
  const records = [];
  for (let i = 0; i < 120; i++)
    records.push({
      ...home,
      listing_id: `baseline${i}`,
      locality: `area${i % 6}`,
      posted_by_contact: `owner${i}`,
      price: 9000000,
    });
  for (let i = 0; i < 18; i++)
    for (const [phone, price] of [
      ["agency", 9000000],
      ["bait", 4500000],
    ])
      records.push({
        ...home,
        listing_id: phone + i,
        locality: `area${i % 6}`,
        posted_by: "agent",
        posted_by_contact: phone,
        posted_by_name: `name${i % 3}`,
        price,
      });
  const f = detectFraud(records);
  assert.equal(f.ids.length, 18);
  assert.ok(f.ids.every((id) => id.startsWith("bait")));
});
