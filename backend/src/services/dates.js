const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Costa_Rica",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function localDay(value = new Date()) {
  const parts = formatter.formatToParts(new Date(value));
  const get = (key) => parts.find((p) => p.type === key).value;
  return get("year") + "-" + get("month") + "-" + get("day");
}
module.exports = { localDay };
