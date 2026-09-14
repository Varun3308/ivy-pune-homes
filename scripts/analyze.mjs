import "dotenv/config";
import fs from "node:fs/promises";
import { analyzeDataset } from "../shared/domain.js";
const raw = await Promise.all(
  ["listings", "rentals", "projects"].map(async (k) =>
    JSON.parse(await fs.readFile(`data/${k}.json`, "utf8")),
  ),
);
const data = analyzeDataset(...raw);
await fs.writeFile("data/analysis.json", JSON.stringify(data.summary, null, 2));
let submission;
try {
  submission = JSON.parse(await fs.readFile("submission.json", "utf8"));
} catch {
  submission = JSON.parse(
    await fs.readFile("submission.template.json", "utf8"),
  );
  submission.findings = [];
}
submission.api_key = process.env.IVY_API_KEY;
submission.candidate.name = "Varun Vikram Singh";
submission.answers = data.summary.answers;
await fs.writeFile(
  "submission.json",
  JSON.stringify(submission, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      ...data.summary.answers,
      fake_listing_ids: `${data.summary.answers.fake_listing_ids.length} IDs; see submission.json`,
    },
    null,
    2,
  ),
);
console.log(
  "area corrections",
  data.summary.corrected_area_records,
  "duplicate groups",
  data.summary.duplicate_groups.length,
  "networks",
  data.summary.fraud_networks.length,
);
