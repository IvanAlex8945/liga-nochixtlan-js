export interface SchedulingTeam {
  id: number;
  name: string;
  match_frequency_days?: number | null;
  preferred_time_notes?: string | null;
}

export interface SchedulingMatch {
  id?: number | null;
  home_team_id: number;
  away_team_id: number;
  scheduled_date?: string | null;
  time_str?: string | null;
  court?: string | null;
}

interface SchedulingCheckInput {
  matches: SchedulingMatch[];
  teams: SchedulingTeam[];
  homeTeamId: number;
  awayTeamId: number;
  scheduledDate?: string | null;
  timeStr?: string | null;
  court?: string | null;
  excludeMatchId?: number | null;
}

export interface SchedulingCheckResult {
  blocking: string[];
  warnings: string[];
}

function normalizeDate(value?: string | null) {
  return value ? value.slice(0, 10) : null;
}

function parseTimeToMinutes(value?: string | null) {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minutes = Number(match[2]);
  const meridian = match[3].toUpperCase();
  if (meridian === 'PM' && hour !== 12) hour += 12;
  if (meridian === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minutes;
}

function daysBetween(a: string, b: string) {
  const start = new Date(`${a}T12:00:00`);
  const end = new Date(`${b}T12:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function teamName(teams: SchedulingTeam[], id: number) {
  return teams.find((team) => team.id === id)?.name ?? `Equipo #${id}`;
}

function involvesTeam(match: SchedulingMatch, teamId: number) {
  return match.home_team_id === teamId || match.away_team_id === teamId;
}

export function checkSchedulingConflicts(input: SchedulingCheckInput): SchedulingCheckResult {
  const date = normalizeDate(input.scheduledDate);
  const newTime = parseTimeToMinutes(input.timeStr);
  const blocking: string[] = [];
  const warnings: string[] = [];
  const teamIds = [input.homeTeamId, input.awayTeamId];

  const comparableMatches = input.matches.filter((match) => {
    if (input.excludeMatchId && match.id === input.excludeMatchId) return false;
    return Boolean(match.scheduled_date);
  });

  if (date && input.timeStr) {
    for (const match of comparableMatches) {
      const matchDate = normalizeDate(match.scheduled_date);
      if (matchDate !== date || match.time_str !== input.timeStr) continue;

      const overlappingTeam = teamIds.find((teamId) => involvesTeam(match, teamId));
      if (overlappingTeam) {
        blocking.push(`${teamName(input.teams, overlappingTeam)} ya tiene partido el ${date} a las ${input.timeStr}.`);
      }

      if (input.court && match.court === input.court) {
        blocking.push(`${input.court} ya está ocupada el ${date} a las ${input.timeStr}.`);
      }
    }
  }

  if (date && newTime !== null) {
    for (const teamId of teamIds) {
      for (const match of comparableMatches.filter((candidate) => involvesTeam(candidate, teamId))) {
        const matchDate = normalizeDate(match.scheduled_date);
        const matchTime = parseTimeToMinutes(match.time_str);
        if (matchDate !== date || matchTime === null) continue;
        const restMinutes = Math.abs(newTime - matchTime);
        if (restMinutes > 0 && restMinutes < 60) {
          warnings.push(`${teamName(input.teams, teamId)} tendría solo ${restMinutes} min de descanso el ${date}.`);
        }
      }
    }
  }

  if (date) {
    const selectedDate = date;
    for (const teamId of teamIds) {
      const team = input.teams.find((candidate) => candidate.id === teamId);
      const minDays = team?.match_frequency_days ?? null;
      if (!minDays) continue;

      const previous = comparableMatches
        .filter((match) => involvesTeam(match, teamId))
        .map((match) => normalizeDate(match.scheduled_date))
        .filter((matchDate): matchDate is string => matchDate !== null)
        .filter((matchDate) => matchDate < selectedDate)
        .sort()
        .at(-1);

      if (!previous) continue;
      const diff = daysBetween(previous, selectedDate);
      if (diff < minDays) {
        warnings.push(`${teamName(input.teams, teamId)} jugó el ${previous}; preferencia mínima: ${minDays} días.`);
      }
    }
  }

  for (const teamId of teamIds) {
    const notes = input.teams.find((team) => team.id === teamId)?.preferred_time_notes?.trim();
    if (notes) warnings.push(`${teamName(input.teams, teamId)}: ${notes}`);
  }

  return {
    blocking: Array.from(new Set(blocking)),
    warnings: Array.from(new Set(warnings)),
  };
}
