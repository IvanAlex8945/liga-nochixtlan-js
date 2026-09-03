# MEGAPROMPT V5 — Liga Nochixtlán
## Landing deportiva + navegación por secciones + transiciones premium + responsive móvil + cero regresiones

> **Objetivo:** transformar la página pública/oficial de Liga Nochixtlán en una experiencia web deportiva mucho más atractiva, tipo **landing page oficial interactiva**, con una pestaña de **Inicio/Bienvenida** de gran impacto, secciones claramente separadas, transiciones suaves entre vistas y una experiencia responsive excelente en celular, **sin romper nada de lo que ya funciona**.

---

# 0. ROL Y MISIÓN

Actúa como un equipo coordinado de:

- **Creative Director**
- **Senior Sports Product Designer**
- **Senior UI/UX Designer**
- **Senior Front-End Engineer**
- **Motion / Interaction Designer**
- **Design Systems Engineer**
- **Responsive / Mobile UX Specialist**
- **Accessibility Specialist**
- **Performance Engineer**
- **QA / Regression Engineer**

La aplicación ya funciona.

**NO estás construyendo un sistema nuevo.**

Tu misión es:

1. conservar toda la funcionalidad existente;
2. conservar todos los datos reales;
3. mantener intactos backend, lógica, Admin y reportes;
4. rehacer exclusivamente la experiencia pública;
5. convertirla en una web deportiva oficial mucho más espectacular;
6. crear una nueva pestaña **Inicio / Bienvenida**;
7. separar claramente el resto de las secciones;
8. implementar transiciones premium tipo **fade + slide**;
9. conseguir una experiencia excelente en móvil;
10. utilizar subagentes para acelerar auditoría, diseño y QA;
11. dejar el proyecto **LISTO PARA PREVIEW**, pero NO hacer deploy ni merge a producción.

---

# 1. VISIÓN DEL PRODUCTO

Quiero que Liga Nochixtlán deje de sentirse principalmente como:

> “una interfaz donde consulto tablas y estadísticas”

y pase a sentirse como:

> **“la página web oficial de una liga de básquetbol que presenta, organiza y hace emocionante toda la competición.”**

La experiencia debe comunicar:

- BÁSQUETBOL
- COMPETENCIA
- OFICIALIDAD
- PRESTIGIO
- MODERNIDAD
- ORGANIZACIÓN
- ENERGÍA
- IDENTIDAD
- NOCHIXTLÁN

---

# 2. NUEVA ARQUITECTURA DE NAVEGACIÓN

Quiero reorganizar la página pública en estas vistas principales:

1. **Inicio**
2. **Estadísticas**
3. **Posiciones**
4. **Mi equipo**
5. **Liguilla**
6. **Calendario**

## IMPORTANTE

Actualmente pueden existir nombres o componentes como:

- Posiciones
- Líderes
- Estadísticas
- Mi equipo
- Liguilla
- Calendario

En esta nueva versión:

### `Inicio`
será la portada / landing principal.

### `Estadísticas`
puede integrar de forma coherente:

- líderes;
- top anotadores;
- top tripleros;
- récords;
- mejor ofensiva;
- mejor defensiva;
- demás información estadística ya existente.

No elimines datos.

Si actualmente `Líderes` funciona como una sección propia y moverla dentro de `Estadísticas` implica riesgo funcional, conserva internamente la estructura existente y resuelve el cambio únicamente desde la presentación.

La prioridad es:

**nueva organización visual sin romper la lógica.**

---

# 3. RESTRICCIONES ABSOLUTAS

## NO MODIFICAR

- backend;
- base de datos;
- esquemas;
- modelos;
- migraciones;
- APIs;
- endpoints;
- Server Actions;
- autenticación;
- sesiones;
- permisos;
- lógica de negocio;
- cálculos de posiciones;
- cálculos de líderes;
- cálculos de estadísticas;
- lógica de partidos;
- lógica de calendario;
- lógica de liguilla;
- Reporte PDF;
- consultas;
- fetching;
- variables de entorno;
- configuración sensible;
- infraestructura;
- contratos de datos;
- nombres de propiedades;
- Panel Admin.

## NO HACER

- inventar partidos;
- inventar jugadores;
- inventar estadísticas;
- inventar equipos;
- inventar sedes;
- inventar jornadas;
- reemplazar datos reales por mocks;
- cambiar nombres oficiales;
- ocultar funcionalidades existentes;
- eliminar funciones porque “no combinan con el diseño”;
- actualizar dependencias solo por modernizar;
- hacer refactorizaciones generales innecesarias;
- hacer deploy;
- hacer merge a producción;
- manipular secretos;
- ejecutar comandos destructivos.

---

# 4. REGLA MAESTRA DE SEGURIDAD

Si una mejora visual requiere cambiar lógica:

1. intenta resolverlo únicamente a nivel de UI;
2. reutiliza props/datos ya existentes;
3. crea wrappers o variantes públicas;
4. evita tocar componentes compartidos con Admin;
5. si no puede hacerse de forma segura, conserva el funcionamiento actual;
6. reporta la limitación.

## Frase clave

**RECONSTRUIR LA PRESENTACIÓN, NO RECONSTRUIR LA LÓGICA.**

---

# 5. USO OBLIGATORIO DE SUBAGENTES

Utiliza subagentes para acelerar el trabajo.

No hagas todo serialmente si puede analizarse en paralelo.

---

## SUBAGENTE A — Auditor UI/UX

Responsabilidades:

- revisar la página pública actual;
- detectar por qué todavía puede sentirse como dashboard;
- identificar problemas de jerarquía;
- revisar exceso de cards/pills;
- identificar qué elementos actuales deben conservarse;
- proponer mejoras concretas.

### Modo
Solo análisis.

### No debe editar archivos.

---

## SUBAGENTE B — Creative Direction

Responsabilidades:

- definir la nueva arquitectura de landing;
- proponer jerarquía del Hero;
- definir ritmo visual;
- establecer cómo hacer que la experiencia se sienta deportiva;
- proponer composición desktop y móvil.

### Modo
Análisis / diseño.

### No modificar lógica.

---

## SUBAGENTE C — Motion / Interaction

Responsabilidades:

- diseñar el sistema de transición entre vistas;
- definir fade + slide;
- definir dirección de animación;
- definir indicador activo;
- revisar swipe táctil;
- asegurar buen rendimiento.

---

## SUBAGENTE D — Responsive / Mobile

Responsabilidades:

Revisar:

- 390px
- 430px
- 768px
- 1024px
- 1366px
- 1440px
- 1920px

Debe proponer:

- navegación móvil;
- Hero móvil;
- presentación de estadísticas;
- tablas adaptadas;
- swipe táctil;
- controles cómodos;
- solución de overflow.

---

## SUBAGENTE E — Accessibility + Performance

Responsabilidades:

- contraste;
- teclado;
- focus-visible;
- semántica;
- reduced motion;
- peso de imágenes;
- layout shift;
- animaciones eficientes;
- uso de `transform` / `opacity`;
- evitar efectos caros.

---

## SUBAGENTE F — Regression QA

Debe mapear y probar:

- carga de página;
- cambio de temporada;
- cambio de categoría;
- Inicio;
- Estadísticas;
- Posiciones;
- Mi equipo;
- Liguilla;
- Calendario;
- Reporte PDF;
- acceso Admin;
- datos reales;
- navegación;
- responsive.

---

## SUBAGENTE G — Visual QA

Después de la implementación debe revisar:

- desktop;
- tablet;
- móvil;
- Hero;
- navegación;
- transiciones;
- tablas;
- consistencia visual;
- scroll horizontal;
- textos cortados;
- errores visuales;
- consola del navegador cuando sea posible.

---

# 6. COORDINACIÓN ENTRE AGENTES

## Regla

No permitas que varios subagentes modifiquen simultáneamente los mismos archivos.

### Preferencia

- subagentes = analizar / revisar / probar;
- agente principal = implementar e integrar.

El agente principal debe:

1. recibir hallazgos;
2. definir solución final;
3. modificar el frontend;
4. integrar motion;
5. probar;
6. corregir regresiones.

---

# 7. FASE 1 — BASELINE

Antes de editar:

```bash
git status
git branch --show-current
```

Después:

1. inspecciona `package.json`;
2. identifica framework;
3. identifica scripts existentes;
4. identifica rutas públicas;
5. identifica componentes compartidos;
6. identifica componentes exclusivos de público;
7. ejecuta la página actual;
8. registra el baseline funcional;
9. invoca los subagentes.

No edites todavía si no entiendes el impacto.

---

# 8. FASE 2 — MAPA DE IMPACTO

Identifica:

- página pública;
- shell/layout;
- navegación;
- hero;
- selectores;
- vistas;
- tablas;
- estilos globales;
- componentes compartidos con Admin.

## Si un componente también lo usa Admin

No cambies su diseño global si puede afectar Admin.

Preferir:

- wrapper público;
- variante;
- clases scopeadas;
- props de presentación;
- componente visual específico.

---

# 9. PESTAÑA `INICIO` — LANDING PRINCIPAL

Esta es la parte más importante del V5.

Quiero una nueva vista:

# INICIO

Debe ser la portada oficial de la liga.

---

# 10. HERO DE INICIO

El Hero debe ser espectacular.

Debe sentirse como una portada deportiva profesional.

## Debe poder incluir, cuando ya existan los datos:

- LIGA NOCHIXTLÁN;
- Liga Municipal de Básquetbol;
- temporada activa;
- categoría activa;
- clubes/equipos;
- número de partidos;
- próximo partido;
- jornada;
- dato destacado.

## NO inventar información.

---

# 11. COMPOSICIÓN DEL HERO

En desktop quiero una composición más editorial y asimétrica.

Ejemplo conceptual:

```text
┌──────────────────────────────────────────────────────────────┐
│ LOGO       INICIO  ESTADÍSTICAS  POSICIONES ...             │
│                                                              │
│         [ATMÓSFERA / VISUAL]          LIGA NOCHIXTLÁN        │
│                                      TEMPORADA 2026           │
│                                      17 CLUBES                │
│                                      265 PARTIDOS             │
│                                      Próximo encuentro        │
│                                                              │
│                                      [VER POSICIONES]         │
│                                      [ESTADÍSTICAS]           │
└──────────────────────────────────────────────────────────────┘
```

No es obligatorio copiar esa distribución.

Lo importante es:

- composición;
- jerarquía;
- impacto;
- respiración;
- profundidad;
- presencia del básquetbol.

---

# 12. ALTURA DEL HERO

En desktop puede utilizar aproximadamente:

```css
min-height: 82vh;
```

hasta:

```css
min-height: 100vh;
```

si la composición realmente lo justifica.

No obligar a que sea 100vh si perjudica la experiencia.

---

# 13. VISUAL DEPORTIVO

Reutiliza activos propios existentes cuando sea posible.

Puedes aprovechar:

- estadio;
- cancha;
- iluminación;
- balón;
- público;
- fondos existentes;
- logo nuevo si ya está disponible.

## Integración

Usar:

- overlays;
- gradients;
- masks;
- lighting;
- profundidad;
- contraste.

## Evitar

- imagen de stock con watermark;
- estética de apuestas;
- casino;
- copiar la referencia del usuario;
- efectos gamer.

---

# 14. CONTENIDO DE `INICIO`

Además del Hero, la pestaña Inicio puede incorporar bloques breves:

## A. Próximo partido

Cuando exista información real.

## B. Resumen de competición

Ejemplo:

- clubes;
- partidos;
- jornada;
- categoría.

## C. Destacados

Cuando existan datos reales:

- líder;
- mejor ofensiva;
- mejor defensiva;
- líder anotador.

## D. Call to action

Acciones como:

- Ver posiciones
- Ver estadísticas
- Consultar calendario

Estos botones deben cambiar a la vista correspondiente dentro de la misma experiencia.

---

# 15. NO SOBRECARGAR `INICIO`

Inicio debe vender la experiencia.

No debe mostrar todas las tablas completas.

Debe servir como:

- presentación;
- resumen;
- punto de entrada.

Los detalles pertenecen a sus pestañas.

---

# 16. NAVEGACIÓN PRINCIPAL

Quiero estas vistas:

```text
INICIO
ESTADÍSTICAS
POSICIONES
MI EQUIPO
LIGUILLA
CALENDARIO
```

## Diseño

La navegación debe sentirse premium.

Puede utilizar:

- indicador animado;
- underline;
- rail;
- background sutil;
- cambio de peso.

Evitar convertir todos los items en pills grandes.

---

# 17. NAVEGACIÓN STICKY

En desktop y móvil evalúa que, al abandonar el Hero, la navegación pueda convertirse en:

- sticky;
- compacta;
- ligeramente translúcida;
- legible.

No debe tapar contenido.

No implementar si causa problemas.

---

# 18. TRANSICIÓN ENTRE VISTAS

Este punto es crítico.

Quiero una experiencia:

# FADE + SLIDE

Al cambiar de vista.

---

# 19. DIRECCIÓN DE TRANSICIÓN

Usa el orden:

```text
Inicio = 0
Estadísticas = 1
Posiciones = 2
Mi equipo = 3
Liguilla = 4
Calendario = 5
```

Si:

```text
newIndex > currentIndex
```

el nuevo contenido entra desde la derecha.

Si:

```text
newIndex < currentIndex
```

el nuevo contenido entra desde la izquierda.

---

# 20. COMPORTAMIENTO DE LA TRANSICIÓN

Ejemplo:

### Salida

- opacity: 1 → 0;
- translateX: 0 → ±24px / ±40px;
- duración corta.

### Entrada

- opacity: 0 → 1;
- translateX: ∓24px / ∓40px → 0.

## Duración recomendada

```text
220–350 ms
```

Ajusta según el resultado.

---

# 21. NO QUIERO UNA ANIMACIÓN LENTA

La transición debe sentirse:

- rápida;
- elegante;
- responsiva;
- premium.

No debe sentirse como:

- presentación de PowerPoint;
- carrusel lento;
- pantalla esperando animación.

La información debe estar disponible casi inmediatamente.

---

# 22. INDICADOR ACTIVO ANIMADO

El indicador de la pestaña activa debe moverse suavemente.

Puede ser:

- underline;
- highlight;
- rail;
- accent bar.

Debe deslizarse de una opción a otra.

No simplemente desaparecer y reaparecer.

---

# 23. SWIPE EN MÓVIL

Explora un gesto horizontal real para:

- avanzar;
- retroceder;

entre vistas.

## Solo implementarlo si:

- no rompe scroll vertical;
- no interfiere con tablas;
- no interfiere con selectores;
- no interfiere con gestos del navegador;
- es robusto.

## Los botones SIEMPRE deben seguir existiendo.

Swipe es una mejora adicional.

---

# 24. `ESTADÍSTICAS`

Esta vista debe sentirse como un verdadero centro estadístico de la liga.

Puede integrar visualmente:

- líderes;
- top anotadores;
- top tripleros;
- récord de puntos;
- récord de triples;
- mejor ofensiva;
- mejor defensiva;
- otros datos existentes.

## Mejorar presentación

No limitarse a:

- dos tablas planas.

Utilizar cuando aporte valor:

- top 3 destacado;
- ranking;
- cards de récord;
- paneles editoriales;
- barras compactas;
- jerarquía tipográfica.

---

# 25. `POSICIONES`

Debe ser la tabla oficial.

Prioridades:

1. legibilidad;
2. jerarquía;
3. escaneo rápido;
4. profesionalidad;
5. responsive.

## Desktop

Mostrar información completa de forma limpia.

## Mobile

No comprimir todas las columnas.

Priorizar:

- posición;
- equipo;
- PJ;
- PG;
- PP;
- PTS.

La información secundaria puede:

- expandirse;
- aparecer en segunda línea;
- estar disponible en detalle.

---

# 26. `MI EQUIPO`

Debe sentirse como una experiencia personalizada de consulta.

No cambiar lógica.

Mejorar únicamente:

- presentación;
- jerarquía;
- lectura;
- responsive;
- integración visual.

---

# 27. `LIGUILLA`

Mantener toda la lógica actual.

Mejorar:

- bracket;
- rondas;
- jerarquía;
- avance;
- spacing;
- responsive.

En móvil permitir navegación cómoda del bracket si es necesario.

---

# 28. `CALENDARIO`

Debe responder rápidamente:

- quién juega;
- cuándo;
- dónde;
- resultado;
- jornada.

Mejorar:

- grouping;
- cards / rows;
- fechas;
- jerarquía;
- responsive.

---

# 29. LOGO E IDENTIDAD

Si ya existe la nueva identidad visual de Liga Nochixtlán:

- intégrala;
- utilízala con moderación;
- aplícala en navbar/hero cuando convenga.

Si el branding aún no está finalizado:

- no inventar un reemplazo genérico que empeore el diseño.

Mantener el layout preparado para integrarlo.

---

# 30. ESTILO VISUAL

Mantener la dirección que ya funciona:

- dark premium;
- graphite;
- negro;
- navy profundo;
- dorado;
- blanco cálido;
- ambiente deportivo.

---

# 31. DORADO

El dorado debe significar importancia.

Utilizar para:

- CTA principal;
- estado activo;
- líder;
- acentos;
- información destacada.

No usar en todos los bordes.

---

# 32. MENOS DASHBOARD

Reducir:

- cards dentro de cards;
- pills excesivas;
- contenedores anidados;
- bordes por todas partes.

Usar más:

- espacio;
- tipografía;
- composición;
- fotografía;
- gradientes;
- divisores;
- luz;
- jerarquía.

---

# 33. DESIGN SYSTEM

Crear / consolidar tokens de:

- background;
- surface;
- accent;
- text;
- spacing;
- radius;
- shadow;
- motion;
- typography.

Evitar estilos arbitrarios en cada componente.

---

# 34. RESPONSIVE — PRIORIDAD ALTA

La experiencia debe diseñarse explícitamente para:

```text
390 × 844
430 × 932
768px
1024px
1366 × 768
1440 × 900
1920 × 1080
```

---

# 35. MOBILE HERO

En móvil:

- reducir altura si hace falta;
- apilar contenido de forma inteligente;
- mantener una imagen potente;
- no esconder información principal;
- CTA táctil cómodo;
- métricas en 2 columnas o carrusel compacto solo si mejora UX.

---

# 36. MOBILE NAVIGATION

Debe ser usable con una mano.

Puede ser:

- scroll horizontal;
- sticky;
- compacta;
- indicador activo claro.

No usar texto diminuto.

Targets táctiles adecuados.

---

# 37. MOBILE TABLES

Evitar:

- tablas ilegibles;
- columnas de 35px;
- scroll lateral gigantesco.

Preferir:

- cards compactas;
- rows responsivas;
- expansion;
- progressive disclosure.

---

# 38. ACCESIBILIDAD

Objetivo razonable:

**WCAG AA**

Verificar:

- contraste;
- teclado;
- focus-visible;
- headings;
- labels;
- semántica;
- reduced motion;
- touch targets;
- color no como único indicador.

---

# 39. PREFERS REDUCED MOTION

Para:

```css
@media (prefers-reduced-motion: reduce)
```

las transiciones deben:

- reducir desplazamiento;
- utilizar principalmente fade;
- eliminar motion innecesario.

---

# 40. PERFORMANCE

Las animaciones deben utilizar principalmente:

- `transform`;
- `opacity`.

Evitar animar:

- width;
- height;
- top;
- left;

cuando no sea necesario.

No introducir dependencias grandes únicamente por motion.

---

# 41. DEPENDENCIAS

Antes de instalar una librería de animación:

1. revisar dependencias actuales;
2. comprobar si ya existe una solución;
3. evaluar CSS + React;
4. justificar cualquier nueva dependencia.

Si ya existe una librería como Motion/Framer Motion, puedes aprovecharla.

---

# 42. FASES DE IMPLEMENTACIÓN

## Fase A — Auditoría paralela

Invocar subagentes.

## Fase B — Design Direction

Integrar conclusiones.

## Fase C — Public Shell

Crear estructura nueva.

## Fase D — Inicio

Implementar landing.

## Fase E — Navigation + Motion

Implementar tabs y fade/slide.

## Fase F — Secciones

Integrar las vistas existentes.

## Fase G — Mobile

Optimizar responsive.

## Fase H — Accessibility + Performance

Pulir.

## Fase I — Regression QA

Validar todo.

---

# 43. VALIDACIÓN FUNCIONAL OBLIGATORIA

Verificar:

- Inicio;
- selección de temporada;
- selección de categoría;
- Estadísticas;
- Posiciones;
- Mi equipo;
- Liguilla;
- Calendario;
- PDF;
- acceso Admin;
- navegación entre tabs;
- navegación mediante CTAs de Inicio;
- refresh;
- datos reales;
- móvil;
- desktop.

---

# 44. VALIDACIÓN DE MOTION

Comprobar:

- dirección correcta;
- no flicker;
- no layout jump;
- no contenido duplicado visible;
- no animación lenta;
- reduced motion;
- 60 FPS razonables en dispositivos modernos.

---

# 45. QA TÉCNICO

Ejecutar únicamente scripts existentes.

Por ejemplo:

```bash
npm run build
npm run lint
npm test
```

Si alguno no existe, reportarlo.

Build debe pasar.

---

# 46. GIT SAFETY

Trabaja únicamente en la rama asignada.

No ejecutar sin autorización:

```text
git reset --hard
git clean -fd
git push --force
```

No:

- merge a producción;
- deploy;
- tocar secretos;
- cambiar infraestructura.

---

# 47. AUTONOMÍA

Si el entorno está configurado para autoaprobar operaciones seguras:

- no pedir confirmación para edición de frontend;
- no pedir confirmación para build;
- no pedir confirmación para lint;
- no pedir confirmación para tests;
- no pedir confirmación para inspecciones normales;
- avanzar autónomamente.

## Sí detenerse para:

- acciones destructivas;
- cambios sensibles;
- deploy;
- merge productivo;
- acceso fuera del workspace;
- modificaciones fuera de alcance.

---

# 48. CRITERIOS DE ACEPTACIÓN VISUAL

No terminar si únicamente:

- agregaste una pestaña Inicio;
- pusiste un fade;
- cambiaste un fondo.

Debe existir un salto claro en:

- arquitectura;
- Hero;
- navegación;
- motion;
- experiencia móvil;
- presentación de estadísticas;
- composición general.

---

# 49. PREGUNTAS DE AUTOCONTROL

Antes de declarar terminado:

### ¿Inicio parece una verdadera landing deportiva?
Debe ser sí.

### ¿La web sigue pareciendo un dashboard?
Debe ser no o mucho menos.

### ¿Cambiar de pestaña se siente premium?
Debe ser sí.

### ¿Móvil está diseñado realmente para móvil?
Debe ser sí.

### ¿La tabla sigue siendo clara?
Debe ser sí.

### ¿Admin sigue intacto?
Debe ser sí.

### ¿El PDF sigue funcionando?
Debe ser sí.

### ¿El build pasa?
Debe ser sí.

---

# 50. ENTREGA FINAL

Entregar:

## A. Resumen
Qué se cambió.

## B. Archivos modificados
Lista exacta.

## C. Subagentes
Qué hizo cada uno.

## D. Inicio
Qué contiene la nueva landing.

## E. Navigation / Motion
Cómo funciona fade + slide.

## F. Mobile
Qué adaptación se realizó.

## G. Accessibility
Qué se verificó.

## H. Performance
Qué se optimizó.

## I. Regression QA
Qué funciones fueron comprobadas.

## J. Estado final

Terminar obligatoriamente con:

```text
LISTO PARA PREVIEW
```

o:

```text
NO LISTO PARA PREVIEW
```

con motivos.

---

# 51. INSTRUCCIÓN FINAL PARA EL AGENTE PRINCIPAL

Lee este documento completo.

Después:

1. ejecuta baseline;
2. invoca los subagentes;
3. paraleliza auditoría, dirección creativa, motion, mobile, accessibility/performance y regression mapping;
4. integra los hallazgos;
5. crea la nueva arquitectura pública;
6. implementa `Inicio`;
7. implementa navegación por secciones;
8. implementa transición fade + slide;
9. integra todas las vistas existentes;
10. optimiza responsive móvil;
11. prueba todo;
12. corrige regresiones;
13. deja el proyecto listo para Preview.

## Prioridad absoluta

# LANDING DEPORTIVA ESPECTACULAR + SECCIONES SEPARADAS + FADE/SLIDE + MOBILE PREMIUM + CERO REGRESIONES

---

# APÉNDICE A — PROMPT DE ARRANQUE PARA ANTIGRAVITY

Pegar después de colocar este archivo en la raíz del proyecto:

```text
Lee completamente MEGAPROMPT_LIGA_NOCHIXTLAN_V5.md antes de modificar archivos.

Ejecuta TODO el plan descrito.

Quiero convertir la página pública actual en una landing deportiva oficial mucho más espectacular y ordenada.

La nueva navegación principal debe ser:

- Inicio
- Estadísticas
- Posiciones
- Mi equipo
- Liguilla
- Calendario

Inicio debe funcionar como una verdadera portada/landing de la liga, con Hero de alto impacto, temporada, categoría, métricas reales, próximo encuentro y accesos claros a las demás secciones.

Al cambiar entre secciones quiero una transición premium tipo fade + slide, con dirección coherente según el orden de las pestañas. En móvil, explora swipe táctil solamente si es robusto y no interfiere con scroll, tablas ni controles.

El diseño debe ser totalmente responsive y estar especialmente cuidado para 390px y 430px.

Usa subagentes en paralelo para:
1. auditoría UI/UX;
2. dirección creativa;
3. motion/interacciones;
4. responsive/mobile;
5. accesibilidad/performance;
6. regression QA;
7. visual QA.

El agente principal debe ser el único integrador principal de código.

NO modifiques backend, base de datos, APIs, autenticación, lógica, cálculos, PDF, Panel Admin, contratos de datos ni infraestructura.

Puedes reconstruir profundamente la capa de presentación pública si es necesario.

No hagas deploy.
No hagas merge a producción.
No ejecutes acciones destructivas.

Trabaja autónomamente dentro del workspace y continúa hasta dejar el proyecto LISTO PARA PREVIEW.
```

---

# APÉNDICE B — PLAN DEL USUARIO

## 1. Respaldar la versión actual

```bash
git status
git add .
git commit -m "backup: stable version before landing v5"
git push
```

Si no hay cambios pendientes, no crear commit vacío.

---

## 2. Crear rama V5

```bash
git checkout -b redesign/public-v5-landing
```

Si ya existe:

```bash
git checkout redesign/public-v5-landing
```

---

## 3. Copiar este archivo al proyecto

Nombre exacto recomendado:

```text
MEGAPROMPT_LIGA_NOCHIXTLAN_V5.md
```

---

## 4. Configuración para trabajar con autonomía

Permitir autoejecución únicamente para operaciones normales y reversibles del proyecto.

Mantener bloqueadas o sujetas a aprobación:

- comandos destructivos;
- deploy;
- merge productivo;
- force push;
- acceso fuera del workspace;
- secretos;
- infraestructura.

---

## 5. Antes de Preview

Ejecutar:

```bash
git status
git diff
npm run build
```

Si existen:

```bash
npm run lint
npm test
```

---

## 6. Probar manualmente

### Desktop
- Inicio
- Estadísticas
- Posiciones
- Mi equipo
- Liguilla
- Calendario
- temporada
- categoría
- PDF
- Admin

### Mobile
- 390px
- 430px
- navegación
- Hero
- swipe/fade/slide
- tablas
- selects
- CTAs
- scroll vertical

---

## 7. Commit de V5

Cuando esté aprobado localmente:

```bash
git add .
git commit -m "feat: public sports landing v5 with animated sections"
git push -u origin redesign/public-v5-landing
```

---

## 8. Preview primero

Revisar Preview Deployment.

No hacer merge todavía.

Comparar:

- producción actual;
- V5 Preview.

---

## 9. Producción

Solo después de aprobación manual.

---

# REGLA DE ORO

**Autonomía para analizar, diseñar, implementar y probar.  
Aprobación humana para destruir, desplegar o afectar producción.**
