export function formatDateStr(date) {
  return date.toISOString().split('T')[0];
}

export function getPresetRange(presetId, referenceDate = new Date()) {
  const today = new Date(referenceDate);
  const end = formatDateStr(today);

  if (presetId === 'today') return { from: end, to: end };
  if (presetId === 'week') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: formatDateStr(from), to: end };
  }
  if (presetId === 'month') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: formatDateStr(from), to: end };
  }
  return null;
}

export function isValidDateRange(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) return false;
  return dateFrom <= dateTo;
}
