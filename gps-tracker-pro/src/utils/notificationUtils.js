export function mergeNotifications(prev, incoming, maxNotifications = 50) {
  const merged = [...incoming, ...prev];
  const seen = new Set();

  return merged.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, maxNotifications);
}
