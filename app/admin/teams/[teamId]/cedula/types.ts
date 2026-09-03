export interface CedulaEquipo {
  capitan: string;
  categoria: string;
  nombre: string;
  telefono: string;
}

export interface CedulaJugador {
  foto_url: string | null;
  nombre: string;
  numero: number | string | null;
}

export interface CedulaInscripcionData {
  equipo: CedulaEquipo;
  jugadores: CedulaJugador[];
  temporada: string;
}
