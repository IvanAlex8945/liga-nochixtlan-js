#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
schedule_tuesday.py
===================
Motor automatizado de generación de rol de juegos semanal (Martes)
para la Liga Municipal de Básquetbol de Nochixtlán.

Reglas clave:
  1. Candado INTERCAB: Cancha Bicentenario @ 09:00 PM o 10:00 PM (Prioridad #1).
  2. Distribución Tradicional por Categoría:
       - JUEVES: Libre y Master
       - VIERNES: Femenil y Veteranos
       - SÁBADO: Tercera Fuerza (3ra)
  3. Filtro Anti-Duplicados Estricto:
       - NUNCA programa un cruce entre dos equipos que ya se enfrentaron en el torneo.
  4. Permisos y Descansos:
       - Excluye equipos con permiso (ej. BUHOS) y otorga descansos justos.
  5. Balance de Canchas: Distribuye equitativamente 50/50 entre Bicentenario y Techada.
  6. Salida para WhatsApp y persistencia opcional (--commit) en Supabase.
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
EXPORTS_DIR = os.path.join(ROOT_DIR, 'exports')

COURT_BICENTENARIO = 'Cancha Bicentenario'
COURT_TECHADA = 'Cancha Techada'
VALID_COURTS = [COURT_BICENTENARIO, COURT_TECHADA]
DEFAULT_TIMES = ['06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM']

DAYS_ES = {
    0: 'Lunes', 1: 'Martes', 2: 'Miércoles', 3: 'Jueves',
    4: 'Viernes', 5: 'Sábado', 6: 'Domingo'
}

# Días tradicionales oficiales de la liga
DEFAULT_CATEGORY_DAYS = {
    'Libre': 'Jueves',
    'Master': 'Jueves',
    'Veteranos': 'Viernes',
    'Femenil': 'Viernes',
    '3ra': 'Sábado'
}


def load_env() -> Dict[str, str]:
    """Carga variables desde .env.local de forma segura sin exponer claves."""
    env = {}
    env_file = os.path.join(ROOT_DIR, '.env.local')
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip().strip('"\'')
    return env


class SupabaseClient:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip('/')
        self.key = key
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }

    def get(self, path: str, params: Optional[Dict[str, str]] = None) -> Any:
        query_str = f"?{urllib.parse.urlencode(params)}" if params else ""
        req = urllib.request.Request(f"{self.url}/rest/v1/{path}{query_str}", headers=self.headers)
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))

    def patch(self, path: str, data: Dict[str, Any], match_param: str) -> Any:
        req = urllib.request.Request(
            f"{self.url}/rest/v1/{path}?{match_param}",
            data=json.dumps(data).encode('utf-8'),
            headers=self.headers,
            method='PATCH'
        )
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))

    def post(self, path: str, data: Any) -> Any:
        req = urllib.request.Request(
            f"{self.url}/rest/v1/{path}",
            data=json.dumps(data).encode('utf-8'),
            headers=self.headers,
            method='POST'
        )
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))


def get_upcoming_weekend_dates(base_date: Optional[datetime] = None) -> List[str]:
    """
    Retorna las fechas (YYYY-MM-DD) para el próximo Jueves, Viernes y Sábado.
    Si hoy es martes, retorna el jueves, viernes y sábado de esta misma semana.
    """
    if base_date is None:
        base_date = datetime.now()
    
    current_weekday = base_date.weekday()
    days_until_thursday = (3 - current_weekday) % 7
    if days_until_thursday == 0 and base_date.hour >= 23:
        days_until_thursday = 7
    
    thursday = base_date + timedelta(days=days_until_thursday)
    friday = thursday + timedelta(days=1)
    saturday = thursday + timedelta(days=2)
    
    return [
        thursday.strftime('%Y-%m-%d'),
        friday.strftime('%Y-%m-%d'),
        saturday.strftime('%Y-%m-%d')
    ]


def calculate_court_history(matches: List[Dict[str, Any]]) -> Dict[int, Dict[str, int]]:
    """Calcula cuántos partidos ha jugado cada equipo en cada cancha."""
    stats: Dict[int, Dict[str, int]] = {}
    for m in matches:
        court = m.get('court')
        if not court:
            continue
        for team_id in [m.get('home_team_id'), m.get('away_team_id')]:
            if team_id is None:
                continue
            if team_id not in stats:
                stats[team_id] = {COURT_BICENTENARIO: 0, COURT_TECHADA: 0}
            if court in stats[team_id]:
                stats[team_id][court] += 1
    return stats


def choose_fair_court(
    home_id: int,
    away_id: int,
    court_history: Dict[int, Dict[str, int]],
    available_courts: List[str]
) -> str:
    """Elige la cancha que mejor balancee el historial de ambos equipos hacia un 50/50."""
    if not available_courts:
        return COURT_BICENTENARIO
    if len(available_courts) == 1:
        return available_courts[0]

    h_stats = court_history.get(home_id, {COURT_BICENTENARIO: 0, COURT_TECHADA: 0})
    a_stats = court_history.get(away_id, {COURT_BICENTENARIO: 0, COURT_TECHADA: 0})

    bic_count = h_stats.get(COURT_BICENTENARIO, 0) + a_stats.get(COURT_BICENTENARIO, 0)
    tech_count = h_stats.get(COURT_TECHADA, 0) + a_stats.get(COURT_TECHADA, 0)

    if bic_count > tech_count and COURT_TECHADA in available_courts:
        return COURT_TECHADA
    if tech_count > bic_count and COURT_BICENTENARIO in available_courts:
        return COURT_BICENTENARIO

    return available_courts[0]


def format_whatsapp_schedule(
    assignments: List[Dict[str, Any]],
    permisos_equipos: List[str],
    descansos: List[Dict[str, str]]
) -> str:
    """Genera el mensaje formateado con emojis para copiar y pegar en WhatsApp."""
    lines = []
    lines.append("🏀 *LIGA MUNICIPAL DE BÁSQUETBOL NOCHIXTLÁN* 🏀")
    lines.append("📋 *ROL OFICIAL DE JUEGOS DE LA SEMANA*")
    lines.append("═════════════════════════════════════\n")

    by_date: Dict[str, List[Dict[str, Any]]] = {}
    for item in assignments:
        by_date.setdefault(item['date'], []).append(item)

    for date_str in sorted(by_date.keys()):
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        day_name = DAYS_ES.get(dt.weekday(), '').upper()
        lines.append(f"🗓 *{day_name} {dt.strftime('%d/%m/%Y')}*")
        lines.append("─────────────────────────────────────")

        by_court: Dict[str, List[Dict[str, Any]]] = {}
        for match in by_date[date_str]:
            by_court.setdefault(match['court'], []).append(match)

        for court_name in sorted(by_court.keys()):
            icon = "🏟️" if "Bicentenario" in court_name else "🏛️"
            lines.append(f"\n{icon} *{court_name.upper()}*")
            court_matches = sorted(by_court[court_name], key=lambda x: x['time_str'])
            for m in court_matches:
                cat_tag = f"[{m['category'].upper()}]"
                home = m['home_team_name']
                away = m['away_team_name']
                jornada_label = f"J{m['jornada']}" if m.get('jornada') else m.get('phase', '')
                lines.append(f"  ⏰ *{m['time_str']}* · {cat_tag} {home} 🆚 {away} ({jornada_label})")
        lines.append("")

    if descansos:
        lines.append("🛌 *EQUIPOS QUE DESCANSAN ESTA JORNADA:*")
        for d in descansos:
            lines.append(f"  • *{d['team_name']}* ({d['category']})")
        lines.append("")

    if permisos_equipos:
        lines.append("📝 *PERMISOS REGISTRADOS PARA ESTA SEMANA:*")
        for p in permisos_equipos:
            lines.append(f"  • *{p}* (Permiso reglamentario)")
        lines.append("")

    lines.append("⚠️ *NOTAS IMPORTANTES:*")
    lines.append("• Presentarse con 15 minutos de anticipación y credenciales digitales vigentes.")
    lines.append("• Tolerancia máxima de 10 minutos para el primer partido de la jornada.")
    lines.append("• ¡Mucho éxito a todos los equipos!")

    return "\n".join(lines)


def schedule_week(
    client: SupabaseClient,
    dates: List[str],
    permisos_names: List[str],
    intercab_day_pref: str = 'Jueves',
    intercab_time_pref: str = '09:00 PM',
    custom_prefs: Optional[Dict[str, Dict[str, str]]] = None,
    category_days: Optional[Dict[str, str]] = None,
    season_ids: Optional[List[int]] = None,
    prevent_rematches: bool = True
) -> Tuple[List[Dict[str, Any]], List[str], List[Dict[str, str]]]:
    """
    Ejecuta el motor de asignación semanal considerando todas las restricciones.
    """
    if custom_prefs is None:
        custom_prefs = {}
    if category_days is None:
        category_days = dict(DEFAULT_CATEGORY_DAYS)

    # 1. Temporadas activas
    seasons_raw = client.get('seasons', {'is_active': 'eq.true'})
    active_seasons = {s['id']: s for s in seasons_raw}
    if season_ids:
        active_seasons = {sid: s for sid, s in active_seasons.items() if sid in season_ids}

    # 2. Historial de partidos completos para balance de canchas y anti-duplicados
    all_matches_history = client.get('matches', {
        'select': 'id,season_id,home_team_id,away_team_id,court,status,phase'
    })
    court_history = calculate_court_history(all_matches_history)

    # Mapa de parejas que ya jugaron en cada temporada (evita que se juegue "doble vez")
    played_pairs_by_season: Dict[int, Set[Tuple[int, int]]] = {}
    for m in all_matches_history:
        st = m.get('status')
        if st in ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble']:
            s_id = m.get('season_id')
            if s_id is not None:
                pair = tuple(sorted([m['home_team_id'], m['away_team_id']]))
                played_pairs_by_season.setdefault(s_id, set()).add(pair)

    # 3. Equipos y pendientes por categoría
    permisos_applied: List[str] = []
    descansos_applied: List[Dict[str, str]] = []
    matches_to_schedule: List[Dict[str, Any]] = []

    permisos_normalized = [p.strip().upper() for p in permisos_names if p.strip()]

    for sid, season in sorted(active_seasons.items(), key=lambda x: x[0]):
        category = season.get('category', '')
        teams_raw = client.get('teams', {
            'season_id': f"eq.{sid}",
            'status': 'eq.Activo'
        })
        team_map = {t['id']: t for t in teams_raw}

        # Partidos pendientes o programados sin fecha
        pending_matches = client.get('matches', {
            'season_id': f"eq.{sid}",
            'status': 'eq.Pendiente',
            'order': 'jornada.asc,id.asc'
        })

        if not pending_matches:
            pending_matches = client.get('matches', {
                'season_id': f"eq.{sid}",
                'status': 'eq.Programado',
                'scheduled_date': 'is.null',
                'order': 'jornada.asc,id.asc'
            })

        if not pending_matches:
            continue

        played_in_this_season = played_pairs_by_season.get(sid, set())

        # Si se exige evitar revanchas/duplicados, filtrar partidos donde los equipos ya jugaron
        valid_pending = []
        for m in pending_matches:
            pair = tuple(sorted([m['home_team_id'], m['away_team_id']]))
            # Si es fase de Liguilla (ej. Semifinal), se permiten juegos de serie al mejor de 3
            is_playoffs = m.get('phase') and m.get('phase') != 'Fase Regular'
            if not is_playoffs and prevent_rematches and pair in played_in_this_season:
                # Este partido ya se jugó en una jornada previa
                continue
            valid_pending.append(m)

        if not valid_pending:
            print(f"ℹ️ [{category}] Todos los partidos pendientes registrados en BD ya se jugaron previamente (no hay cruces nuevos en la tabla).")
            continue

        target_jornada = valid_pending[0].get('jornada')
        jornada_matches = [m for m in valid_pending if m.get('jornada') == target_jornada]
        if not jornada_matches:
            jornada_matches = valid_pending[:6]

        for m in jornada_matches:
            home_team = team_map.get(m['home_team_id'], {})
            away_team = team_map.get(m['away_team_id'], {})
            home_name = home_team.get('name', f"Equipo #{m['home_team_id']}")
            away_name = away_team.get('name', f"Equipo #{m['away_team_id']}")

            home_permiso = any(p in home_name.upper() for p in permisos_normalized)
            away_permiso = any(p in away_name.upper() for p in permisos_normalized)

            if home_permiso or away_permiso:
                permiso_team = home_name if home_permiso else away_name
                rival_team = away_name if home_permiso else home_name
                permisos_applied.append(f"{permiso_team} ({category})")
                descansos_applied.append({
                    'team_name': rival_team,
                    'category': category,
                    'reason': f"Descansa por permiso de {permiso_team}"
                })
                continue

            matches_to_schedule.append({
                'match_id': m['id'],
                'season_id': sid,
                'category': category,
                'jornada': m.get('jornada'),
                'phase': m.get('phase', 'Fase Regular'),
                'home_team_id': m['home_team_id'],
                'away_team_id': m['away_team_id'],
                'home_team_name': home_name,
                'away_team_name': away_name,
                'is_intercab': ('INTERCAB' in home_name.upper() or 'INTERCAB' in away_name.upper())
            })

    # 4. Generar parrilla de slots disponibles
    slots: List[Dict[str, Any]] = []
    for d_str in dates:
        dt = datetime.strptime(d_str, '%Y-%m-%d')
        day_name = DAYS_ES.get(dt.weekday(), '')
        for court in VALID_COURTS:
            for time_str in DEFAULT_TIMES:
                slots.append({
                    'date': d_str,
                    'day_name': day_name,
                    'court': court,
                    'time_str': time_str,
                    'occupied': False,
                    'match': None
                })

    assignments: List[Dict[str, Any]] = []

    # 5. PRIORIDAD 1: Candado INTERCAB
    intercab_matches = [m for m in matches_to_schedule if m['is_intercab']]
    non_intercab_matches = [m for m in matches_to_schedule if not m['is_intercab']]

    for im in intercab_matches:
        target_slots = [
            s for s in slots
            if not s['occupied']
            and s['court'] == COURT_BICENTENARIO
            and s['time_str'] in ['09:00 PM', '10:00 PM']
        ]

        day_matched_slots = [s for s in target_slots if s['day_name'].lower() == intercab_day_pref.lower()]
        slot_to_pick = None
        if day_matched_slots:
            time_matched = [s for s in day_matched_slots if s['time_str'] == intercab_time_pref]
            slot_to_pick = time_matched[0] if time_matched else day_matched_slots[0]
        elif target_slots:
            slot_to_pick = target_slots[0]

        if slot_to_pick:
            slot_to_pick['occupied'] = True
            slot_to_pick['match'] = im
            assignments.append({
                **im,
                'date': slot_to_pick['date'],
                'court': slot_to_pick['court'],
                'time_str': slot_to_pick['time_str'],
                'day_name': slot_to_pick['day_name']
            })

    # 6. PRIORIDAD 2: Preferencias personalizadas
    remaining_matches: List[Dict[str, Any]] = []
    for m in non_intercab_matches:
        pref = None
        for team_name in [m['home_team_name'].upper(), m['away_team_name'].upper()]:
            for key, p_val in custom_prefs.items():
                if key.upper() in team_name:
                    pref = p_val
                    break
            if pref:
                break

        if pref:
            req_time = pref.get('time')
            req_day = pref.get('day')
            candidates = [
                s for s in slots
                if not s['occupied']
                and (not req_time or s['time_str'] == req_time)
                and (not req_day or s['day_name'].lower() == req_day.lower())
            ]
            if candidates:
                chosen = candidates[0]
                chosen['occupied'] = True
                chosen['match'] = m
                assignments.append({
                    **m,
                    'date': chosen['date'],
                    'court': chosen['court'],
                    'time_str': chosen['time_str'],
                    'day_name': chosen['day_name']
                })
                continue
        remaining_matches.append(m)

    # 7. PRIORIDAD 3: Asignación por día tradicional de la categoría + Balance de Canchas
    for m in remaining_matches:
        cat = m['category']
        preferred_day = category_days.get(cat, 'Jueves')

        # Buscar slots libres en el día asignado a la categoría
        candidate_slots = [
            s for s in slots
            if not s['occupied'] and s['day_name'].lower() == preferred_day.lower()
        ]
        if not candidate_slots:
            candidate_slots = [s for s in slots if not s['occupied']]

        if not candidate_slots:
            print(f"⚠️ Alerta: No hay slots suficientes para {m['home_team_name']} vs {m['away_team_name']}")
            break

        available_courts_now = list(set(s['court'] for s in candidate_slots))
        fair_court = choose_fair_court(
            m['home_team_id'],
            m['away_team_id'],
            court_history,
            available_courts_now
        )

        court_slots = [s for s in candidate_slots if s['court'] == fair_court]
        selected_slot = court_slots[0] if court_slots else candidate_slots[0]

        selected_slot['occupied'] = True
        selected_slot['match'] = m
        assignments.append({
            **m,
            'date': selected_slot['date'],
            'court': selected_slot['court'],
            'time_str': selected_slot['time_str'],
            'day_name': selected_slot['day_name']
        })

        for tid in [m['home_team_id'], m['away_team_id']]:
            if tid not in court_history:
                court_history[tid] = {COURT_BICENTENARIO: 0, COURT_TECHADA: 0}
            court_history[tid][selected_slot['court']] += 1

    return assignments, permisos_applied, descansos_applied


def commit_to_supabase(
    client: SupabaseClient,
    assignments: List[Dict[str, Any]],
    permisos_equipos: List[str]
) -> None:
    """Persiste en Supabase las asignaciones y permisos."""
    print("\n⏳ Guardando partidos programados en Supabase...")
    for item in assignments:
        patch_data = {
            'scheduled_date': f"{item['date']}T00:00:00",
            'time_str': item['time_str'],
            'court': item['court'],
            'status': 'Programado'
        }
        client.patch('matches', patch_data, f"id=eq.{item['match_id']}")
        print(f"  ✓ Partido #{item['match_id']} ({item['home_team_name']} vs {item['away_team_name']}) -> {item['day_name']} {item['time_str']} [{item['court']}]")

    if permisos_equipos:
        print("\n⏳ Actualizando contador de permisos para equipos...")
        for p_name in permisos_equipos:
            clean_name = p_name.split('(')[0].strip()
            teams = client.get('teams', {'name': f"ilike.*{clean_name}*"})
            for t in teams:
                current_used = t.get('permissions_used') or 0
                client.patch('teams', {'permissions_used': current_used + 1}, f"id=eq.{t['id']}")
                print(f"  ✓ Permiso sumado a {t['name']} (Total usados: {current_used + 1}/3)")

    print("\n✅ ¡Todos los cambios han sido aplicados exitosamente a Supabase!")


def main():
    parser = argparse.ArgumentParser(
        description="Generador Semanal de Rol de Juegos (Martes) - Liga Nochixtlán"
    )
    parser.add_argument(
        '--dates',
        type=str,
        help="Fechas separadas por coma (YYYY-MM-DD,YYYY-MM-DD,...). Por defecto calcula Jueves, Viernes y Sábado."
    )
    parser.add_argument(
        '--permisos',
        type=str,
        default="",
        help="Nombres de equipos que pidieron permiso separados por coma (ej. 'BUHOS')."
    )
    parser.add_argument(
        '--intercab-day',
        type=str,
        default="Jueves",
        help="Día preferido para INTERCAB (Jueves, Viernes, Sábado). Por defecto: Jueves."
    )
    parser.add_argument(
        '--intercab-time',
        type=str,
        default="09:00 PM",
        choices=['09:00 PM', '10:00 PM'],
        help="Horario estelar para INTERCAB (09:00 PM o 10:00 PM). Por defecto: 09:00 PM."
    )
    parser.add_argument(
        '--allow-rematches',
        action='store_true',
        help="Permitir programar partidos entre equipos que ya se enfrentaron en la temporada (por defecto está desactivado para evitar duplicados)."
    )
    parser.add_argument(
        '--commit',
        action='store_true',
        help="Aplica los cambios directamente a la base de datos de Supabase. Si no se indica, corre en modo dry-run."
    )
    parser.add_argument(
        '--interactive', '-i',
        action='store_true',
        help="Inicia el asistente interactivo paso a paso."
    )

    args = parser.parse_args()

    env = load_env()
    supabase_url = env.get('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = env.get('SUPABASE_SERVICE_ROLE_KEY') or env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

    if not supabase_url or not supabase_key:
        print("❌ Error: No se encontraron credenciales en .env.local")
        sys.exit(1)

    client = SupabaseClient(supabase_url, supabase_key)

    permisos_list = [p.strip() for p in args.permisos.split(',') if p.strip()]
    dates_list = [d.strip() for d in args.dates.split(',') if d.strip()] if args.dates else get_upcoming_weekend_dates()
    intercab_day = args.intercab_day
    intercab_time = args.intercab_time

    if args.interactive:
        print("\n" + "="*60)
        print("🏀 ASISTENTE DE PROGRAMACIÓN DE LOS MARTES 🏀")
        print("="*60)
        
        print(f"\nFechas sugeridas para este fin de semana:")
        for idx, d in enumerate(dates_list, 1):
            dt = datetime.strptime(d, '%Y-%m-%d')
            print(f"  {idx}. {DAYS_ES.get(dt.weekday(), '')} {d}")
        
        ans_dates = input("\n¿Usar estas fechas? [S/n] (o escribe las fechas separadas por coma YYYY-MM-DD): ").strip()
        if ans_dates and ans_dates.lower() not in ['s', 'si', 'y', 'yes']:
            dates_list = [d.strip() for d in ans_dates.split(',') if d.strip()]

        perm_input = input("\n¿Qué equipos pidieron permiso esta semana? (separados por coma, ej. BUHOS): ").strip()
        if perm_input:
            permisos_list = [p.strip() for p in perm_input.split(',') if p.strip()]

        ic_day_input = input(f"\n¿Qué día jugará INTERCAB? [por defecto {intercab_day}]: ").strip()
        if ic_day_input:
            intercab_day = ic_day_input

        ic_time_input = input(f"¿A qué hora jugará INTERCAB? (1 para 09:00 PM, 2 para 10:00 PM) [por defecto {intercab_time}]: ").strip()
        if ic_time_input == '2':
            intercab_time = '10:00 PM'
        elif ic_time_input == '1':
            intercab_time = '09:00 PM'

    print("\n🔍 Analizando temporadas activas y partidos pendientes en Supabase...")
    assignments, permisos_applied, descansos_applied = schedule_week(
        client=client,
        dates=dates_list,
        permisos_names=permisos_list,
        intercab_day_pref=intercab_day,
        intercab_time_pref=intercab_time,
        prevent_rematches=not args.allow_rematches
    )

    if not assignments:
        print("ℹ️ No se encontraron partidos pendientes para programar.")
        sys.exit(0)

    print("\n" + "="*75)
    print("📊 PROPUESTA DE PROGRAMACIÓN PARA EL FIN DE SEMANA")
    print("="*75)
    
    by_date: Dict[str, List[Dict[str, Any]]] = {}
    for a in assignments:
        by_date.setdefault(a['date'], []).append(a)

    for d_str in sorted(by_date.keys()):
        dt = datetime.strptime(d_str, '%Y-%m-%d')
        day_title = f"{DAYS_ES.get(dt.weekday(), '').upper()} {d_str}"
        print(f"\n📌 {day_title}")
        print("-" * 75)
        print(f"{'HORA':<10} | {'CANCHA':<20} | {'CAT':<10} | {'PARTIDO'}")
        print("-" * 75)

        sorted_matches = sorted(by_date[d_str], key=lambda x: (x['time_str'], x['court']))
        for m in sorted_matches:
            star = " ⭐ [INTERCAB]" if m['is_intercab'] else ""
            matchup = f"{m['home_team_name']} vs {m['away_team_name']}{star}"
            print(f"{m['time_str']:<10} | {m['court']:<20} | {m['category']:<10} | {matchup}")

    if descansos_applied:
        print("\n🛌 DESCANSOS:")
        for d in descansos_applied:
            print(f"  • {d['team_name']} ({d['category']}) - {d['reason']}")

    if permisos_applied:
        print("\n📝 PERMISOS:")
        for p in permisos_applied:
            print(f"  • {p}")

    os.makedirs(EXPORTS_DIR, exist_ok=True)
    whatsapp_text = format_whatsapp_schedule(assignments, permisos_applied, descansos_applied)
    first_date = dates_list[0] if dates_list else datetime.now().strftime('%Y-%m-%d')
    export_file = os.path.join(EXPORTS_DIR, f"rol_semanal_{first_date}.txt")
    with open(export_file, 'w', encoding='utf-8') as f:
        f.write(whatsapp_text)

    print(f"\n📱 Archivo de WhatsApp generado en:\n   -> {export_file}")

    if args.commit:
        commit_to_supabase(client, assignments, permisos_applied)
    else:
        print("\n" + "-"*75)
        print("💡 Modo Seguro (DRY-RUN): Los cambios NO se han aplicado a Supabase aún.")
        ans = input("¿Deseas aplicar esta programación directamente en Supabase? [s/N]: ").strip().lower()
        if ans in ['s', 'si', 'y', 'yes']:
            commit_to_supabase(client, assignments, permisos_applied)
        else:
            print("🔒 Operación finalizada sin modificar la base de datos.")


if __name__ == '__main__':
    main()
