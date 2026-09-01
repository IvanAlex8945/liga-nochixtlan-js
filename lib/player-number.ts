export type PlayerNumberValue = number | string | null | undefined;

export function formatPlayerNumber(value: PlayerNumberValue, emptyValue = '-') {
  const normalized = String(value ?? '').trim();

  if (normalized === '') {
    return emptyValue;
  }

  return normalized;
}

export function normalizePlayerNumberForStorage(value: PlayerNumberValue) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }

  return String(value).trim();
}
