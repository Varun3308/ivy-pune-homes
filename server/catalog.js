import { analyzeDataset } from "../shared/domain.js";
let cache, pending;
export async function fetchCollection(call, collection) {
  const records = [];
  let offset = 0;
  while (true) {
    const page = await call(`/v1/${collection}?limit=50&offset=${offset}`);
    if (
      !Array.isArray(page.results) ||
      page.offset !== offset ||
      page.count !== page.results.length
    )
      throw new Error("Unexpected pagination response");
    records.push(...page.results);
    if (!page.has_more) return records;
    if (!page.count)
      throw new Error(
        "The property service stopped returning records before the last page.",
      );
    offset = page.offset + page.count;
  }
}
export async function catalog(call) {
  if (cache && Date.now() - cache.loadedAt < 10 * 60 * 1000) return cache;
  if (!pending) {
    pending = Promise.all(
      ["listings", "rentals", "projects"].map((name) =>
        fetchCollection(call, name),
      ),
    )
      .then((raw) => {
        cache = { ...analyzeDataset(...raw), loadedAt: Date.now() };
        return cache;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}
