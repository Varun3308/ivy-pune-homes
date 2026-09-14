import "dotenv/config";
import { createHash } from "node:crypto";
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export async function upstream(path, { token, method = "GET", body } = {}) {
  const response = await fetch(
    (process.env.IVY_API_BASE || "https://solve.ivy.homes") + path,
    {
      method,
      headers: {
        "X-API-Key": process.env.IVY_API_KEY,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      response.status,
      typeof data.detail === "string"
        ? data.detail
        : "The property service could not accept that request.",
    );
  return data;
}
export function tokenInfo(token) {
  // The upstream's signed token has two segments; only decode metadata. Upstream validates signatures.
  try {
    return JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
  } catch {
    return {};
  }
}
const refreshes = new Map();
export async function refreshSession(refreshToken) {
  if (!refreshToken) throw new ApiError(401, "Please sign in to continue.");
  const key = createHash("sha256").update(refreshToken).digest("hex");
  if (!refreshes.has(key)) {
    const promise = upstream("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
    });
    refreshes.set(key, promise);
    promise
      .finally(() => {
        const timer = setTimeout(() => refreshes.delete(key), 30000);
        timer.unref();
      })
      .catch(() => {});
  }
  return refreshes.get(key);
}
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/api",
};
export function setSession(res, data) {
  res.cookie("ivy_access", data.access_token, {
    ...cookieOptions,
    maxAge: 7 * 86400000,
  });
  res.cookie("ivy_refresh", data.refresh_token, {
    ...cookieOptions,
    maxAge: 7 * 86400000,
  });
}
export function clearSession(res) {
  res.clearCookie("ivy_access", cookieOptions);
  res.clearCookie("ivy_refresh", cookieOptions);
}
export async function authenticated(req, res, next) {
  let access = req.cookies.ivy_access;
  async function refresh() {
    const data = await refreshSession(req.cookies.ivy_refresh);
    setSession(res, data);
    access = data.access_token;
    return data;
  }
  try {
    if (!access || (tokenInfo(access).exp || 0) * 1000 < Date.now() + 60000)
      await refresh();
    req.ivy = async (path, options) => {
      try {
        return await upstream(path, { ...options, token: access });
      } catch (error) {
        if (error.status !== 401) throw error;
        await refresh();
        return upstream(path, { ...options, token: access });
      }
    };
    // Validate every incoming session before serving shared cached data.
    req.saved = await req.ivy("/v1/saved");
    req.user = { email: tokenInfo(access).sub };
    next();
  } catch (error) {
    if ([401, 403].includes(error.status)) clearSession(res);
    next(error);
  }
}
