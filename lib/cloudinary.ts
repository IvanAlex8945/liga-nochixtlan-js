import { createHash } from 'node:crypto';

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }

  return value;
}

export function getCloudinaryConfig() {
  return {
    cloudName: requireEnv('CLOUDINARY_CLOUD_NAME'),
    apiKey: requireEnv('CLOUDINARY_API_KEY'),
    apiSecret: requireEnv('CLOUDINARY_API_SECRET'),
  };
}

function normalizeSegment(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function buildPlayerPhotoFolder(seasonId: number, teamId: number) {
  return `liga-nochixtlan/players/season-${seasonId}/team-${teamId}`;
}

export function buildPlayerPhotoPublicId(playerName: string) {
  const base = normalizeSegment(playerName) || 'jugador';
  return `${base}-${Date.now()}`;
}

export function signCloudinaryParams(params: Record<string, string | number | boolean | undefined>) {
  const { apiSecret } = getCloudinaryConfig();
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1')
    .update(`${serialized}${apiSecret}`)
    .digest('hex');
}

export function buildCloudinaryThumbUrl(url: string) {
  return url.replace(
    '/upload/',
    '/upload/f_auto,q_auto,w_240,h_240,c_fill,g_face/'
  );
}
