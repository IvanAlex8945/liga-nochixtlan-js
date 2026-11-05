import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { normalizeText } from '@/lib/voice-box-score';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * System Instruction con método paso a paso (Chain-of-Thought) para calcular las canastas sin saltarse ninguna
 * y registrar únicamente a las jugadoras mencionadas en la asistencia o en los puntos.
 */
const BASE_SYSTEM_INSTRUCTION = `Eres el anotador y calculador matemático oficial de una mesa de control de básquetbol.
El usuario dicta las asistencias y las canastas jugada por jugada tal como vienen en la hoja de anotación.

PASO 1: EXTRAER ÚNICAMENTE LAS JUGADORAS MENCIONADAS EN ASISTENCIA O PUNTOS
- Incluye en 'players' SOLAMENTE a las jugadoras que el usuario mencionó explícitamente en el dictado (ya sea en el pase de lista de asistencia o anotando puntos).
- REGLA ESTRICTA: Si una jugadora aparece en la cédula oficial de referencia pero el usuario NO la nombró en el audio/texto, NO la incluyas en el array 'players'.
- Las jugadoras mencionadas en la asistencia que no anotaron puntos quedan con played: true y 0 puntos.

PASO 2: EXTRAER Y ENUMERAR CADA ACCIÓN DE PUNTOS EN 'baskets_log' (OBLIGATORIO)
- Recorre el dictado de puntos y extrae CADA canasta individual en el array 'baskets_log' con:
  * basket_index: número secuencial (1, 2, 3...)
  * player_number: dorsal de la jugadora
  * action_text: frase exacta (ej. "Dos puntos para la 12", "Tres puntos para la 7", "Un punto para la 7", "2 de la 12")
  * points: puntos que otorga (2 para doble/dos puntos, 3 para triple/tres puntos, 1 para tiro libre/un punto)
  * is_triple: true si la acción es de 3 puntos ("tres puntos", "triple", "una de 3")

PASO 3: SUMAR MATEMÁTICAMENTE POR CADA DORSAL
- Para cada dorsal, suma los puntos de todas sus apariciones en 'baskets_log':
  * points_1pt: suma de tiros libres (1 punto c/u)
  * points_2pt: suma de dobles (2 puntos c/u)
  * points_3pt: suma de triples (3 puntos c/u)
  * total_points: points_1pt + points_2pt + points_3pt
- total_team_score: Suma exacta de los total_points de todas las jugadoras del equipo.`;

const BOX_SCORE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    transcription_text: {
      type: 'string',
      description: 'Transcripción literal completa de lo que dictó el usuario.',
    },
    baskets_log: {
      type: 'array',
      description: 'Lista paso a paso de cada canasta dictada en orden cronológico.',
      items: {
        type: 'object',
        properties: {
          basket_index: { type: 'integer' },
          player_number: { type: 'integer' },
          action_text: { type: 'string' },
          points: { type: 'integer' },
          is_triple: { type: 'boolean' },
        },
        required: ['basket_index', 'player_number', 'action_text', 'points', 'is_triple'],
      },
    },
    teams: {
      type: 'array',
      description: 'Equipos con únicamente las jugadoras mencionadas en el dictado y sus puntos acumulados.',
      items: {
        type: 'object',
        properties: {
          team_name: {
            type: 'string',
            description: 'Nombre del equipo.',
          },
          team_side: {
            type: 'string',
            enum: ['home', 'away', 'unknown'],
            description: "Local ('home') o Visitante ('away').",
          },
          total_team_score: {
            type: 'integer',
            description: 'Suma matemática exacta de los puntos de todas las jugadoras.',
          },
          players: {
            type: 'array',
            description: 'Jugadoras que fueron mencionadas en la asistencia o en los puntos (NO incluir jugadoras ausentes).',
            items: {
              type: 'object',
              properties: {
                number: {
                  type: 'integer',
                  description: 'Dorsal de la jugadora.',
                },
                name: {
                  type: 'string',
                  description: 'Nombre de la jugadora según cédula o Jugador Desconocido.',
                },
                played: {
                  type: 'boolean',
                  description: 'true únicamente si fue mencionada en la asistencia o anotó puntos en el dictado.',
                },
                points_1pt: {
                  type: 'integer',
                  description: 'Puntos por tiros libres (1 punto c/u).',
                },
                points_2pt: {
                  type: 'integer',
                  description: 'Puntos por dobles (2 puntos c/u).',
                },
                points_3pt: {
                  type: 'integer',
                  description: 'Puntos por triples (3 puntos c/u).',
                },
                total_points: {
                  type: 'integer',
                  description: 'Suma exacta: points_1pt + points_2pt + points_3pt.',
                },
                matched_player_id: {
                  type: 'integer',
                  description: 'ID de la jugadora en la cédula oficial, o 0 si no existe.',
                },
              },
              required: [
                'number',
                'name',
                'played',
                'points_1pt',
                'points_2pt',
                'points_3pt',
                'total_points',
              ],
            },
          },
        },
        required: ['team_name', 'total_team_score', 'players'],
      },
    },
  },
  required: ['teams', 'baskets_log'],
};

interface RosterPlayerInput {
  player_id: number;
  name: string;
  number: number | null;
}

interface TeamContextInput {
  id: number;
  name: string;
  players?: RosterPlayerInput[];
}

interface AudioPayloadInput {
  base64: string;
  mimeType: string;
}

interface ParseBoxScoreRequestBody {
  transcript?: string;
  audio?: AudioPayloadInput;
  targetTeamSide?: 'home' | 'away' | 'both';
  homeTeam?: TeamContextInput;
  awayTeam?: TeamContextInput;
}

type ModelInputItem =
  | { type: 'text'; text: string }
  | { type: 'audio'; data: string; mime_type: string };

function cleanAndSanitizeBase64(input: string): string {
  let cleaned = input;
  const commaIdx = cleaned.indexOf(',');
  if (commaIdx !== -1) {
    cleaned = cleaned.substring(commaIdx + 1);
  }
  cleaned = cleaned.replace(/[^A-Za-z0-9+/=]/g, '');
  while (cleaned.length % 4 !== 0) {
    cleaned += '=';
  }
  return cleaned;
}

function sanitizeAudioMimeType(mime?: string): string {
  if (!mime) return 'audio/webm';
  const base = mime.split(';')[0].trim().toLowerCase();
  const allowed = [
    'audio/webm',
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/m4a',
    'audio/aac',
    'audio/flac',
  ];
  return allowed.includes(base) ? base : 'audio/webm';
}

/**
 * Verifica si una jugadora con 0 puntos realmente fue mencionada en el texto transcrito
 * (por su número de dorsal o por alguno de sus nombres/apellidos).
 * Esto evita que el LLM agregue jugadoras de la cédula que NO asistieron al partido.
 */
function wasZeroPointPlayerMentionedInText(
  player: { number: number | null; name: string },
  fullText: string
): boolean {
  const normText = normalizeText(fullText);
  if (!normText) return true;

  if (player.number !== null && player.number >= 0) {
    const numStr = String(player.number);
    const numRegex = new RegExp(`\\b${numStr}\\b`);
    if (numRegex.test(normText)) {
      return true;
    }
  }

  const normName = normalizeText(player.name);
  if (normName && !normName.includes('desconocid')) {
    const tokens = normName.split(' ').filter((t) => t.length >= 3);
    if (tokens.some((token) => normText.includes(token))) {
      return true;
    }
  }

  return false;
}

const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
];

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Falta configurar GEMINI_API_KEY en las variables de entorno (.env.local o Vercel).',
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ParseBoxScoreRequestBody;
    const transcript = body?.transcript?.trim();
    const audio = body?.audio;
    const targetTeamSide = body?.targetTeamSide || 'both';

    if (!transcript && !audio?.base64) {
      return NextResponse.json(
        { error: 'Debes proporcionar un texto dictado o grabar un audio antes de procesar.' },
        { status: 400 }
      );
    }

    let rosterContextPrompt = '';
    const formatRoster = (team?: TeamContextInput) => {
      if (!team) return 'Sin datos';
      const playersList = (team.players ?? [])
        .map(
          (p) =>
            `[dorsal=${p.number ?? 'S/N'}, player_id=${p.player_id}, nombre="${p.name}"]`
        )
        .join(', ');
      return `Equipo "${team.name}" (id=${team.id}): ${playersList || 'Sin jugadoras'}`;
    };

    if (targetTeamSide === 'home' && body.homeTeam) {
      rosterContextPrompt = `\n\nCATÁLOGO DE CÉDULA OFICIAL DEL EQUIPO LOCAL (team_side="home"):
${formatRoster(body.homeTeam)}
IMPORTANTE: Usa este catálogo SOLO para buscar los nombres e IDs de los dorsales que el usuario dicte. NO agregues al resultado jugadoras del catálogo que el usuario no haya mencionado.`;
    } else if (targetTeamSide === 'away' && body.awayTeam) {
      rosterContextPrompt = `\n\nCATÁLOGO DE CÉDULA OFICIAL DEL EQUIPO VISITANTE (team_side="away"):
${formatRoster(body.awayTeam)}
IMPORTANTE: Usa este catálogo SOLO para buscar los nombres e IDs de los dorsales que el usuario dicte. NO agregues al resultado jugadoras del catálogo que el usuario no haya mencionado.`;
    } else if (body.homeTeam || body.awayTeam) {
      rosterContextPrompt = `\n\nCATÁLOGO DE CÉDULA OFICIAL DEL PARTIDO:
- LOCAL (team_side="home"): ${formatRoster(body.homeTeam)}
- VISITANTE (team_side="away"): ${formatRoster(body.awayTeam)}
IMPORTANTE: NO agregues jugadoras del catálogo que no hayan sido mencionadas en el dictado.`;
    }

    const ai = new GoogleGenAI({ apiKey });

    let interactionInput: string | ModelInputItem[];

    if (audio?.base64) {
      const sanitizedBase64 = cleanAndSanitizeBase64(audio.base64);
      const sanitizedMime = sanitizeAudioMimeType(audio.mimeType);

      if (!sanitizedBase64) {
        return NextResponse.json(
          { error: 'El archivo de audio grabado no contiene datos válidos en base64.' },
          { status: 400 }
        );
      }

      interactionInput = [
        {
          type: 'text',
          text: `Escucha este audio de mesa de control de básquetbol.
1. Incluye en 'players' únicamente a las jugadoras nombradas en la asistencia o en los puntos (excluye a las que no fueron mencionadas).
2. Extrae el listado paso a paso de cada canasta en 'baskets_log'.
3. Suma los puntos exactos para cada dorsal.`,
        },
        {
          type: 'audio',
          data: sanitizedBase64,
          mime_type: sanitizedMime,
        },
      ];
    } else {
      interactionInput = `Dictado de básquetbol:\n"""\n${transcript}\n"""\nIncluye únicamente a las jugadoras mencionadas, extrae cada canasta en 'baskets_log' y suma los puntos por jugadora.`;
    }

    let outputText: string | null | undefined;
    let lastError: Error | null = null;

    for (const modelName of FALLBACK_MODELS) {
      try {
        const interaction = await ai.interactions.create({
          model: modelName,
          system_instruction: `${BASE_SYSTEM_INSTRUCTION}${rosterContextPrompt}`,
          input: interactionInput,
          response_format: {
            type: 'text',
            mime_type: 'application/json',
            schema: BOX_SCORE_JSON_SCHEMA,
          },
        });

        outputText = interaction.output_text;
        if (outputText) {
          break;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[API /api/parse-box-score] Intento con ${modelName} falló:`, lastError.message);
      }
    }

    if (!outputText) {
      const errMsg =
        lastError?.message ||
        'El modelo de IA no devolvió un JSON válido. Intenta procesar nuevamente.';
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    const parsedJson = JSON.parse(outputText) as {
      transcription_text?: string;
      baskets_log?: Array<{
        basket_index: number;
        player_number: number;
        action_text: string;
        points: number;
        is_triple: boolean;
      }>;
      teams?: Array<{
        team_name: string;
        team_side?: 'home' | 'away' | 'unknown';
        total_team_score: number;
        players: Array<{
          number: number | null;
          name: string;
          played?: boolean;
          points_1pt: number;
          points_2pt: number;
          points_3pt: number;
          total_points: number;
          matched_player_id?: number | null;
        }>;
      }>;
    };

    const fullTextForCheck = transcript || parsedJson.transcription_text || '';
    const log = Array.isArray(parsedJson.baskets_log) ? parsedJson.baskets_log : [];

    if (Array.isArray(parsedJson.teams)) {
      for (const team of parsedJson.teams) {
        if (!Array.isArray(team.players)) continue;

        let teamSum = 0;

        for (const player of team.players) {
          if (typeof player.number === 'number' && player.number >= 0 && log.length > 0) {
            const playerBaskets = log.filter((b) => b.player_number === player.number);

            if (playerBaskets.length > 0) {
              const p1 = playerBaskets
                .filter((b) => !b.is_triple && b.points === 1)
                .reduce((s, b) => s + b.points, 0);
              const p2 = playerBaskets
                .filter((b) => !b.is_triple && b.points === 2)
                .reduce((s, b) => s + b.points, 0);
              const p3 = playerBaskets
                .filter((b) => b.is_triple || b.points === 3)
                .reduce((s, b) => s + b.points, 0);

              player.points_1pt = p1;
              player.points_2pt = p2;
              player.points_3pt = p3;
              player.total_points = p1 + p2 + p3;
              player.played = true;
            }
          }

          if (typeof player.number === 'number' && player.number < 0) {
            player.number = null;
          }
          if (!player.matched_player_id || player.matched_player_id <= 0) {
            player.matched_player_id = null;
          }
          if (player.played === undefined) {
            player.played = true;
          }
        }

        // Filtrar jugadoras con 0 puntos que NO fueron mencionadas en el dictado (ej. la #22 ausente)
        team.players = team.players.filter((player) => {
          if (player.played === false) return false;
          if ((player.total_points || 0) > 0) return true;
          if (fullTextForCheck) {
            return wasZeroPointPlayerMentionedInText(player, fullTextForCheck);
          }
          return true;
        });

        for (const player of team.players) {
          teamSum += player.total_points || 0;
        }
        team.total_team_score = teamSum;
      }
    }

    return NextResponse.json(parsedJson, { status: 200 });
  } catch (error) {
    console.error('[API /api/parse-box-score] Error:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error interno al procesar las estadísticas por voz.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
