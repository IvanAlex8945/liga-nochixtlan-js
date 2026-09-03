import { createClient } from '@supabase/supabase-js';

const serviceKey = process.argv[2];
if (!serviceKey) {
  console.error("❌ POR FAVOR PASA LA SERVICE ROLE KEY COMO ARGUMENTO.");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fnjvvbelrleamywyxoaq.supabase.co';
const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("⚙️  Creando Temporada Simulacro Neon...\n");

  // 1. Crear Temporada Falsa
  const { data: season, error: e1 } = await supabase.from('seasons').insert({
    name: '🔵 Simulacro Neon (Mejor de 3) 🔵',
    category: '3ra Fuerza',
    year: 2026,
    is_active: true
  }).select().single();

  if (e1) return console.error(e1);
  const sId = season.id;
  console.log("✅ Temporada creada:", sId);

  // 2. Crear 8 Equipos Falsos
  const teamNames = ['Lakers', 'Bulls', 'Celtics', 'Heat', 'Warriors', 'Spurs', 'Suns', 'Raptors'];
  const teamsToInsert = teamNames.map(n => ({ season_id: sId, name: n, status: 'Activo', category: '3ra Fuerza' }));

  const { data: teams, error: e2 } = await supabase.from('teams').insert(teamsToInsert).select();
  if (e2) return console.error(e2);
  console.log("✅ 8 Equipos creados.");

  const t = teams;
  const matchesToInsert = [];

  // --- CUARTOS DE FINAL (AL MEJOR DE 3) ---
  
  // SERIE A: [1] Lakers vs [8] Raptors -> Gana Lakers 2-0
  matchesToInsert.push({ season_id: sId, jornada: 20, phase: 'Cuartos de Final', status: 'Jugado', home_team_id: t[0].id, away_team_id: t[7].id, home_score: 110, away_score: 95 });
  matchesToInsert.push({ season_id: sId, jornada: 21, phase: 'Cuartos de Final', status: 'Jugado', home_team_id: t[7].id, away_team_id: t[0].id, home_score: 85, away_score: 102 });

  // SERIE B: [2] Bulls vs [7] Suns -> Gana Suns 2-1
  matchesToInsert.push({ season_id: sId, jornada: 20, phase: 'Cuartos de Final', status: 'Jugado', home_team_id: t[1].id, away_team_id: t[6].id, home_score: 98, away_score: 104 });
  matchesToInsert.push({ season_id: sId, jornada: 21, phase: 'Cuartos de Final', status: 'Jugado', home_team_id: t[6].id, away_team_id: t[1].id, home_score: 88, away_score: 100 });
  matchesToInsert.push({ season_id: sId, jornada: 22, phase: 'Cuartos de Final', status: 'Jugado', home_team_id: t[1].id, away_team_id: t[6].id, home_score: 95, away_score: 98 });

  // SERIE C: [3] Celtics vs [6] Spurs -> Gana Celtics 2-0
  matchesToInsert.push({ season_id: sId, jornada: 20, phase: 'Cuartos de Final', status: 'Jugado', home_team_id: t[2].id, away_team_id: t[5].id, home_score: 105, away_score: 90 });
  matchesToInsert.push({ season_id: sId, jornada: 21, phase: 'Cuartos de Final', status: 'Jugado', home_team_id: t[5].id, away_team_id: t[2].id, home_score: 92, away_score: 115 });

  // SERIE D: [4] Heat vs [5] Warriors -> Gana Warriors 2-1
  matchesToInsert.push({ season_id: sId, jornada: 20, phase: 'Cuartos de Final', status: 'Jugado', home_team_id: t[3].id, away_team_id: t[4].id, home_score: 120, away_score: 115 });
  matchesToInsert.push({ season_id: sId, jornada: 21, phase: 'Cuartos de Final', status: 'Jugado', home_team_id: t[4].id, away_team_id: t[3].id, home_score: 110, away_score: 105 });
  matchesToInsert.push({ season_id: sId, jornada: 22, phase: 'Cuartos de Final', status: 'Jugado', home_team_id: t[3].id, away_team_id: t[4].id, home_score: 98, away_score: 102 });

  // --- SEMIFINALES (AL MEJOR DE 3) ---
  // Re-siembra: Quedan [1] Lakers, [3] Celtics, [5] Warriors, [7] Suns
  // Semi 1: [1] Lakers vs [7] Suns -> Lakers gana 2-1
  matchesToInsert.push({ season_id: sId, jornada: 23, phase: 'Semifinal', status: 'Jugado', home_team_id: t[0].id, away_team_id: t[6].id, home_score: 100, away_score: 105 });
  matchesToInsert.push({ season_id: sId, jornada: 24, phase: 'Semifinal', status: 'Jugado', home_team_id: t[6].id, away_team_id: t[0].id, home_score: 90, away_score: 110 });
  matchesToInsert.push({ season_id: sId, jornada: 25, phase: 'Semifinal', status: 'Programado', home_team_id: t[0].id, away_team_id: t[6].id }); // Para ver caja pendiente

  // Semi 2: [3] Celtics vs [5] Warriors -> Celtics gana 2-0
  matchesToInsert.push({ season_id: sId, jornada: 23, phase: 'Semifinal', status: 'Jugado', home_team_id: t[2].id, away_team_id: t[4].id, home_score: 112, away_score: 98 });
  matchesToInsert.push({ season_id: sId, jornada: 24, phase: 'Semifinal', status: 'Jugado', home_team_id: t[4].id, away_team_id: t[2].id, home_score: 102, away_score: 120 });

  // --- GRAN FINAL (A UN PARTIDO) ---
  // [1] Lakers vs [3] Celtics
  matchesToInsert.push({ season_id: sId, jornada: 26, phase: 'Final', status: 'Programado', home_team_id: t[0].id, away_team_id: t[2].id, scheduled_date: '2026-06-15', time_str: '20:00 PM', court: 'Techada' });

  const { error: e3 } = await supabase.from('matches').insert(matchesToInsert);
  if (e3) return console.error(e3);

  console.log("✅ Bracket completo de Liguilla inyectado con éxito.");
  console.log("\n🎉 Refresca la vista pública y selecciona '🔴 Simulacro Neon 🔴'.");
  console.log("Cuando termines de verla, solo ve al Panel Admin en Temporadas y borra o desactiva la temporada simulacro.");
}

run();
