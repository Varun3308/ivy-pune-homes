import fs from 'node:fs/promises';
import { request } from './api.mjs';
const paths = ['/health', '/v1/listing/DWE-3002501', '/v1/listings/DWE-3002501', '/v1/listings/DWE-3002501/similar', '/v1/favourites', '/v1/analytics/summary', '/v1/saved'];
for (const collection of ['listings', 'rentals', 'projects']) {
  for (const query of ['limit=200', 'page=2&limit=5', 'offset=5&limit=5', 'locality=balewadi', 'locality=Balewadi', 'furnishing=fully-furnished', 'sort_by=' + (collection === 'projects' ? 'price_min' : 'price') + '&order=asc', 'sort_by=' + (collection === 'projects' ? 'price_min' : 'price') + '&order=desc']) paths.push(`/v1/${collection}?${query}`);
}
for (const q of ['bhk=2','bedroom=2','min_price=15000000','max_price=5000000','property_type=villa','project_id=P30001','sort_by=carpet_area&order=desc','sort_by=posted_at&order=desc','sort_by=bedroom&order=desc']) paths.push('/v1/listings?'+q);
paths.push('/v1/rentals?bhk=2','/v1/projects?project_status=completed');
const probes = [];
for (const path of paths) {
  const result = await request(path); probes.push({ path, ...result });
  const b = result.body;
  console.log(path, result.status, b.results ? JSON.stringify({ ...Object.fromEntries(Object.entries(b).filter(([k]) => k !== 'results')), sample: b.results.slice(0,3).map(x=>({ id:x.listing_id||x.project_id, locality:x.locality,bedroom:x.bedroom, furnishing:x.furnishing,price:x.price??x.price_min,carpet_area:x.carpet_area,posted_at:x.posted_at })) }) : JSON.stringify(b).slice(0,80));
}
await fs.writeFile('data/probes.json',JSON.stringify(probes,null,2));
