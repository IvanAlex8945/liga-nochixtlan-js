'use client';

// regenerator-runtime es requerido por react-speech-recognition
import 'regenerator-runtime/runtime';
import React, { useEffect, useRef, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { App } from 'antd';

// Cliente oficial de Supabase del proyecto y función de persistencia de partidos
import { supabase } from '@/lib/supabase';
import { saveMatchResult, type ResultType } from '@/lib/saveMatch';
import { invalidatePublicCache } from '@/lib/public-cache-client';
import type { PlayerRow } from './PlayerAttendanceTable';
import {
  applyReconciledItemsToLineup,
  buildMatchReconciliationReport,
  type ParsedBoxScoreResponse,
  type ReconciledPlayerItem,
  type TeamReconciliationReport,
} from '@/lib/voice-box-score';

interface MatchContext {
  id: number;
  home_team: { id: number; name: string };
  away_team: { id: number; name: string };
}

interface DictadoEstadisticasProps {
  seasonId?: number | null;
  match: MatchContext;
  homePlayers: PlayerRow[];
  awayPlayers: PlayerRow[];
  resultType?: ResultType;
  /** Callback para volcar los puntos ya conciliados a las tablas de CaptureForm */
  onApplyToTables: (nextHome: PlayerRow[], nextAway: PlayerRow[]) => void;
  /** Callback opcional cuando se guarda directamente en Supabase desde este componente */
  onSavedDirect?: () => void;
}

export default function DictadoEstadisticas({
  seasonId = null,
  match,
  homePlayers,
  awayPlayers,
  resultType = 'Normal',
  onApplyToTables,
  onSavedDirect,
}: DictadoEstadisticasProps) {
  const { message } = App.useApp();
  const [expanded, setExpanded] = useState<boolean>(true);
  const [manualTranscript, setManualTranscript] = useState<string>('');
  const [boxScoreData, setBoxScoreData] = useState<ParsedBoxScoreResponse | null>(null);
  const [homeReport, setHomeReport] = useState<TeamReconciliationReport | null>(null);
  const [awayReport, setAwayReport] = useState<TeamReconciliationReport | null>(null);
  const [applyMode, setApplyMode] = useState<'replace' | 'merge'>('replace');

  // Selector de equipo objetivo: 'home', 'away', o 'both'
  const [targetTeam, setTargetTeam] = useState<'home' | 'away' | 'both'>('home');

  const [procesandoIA, setProcesandoIA] = useState<boolean>(false);
  const [guardandoBD, setGuardandoBD] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Grabación nativa de audio con MediaRecorder
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Web Speech Recognition
  const {
    transcript,
    listening: webSpeechListening,
    resetTranscript,
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setManualTranscript(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    detenerCualquierGrabacion();
    resetTranscript();
    setManualTranscript('');
    setBoxScoreData(null);
    setHomeReport(null);
    setAwayReport(null);
    setErrorMsg(null);
  }, [match.id, resetTranscript]);

  const detenerCualquierGrabacion = () => {
    if (webSpeechListening) {
      SpeechRecognition.stopListening();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecordingAudio(false);
    setRecordingSeconds(0);
  };

  const iniciarGrabacionAudio = async () => {
    setErrorMsg(null);
    detenerCualquierGrabacion();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(250);
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Error al acceder al micrófono:', err);
      setErrorMsg(
        'No se pudo acceder al micrófono. Asegúrate de dar permiso de micrófono en tu navegador.'
      );
    }
  };

  const detenerGrabacionYProcesar = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      recorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecordingAudio(false);

      const mimeType = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      if (audioBlob.size === 0) {
        setErrorMsg('El audio grabado quedó vacío. Intenta de nuevo.');
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        await ejecutarLlamadaIA({
          audio: {
            base64: base64Data,
            mimeType,
          },
        });
      };
    };

    recorder.stop();
  };

  const cancelarGrabacion = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current.stop();
    }
    detenerCualquierGrabacion();
  };

  const limpiarTodo = () => {
    detenerCualquierGrabacion();
    resetTranscript();
    setManualTranscript('');
    setBoxScoreData(null);
    setHomeReport(null);
    setAwayReport(null);
    setErrorMsg(null);
  };

  const cargarEjemploDeDictado = () => {
    let ejemplo = '';
    if (targetTeam === 'home') {
      const p12 = homePlayers.find((p) => p.number === 12) || homePlayers[0];
      const p7 = homePlayers.find((p) => p.number === 7) || homePlayers[1];
      const p9 = homePlayers.find((p) => p.number === 9) || homePlayers[2];
      ejemplo = `Vamos primero con la asistencia de ${match.home_team.name}: la ${p12?.number ?? 12}, la ${p7?.number ?? 7} y la ${p9?.number ?? 9}. Ahora vamos con los puntos: Dos puntos para la ${p12?.number ?? 12}. Dos puntos para la ${p12?.number ?? 12}. Un punto para la ${p12?.number ?? 12}. Dos puntos para la ${p7?.number ?? 7}. Tres puntos para la ${p9?.number ?? 9}.`;
    } else if (targetTeam === 'away') {
      const a7 = awayPlayers.find((p) => p.number === 7) || awayPlayers[0];
      const a12 = awayPlayers.find((p) => p.number === 12) || awayPlayers[1];
      const a9 = awayPlayers.find((p) => p.number === 9) || awayPlayers[2];
      ejemplo = `Vamos primero con la asistencia de ${match.away_team.name}: la ${a7?.number ?? 7}, la ${a12?.number ?? 12} y la ${a9?.number ?? 9}. Ahora vamos con los puntos: Dos puntos para la ${a12?.number ?? 12}. Dos puntos para la ${a7?.number ?? 7}. Tres puntos para la ${a9?.number ?? 9}. Un punto para la ${a7?.number ?? 7}.`;
    } else {
      ejemplo = `Asistencia de ${match.home_team.name}: la 12, la 7 y la 9. Puntos de ${match.home_team.name}: Dos puntos para la 12, un punto para la 12, tres puntos para la 9. Asistencia de ${match.away_team.name}: la 7 y la 12. Puntos de ${match.away_team.name}: Dos puntos para la 7, tres puntos para la 7.`;
    }

    setManualTranscript(ejemplo);
    setErrorMsg(null);
  };

  const fetchConReintento = async (url: string, options: RequestInit, intentos = 3): Promise<Response> => {
    for (let i = 0; i < intentos; i++) {
      try {
        return await fetch(url, options);
      } catch (err) {
        const esUltimoIntento = i === intentos - 1;
        if (esUltimoIntento) throw err;
        // Espera breve si el servidor de desarrollo está recompilando (Hot Reload)
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
      }
    }
    throw new Error('No se pudo conectar con el servidor local.');
  };

  const ejecutarLlamadaIA = async (payload: {
    transcript?: string;
    audio?: { base64: string; mimeType: string };
  }) => {
    setProcesandoIA(true);
    setErrorMsg(null);

    try {
      const response = await fetchConReintento('/api/parse-box-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          targetTeamSide: targetTeam,
          homeTeam: {
            id: match.home_team.id,
            name: match.home_team.name,
            players: homePlayers.map((p) => ({
              player_id: p.player_id,
              name: p.name,
              number: p.number,
            })),
          },
          awayTeam: {
            id: match.away_team.id,
            name: match.away_team.name,
            players: awayPlayers.map((p) => ({
              player_id: p.player_id,
              name: p.name,
              number: p.number,
            })),
          },
        }),
      });

      const data = (await response.json()) as ParsedBoxScoreResponse & {
        transcription_text?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo procesar el dictado con IA.');
      }

      if (data.transcription_text) {
        setManualTranscript(data.transcription_text);
      }

      setBoxScoreData(data);

      const { homeReport: nextHome, awayReport: nextAway } = buildMatchReconciliationReport(
        data,
        match.home_team,
        match.away_team,
        homePlayers,
        awayPlayers
      );

      // Si se dictó un equipo específico, conservamos el reporte del otro si ya existía
      if (targetTeam === 'home') {
        setHomeReport(nextHome);
      } else if (targetTeam === 'away') {
        setAwayReport(nextAway);
      } else {
        setHomeReport(nextHome);
        setAwayReport(nextAway);
      }

      message.success('✨ Dictado procesado y acumulado por jugadora con éxito.');
    } catch (error) {
      console.warn('[DictadoEstadisticas] Aviso al procesar con IA:', error);
      const rawMessage = error instanceof Error ? error.message : '';
      const friendlyMessage =
        rawMessage.includes('Failed to fetch') || rawMessage.includes('NetworkError')
          ? 'El servidor local se estaba actualizando. Por favor vuelve a presionar "Procesar Texto con IA" o recarga la página (F5).'
          : rawMessage || 'Ocurrió un error al estructurar las estadísticas con IA.';
      setErrorMsg(friendlyMessage);
    } finally {
      setProcesandoIA(false);
    }
  };

  const procesarTextoConIA = () => {
    const texto = manualTranscript.trim();
    if (!texto) {
      setErrorMsg('Dicta o escribe el resumen antes de procesar con IA.');
      return;
    }
    ejecutarLlamadaIA({ transcript: texto });
  };

  const updateReconciledItem = (
    side: 'home' | 'away',
    key: string,
    patch: Partial<ReconciledPlayerItem>
  ) => {
    const updater = (prev: TeamReconciliationReport | null): TeamReconciliationReport | null => {
      if (!prev) return null;
      const updatedItems = prev.items.map((item) => {
        if (item.key !== key) return item;
        return { ...item, ...patch };
      });
      const calculatedPlayersSum = updatedItems.reduce(
        (sum, item) => sum + (item.ignored ? 0 : Number(item.totalPoints) || 0),
        0
      );
      return {
        ...prev,
        items: updatedItems,
        calculatedPlayersSum,
      };
    };

    if (side === 'home') {
      setHomeReport(updater);
    } else {
      setAwayReport(updater);
    }
  };

  const allItems = [...(homeReport?.items ?? []), ...(awayReport?.items ?? [])];
  const exactCount = allItems.filter(
    (i) => !i.ignored && i.status === 'exact' && i.assignedPlayerId !== null
  ).length;
  const discrepancyCount = allItems.filter(
    (i) => !i.ignored && i.status === 'discrepancy' && i.assignedPlayerId !== null
  ).length;
  const unresolvedCount = allItems.filter(
    (i) => !i.ignored && i.assignedPlayerId === null
  ).length;

  const aplicarPuntosALaTabla = () => {
    if (!homeReport && !awayReport) return;

    if (unresolvedCount > 0) {
      setErrorMsg(
        `Aún tienes ${unresolvedCount} jugadora(s) en ROJO sin asignar a la cédula. Asígnalas o márcalas como "Ignorar" antes de aplicar.`
      );
      return;
    }

    const nextHome = homeReport
      ? applyReconciledItemsToLineup(homePlayers, homeReport.items, applyMode)
      : homePlayers;
    const nextAway = awayReport
      ? applyReconciledItemsToLineup(awayPlayers, awayReport.items, applyMode)
      : awayPlayers;

    onApplyToTables(nextHome, nextAway);
    setErrorMsg(null);
    message.success('✅ Puntos y triples aplicados a la tabla de captura.', 5);
  };

  const guardarEnBaseDeDatos = async () => {
    if (!homeReport && !awayReport) {
      setErrorMsg('Primero procesa el dictado con IA y revisa el reporte.');
      return;
    }

    if (unresolvedCount > 0) {
      setErrorMsg(
        `No se puede guardar aún: hay ${unresolvedCount} jugadora(s) con número no encontrado en la cédula. Asígnalas o ignóralas primero.`
      );
      return;
    }

    setGuardandoBD(true);
    setErrorMsg(null);

    try {
      const nextHome = homeReport
        ? applyReconciledItemsToLineup(homePlayers, homeReport.items, applyMode)
        : homePlayers;
      const nextAway = awayReport
        ? applyReconciledItemsToLineup(awayPlayers, awayReport.items, applyMode)
        : awayPlayers;

      onApplyToTables(nextHome, nextAway);

      await saveMatchResult(
        supabase,
        match.id,
        resultType,
        nextHome.map((r) => ({
          player_id: r.player_id,
          team_id: r.team_id,
          played: r.played,
          points: r.played ? Number(r.points) || 0 : 0,
          triples: r.played ? Number(r.triples) || 0 : 0,
        })),
        nextAway.map((r) => ({
          player_id: r.player_id,
          team_id: r.team_id,
          played: r.played,
          points: r.played ? Number(r.points) || 0 : 0,
          triples: r.played ? Number(r.triples) || 0 : 0,
        }))
      );

      await invalidatePublicCache({ seasonId });

      window.alert('✅ ¡Estadísticas validadas y guardadas correctamente en Supabase!');
      limpiarTodo();
      onSavedDirect?.();
    } catch (error) {
      console.warn('[DictadoEstadisticas] Error al guardar en Supabase:', error);
      setErrorMsg(
        error instanceof Error ? error.message : 'Error al guardar las estadísticas en Supabase.'
      );
    } finally {
      setGuardandoBD(false);
    }
  };

  const renderTeamReconciliationCard = (
    report: TeamReconciliationReport,
    roster: PlayerRow[],
    icon: string
  ) => {
    const scoreDiff = report.calculatedPlayersSum - report.dictatedTeamTotalScore;

    const assignedCounts = new Map<number, number>();
    for (const item of report.items) {
      if (!item.ignored && item.assignedPlayerId) {
        assignedCounts.set(
          item.assignedPlayerId,
          (assignedCounts.get(item.assignedPlayerId) ?? 0) + 1
        );
      }
    }

    return (
      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 bg-neutral-900/90 px-4 py-3">
          <div>
            <div className="text-base font-bold text-white">
              {icon} {report.officialTeamName}
            </div>
            <div className="text-xs text-neutral-400">
              Detectado en voz como: <span className="text-neutral-300">{report.dictatedTeamName}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
              Suma Jugadoras: {report.calculatedPlayersSum} pts
            </span>
            {report.dictatedTeamTotalScore > 0 && report.dictatedTeamTotalScore !== report.calculatedPlayersSum && (
              <span className="rounded-lg px-2.5 py-1 text-xs font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30">
                Total narrado: {report.dictatedTeamTotalScore} pts ({scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} pts)
              </span>
            )}
          </div>
        </div>

        {report.items.length === 0 ? (
          <div className="p-6 text-center text-sm text-neutral-500">
            No se mencionaron jugadoras con puntos para este equipo en el dictado.
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/80">
            {report.items.map((item) => {
              const isResolved = item.ignored || item.assignedPlayerId !== null;
              const isDuplicate =
                !item.ignored &&
                item.assignedPlayerId !== null &&
                (assignedCounts.get(item.assignedPlayerId) ?? 0) > 1;

              let rowBg = 'bg-neutral-950';
              let badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
              let badgeText = '🟢 Encontrada en cédula';

              if (item.ignored) {
                rowBg = 'bg-neutral-950/40 opacity-60';
                badgeClass = 'bg-neutral-700/40 text-neutral-400 border-neutral-600';
                badgeText = '⚪ Ignorada';
              } else if (!isResolved) {
                rowBg = 'bg-red-950/25';
                badgeClass = 'bg-red-500/20 text-red-300 border-red-500/40';
                badgeText = '🔴 Dorsal NO existe en cédula';
              } else if (item.status === 'discrepancy') {
                rowBg = 'bg-amber-950/20';
                badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                badgeText = '🟡 Revisar número/nombre';
              }

              return (
                <div key={item.key} className={`p-3.5 transition ${rowBg}`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1 lg:max-w-[38%]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-neutral-800 px-2 py-0.5 font-mono text-xs font-bold text-amber-400">
                          Dictado: #{item.dictatedNumber ?? 'S/N'}
                        </span>
                        <span className="font-semibold text-white">{item.dictatedName}</span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}
                        >
                          {badgeText}
                        </span>
                      </div>
                      <p className="text-xs leading-snug text-neutral-400">{item.statusReason}</p>
                      {isDuplicate && (
                        <p className="text-xs font-medium text-amber-400">
                          ℹ️ Esta jugadora aparece más de una vez en el dictado; sus puntos se sumarán automáticamente.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-center">
                        <span className="block text-[10px] text-neutral-500">1PT (Tiros L.)</span>
                        <span className="font-mono font-semibold text-neutral-200">
                          {item.points1pt}
                        </span>
                      </div>
                      <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-center">
                        <span className="block text-[10px] text-neutral-500">2PT (Dobles)</span>
                        <span className="font-mono font-semibold text-neutral-200">
                          {item.points2pt}
                        </span>
                      </div>
                      <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-center">
                        <span className="block text-[10px] text-neutral-500">3PT (pts)</span>
                        <span className="font-mono font-semibold text-neutral-200">
                          {item.points3pt}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-semibold text-amber-400">
                          Puntos Totales
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          disabled={item.ignored}
                          value={item.totalPoints}
                          onChange={(e) =>
                            updateReconciledItem(report.side, item.key, {
                              totalPoints: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-16 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-center font-mono text-sm font-bold text-emerald-400 focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-[10px] font-semibold text-sky-400">
                          Triples (#)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          disabled={item.ignored}
                          value={item.triplesCount}
                          onChange={(e) =>
                            updateReconciledItem(report.side, item.key, {
                              triplesCount: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="w-16 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-center font-mono text-sm font-bold text-sky-300 focus:border-sky-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 lg:w-[300px]">
                      <label className="text-[11px] font-semibold text-neutral-400">
                        Asignar en cédula oficial a:
                      </label>
                      <select
                        value={
                          item.ignored
                            ? 'IGNORE'
                            : item.assignedPlayerId !== null
                              ? String(item.assignedPlayerId)
                              : ''
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'IGNORE') {
                            updateReconciledItem(report.side, item.key, {
                              ignored: true,
                              assignedPlayerId: null,
                            });
                          } else if (val === '') {
                            updateReconciledItem(report.side, item.key, {
                              ignored: false,
                              assignedPlayerId: null,
                            });
                          } else {
                            const chosenId = Number(val);
                            const chosenPlayer = roster.find((r) => r.player_id === chosenId);
                            updateReconciledItem(report.side, item.key, {
                              ignored: false,
                              assignedPlayerId: chosenId,
                              status:
                                chosenPlayer &&
                                item.dictatedNumber !== null &&
                                Number(chosenPlayer.number) === item.dictatedNumber
                                  ? 'exact'
                                  : 'discrepancy',
                              statusReason: chosenPlayer
                                ? `Asignada manualmente en cédula a #${chosenPlayer.number ?? 'S/N'} ${chosenPlayer.name}.`
                                : item.statusReason,
                            });
                          }
                        }}
                        className={`w-full rounded-lg border px-2.5 py-2 text-xs font-medium transition focus:outline-none ${
                          item.ignored
                            ? 'border-neutral-700 bg-neutral-900 text-neutral-400'
                            : item.assignedPlayerId === null
                              ? 'border-red-500 bg-red-950/50 text-red-200 ring-1 ring-red-500/50'
                              : 'border-emerald-600/50 bg-neutral-900 text-white'
                        }`}
                      >
                        <option value="">
                          -- ⚠️ Seleccionar jugadora de la cédula --
                        </option>
                        {roster.map((player) => (
                          <option key={player.player_id} value={String(player.player_id)}>
                            #{player.number ?? 'S/N'} — {player.name}
                          </option>
                        ))}
                        <option value="IGNORE">🚫 Ignorar esta fila (no aplicar puntos)</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="mb-5 rounded-xl border border-amber-500/30 bg-neutral-900/95 text-neutral-100 shadow-lg">
      <div
        onClick={() => setExpanded((prev) => !prev)}
        className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-neutral-800/60"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-lg">
            🎙️
          </span>
          <div>
            <h3 className="text-sm font-bold text-amber-400 sm:text-base">
              Dictado Canasta por Canasta (&quot;2 de la 12, 1 de la 7, triple de la 9&quot;)
            </h3>
            <p className="text-xs text-neutral-400">
              Dicta tal cual la hoja arbitral. Puedes capturar equipo por equipo para máxima precisión.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRecordingAudio && (
            <span className="flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/25 px-3 py-1 text-xs font-bold text-red-200 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Grabando Audio ({formatSeconds(recordingSeconds)})
            </span>
          )}
          <span className="rounded-md bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-neutral-300">
            {expanded ? '▲ Ocultar asistente' : '▼ Abrir asistente de voz'}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-neutral-800 p-4 sm:p-5">
          {/* SELECTOR DE EQUIPO A DICTAR (Recomendado dictar 1 a la vez) */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              ¿A qué equipo vas a dictar?:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTargetTeam('home')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  targetTeam === 'home'
                    ? 'bg-amber-500 text-black shadow'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                🏠 Solo Local ({match.home_team.name})
              </button>
              <button
                type="button"
                onClick={() => setTargetTeam('away')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  targetTeam === 'away'
                    ? 'bg-amber-500 text-black shadow'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                ✈️ Solo Visita ({match.away_team.name})
              </button>
              <button
                type="button"
                onClick={() => setTargetTeam('both')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  targetTeam === 'both'
                    ? 'bg-amber-500 text-black shadow'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                🤝 Ambos Equipos
              </button>
            </div>
          </div>

          {/* BOTONERA PRINCIPAL */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {!isRecordingAudio ? (
              <button
                type="button"
                onClick={iniciarGrabacionAudio}
                disabled={procesandoIA || guardandoBD}
                className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-xs font-bold text-white shadow transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
              >
                🎙️ Grabar Audio (Vivaldi/Universal)
              </button>
            ) : (
              <button
                type="button"
                onClick={detenerGrabacionYProcesar}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-extrabold text-white shadow-lg animate-pulse hover:bg-emerald-500 sm:text-sm"
              >
                ⏹ Terminar y Procesar ({formatSeconds(recordingSeconds)})
              </button>
            )}

            {isRecordingAudio ? (
              <button
                type="button"
                onClick={cancelarGrabacion}
                className="flex items-center justify-center gap-2 rounded-lg bg-neutral-700 px-3 py-2.5 text-xs font-bold text-neutral-200 transition hover:bg-neutral-600 sm:text-sm"
              >
                ✖ Cancelar
              </button>
            ) : (
              <button
                type="button"
                onClick={limpiarTodo}
                disabled={procesandoIA || guardandoBD}
                className="flex items-center justify-center gap-2 rounded-lg bg-neutral-700 px-3 py-2.5 text-xs font-bold text-neutral-200 transition hover:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
              >
                🗑️ Limpiar
              </button>
            )}

            <button
              type="button"
              onClick={procesarTextoConIA}
              disabled={!manualTranscript.trim() || isRecordingAudio || procesandoIA || guardandoBD}
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white shadow transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm col-span-2 sm:col-span-2"
            >
              {procesandoIA ? '⏳ Sumando jugadas con Gemini...' : '✨ Procesar Texto con IA'}
            </button>
          </div>

          {isRecordingAudio && (
            <div className="flex items-center justify-between rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-200 sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 animate-ping rounded-full bg-red-500" />
                <span>
                  <strong>Grabando para {targetTeam === 'home' ? match.home_team.name : targetTeam === 'away' ? match.away_team.name : 'ambos'}:</strong> Dicta tal cual: <em>&quot;2 de la 12, 2 de la 12, 1 de la 12, triple de la 9...&quot;</em>. Al terminar presiona el botón verde.
                </span>
              </div>
              <span className="font-mono text-base font-bold text-red-300">
                {formatSeconds(recordingSeconds)}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Transcripción literal o edición manual
              </label>
              <button
                type="button"
                onClick={cargarEjemploDeDictado}
                disabled={isRecordingAudio || procesandoIA}
                className="text-xs font-medium text-amber-400 underline-offset-2 hover:underline disabled:opacity-50"
              >
                📋 Probar con ejemplo de jugadas (&quot;2 de la 12, 1 de la 7, triple de la 9&quot;)
              </button>
            </div>

            <textarea
              rows={3}
              value={manualTranscript}
              disabled={isRecordingAudio}
              onChange={(e) => setManualTranscript(e.target.value)}
              placeholder={`Ejemplo: "2 de la 12, 2 de la 12, 2 de la 12, 1 de la 12, un triple de la 9, 2 de la 7..."`}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3.5 text-sm leading-relaxed text-neutral-100 placeholder-neutral-500 focus:border-amber-400 focus:outline-none disabled:opacity-60"
            />
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs font-medium text-red-200 sm:text-sm">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* REPORTE SEMÁFORO DE CONCILIACIÓN */}
          {(homeReport || awayReport) && (
            <div className="space-y-4 border-t border-neutral-800 pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
                  <div className="text-xs font-semibold text-emerald-400">
                    🟢 Encontradas en Cédula
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-white">{exactCount}</div>
                  <div className="text-[11px] text-neutral-400">
                    Dorsales encontrados y acumulados
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
                  <div className="text-xs font-semibold text-amber-400">
                    🟡 Discrepancias
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-white">{discrepancyCount}</div>
                  <div className="text-[11px] text-neutral-400">
                    Reasignadas o número distinto
                  </div>
                </div>

                <div
                  className={`rounded-xl border p-3 ${
                    unresolvedCount > 0
                      ? 'border-red-500/60 bg-red-950/30'
                      : 'border-neutral-800 bg-neutral-950/50'
                  }`}
                >
                  <div
                    className={`text-xs font-semibold ${
                      unresolvedCount > 0 ? 'text-red-400' : 'text-neutral-400'
                    }`}
                  >
                    🔴 Sin Encontrar en Cédula
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-white">{unresolvedCount}</div>
                  <div className="text-[11px] text-neutral-400">
                    {unresolvedCount > 0
                      ? 'Dorsales de árbitro no registrados'
                      : 'Todo vinculado'}
                  </div>
                </div>
              </div>

              {unresolvedCount > 0 ? (
                <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-3.5 text-xs text-red-200 sm:text-sm">
                  <strong>🚨 Atención:</strong> Hay <strong>{unresolvedCount}</strong> dorsal(es) que no existen en la cédula. Selecciona la jugadora en la fila roja o márcala como ignorar.
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/25 p-3.5 text-xs text-emerald-200 sm:text-sm">
                  <strong>✅ Acumulación completa:</strong> Revisa la suma acumulada de cada jugadora abajo y presiona <strong>&quot;Pasar Puntos a la Tabla de Captura&quot;</strong>.
                </div>
              )}

              <div className="space-y-4">
                {homeReport && renderTeamReconciliationCard(homeReport, homePlayers, '🏠')}
                {awayReport && renderTeamReconciliationCard(awayReport, awayPlayers, '✈️')}
              </div>

              <div className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300">
                  <span className="font-semibold text-neutral-400">Modo al aplicar:</span>
                  <label className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio"
                      name="applyMode"
                      checked={applyMode === 'replace'}
                      onChange={() => setApplyMode('replace')}
                      className="accent-amber-500"
                    />
                    <span>Reemplazar tabla con este dictado</span>
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio"
                      name="applyMode"
                      checked={applyMode === 'merge'}
                      onChange={() => setApplyMode('merge')}
                      className="accent-amber-500"
                    />
                    <span>Sumar a los puntos existentes</span>
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={aplicarPuntosALaTabla}
                    disabled={unresolvedCount > 0 || guardandoBD}
                    className="rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-black shadow transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                  >
                    📥 Pasar Puntos a la Tabla de Captura
                  </button>

                  <button
                    type="button"
                    onClick={guardarEnBaseDeDatos}
                    disabled={unresolvedCount > 0 || guardandoBD}
                    className="rounded-lg border border-emerald-500/50 bg-emerald-600/20 px-4 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                  >
                    {guardandoBD ? '💾 Guardando...' : '💾 Guardar Directo en Supabase'}
                  </button>
                </div>
              </div>

              {boxScoreData && (
                <details className="rounded-lg border border-neutral-800 bg-neutral-950 p-2.5">
                  <summary className="cursor-pointer text-xs font-semibold text-neutral-500 hover:text-neutral-300">
                    Ver JSON crudo devuelto por Gemini
                  </summary>
                  <pre className="mt-2 max-h-60 overflow-auto rounded bg-black/70 p-3 text-[11px] text-emerald-300">
                    {JSON.stringify(boxScoreData, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
