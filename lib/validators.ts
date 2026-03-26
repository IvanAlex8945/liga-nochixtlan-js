import { SupabaseClient } from '@supabase/supabase-js';

export interface PrerequisiteResult {
  ok: boolean;
  message?: string;
}

export async function checkPrerequisites(
  supabase: SupabaseClient,
  step: 'teams' | 'calendar' | 'capture' | 'playoff'
): Promise<PrerequisiteResult> {
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!season) {
    return { ok: false, message: 'No hay temporada activa. Crea y activa una temporada primero.' };
  }

  if (step === 'calendar' || step === 'capture' || step === 'playoff') {
    const { count } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', season.id)
      .eq('status', 'Activo');

    if (!count || count < 2) {
      return { ok: false, message: 'Se necesitan al menos 2 equipos activos en la temporada.' };
    }
  }

  return { ok: true };
}
