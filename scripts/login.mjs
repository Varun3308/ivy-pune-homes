import "dotenv/config";
import fs from "node:fs/promises";
if (!process.env.IVY_API_KEY || !process.env.DEMO_PASSWORD)
  throw new Error("Set IVY_API_KEY and DEMO_PASSWORD in .env.");
const r = await fetch(
  (process.env.IVY_API_BASE || "https://solve.ivy.homes") + "/auth/login",
  {
    method: "POST",
    headers: {
      "X-API-Key": process.env.IVY_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "demo1@ivy.homes",
      password: process.env.DEMO_PASSWORD,
    }),
  },
);
const session = await r.json();
if (!r.ok) throw new Error(JSON.stringify(session));
await fs.mkdir("data", { recursive: true });
await fs.writeFile("data/session.json", JSON.stringify(session, null, 2), {
  mode: 0o600,
});
console.log(
  "Signed in for the audit. Access lifetime:",
  session.expires_in,
  "seconds; refresh flow:",
  session.refresh_url,
);
