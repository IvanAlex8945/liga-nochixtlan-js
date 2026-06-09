export type PlayerCredentialStatus = 'active' | 'revoked' | 'replaced' | 'expired';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomIndex(max: number): number {
  const bytes = new Uint32Array(1);
  globalThis.crypto.getRandomValues(bytes);
  return bytes[0] % max;
}

export function generateCredentialCode(prefix = 'LNB'): string {
  let suffix = '';

  for (let i = 0; i < 8; i += 1) {
    suffix += CODE_ALPHABET[randomIndex(CODE_ALPHABET.length)];
  }

  return `${prefix}-${suffix}`;
}

export function getCredentialStatusLabel(status: PlayerCredentialStatus): string {
  switch (status) {
    case 'active':
      return 'Vigente';
    case 'revoked':
      return 'Revocada';
    case 'replaced':
      return 'Reemplazada';
    case 'expired':
      return 'Expirada';
    default:
      return status;
  }
}

export function normalizeOptionalUrl(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized;
}
