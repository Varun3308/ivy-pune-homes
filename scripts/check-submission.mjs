import fs from "node:fs/promises";
const submission = JSON.parse(await fs.readFile("submission.json", "utf8"));
const template = JSON.parse(
  await fs.readFile("submission.template.json", "utf8"),
);
const errors = [];
const expected = Object.keys(template.answers).sort();
if (
  JSON.stringify(Object.keys(submission.answers).sort()) !==
  JSON.stringify(expected)
)
  errors.push("answers must contain exactly the ten required keys.");
for (const key of ["name", "email", "repo_url", "demo_url"])
  if (!submission.candidate[key]?.trim())
    errors.push(`candidate.${key} is missing.`);
for (const key of ["repo_url", "demo_url"])
  if (
    submission.candidate[key] &&
    !/^https:\/\//.test(submission.candidate[key])
  )
    errors.push(`${key} must be a public HTTPS URL.`);
for (const key of ["corrupt_listing_ids", "fake_listing_ids"]) {
  const ids = submission.answers[key];
  if (JSON.stringify(ids) !== JSON.stringify([...new Set(ids)].sort()))
    errors.push(`${key} must be sorted without duplicates.`);
}
const categories = new Set([
  "auth",
  "pagination",
  "units",
  "filters",
  "sorting",
  "timestamps",
  "duplicates",
  "completeness",
  "data_quality",
  "fraud",
  "consistency",
  "missing_endpoint",
  "undocumented_endpoint",
]);
for (const [i, f] of submission.findings.entries()) {
  if (!categories.has(f.category))
    errors.push(`Finding ${i + 1}: invalid category.`);
  if (
    !f.endpoint ||
    !f.documented ||
    !f.actual ||
    !f.how_found ||
    !f.impact ||
    !Array.isArray(f.evidence)
  )
    errors.push(`Finding ${i + 1}: missing required field.`);
  if (f.evidence.length > 20)
    errors.push(`Finding ${i + 1}: too many evidence identifiers.`);
}
if (errors.length) {
  console.error(
    "Submission is not ready to send:\n" +
      errors.map((e) => "  - " + e).join("\n"),
  );
  process.exitCode = 1;
} else
  console.log(
    "Submission structure is complete. Verify the public repository and deployment before submitting the form.",
  );
