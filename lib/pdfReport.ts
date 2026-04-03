/**
 * lib/pdfReport.ts — Reporte de Elegibilidad en PDF
 * Usa jsPDF + jspdf-autotable (ya instalados)
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calcularPosiciones, MatchForStandings, TeamStats } from './standings';
import { elegibilidadLiguilla } from './liga';

interface StatRow {
  player_id: number;
  match_id: number;
  team_id: number;
  played: boolean;
  points: number;
  triples: number;
  players?: { id: number; name: string };
  matches?: { season_id: number };
}

export function generateEligibilityPDF(
  standings: TeamStats[],
  seasonMatches: any[],
  seasonName: string,
  allStats: StatRow[]
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const now = new Date();
  const fecha = now.toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const top8 = standings.slice(0, 8);

  // ── Pre-calculate Data ──────────────────────────────────────
  let globalJugadores = 0;
  let globalElegibles = 0;

  const teamData = top8.map(team => {
    const teamMatches = seasonMatches.filter(
      (m) => (m.home_team_id === team.id || m.away_team_id === team.id) &&
              ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status ?? '')
    );
    const totalPartidos = teamMatches.length;
    const minReq = elegibilidadLiguilla(totalPartidos);
    const teamMatchIds = new Set(teamMatches.map((m) => m.id));
    const asistMap: Record<number, { nombre: string; asistencias: number }> = {};
    
    for (const s of allStats) {
      // Usar comprobación holgada por si hay diferencias sutiles (string vs number)
      if (!teamMatchIds.has(s.match_id) || Number(s.team_id) !== Number(team.id) || !s.played) continue;
      const p = s.players;
      if (!p) continue;
      if (!asistMap[p.id]) asistMap[p.id] = { nombre: p.name, asistencias: 0 };
      asistMap[p.id].asistencias++;
    }

    const rows = Object.values(asistMap).sort((a, b) => b.asistencias - a.asistencias);
    const equipoElegibles = rows.filter(r => r.asistencias >= minReq).length;
    
    globalJugadores += rows.length;
    globalElegibles += equipoElegibles;

    return {
      team,
      totalPartidos,
      minReq,
      jugadoresCount: rows.length,
      elegiblesCount: equipoElegibles,
      rows
    };
  });

  // ── Header ───────────────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, 'F'); // White background
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LIGA MUNICIPAL DE BASQUETBOL DE NOCHIXTLAN', 105, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('REPORTE GENERAL DE ELEGIBILIDAD PARA LIGUILLA', 105, 21, { align: 'center' });
  
  // Thick Black Line
  doc.setLineWidth(0.8);
  doc.line(14, 24, 196, 24);

  // Meta info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de emision: ', 14, 32);
  doc.setFont('helvetica', 'normal');
  doc.text(fecha, 43, 32);

  doc.setFont('helvetica', 'bold');
  doc.text('Temporada: ', 14, 37);
  doc.setFont('helvetica', 'normal');
  doc.text(seasonName, 35, 37);

  doc.setFont('helvetica', 'bold');
  doc.text('Total de equipos: ', 14, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`${top8.length}`, 43, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('Total de jugadores en plantilla: ', 14, 47);
  doc.setFont('helvetica', 'normal');
  doc.text(`${globalJugadores}`, 64, 47);

  doc.setFont('helvetica', 'bold');
  doc.text('Total elegibles para Liguilla: ', 14, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`${globalElegibles} de ${globalJugadores}`, 60, 52);

  doc.setLineWidth(0.1);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 58, 196, 58);

  let y = 68;

  // ── Per-team eligibility ──────────────────────────────────
  for (const tData of teamData) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Equipo: ${tData.team.equipo}`, 14, y);

    // Subtle line under team name
    y += 3;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(14, y, 196, y);
    y += 5;

    // Sub info
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Partidos jugados: ${tData.totalPartidos} | Minimo requerido: ${tData.minReq} ( ⌊${tData.totalPartidos} / 2⌋ + 1 ) | Elegibles: ${tData.elegiblesCount} de ${tData.jugadoresCount}`,
      14, y
    );
    y += 4;

    const tableRows = tData.rows.map((p, i) => [
      `${i + 1}`,
      p.nombre,
      `${p.asistencias}`,
      `${tData.minReq}`,
      p.asistencias >= tData.minReq ? 'ELEGIBLE' : 'NO ELEGIBLE',
    ]);

    if (tableRows.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.text('Sin jugadores registrados.', 14, y + 5);
      y += 12;
    } else {
      autoTable(doc, {
        startY: y,
        head: [['#', 'Jugador', 'Asistencias', 'Minimo req.', 'Estatus']],
        body: tableRows,
        theme: 'grid',
        styles: { 
          fontSize: 8.5, 
          textColor: [0, 0, 0], 
          fillColor: [255, 255, 255],
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
          cellPadding: 3
        },
        headStyles: { 
          fillColor: [0, 0, 0], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 80 },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 26, halign: 'center' },
          4: { cellWidth: 40, halign: 'center', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.column.index === 4 && data.section === 'body') {
            const v = String(data.cell.raw);
            if (v === 'ELEGIBLE') {
              data.cell.styles.textColor = [34, 139, 34]; // Forest Green
            } else {
              data.cell.styles.textColor = [220, 38, 38]; // Red
            }
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 14;
    }
  }

  doc.save(`Elegibilidad_${seasonName.replace(/\s/g, '_')}.pdf`);
}
