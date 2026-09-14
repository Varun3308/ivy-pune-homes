import fs from 'node:fs/promises';
import { request } from './api.mjs';
await fs.mkdir('data', { recursive: true });
for (const collection of ['listings', 'rentals', 'projects']) {
  const records = [], pages = [];
  let offset = 0;
  while (true) {
    const { status, body } = await request(`/v1/${collection}?limit=200&offset=${offset}`);
    if (status !== 200) throw new Error(JSON.stringify(body));
    const { results, ...meta } = body;
    if (meta.offset !== offset || meta.count !== results.length) throw new Error('Pagination contract changed');
    records.push(...results); pages.push(meta);
    if (!meta.has_more) break;
    if (!meta.count) throw new Error('Pagination stalled');
    offset = meta.offset + meta.count;
  }
  await fs.writeFile(`data/${collection}.json`, JSON.stringify(records, null, 2));
  await fs.writeFile(`data/${collection}-pages.json`, JSON.stringify(pages, null, 2));
  console.log(collection, records.length, 'records;', pages.length, 'pages;', JSON.stringify(pages[0]), JSON.stringify(pages.at(-1)));
}
