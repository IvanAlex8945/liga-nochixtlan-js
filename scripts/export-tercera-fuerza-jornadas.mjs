import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'exports');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const seasonId = 4;
const firstLegLastJornada = 16;

const { data: season, error: seasonError } = await supabase
  .from('seasons')
  .select('id, name, category, year, is_active')
  .eq('id', seasonId)
  .single();

if (seasonError) throw seasonError;

const { data: teams, error: teamsError } = await supabase
  .from('teams')
  .select('id, name, status, category')
  .eq('season_id', seasonId)
  .order('name');

if (teamsError) throw teamsError;

const { data: matches, error: matchesError } = await supabase
  .from('matches')
  .select(`
    id,
    jornada,
    phase,
    status,
    scheduled_date,
    time_str,
    court,
    home_team_id,
    away_team_id,
    home_team:teams!matches_home_team_id_fkey(id, name),
    away_team:teams!matches_away_team_id_fkey(id, name)
  `)
  .eq('season_id', seasonId)
  .eq('phase', 'Fase Regular')
  .order('jornada', { ascending: true })
  .order('id', { ascending: true });

if (matchesError) throw matchesError;

const normalizedMatches = (matches ?? []).map((match) => ({
  id: match.id,
  jornada: match.jornada,
  vuelta: match.jornada <= firstLegLastJornada ? 'primera' : 'segunda',
  espejo_de_jornada: match.jornada <= firstLegLastJornada ? match.jornada + firstLegLastJornada : match.jornada - firstLegLastJornada,
  status: match.status,
  local: match.home_team?.name ?? `#${match.home_team_id}`,
  visitante: match.away_team?.name ?? `#${match.away_team_id}`,
  fecha: match.scheduled_date,
  hora: match.time_str,
  cancha: match.court,
}));

const jornadasMap = new Map();
for (const match of normalizedMatches) {
  if (!jornadasMap.has(match.jornada)) {
    jornadasMap.set(match.jornada, {
      jornada: match.jornada,
      vuelta: match.vuelta,
      espejo_de_jornada: match.espejo_de_jornada,
      partidos: [],
    });
  }
  jornadasMap.get(match.jornada).partidos.push({
    id: match.id,
    local: match.local,
    visitante: match.visitante,
    status: match.status,
    fecha: match.fecha,
    hora: match.hora,
    cancha: match.cancha,
  });
}

const jornadas = Array.from(jornadasMap.values()).sort((a, b) => a.jornada - b.jornada);

const summary = {
  total_equipos: teams?.length ?? 0,
  total_partidos_fase_regular: normalizedMatches.length,
  jornadas_detectadas: jornadas.map((j) => j.jornada),
  primera_vuelta_jornadas: jornadas.filter((j) => j.jornada <= firstLegLastJornada).map((j) => j.jornada),
  segunda_vuelta_jornadas: jornadas.filter((j) => j.jornada > firstLegLastJornada).map((j) => j.jornada),
  total_con_jaguares: normalizedMatches.filter((m) => m.local === 'JAGUARES' || m.visitante === 'JAGUARES').length,
  pendientes: normalizedMatches.filter((m) => m.status === 'Pendiente').length,
  programados: normalizedMatches.filter((m) => m.status === 'Programado').length,
  jugados_o_wo: normalizedMatches.filter((m) => m.status === 'Jugado' || String(m.status).startsWith('WO')).length,
};

const payload = {
  exported_at: new Date().toISOString(),
  assumption: 'Las jornadas 1 a 16 se consideran primera vuelta; la 17 en adelante se consideran segunda vuelta/espejo.',
  season,
  summary,
  teams,
  jornadas,
};

const mdLines = [];
mdLines.push(`# Extraccion de jornadas - ${season.name}`);
mdLines.push('');
mdLines.push(`- Temporada: ${season.name}`);
mdLines.push(`- Categoria: ${season.category}`);
mdLines.push(`- Season ID: ${season.id}`);
mdLines.push(`- Equipos: ${summary.total_equipos}`);
mdLines.push(`- Partidos de fase regular: ${summary.total_partidos_fase_regular}`);
mdLines.push(`- Pendientes: ${summary.pendientes}`);
mdLines.push(`- Programados: ${summary.programados}`);
mdLines.push(`- Jugados o WO: ${summary.jugados_o_wo}`);
mdLines.push(`- Partidos con Jaguares: ${summary.total_con_jaguares}`);
mdLines.push('');
mdLines.push('## Equipos');
mdLines.push('');
for (const team of teams ?? []) {
  mdLines.push(`- ${team.name} (${team.status})`);
}

for (const jornada of jornadas) {
  mdLines.push('');
  mdLines.push(`## Jornada ${jornada.jornada}`);
  mdLines.push('');
  mdLines.push(`- Vuelta: ${jornada.vuelta}`);
  mdLines.push(`- Jornada espejo esperada: ${jornada.espejo_de_jornada}`);
  mdLines.push('');
  for (const match of jornada.partidos) {
    const extras = [match.status, match.fecha, match.hora, match.cancha].filter(Boolean).join(' | ');
    mdLines.push(`- ${match.local} vs ${match.visitante} :: ${extras}`);
  }
}

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'tercera-fuerza-jornadas.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
await writeFile(path.join(outDir, 'tercera-fuerza-jornadas.md'), `${mdLines.join('\n')}\n`, 'utf8');

console.log(`Exportados:`);
console.log(`- ${path.join(outDir, 'tercera-fuerza-jornadas.json')}`);
console.log(`- ${path.join(outDir, 'tercera-fuerza-jornadas.md')}`);
