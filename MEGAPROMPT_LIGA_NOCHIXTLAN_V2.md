# MEGAPROMPT — Rediseño Espectacular de la Página Oficial de Liga Nochixtlán

> **Objetivo:** transformar la página pública actual en una experiencia digital deportiva de nivel profesional, con una presencia visual comparable en calidad, jerarquía y emoción a grandes portales deportivos modernos, sin copiar ningún diseño y sin romper absolutamente nada de lo que ya funciona.

---

# 0. ROL Y MISIÓN

Actúa como un equipo coordinado de:

- **Senior Product Designer**
- **Senior UI/UX Designer especializado en deporte**
- **Senior Front-End Engineer**
- **Design Systems Engineer**
- **Responsive/Mobile UX Specialist**
- **Accessibility Specialist**
- **Performance Engineer**
- **QA / Regression Engineer**

Tu misión es realizar una **segunda gran iteración exclusivamente visual y de experiencia de usuario sobre la PÁGINA PÚBLICA/OFICIAL de Liga Nochixtlán**.

La aplicación ya funciona. No estás construyendo una aplicación nueva.

Debes:

1. conservar todas las funciones actuales;
2. conservar todos los datos reales;
3. conservar la arquitectura funcional estable;
4. transformar profundamente la imagen pública;
5. elevar la experiencia a un nivel de **portal deportivo oficial premium**;
6. probar exhaustivamente que no haya regresiones;
7. dejar el proyecto listo para Preview, pero **NO desplegar a producción ni hacer merge a la rama productiva sin autorización del usuario**.

---

# 1. PRINCIPIO CENTRAL

La página actual todavía transmite demasiado:

> “dashboard / SaaS / sistema administrativo elegante”

y no suficientemente:

> **“portal oficial de una competición de básquetbol que los aficionados visitan para seguir la liga.”**

El nuevo diseño debe comunicar de inmediato:

- BÁSQUETBOL
- COMPETICIÓN
- PRESTIGIO
- INFORMACIÓN
- ENERGÍA
- ORGANIZACIÓN
- NOCHIXTLÁN
- IDENTIDAD OFICIAL

Debe sentirse más como una **plataforma deportiva editorial viva** y menos como una aplicación administrativa.

---

# 2. REFERENCIAS CONCEPTUALES

Puedes estudiar conceptualmente la jerarquía y calidad de experiencias de:

- NBA
- ESPN
- Formula 1
- UEFA
- grandes ligas y portales deportivos modernos

Pero:

**NO copies layouts, marcas, logos, componentes propietarios, imágenes o diseños específicos.**

Úsalos solamente como referencia para entender:

- jerarquía editorial;
- protagonismo del deporte;
- manejo de fotografía;
- marcadores;
- estadísticas;
- navegación;
- equipos;
- resultados;
- ritmo visual;
- composición;
- escala;
- tipografía;
- uso del espacio;
- experiencia móvil.

---

# 3. RESTRICCIONES ABSOLUTAS — NO ROMPER LO QUE FUNCIONA

## NO modificar

- backend;
- base de datos;
- esquemas;
- migraciones;
- modelos;
- APIs;
- endpoints;
- Server Actions;
- autenticación;
- sesiones;
- permisos;
- lógica de negocio;
- cálculos de clasificación;
- cálculos de estadísticas;
- lógica de partidos;
- lógica de calendario;
- lógica de liguilla;
- generación del PDF;
- consultas;
- fetching de datos;
- variables de entorno;
- rutas existentes;
- contratos de datos;
- nombres de propiedades;
- configuración de deployment;
- configuración general del proyecto;
- Panel Admin;
- comportamiento de botones existente;
- flujos funcionales existentes.

## NO hacer

- refactorizaciones generales innecesarias;
- cambios de infraestructura;
- actualizaciones de Next.js, React, Tailwind u otras dependencias solo por modernizar;
- reemplazar librerías que funcionan;
- reescribir componentes funcionales estables si no es necesario;
- crear datos ficticios;
- crear partidos ficticios;
- crear equipos ficticios;
- inventar logotipos;
- inventar estadísticas;
- inventar sedes;
- inventar jornadas;
- introducir mocks en producción;
- cambiar nombres oficiales;
- eliminar información existente;
- ocultar funcionalidades para que “se vea más limpio”;
- cambiar el diseño del Panel Admin;
- hacer deploy;
- hacer merge a `main`/rama productiva;
- cambiar secretos, `.env`, credenciales o configuración sensible.

## Regla

Si una mejora visual requiere cambiar lógica:

**NO la implementes de esa forma. Busca una alternativa puramente visual.**

Si no existe una alternativa segura:

**repórtala y conserva el comportamiento actual.**

---

# 4. USO OBLIGATORIO DE SUBAGENTES

Usa subagentes para paralelizar investigación, auditoría, QA y revisión.

No realices todo de forma serial si puede dividirse de manera segura.

## Subagente A — Auditor UI/UX

Responsabilidades:

- inspeccionar toda la página pública;
- detectar por qué se siente como dashboard;
- identificar exceso de cards, píldoras, bordes y contenedores;
- revisar jerarquía;
- revisar ritmo vertical;
- revisar desktop y móvil;
- entregar recomendaciones concretas.

**Modo:** análisis / lectura.  
**No debe editar archivos.**

## Subagente B — Arquitecto Visual / Design System

Responsabilidades:

- inventariar tokens visuales actuales;
- proponer sistema coherente de colores, tipografía, escala, spacing, radius, shadows, surfaces, dividers y states;
- definir cómo hacer el sistema más editorial y deportivo.

**Modo:** análisis / lectura.  
**No debe tocar lógica.**

## Subagente C — Responsive Specialist

Responsabilidades:

- revisar 390 px, 430 px, tablet, 1366×768, 1440p y 1920×1080;
- detectar overflow;
- revisar tablas;
- revisar navegación;
- proponer representación móvil de standings y estadísticas;
- verificar touch targets.

**Modo:** análisis y QA.

## Subagente D — Accessibility + Performance

Responsabilidades:

- contraste;
- focus-visible;
- navegación por teclado;
- semántica;
- reduced motion;
- peso de imágenes;
- layout shifts;
- fuentes;
- animaciones;
- renderizado;
- posibles regresiones de performance.

**Modo:** análisis y QA.

## Subagente E — Regression Auditor

Responsabilidades:

Crear una lista de funciones existentes que deben permanecer intactas:

- selección de temporada;
- selección de categoría;
- posiciones;
- líderes;
- estadísticas;
- partidos de mi equipo;
- liguilla;
- calendario;
- Reporte PDF;
- acceso al Admin;
- navegación;
- carga de datos reales.

Al final debe verificar nuevamente todas.

**Modo:** QA.  
**No cambiar lógica.**

## Subagente F — Browser / Visual QA

Cuando haya versión implementada:

- abrir la página en ejecución;
- revisar viewport por viewport;
- buscar elementos cortados, scroll horizontal, jerarquía rota, contrastes deficientes, inconsistencias visuales, componentes que parecen SaaS, problemas de navegación y errores de consola visibles.

## Regla de coordinación

**No permitas que varios subagentes editen simultáneamente los mismos archivos.**

Preferencia:

- subagentes = investigación, auditoría, pruebas y recomendaciones;
- agente principal = integración final y escritura sobre la rama activa.

Si decides usar worktrees o ramas aisladas para una tarea muy concreta, evita conflictos y fusiona únicamente cambios estrictamente visuales ya revisados.

El agente principal es responsable de integrar hallazgos, tomar decisiones de diseño, ejecutar los cambios, resolver conflictos y validar el producto final.

---

# 5. PROCEDIMIENTO OBLIGATORIO

## FASE A — Baseline

Antes de editar:

1. ejecutar `git status`;
2. identificar rama actual;
3. verificar que se está trabajando en una rama de rediseño y no directamente en producción;
4. inspeccionar `package.json`;
5. identificar framework y stack;
6. identificar comandos de dev, build, lint y test;
7. ejecutar el proyecto actual si es posible;
8. revisar página pública;
9. registrar el baseline visual y funcional.

No cambies archivos hasta comprender el proyecto.

## FASE B — Mapa de impacto

Identificar:

- archivo/route de la página pública;
- layouts;
- componentes utilizados;
- estilos globales;
- componentes compartidos con Admin;
- componentes exclusivos de público;
- componentes que manejan funcionalidad;
- componentes puramente visuales.

Para componentes compartidos con Admin:

**NO cambies su comportamiento global si puede afectar el Panel Admin.**

Si hace falta, usa variantes, wrappers, clases específicas o composición exclusiva de la página pública.

---

# 6. NUEVA DIRECCIÓN VISUAL

## Norte visual

**Broadcast Sports Editorial × Premium Digital League × Oaxaca Contemporáneo**

No:

- SaaS;
- dashboard financiero;
- panel de administración;
- gaming RGB;
- casino;
- lujo barroco;
- sitio lleno de cards.

---

# 7. LAYOUT GENERAL

En desktop:

- utilizar un shell amplio;
- `max-width` aproximado de **1440–1600px**, si encaja con la arquitectura;
- aprovechar mejor pantallas grandes;
- establecer una grid editorial de **12 columnas**;
- usar composiciones asimétricas;
- combinar bloques 7/5, 8/4 o similares cuando tenga sentido.

No dejar todo como una aplicación estrecha centrada.

Debe existir un ritmo claro entre zonas atmosféricas, zonas editoriales, datos, tablas y resultados.

---

# 8. HEADER INSTITUCIONAL

Crear un header más parecido al de un portal deportivo oficial.

Debe ser:

- elegante;
- bajo;
- útil;
- limpio;
- responsive.

El acceso administrativo debe existir pero **no competir visualmente con la experiencia pública**.

No convertir cada elemento en una píldora.

---

# 9. HERO DEPORTIVO — CAMBIO MÁS IMPORTANTE

Crear un verdadero **Sports Hero**.

Debe ser la sección de mayor impacto.

## Debe combinar

- LIGA NOCHIXTLÁN;
- liga municipal de básquetbol;
- ubicación / identidad institucional cuando ya exista;
- temporada;
- categoría activa;
- estadísticas reales disponibles;
- fotografía/atmósfera deportiva;
- composición editorial.

## Dirección

En desktop puede utilizar aproximadamente:

- 55–60% información;
- 40–45% elemento visual/fotografía;

o una composición full-width con contenido sobre imagen.

## Fotografía

Si el proyecto ya contiene fotografía deportiva apropiada:

- reutilízala;
- optimízala;
- intégrala mediante masks/gradients/overlays.

Si no existen imágenes adecuadas:

**NO descargues ni inventes activos automáticamente sin necesidad.**

Puedes construir temporalmente la composición con los activos existentes y reportar qué activo fotográfico mejoraría aún más el resultado.

## El Hero debe decir visualmente

> “Aquí se juega básquetbol competitivo.”

No:

> “Bienvenido a nuestro dashboard.”

---

# 10. BACKGROUND

Eliminar el patrón geométrico repetitivo como fondo dominante.

Usar una base limpia y oscura:

- near-black;
- graphite;
- deep navy/charcoal.

Los patrones inspirados en Oaxaca/Nochixtlán pueden existir solo en zonas puntuales y con opacidad extremadamente baja.

---

# 11. COLOR

Conservar una identidad premium oscura.

## Dorado

Reservarlo para:

- categoría activa;
- líder;
- campeón;
- CTA principal;
- puntuación importante;
- selección;
- momentos clave.

Evitar bordear todo de dorado, texto dorado indiscriminado, sombras doradas constantes y glow excesivo.

---

# 12. TIPOGRAFÍA

Crear una jerarquía tipográfica fuerte.

## Display / institucional

Para:

- LIGA NOCHIXTLÁN;
- grandes titulares;
- secciones especiales.

## Sans serif

Para:

- navegación;
- equipos;
- estadísticas;
- tablas;
- labels;
- botones;
- fechas.

Mejorar contraste de tamaños, line-height, weight, tracking y numerales/tabular figures cuando sea apropiado.

---

# 13. NAVEGACIÓN PRINCIPAL

Revisar:

- Posiciones
- Líderes
- Estadísticas
- Partidos de mi equipo
- Liguilla
- Calendario

La navegación debe parecer un portal deportivo.

Preferir underline, barra activa, cambio de weight o background sutil antes que convertir siempre cada item en una cápsula.

Puede ser sticky si mejora navegación.

---

# 14. “LIVE LEAGUE FEEL”

La página debe sentirse viva.

Cuando existan datos reales suficientes, construir módulos visuales para:

- próximo partido;
- último resultado;
- líder actual;
- mejor ofensiva;
- mejor defensiva;
- jornada;
- número de equipos;
- partidos disputados.

Solo si los datos ya están disponibles.

No inventar.

---

# 15. SCORECARDS / PARTIDOS

Si la información ya existe, crear componentes de partido con apariencia profesional.

Ejemplo conceptual:

```text
JORNADA 12 · FINAL

MUEBLES CARLITOS          78
GUERREROS                 72

Cancha Bicentenario
```

O próximos partidos:

```text
VIERNES · 20:00

MUEBLES CARLITOS
      VS
GUERREROS
```

Priorizar equipos, marcador, estado, fecha y sede.

---

# 16. POSICIONES

La tabla es crítica.

Debe verse como una **clasificación oficial**, no una colección de cards.

## Cambiar

- reducir card-per-row;
- utilizar divisores;
- aumentar jerarquía de posición;
- mejorar alineación numérica;
- utilizar `tabular-nums` si procede;
- simplificar backgrounds;
- fortalecer encabezado;
- facilitar scanning horizontal.

## Líder

El líder puede tener un pequeño accent, crown/medal si ya existe, rail lateral o fondo ligeramente diferente.

## Mobile

No aplastar 10 columnas.

Crear una representación responsive que priorice posición, equipo, PJ, PG, PP y puntos, y permita ver información secundaria de manera elegante.

---

# 17. EQUIPOS

Los equipos deben sentirse protagonistas.

Si existen logos:

- utilizarlos correctamente;
- respetar aspect ratio;
- evitar contenedores excesivamente pequeños.

Si no existen:

**NO inventarlos.**

Conservar iniciales/placeholders actuales con un sistema visual más sólido.

---

# 18. LÍDERES Y ESTADÍSTICAS

Evitar otra gran tabla genérica si existe una forma más clara.

Utilizar cuando ayude:

- rankings;
- stat cards;
- compact bars;
- leader rows;
- top 3;
- badges contextuales.

Pero evitar un “dashboard de KPIs”.

---

# 19. LIGUILLA

Si existe bracket:

- darle respiración;
- permitir lectura;
- jerarquizar rondas;
- destacar avance de equipos;
- asegurar buen scroll/control móvil.

No cambiar lógica.

---

# 20. CALENDARIO

Debe responder rápido:

- quién juega;
- cuándo;
- dónde;
- qué categoría;
- resultado si terminó.

Evitar densidad innecesaria.

---

# 21. SISTEMA DE SUPERFICIES

Reducir drásticamente el abuso de:

- cards;
- border radius grande;
- bordes visibles;
- cápsulas.

Definir aproximadamente:

- `surface-page`;
- `surface-section`;
- `surface-elevated`;
- `surface-highlight`.

No usar una tarjeta dentro de otra dentro de otra.

---

# 22. BORDER RADIUS

Escala controlada:

- small: 6–8px
- medium: 10–12px
- large: 16–20px

Pill únicamente para badges, estados y filtros cuando tenga sentido.

---

# 23. ESPACIADO

Definir spacing consistente.

Aumentar espacio editorial y separación entre secciones.

Reducir padding excesivo dentro de nested cards.

---

# 24. MICROINTERACCIONES

## Duración

- 120–180 ms: estados pequeños;
- 180–250 ms: tabs/cards;
- 250–350 ms: entrada de secciones puntuales.

## Permitido

- opacity;
- translateY 1–3px;
- underline;
- border;
- background;
- numeric transitions;
- subtle reveal;
- skeleton loading.

## Evitar

- bounce;
- parallax agresivo;
- partículas;
- loops;
- glow pulsante;
- scale grande;
- animaciones largas.

Respetar `prefers-reduced-motion`.

---

# 25. STATES

Crear experiencia consistente para:

- loading;
- error;
- empty;
- disabled;
- active;
- hover;
- focus-visible.

No introducir nuevos flujos.

---

# 26. RESPONSIVE

## Viewports mínimos

- 390×844;
- 430×932;
- 768px;
- 1024px;
- 1366×768;
- 1440×900;
- 1920×1080.

## Reglas

- no overflow horizontal global;
- no texto cortado;
- botones cómodos;
- navegación clara;
- tablas adaptadas;
- hero reordenado en móvil;
- no hover-only interactions.

---

# 27. ACCESIBILIDAD

Objetivo mínimo razonable:

**WCAG AA**.

Verificar:

- contraste;
- teclado;
- `focus-visible`;
- headings;
- aria cuando haga falta;
- controles con labels;
- touch targets;
- reduced motion;
- semántica de tablas;
- color no como único indicador.

---

# 28. PERFORMANCE

No sacrificar performance por estética.

Evitar nuevas dependencias visuales grandes, imágenes no optimizadas, blur gigantes, video de fondo, canvas innecesario y JS para efectos que CSS resuelve.

Priorizar CSS, assets existentes, componentes actuales, lazy load, image optimization y `transform`/`opacity` para motion.

---

# 29. DEPENDENCIAS

No instalar nuevas librerías salvo que sea realmente imprescindible.

Antes de instalar una:

1. comprobar si el stack actual resuelve el problema;
2. evaluar tamaño;
3. evaluar mantenimiento;
4. justificarla.

---

# 30. IMPLEMENTACIÓN

El agente principal debe implementar por bloques:

1. tokens/design system;
2. page shell;
3. header;
4. hero;
5. navigation;
6. sports highlights;
7. standings;
8. otras secciones;
9. responsive;
10. accessibility;
11. motion;
12. polish.

Después de cada bloque, revisar errores y mantener funcionalidad.

---

# 31. QA FUNCIONAL OBLIGATORIO

Verificar:

- carga inicial;
- temporada;
- categoría;
- Posiciones;
- Líderes;
- Estadísticas;
- Partidos de mi equipo;
- Liguilla;
- Calendario;
- Reporte PDF;
- acceso al Admin;
- refresh;
- estados de carga;
- datos reales.

El Panel Admin debe conservar su aspecto y comportamiento actual.

---

# 32. QA TÉCNICO

Ejecutar solo los scripts que existan realmente:

```bash
npm run build
npm run lint
npm test
```

Si un script no existe, reportarlo.

El build de producción debe pasar.

---

# 33. GIT SAFETY

Trabajar exclusivamente en la rama de rediseño preparada por el usuario.

Antes de tocar archivos:

```bash
git status
git branch --show-current
```

No ejecutar sin autorización explícita:

- `git reset --hard`;
- `git clean -fd`;
- force push;
- rebase destructivo;
- eliminación masiva;
- acciones que descarten trabajo.

**No hacer merge a producción.**

---

# 34. AUTOMATIZACIÓN Y AUTONOMÍA

Una vez que el entorno haya sido configurado por el usuario para autoaprobar operaciones seguras:

- no pidas confirmaciones innecesarias;
- continúa autónomamente con análisis, edición, build, lint y pruebas;
- agrupa operaciones;
- usa subagentes;
- no detengas el flujo por decisiones triviales.

## PERO

La autonomía NO autoriza:

- deploy;
- merge a rama productiva;
- manipulación de secretos;
- acceso fuera del workspace;
- comandos destructivos;
- borrado masivo;
- cambios de infraestructura;
- modificaciones fuera del alcance.

Ante esos casos:

**detente y solicita autorización.**

---

# 35. CRITERIOS DE CALIDAD

No marques la tarea como terminada si solo hiciste:

- nuevos bordes;
- gradients;
- más dorado;
- más sombras;
- otro radius;
- cambios menores de padding.

Debe existir una diferencia clara en:

- composición;
- hero;
- jerarquía;
- presentación deportiva;
- uso del espacio;
- tratamiento de equipos;
- standings;
- experiencia responsive.

---

# 36. TEST VISUAL FINAL

Pregúntate:

### ¿Parece un dashboard?
Si sí, continúa refinando.

### ¿Parece una web gamer?
Si sí, elimina efectos.

### ¿Parece una web oficial deportiva?
Debe ser sí.

### ¿Los datos siguen siendo protagonistas?
Debe ser sí.

### ¿Se entiende en menos de 5 segundos qué es Liga Nochixtlán?
Debe ser sí.

### ¿Se siente bien en móvil?
Debe ser sí.

---

# 37. ENTREGA FINAL

Entregar:

## Archivos modificados
Lista exacta.

## Cambios visuales
Por sección.

## Design System
Tokens/decisiones principales.

## Responsive
Cambios por viewport.

## Accesibilidad
Mejoras realizadas.

## Performance
Medidas tomadas.

## Pruebas
Comandos ejecutados y resultado.

## Regression Check
Funciones verificadas.

## Problemas previos
Solo reportar problemas no relacionados.

## Riesgos pendientes
Si existen.

## Estado
Terminar con:

- `LISTO PARA PREVIEW`
- o `NO LISTO PARA PREVIEW` + motivos.

Nunca hacer deploy o merge automáticamente.

---

# 38. INSTRUCCIÓN FINAL AL AGENTE PRINCIPAL

Antes de empezar:

1. lee este documento completo;
2. invoca los subagentes necesarios;
3. paraleliza auditoría UI/UX, design system, responsive, accesibilidad/performance y regression mapping;
4. integra sus hallazgos;
5. crea una estrategia visual;
6. implementa como único integrador principal;
7. prueba continuamente;
8. ejecuta QA final;
9. entrega reporte.

No me pidas confirmación para operaciones normales, reversibles y dentro del workspace si ya están permitidas por la configuración de Antigravity.

Sí debes detenerte antes de cualquier acción destructiva, deployment, merge productivo, modificación de secretos o cambio fuera del alcance.

# UNA PÁGINA PÚBLICA ESPECTACULAR + CERO REGRESIONES.

---

# PLAN DE EJECUCIÓN DEL USUARIO

## Paso 1 — Guardar versión estable

```bash
git status
git add .
git commit -m "backup: stable version before sports portal redesign"
git push
```

Si no hay cambios pendientes, no crear commit vacío.

## Paso 2 — Crear rama exclusiva

```bash
git checkout -b redesign/sports-portal-v2
```

Si ya existe:

```bash
git checkout redesign/sports-portal-v2
```

## Paso 3 — Colocar este archivo en el repositorio

Nombre:

```text
MEGAPROMPT_LIGA_NOCHIXTLAN_V2.md
```

## Paso 4 — Prompt inicial para Antigravity

```text
Lee completamente MEGAPROMPT_LIGA_NOCHIXTLAN_V2.md.

Ejecuta el plan completo descrito en el documento.

Usa subagentes para auditoría UI/UX, design system, responsive, accesibilidad/performance, regression QA y browser QA.

No realices cambios de backend, base de datos, lógica, Admin o infraestructura.

Trabaja en la rama actual de rediseño.

No hagas deploy ni merge a producción.

Puedes operar autónomamente dentro del workspace y ejecutar las verificaciones necesarias sin pedirme confirmaciones triviales, siempre respetando las restricciones del documento.

Empieza por el baseline, invoca subagentes y procede hasta dejar el resultado LISTO PARA PREVIEW.
```

---

# CONFIGURACIÓN RECOMENDADA DE PERMISOS EN ANTIGRAVITY

La meta es reducir prompts repetitivos **sin darle acceso ilimitado al equipo**.

## Recomendado

### Terminal Command Auto Execution

Configurar:

**Always Proceed**

Esto permite ejecutar comandos automáticamente salvo los que estén explícitamente en `deny`.

### Mantener desactivado

**Agent Non-Workspace File Access**

Este rediseño no necesita acceso a archivos personales fuera del repositorio.

## Acciones habituales que pueden autoaprobarse

- `git status`
- `git diff`
- `git log`
- `git branch`
- `git add`
- `git commit`
- `npm`
- `npx`
- `node`

Según el proyecto también:

- `pnpm`
- `yarn`

## Mantener bloqueadas o con aprobación manual

- `rm -rf`
- `git reset --hard`
- `git clean -fd`
- `git push --force`
- rebases destructivos
- deployment
- cambios fuera del workspace
- manipulación de credenciales
- comandos administrativos
- acciones web con efectos externos

---

# OPCIÓN MULTI-AGENTE

Si tu instalación/plan dispone de **Antigravity 2.0 Teamwork**, puedes iniciar:

```text
/teamwork-preview
```

y después darle el prompt inicial.

Reglas:

- un único integrador de cambios principales;
- subagentes para investigación y QA;
- no editar los mismos archivos en paralelo sin aislamiento;
- no merge/deploy automático.

---

# ANTES DE PREVIEW

Ejecutar:

```bash
git status
git diff
npm run build
```

Cuando existan:

```bash
npm run lint
npm test
```

Revisar:

- desktop;
- móvil;
- temporadas;
- categorías;
- posiciones;
- líderes;
- estadísticas;
- partidos;
- liguilla;
- calendario;
- PDF;
- Admin.

---

# COMMIT DEL REDISEÑO

Cuando el resultado local sea correcto:

```bash
git add .
git commit -m "feat: redesign Liga Nochixtlan public sports portal"
git push -u origin redesign/sports-portal-v2
```

---

# PREVIEW

Usar el deployment Preview de la rama si el proyecto está conectado a una plataforma como Vercel.

No hacer merge todavía.

Comparar producción actual vs Preview.

Solo aprobar si:

- es claramente superior;
- funciona en móvil;
- mantiene datos;
- no rompe Admin;
- build pasa;
- PDF funciona;
- navegación funciona.

---

# PRODUCCIÓN

Únicamente después de aprobación manual.

Preferir Pull Request y merge controlado.

Después del deployment:

- smoke test;
- verificar consola;
- probar rutas principales;
- probar PDF;
- probar Admin;
- probar teléfono.

Si algo falla, realizar rollback al deployment/commit estable.

---

# REGLA DE ORO

**Autonomía para construir y probar.  
Aprobación humana para destruir, desplegar o afectar producción.**
