# Liga de Básquetbol de Nochixtlán

![Versión](https://img.shields.io/badge/Versión-1.2.0-blue)
![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20Supabase%20%7C%20Ant%20Design-green)
![Status](https://img.shields.io/badge/Status-Producción-orange)

## Descripción del Proyecto

Este sistema es una plataforma integral de gestión deportiva diseñada específicamente para la **Liga Municipal de Básquetbol de Nochixtlán**. El objetivo principal es centralizar la administración de torneos, el seguimiento de estadísticas de jugadores en tiempo real y la automatización de la programación de encuentros.

A diferencia de soluciones genéricas, esta plataforma implementa la lógica de negocio particular de la liga, permitiendo una gestión fluida de múltiples categorías (**Libre, Veteranos, Femenil, 3ra**) y adaptándose al ritmo de competencia local, donde los encuentros se concentran los días **jueves, viernes y sábados** en sedes oficiales como la *Cancha Bicentenario* y la *Cancha Techada*.

---

## Desafíos de la Migración Técnica

El proyecto representa una transición crítica desde una arquitectura monolítica en **Python/Streamlit** hacia una arquitectura moderna y distribuida basada en **Javascript/Next.js**.

Los principales retos de ingeniería abordados fueron:

1.  **Refactorización de Lógica de Negocio**: Migración de algoritmos de cálculo de estadísticas y tablas de posiciones desde scripts de Python a una capa de servicios en Typescript.
2.  **Desacoplamiento de Datos**: Sustitución del manejo de estados locales por una infraestructura de base de datos relacional robusta en la nube con Supabase.
3.  **Optimización de UX/UI**: Creación de una interfaz profesional, altamente interactiva y mobile-first utilizando Ant Design y Tailwind CSS 4.
4.  **Estado Global e Hidratación**: Implementación de **Zustand** y **React Query** para manejar la sincronización de partidos en vivo y caché de servidor.

---

## Stack Tecnológico

*   **Frontend**: Next.js 16 (App Router) con React 19.
*   **Lenguaje**: TypeScript (Tipado estático riguroso).
*   **UI Framework**: Ant Design + Tailwind CSS 4.
*   **Backend as a Service (BaaS)**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage).
*   **Gestión de Estado**: Zustand & TanStack Query.
*   **Reportes & Gráficos**: jsPDF + jspdf-autotable / Recharts.

---

## Ingeniería de Reglas de Negocio

El sistema no solo registra datos, sino que aplica reglas estrictas de la liga:

### Sistema de Puntuación (Regla 3-1-0)
A diferencia del estándar internacional, el sistema calcula posiciones basándose en:
*   **Victoria**: 3 puntos.
*   **Derrota (en cancha)**: 1 punto.
*   **W.O. (Default/Forfeit)**: 0 puntos para el perdedor, 3 puntos para el ganador (marcador 20-0).

### Elegibilidad para Liguilla
Cálculo automatizado basado en la asistencia del jugador. Un jugador es elegible para playoffs solo si cumple con la fórmula:
`minRequerido = floor(totalPartidosEquipo / 2) + 1`

### Integridad Operativa
*   **Soft-delete de Jugadores**: Los jugadores con historial estadístico no se eliminan permanentemente, sino que pasan a estado de "Baja" para preservar la integridad histórica del equipo y sus récords.
*   **Alertas de W.O.**: Seguimiento automático de incomparecencias; los equipos con ≥4 W.O. son marcados visualmente para sanción.
*   **Gestión de Permisos**: Control de "permisos de refuerzo" limitados por equipo (0-3).

---

## Automatizaciones y Funciones Clave

*   **Generador de Roles (Round Robin)**: Motor automático que crea torneos de 2 vueltas (ida y vuelta), asignando equitativamente horarios y sedes desde las 06:00 PM.
*   **Difusión por WhatsApp**: Generador dinámico de mensajes estructurados con emojis, permitiendo compartir la jornada completa, horarios y ligas de interés en un solo clic.
*   **Reportes Profesionales en PDF**: Generación de reportes de elegibilidad para el **Top 8** de cada categoría, listos para impresión y firmas oficiales.
*   **Captura Predictiva**: Interfaz de mesa de control diseñada para minimizar errores en la captura de puntos y triples durante el desarrollo del partido.

---

## Integridad de los Datos y Escalabilidad

La migración a **Supabase** marca un hito en la seguridad:
1.  **Persistencia Robusta**: PostgreSQL garantiza transacciones ACID para cada acción de juego.
2.  **Seguridad RLS (Row Level Security)**: Políticas estrictas que separan el acceso del público (lectura) del panel administrativo protegido (escritura).
3.  **Disponibilidad 24/7**: Acceso desde cualquier dispositivo móvil en cancha sin necesidad de infraestructura local.

---

### Perfil del Desarrollador
Este proyecto refleja un enfoque de ingeniería centrado en la **resolución de problemas reales** mediante la modernización de stacks tecnológicos y la implementación de lógica de negocio compleja.

---
*Desarrollado para la Municipalidad de Nochixtlán.*

---

## Instalación y Configuración

Para desplegar una instancia local de este proyecto y realizar pruebas técnicas, sigue estos pasos:

### 1. Clonación del Repositorio
Clona el proyecto en tu máquina local utilizando Git:
```bash
git clone https://github.com/IvanAlex8945/liga-nochixtlan-js.git
cd liga-nochixtlan-js
```

### 2. Instalación de Dependencias
Asegúrate de tener [Node.js](https://nodejs.org/) instalado y ejecuta:
```bash
npm install
```

### 3. Variables de Entorno
El backend utiliza **Supabase**. Crea un archivo `.env` o `.env.local` en el directorio raíz con las siguientes variables:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

### 4. Ejecución en Entorno de Desarrollo
Inicia el servidor de desarrollo local:
```bash
npm run dev
```

El sistema estará disponible para inspección en [http://localhost:3000](http://localhost:3000).

