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
const seasonId = 3;

const { data: season, error: seasonError } = await supabase
  .from('seasons')
  .select('id, name, category, year, is_active')
  .eq('id', seasonId)
  .single();

if (seasonError) throw seasonError;

const { data: matches, error: matchesError } = await supabase
  .from('matches')
  .select(`
    id,
    jornada,
    phase,
    status,
    home_score,
    away_score,
    scheduled_date,
    time_str,
    court,
    home_team:teams!matches_home_team_id_fkey(id, name),
    away_team:teams!matches_away_team_id_fkey(id, name)
  `)
  .eq('season_id', seasonId)
  .eq('phase', 'Fase Regular')
  .order('jornada', { ascending: true })
  .order('id', { ascending: true });

if (matchesError) throw matchesError;

const { data: teams, error: teamsError } = await supabase
  .from('teams')
  .select('id, name, status')
  .eq('season_id', seasonId)
  .eq('status', 'Activo')
  .order('name');

if (teamsError) throw teamsError;

const toStatusBucket = (status) => {
  if (status === 'Pendiente') return 'Pendientes';
  if (status === 'Programado') return 'Programados';
  if (status === 'Jugado' || String(status).startsWith('WO')) return 'Jugados';
  return 'Otros';
};

const formatMatch = (match) => {
  const local = match.home_team?.name ?? 'Local';
  const visita = match.away_team?.name ?? 'Visitante';
  const details = [];

  if (match.status === 'Jugado' && match.home_score !== null && match.away_score !== null) {
    details.push(`Marcador: ${match.home_score}-${match.away_score}`);
  } else if (String(match.status).startsWith('WO')) {
    details.push(`Resultado: ${match.status}`);
    if (match.home_score !== null && match.away_score !== null) {
      details.push(`Marcador asignado: ${match.home_score}-${match.away_score}`);
    }
  } else {
    details.push(`Estatus: ${match.status}`);
  }

  if (match.scheduled_date) details.push(`Fecha: ${match.scheduled_date.slice(0, 10)}`);
  if (match.time_str) details.push(`Hora: ${match.time_str}`);
  if (match.court) details.push(`Cancha: ${match.court}`);

  return `- ${local} vs ${visita} :: ${details.join(' | ')}`;
};

const groupedByJornada = new Map();
for (const match of matches ?? []) {
  if (!groupedByJornada.has(match.jornada)) {
    groupedByJornada.set(match.jornada, {
      jornada: match.jornada,
      Jugados: [],
      Pendientes: [],
      Programados: [],
      Otros: [],
    });
  }
  groupedByJornada.get(match.jornada)[toStatusBucket(match.status)].push(match);
}

const jornadas = Array.from(groupedByJornada.values()).sort((a, b) => a.jornada - b.jornada);

const pairCounts = new Map();
for (const match of matches ?? []) {
  const ids = [match.home_team?.id, match.away_team?.id].filter(Boolean).sort((a, b) => a - b);
  const key = `${ids[0]}-${ids[1]}`;
  pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
}

const faltanPorProgramar = [];
const parejasCompletasConDobleLocalia = [];
for (let i = 0; i < teams.length; i++) {
  for (let j = i + 1; j < teams.length; j++) {
    const teamA = teams[i];
    const teamB = teams[j];
    const key = [teamA.id, teamB.id].sort((a, b) => a - b).join('-');
    const total = pairCounts.get(key) ?? 0;
    const matchesBetween = matches.filter((match) => {
      const ids = [match.home_team?.id, match.away_team?.id].filter(Boolean).sort((a, b) => a - b);
      return `${ids[0]}-${ids[1]}` === key;
    });

    if (total < 2) {
      faltanPorProgramar.push({
        pareja: `${teamA.name} vs ${teamB.name}`,
        existentes: total,
        faltan: 2 - total,
        detalle: total === 0 ? 'No existe ningún enfrentamiento registrado.' : 'Sólo existe un enfrentamiento registrado.',
      });
      continue;
    }

    const homeByA = matchesBetween.filter((match) => match.home_team?.id === teamA.id).length;
    const homeByB = matchesBetween.filter((match) => match.home_team?.id === teamB.id).length;
    if ((homeByA === 2 && homeByB === 0) || (homeByB === 2 && homeByA === 0)) {
      parejasCompletasConDobleLocalia.push({
        pareja: `${teamA.name} vs ${teamB.name}`,
        total,
        detalle: `${homeByA === 2 ? teamA.name : teamB.name} aparece dos veces como local.`,
      });
    }
  }
}

const summary = {
  totalPartidos: matches.length,
  jugados: matches.filter((m) => m.status === 'Jugado' || String(m.status).startsWith('WO')).length,
  pendientes: matches.filter((m) => m.status === 'Pendiente').length,
  programados: matches.filter((m) => m.status === 'Programado').length,
  faltanPorProgramar: faltanPorProgramar.length,
  completasConDobleLocalia: parejasCompletasConDobleLocalia.length,
  jornadas: jornadas.length,
  jornadasConPendientes: jornadas.filter((j) => j.Pendientes.length > 0).map((j) => j.jornada),
  jornadasConProgramados: jornadas.filter((j) => j.Programados.length > 0).map((j) => j.jornada),
};

const lines = [];
lines.push(`# Reporte de Partidos - ${season.name}`);
lines.push('');
lines.push(`Fecha de corte: ${new Date().toISOString()}`);
lines.push('');
lines.push('## Resumen Ejecutivo');
lines.push('');
lines.push(`- Temporada: ${season.name}`);
lines.push(`- Categoría: ${season.category}`);
lines.push(`- Partidos de fase regular registrados: ${summary.totalPartidos}`);
lines.push(`- Partidos jugados o resueltos por W.O.: ${summary.jugados}`);
lines.push(`- Partidos pendientes: ${summary.pendientes}`);
lines.push(`- Partidos programados: ${summary.programados}`);
lines.push(`- Parejas con enfrentamientos faltantes por programar: ${summary.faltanPorProgramar}`);
lines.push(`- Parejas completas pero con doble localía: ${summary.completasConDobleLocalia}`);
lines.push(`- Jornadas detectadas: ${summary.jornadas}`);
lines.push(`- Jornadas con pendientes: ${summary.jornadasConPendientes.length > 0 ? summary.jornadasConPendientes.join(', ') : 'Ninguna'}`);
lines.push(`- Jornadas con programados: ${summary.jornadasConProgramados.length > 0 ? summary.jornadasConProgramados.join(', ') : 'Ninguna'}`);
lines.push('');

for (const jornada of jornadas) {
  lines.push(`## J${jornada.jornada}`);
  lines.push('');

  lines.push(`### Jugados (${jornada.Jugados.length})`);
  if (jornada.Jugados.length === 0) {
    lines.push('- Sin partidos jugados en esta jornada.');
  } else {
    for (const match of jornada.Jugados) lines.push(formatMatch(match));
  }
  lines.push('');

  lines.push(`### Pendientes (${jornada.Pendientes.length})`);
  if (jornada.Pendientes.length === 0) {
    lines.push('- Sin partidos pendientes en esta jornada.');
  } else {
    for (const match of jornada.Pendientes) lines.push(formatMatch(match));
  }
  lines.push('');

  lines.push(`### Programados (${jornada.Programados.length})`);
  if (jornada.Programados.length === 0) {
    lines.push('- Sin partidos programados en esta jornada.');
  } else {
    for (const match of jornada.Programados) lines.push(formatMatch(match));
  }
  lines.push('');
}

lines.push('## Partidos Faltantes por Programar');
lines.push('');
lines.push('Estos faltantes se calculan por pareja de equipos, sin importar quién aparece como local o visitante. La regla usada es que cada pareja debe tener 2 enfrentamientos registrados en fase regular, aunque por errores de captura ambos hayan quedado con la misma localía.');
lines.push('');

if (faltanPorProgramar.length === 0) {
  lines.push('- No se detectaron partidos faltantes por programar.');
} else {
  for (const match of faltanPorProgramar) {
    lines.push(`- ${match.pareja} :: Registrados ${match.existentes} de 2 | Faltan ${match.faltan} | ${match.detalle}`);
  }
}
lines.push('');

lines.push('## Parejas Completas con Doble Localía');
lines.push('');
lines.push('Estas parejas ya tienen 2 enfrentamientos registrados, por lo que no se consideran faltantes. Sin embargo, ambos juegos quedaron capturados con la misma localía y conviene revisarlas sólo para control administrativo.');
lines.push('');

if (parejasCompletasConDobleLocalia.length === 0) {
  lines.push('- No se detectaron parejas completas con doble localía.');
} else {
  for (const pair of parejasCompletasConDobleLocalia) {
    lines.push(`- ${pair.pareja} :: ${pair.detalle}`);
  }
}
lines.push('');

await mkdir(outDir, { recursive: true });
const reportPath = path.join(outDir, 'reporte-femenil.md');
await writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8');

console.log(reportPath);
