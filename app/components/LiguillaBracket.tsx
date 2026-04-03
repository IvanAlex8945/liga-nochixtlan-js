'use client';

import React, { useState, useMemo } from 'react';
import { Typography } from 'antd';

const { Text, Title } = Typography;

export function LiguillaBracketTab({ seasonMatches }: { seasonMatches: any[] }) {
  const liguillaMatches = useMemo(() => {
    return seasonMatches.filter((m) => m.phase && m.phase !== 'Fase Regular');
  }, [seasonMatches]);

  if (liguillaMatches.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 64, filter: 'grayscale(1)', opacity: 0.2 }}>🏆</div>
        <Title level={4} style={{ color: '#FAAD14', marginTop: 16 }}>Esperando Liguilla</Title>
        <Text style={{ color: '#555', display: 'block' }}>Aún no hay encuentros de Liguilla definidos para esta temporada.</Text>
      </div>
    );
  }

  function groupSeries(matches: any[]) {
    const map: Record<string, any[]> = {};
    matches.forEach((m) => {
      const h = m.home_team_id || 0;
      const a = m.away_team_id || 0;
      const key = `${Math.min(h, a)}-${Math.max(h, a)}`;
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    // Sort series matches by jornada
    return Object.values(map).map(list => list.sort((a,b) => (a.jornada || 0) - (b.jornada || 0)));
  }

  const cuartos = groupSeries(liguillaMatches.filter((m) => m.phase === 'Cuartos de Final' || m.phase === 'Octavos de Final'));
  const semis = groupSeries(liguillaMatches.filter((m) => m.phase === 'Semifinal'));
  const final = groupSeries(liguillaMatches.filter((m) => m.phase === 'Final'));
  const tercero = groupSeries(liguillaMatches.filter((m) => m.phase === 'Tercer Lugar'));

  const BracketColumn = ({ title, seriesList, neonColor }: { title: string; seriesList: any[][], neonColor: string }) => (
    <div style={{ flex: '1 1 290px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ textAlign: 'center', paddingBottom: 12, marginBottom: 8, position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: 20, background: neonColor, filter: 'blur(30px)', opacity: 0.3, zIndex: 0 }} />
        <Text style={{ 
          color: '#fff', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, fontSize: 16,
          textShadow: `0 0 10px ${neonColor}88`, position: 'relative', zIndex: 1
        }}>
          {title}
        </Text>
        <div style={{ height: 2, width: '40%', background: `linear-gradient(90deg, transparent, ${neonColor}, transparent)`, margin: '8px auto 0' }} />
      </div>
      {seriesList.length === 0 ? (
        <div style={{ background: '#11111188', border: '1px dashed #333', borderRadius: 12, padding: 30, textAlign: 'center' }}>
          <Text style={{ color: '#444', fontSize: 13 }}>Por definir</Text>
        </div>
      ) : (
        seriesList.map((matchesGroup) => <SeriesBox key={matchesGroup[0].id} matches={matchesGroup} neonColor={neonColor} />)
      )}
    </div>
  );

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 40, paddingTop: 20 }}>
      {/* Horizontal container simulating an NBA Playoff bracket structure */}
      <div style={{ display: 'flex', gap: 40, minWidth: 900, padding: '10px 20px', alignItems: 'stretch' }}>
        <BracketColumn title="Cuartos de Final" seriesList={cuartos} neonColor="#1677ff" />
        <BracketColumn title="Semifinales" seriesList={semis} neonColor="#f5222d" />
        <BracketColumn title="La Gran Final" seriesList={[...final, ...tercero]} neonColor="#FAAD14" />
      </div>
    </div>
  );
}

function SeriesBox({ matches, neonColor }: { matches: any[], neonColor: string }) {
  const [hovered, setHovered] = useState(false);
  
  // Extract canonical teams from the first match
  const tA_id = matches[0].home_team_id;
  const tB_id = matches[0].away_team_id;
  const tA_name = matches[0].home_team?.name ?? 'Por definir';
  const tB_name = matches[0].away_team?.name ?? 'Por definir';
  const phase = matches[0].phase;
  
  let winsA = 0;
  let winsB = 0;
  
  matches.forEach(m => {
    const isJugado = ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status);
    if (!isJugado) return;
    
    let homeWon = (m.home_score ?? 0) > (m.away_score ?? 0) || m.status === 'WO Visitante';
    let awayWon = (m.away_score ?? 0) > (m.home_score ?? 0) || m.status === 'WO Local';
    
    if (m.home_team_id === tA_id && homeWon) winsA++;
    if (m.away_team_id === tA_id && awayWon) winsA++;
    if (m.home_team_id === tB_id && homeWon) winsB++;
    if (m.away_team_id === tB_id && awayWon) winsB++;
  });

  const seriesWonA = winsA > winsB && winsA > (matches.length / 2);
  const seriesWonB = winsB > winsA && winsB > (matches.length / 2);

  const getDots = (w: number) => {
    return Array.from({ length: w }).map((_, i) => <span key={i} style={{ fontSize: 10, margin: '0 2px' }}>🔥</span>);
  };

  const containerStyle: React.CSSProperties = {
    background: 'linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)',
    border: hovered ? `1px solid ${neonColor}` : `1px solid #333`,
    borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative',
    boxShadow: hovered ? `0 8px 32px ${neonColor}44` : `0 8px 24px rgba(0,0,0,0.6)`,
    transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
    transition: 'all 0.3s ease', cursor: 'pointer',
  };

  const TeamRow = ({ name, wins, isOverallWinner, isOverallLoser }: { name: string; wins: number; isOverallWinner: boolean; isOverallLoser: boolean }) => (
    <div style={{ 
      display: 'flex', justifyContent: 'space-between', padding: '12px 16px', alignItems: 'center',
      background: isOverallWinner ? `linear-gradient(90deg, ${neonColor}22 0%, transparent 100%)` : 'transparent',
      borderLeft: isOverallWinner ? `4px solid ${neonColor}` : '4px solid transparent',
      transition: 'all 0.2s', opacity: isOverallLoser ? 0.5 : 1
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Text style={{ 
          color: isOverallWinner ? '#fff' : (isOverallLoser ? '#666' : '#bbb'), 
          fontWeight: isOverallWinner ? 800 : 500, fontSize: 14,
          textShadow: isOverallWinner ? `0 0 10px ${neonColor}55` : 'none'
        }}>
          {name}
        </Text>
        <div style={{ height: 14, display: 'flex' }}>
          {getDots(wins)}
        </div>
      </div>
      <div style={{ 
        background: isOverallWinner ? neonColor : '#222', color: isOverallWinner ? '#000' : '#888', 
        padding: '2px 8px', borderRadius: 4, fontWeight: 800, fontSize: 16, minWidth: 28, textAlign: 'center',
        boxShadow: isOverallWinner ? `0 0 8px ${neonColor}` : 'none'
      }}>
        {wins}
      </div>
    </div>
  );

  return (
    <div style={containerStyle} onMouseOver={() => setHovered(true)} onMouseOut={() => setHovered(false)}>
      <div style={{ background: '#000000dd', padding: '6px 12px', fontSize: 11, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222' }}>
        <span style={{ color: '#aaa', fontWeight: 600 }}>{matches.length > 1 ? `SERIE AL MEJOR DE ${matches.length}` : 'PARTIDO ÚNICO'}</span>
        {phase === 'Tercer Lugar' && <span style={{ color: '#1677ff', fontWeight: 800 }}>3ER LUGAR</span>}
        {phase === 'Final' && <span style={{ color: '#FAAD14', fontWeight: 900 }}>🏆 GRAN FINAL</span>}
      </div>
      
      <TeamRow name={tA_name} wins={winsA} isOverallWinner={seriesWonA} isOverallLoser={seriesWonB} />
      <div style={{ height: 1, background: '#222', margin: '0 16px' }} />
      <TeamRow name={tB_name} wins={winsB} isOverallWinner={seriesWonB} isOverallLoser={seriesWonA} />

      {/* Renders Individual matches dropdown on hover */}
      {hovered && (
        <div style={{ background: '#111', borderTop: '1px solid #333', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Text style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>Resultados por Juego</Text>
          {matches.map((m, i) => {
             const mIsJugado = ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status);
             return (
               <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', background: '#000', padding: '4px 8px', borderRadius: 4 }}>
                 <span>Juego {i + 1} <span style={{ color: '#555', fontSize: 9 }}>(J{m.jornada})</span></span>
                 {mIsJugado ? (
                   <span style={{ color: '#fff', fontWeight: 500 }}>{m.home_team?.name} {m.home_score} - {m.away_score} {m.away_team?.name}</span>
                 ) : (
                   <span style={{ color: '#666' }}>Programado</span>
                 )}
               </div>
             )
          })}
        </div>
      )}
    </div>
  );
}
