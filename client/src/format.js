export const number = (n) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
export const money = (n) =>
  n < 0
    ? "Price unavailable"
    : n >= 1e7
      ? `₹${+(n / 1e7).toFixed(2)} Cr`
      : n >= 1e5
        ? `₹${+(n / 1e5).toFixed(2)} L`
        : `₹${number(n)}`;
export const title = (text) =>
  String(text || "").replace(/\b\w/g, (c) => c.toUpperCase());
export const date = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
