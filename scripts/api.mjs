import "dotenv/config";
import fs from "node:fs/promises";
export const base = process.env.IVY_API_BASE || "https://solve.ivy.homes";
let session;
export async function request(path, options = {}, retried = false) {
  session ||= JSON.parse(await fs.readFile("data/session.json", "utf8"));
  const response = await fetch(base + path, {
    ...options,
    headers: {
      "X-API-Key": process.env.IVY_API_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const body = await response.json();
  if (response.status === 401 && !retried && !path.startsWith("/auth/")) {
    const refreshed = await request("/auth/refresh", {
      method: "POST",
      body: { refresh_token: session.refresh_token },
    });
    if (refreshed.status !== 200) throw new Error("Please log in again");
    session = refreshed.body;
    await fs.writeFile("data/session.json", JSON.stringify(session));
    return request(path, options, true);
  }
  return { status: response.status, body };
}
