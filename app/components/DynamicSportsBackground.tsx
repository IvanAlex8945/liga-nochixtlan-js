'use client';

import { memo, useEffect, useRef, useState } from 'react';
import type { TabKey } from './PublicPageClient';

interface BackgroundConfig {
  imageUrl: string;
  focusPoint: string;
  scale: number;
  glowColor: string;
  vignetteBottom: number;
  title: string;
}

// Configuración visual auténtica de la Liga Nochixtlán por sección/pestaña
export const TAB_BACKGROUND_CONFIGS: Record<TabKey, BackgroundConfig> = {
  home: {
    imageUrl: '/cancha_nochixtlan_noche.jpg',
    focusPoint: '50% 25%',
    scale: 1,
    glowColor: 'rgba(245, 158, 11, 0.22)', // Oro halógeno de reflector
    vignetteBottom: 0.94,
    title: 'La Catedral de la Duela Mixteca',
  },
  standings: {
    imageUrl: '/cancha_posiciones.jpg',
    focusPoint: '50% 60%', // Foco centrado en el balón de básquetbol y las líneas
    scale: 1.02,
    glowColor: 'rgba(245, 158, 11, 0.16)',
    vignetteBottom: 0.96, // Viñeta profunda para legibilidad óptima de la tabla general
    title: 'Tabla General de Clasificación',
  },
  stats: {
    imageUrl: '/cancha_estadisticas.jpg',
    focusPoint: '50% 40%', // Foco en el salto a canasta y el tablero
    scale: 1.02,
    glowColor: 'rgba(251, 191, 36, 0.24)',
    vignetteBottom: 0.95,
    title: 'Líderes Anotadores y Estadísticas',
  },
  'team-matches': {
    imageUrl: '/cancha_equipo.jpg',
    focusPoint: '50% 55%', // Foco en el círculo del equipo y el compañerismo
    scale: 1.02,
    glowColor: 'rgba(56, 189, 248, 0.16)', // Destello sutil azul mixteco
    vignetteBottom: 0.95,
    title: 'Seguimiento por Equipo',
  },
  bracket: {
    imageUrl: '/cancha_liguilla.jpg',
    focusPoint: '50% 42%', // Tensión de los dos jugadores disputando el balón
    scale: 1.03,
    glowColor: 'rgba(225, 29, 72, 0.20)', // Resplandor de liguilla y playoffs
    vignetteBottom: 0.96,
    title: 'Liguilla y Playoffs',
  },
  calendar: {
    imageUrl: '/cancha_calendario.jpg',
    focusPoint: '50% 35%', // Cancha vacía y estrellas antes de iniciar
    scale: 1,
    glowColor: 'rgba(245, 158, 11, 0.16)',
    vignetteBottom: 0.95,
    title: 'Rol Oficial de Juegos',
  },
};

const ALL_IMAGE_URLS = Object.values(TAB_BACKGROUND_CONFIGS).map((c) => c.imageUrl);

interface DynamicSportsBackgroundProps {
  activeTab: TabKey;
}

function DynamicSportsBackgroundComponent({ activeTab }: DynamicSportsBackgroundProps) {
  const currentConfig = TAB_BACKGROUND_CONFIGS[activeTab] ?? TAB_BACKGROUND_CONFIGS.home;

  // Precarga automática en segundo plano de las 6 fotos para que la transición sea instantánea
  useEffect(() => {
    if (typeof window === 'undefined') return;
    ALL_IMAGE_URLS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Sistema de doble capa (Layer A y Layer B) para Crossfade cinematográfico sin parpadeos
  const [activeLayer, setActiveLayer] = useState<'A' | 'B'>('A');
  const [layerA, setLayerA] = useState<BackgroundConfig>(currentConfig);
  const [layerB, setLayerB] = useState<BackgroundConfig>(currentConfig);
  const prevTabRef = useRef<TabKey>(activeTab);

  useEffect(() => {
    if (activeTab === prevTabRef.current) return;
    prevTabRef.current = activeTab;

    if (activeLayer === 'A') {
      setLayerB(currentConfig);
      setActiveLayer('B');
    } else {
      setLayerA(currentConfig);
      setActiveLayer('A');
    }
  }, [activeTab, activeLayer, currentConfig]);

  return (
    <div className="dynamic-sports-bg-root" aria-hidden="true">
      {/* ── CAPA A (CROSSFADE LAYER) ── */}
      <div
        className="dynamic-sports-bg-image-layer"
        style={{
          backgroundImage: `url("${layerA.imageUrl}")`,
          backgroundPosition: layerA.focusPoint,
          transform: `scale(${layerA.scale})`,
          opacity: activeLayer === 'A' ? 1 : 0,
          transition: 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 1200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {/* ── CAPA B (CROSSFADE LAYER) ── */}
      <div
        className="dynamic-sports-bg-image-layer"
        style={{
          backgroundImage: `url("${layerB.imageUrl}")`,
          backgroundPosition: layerB.focusPoint,
          transform: `scale(${layerB.scale})`,
          opacity: activeLayer === 'B' ? 1 : 0,
          transition: 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 1200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      {/* ── CAPA 2: LUZ AMBIENTAL DE REFLECTOR REACTIVA ── */}
      <div
        className="dynamic-sports-bg-spotlight"
        style={{
          background: `
            radial-gradient(circle at 74% 28%, ${currentConfig.glowColor} 0%, transparent 55%),
            radial-gradient(circle at 26% 18%, rgba(56, 189, 248, 0.08) 0%, transparent 45%),
            radial-gradient(ellipse 90% 45% at 50% 0%, rgba(245, 158, 11, 0.12) 0%, transparent 60%)
          `,
        }}
      />

      {/* ── CAPA 3: VIÑETA EDITORIAL DEPORTIVA DE ALTO CONTRASTE (WCAG AAA) ── */}
      <div
        className="dynamic-sports-bg-vignette"
        style={{
          background: `
            linear-gradient(
              to bottom,
              rgba(4, 6, 10, 0.62) 0%,
              rgba(4, 6, 10, 0.35) 25%,
              rgba(4, 6, 10, 0.72) 60%,
              rgba(4, 6, 10, ${currentConfig.vignetteBottom}) 92%,
              #04060a 100%
            ),
            radial-gradient(
              ellipse 110% 85% at 50% 45%,
              transparent 30%,
              rgba(4, 6, 10, 0.88) 85%
            )
          `,
        }}
      />

      {/* ── CAPA 4: MICRO-TEXTURA VECTORIAL DE CANCHA ── */}
      <div className="dynamic-sports-bg-mesh" />
    </div>
  );
}

export const DynamicSportsBackground = memo(DynamicSportsBackgroundComponent);
