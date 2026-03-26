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
    day: '2-digit', month: 'long', year: 'numeric', weekday: 'long',
  });

  // Limit to top 8 teams (per requirement)
  const top8 = standings.slice(0, 8);
  const matchIds = new Set(seasonMatches.map((m) => m.id));

  // ── Header ───────────────────────────────────────────────
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(250, 173, 20);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Liga Municipal de Básquetbol – Nochixtlán', 105, 10, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(200, 200, 200);
  doc.text('REPORTE DE ELEGIBILIDAD DE LIGUILLA', 105, 17, { align: 'center' });

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Temporada: ${seasonName}`, 14, 30);
  doc.text(`Fecha: ${fecha}`, 14, 36);
  doc.text(`Fórmula: Mínimo = ⌊Total de Partidos ÷ 2⌋ + 1`, 14, 42);
  doc.text(`Clasificados a liguilla: Primeros 8 equipos`, 14, 48);

  let y = 56;

  // ── Per-team eligibility ──────────────────────────────────
  for (let ti = 0; ti < top8.length; ti++) {
    const team = top8[ti];

    // Count team's played matches
    const teamMatches = seasonMatches.filter(
      (m) => (m.home_team_id === team.id || m.away_team_id === team.id) &&
              ['Jugado', 'WO Local', 'WO Visitante', 'WO Doble'].includes(m.status ?? '')
    );
    const totalPartidos = teamMatches.length;
    const minReq = elegibilidadLiguilla(totalPartidos);

    // Player attendance for this team's matches
    const teamMatchIds = new Set(teamMatches.map((m) => m.id));
    const asistMap: Record<number, { nombre: string; asistencias: number }> = {};
    for (const s of allStats) {
      if (!teamMatchIds.has(s.match_id) || s.team_id !== team.id || !s.played) continue;
      const p = s.players;
      if (!p) continue;
      if (!asistMap[p.id]) asistMap[p.id] = { nombre: p.name, asistencias: 0 };
      asistMap[p.id].asistencias++;
    }

    const rows = Object.values(asistMap)
      .sort((a, b) => b.asistencias - a.asistencias)
      .map((p) => [
        p.nombre,
        `${p.asistencias}`,
        `${minReq}`,
        p.asistencias >= minReq ? '✓ Elegible' : '✗ No elegible',
      ]);

    if (y > 240) {
      doc.addPage();
      y = 14;
    }

    // Team title bar
    doc.setFillColor(30, 30, 30);
    doc.rect(14, y - 4, 182, 9, 'F');
    doc.setTextColor(250, 173, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${ti + 1}° ${team.equipo}`, 16, y + 2);
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `PJ: ${team.PJ} | PG: ${team.PG} | Pts: ${team.Pts} | Mínimo: ${minReq} partidos`,
      120, y + 2
    );
    y += 8;

    if (rows.length === 0) {
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(8);
      doc.text('Sin estadísticas de asistencia registradas', 16, y + 4);
      y += 12;
    } else {
      autoTable(doc, {
        startY: y,
        head: [['Jugador', 'Asistencias', 'Mínimo', 'Estatus']],
        body: rows,
        theme: 'plain',
        styles: { fontSize: 8.5, textColor: [220, 220, 220], fillColor: [26, 26, 26] },
        headStyles: { fontStyle: 'bold', textColor: [180, 180, 180], fillColor: [17, 17, 17] },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 28, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: {
            cellWidth: 34, halign: 'center',
            textColor: undefined, // overridden per cell below
          },
        },
        didParseCell: (data) => {
          if (data.column.index === 3 && data.section === 'body') {
            const v = String(data.cell.raw);
            data.cell.styles.textColor = v.startsWith('✓')
              ? [82, 196, 26]
              : [255, 77, 79];
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  // ── Footer ────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Liga Nochixtlán · ${fecha} · Pág. ${i} de ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  doc.save(`Elegibilidad_${seasonName.replace(/\s/g, '_')}.pdf`);
}
