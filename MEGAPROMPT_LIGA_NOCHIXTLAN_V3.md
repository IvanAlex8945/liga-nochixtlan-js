# MEGAPROMPT V3 — Rediseño Total de la Página Oficial de Liga Nochixtlán

> **Objetivo general:** rehacer visualmente desde cero la **página pública/oficial** de Liga Nochixtlán para que deje de sentirse como dashboard y pase a sentirse como un **portal deportivo oficial, moderno, espectacular y memorable**, inspirado conceptualmente en la energía de una landing page de torneo/básquetbol de alto impacto, **sin copiar diseños existentes ni usar elementos con copyright**, y **sin romper absolutamente nada de la lógica, datos o funciones que ya sirven**.

---

# 0. IDEA CENTRAL

La versión actual está funcional, limpia y estable, pero todavía se percibe demasiado como:

- dashboard;
- sistema administrativo bonito;
- tabla con estilo premium;

y no lo suficiente como:

- portal oficial de una liga;
- experiencia deportiva inmersiva;
- sitio que los aficionados quieren visitar;
- página con personalidad propia;
- producto visual con impacto inmediato.

Quiero una **nueva generación visual**, incluso si la página pública se reconstruye completamente desde cero a nivel de interfaz.

## MUY IMPORTANTE

**Sí puedes rediseñar completamente la página pública desde cero a nivel visual y estructural, pero NO puedes romper ni alterar la lógica que ya funciona.**

Eso significa:

- nueva arquitectura visual;
- nuevo layout;
- nuevo hero;
- nueva navegación;
- nuevas transiciones;
- nueva presentación de secciones;
- nueva experiencia responsive;

pero conservando intactos:

- datos reales;
- consultas;
- lógica;
- cálculos;
- panel admin;
- reportes;
- rutas;
- comportamiento funcional actual.

---

# 1. ROL DEL AGENTE

Actúa como un equipo coordinado de alto nivel compuesto por:

- **Creative Director**
- **Senior Sports Product Designer**
- **Senior UI/UX Designer**
- **Senior Front-End Engineer**
- **Design Systems Engineer**
- **Animation / Interaction Designer**
- **Responsive & Mobile Specialist**
- **Accessibility Specialist**
- **Performance Engineer**
- **QA / Regression Engineer**

Tu misión es entregar una **página pública espectacular**, que se sienta como la presencia digital oficial de una liga de básquetbol seria, moderna y emocionante.

---

# 2. REFERENCIA DE DIRECCIÓN VISUAL

La tercera imagen compartida por el usuario funciona como **referencia conceptual de energía e impacto**, no como plantilla para copiar.

## Toma de esa referencia únicamente estas ideas de alto nivel:

- sensación de evento deportivo;
- hero más impactante;
- visual más memorable;
- presencia clara del básquetbol;
- navegación más protagonista;
- una experiencia menos “tabla de datos” y más “portal de liga”;
- mayor dinamismo visual;
- transiciones más notorias;
- atmósfera de torneo.

## PROHIBIDO

No copies literalmente:

- layout exacto;
- ilustraciones exactas;
- tipografías idénticas si son distintivas;
- watermark;
- textos;
- composición clonada;
- logos;
- identidad de terceros;
- recursos con copyright no licenciados;
- branding de Shutterstock ni de ninguna otra marca restringida.

La inspiración debe ser **abstracta y conceptual**, no una copia.

---

# 3. OBJETIVO DE RESULTADO

Cuando una persona abra la página debe sentir inmediatamente:

- **BÁSQUETBOL**
- **COMPETENCIA**
- **ESPECTÁCULO**
- **OFICIALIDAD**
- **PRESTIGIO**
- **MODERNIDAD**
- **IDENTIDAD DE LIGA**
- **NOCHIXTLÁN**

El resultado final debe parecer mucho más cercano a:

- home de torneo;
- portal deportivo oficial;
- experiencia editorial deportiva;
- producto de seguimiento de liga;

y mucho menos a:

- panel administrativo;
- dashboard SaaS;
- app de tablas con buen CSS.

---

# 4. RESTRICCIONES ABSOLUTAS — NO ROMPER NADA

## NO modificar

- backend;
- base de datos;
- modelos;
- migraciones;
- APIs;
- endpoints;
- Server Actions;
- autenticación;
- sesiones;
- permisos;
- estructura de datos;
- lógica de negocio;
- cálculos de posiciones;
- cálculos de estadísticas;
- lógica de partidos;
- lógica de calendario;
- lógica de liguilla;
- generación de PDF;
- consultas;
- fetching;
- variables de entorno;
- configuración sensible;
- infraestructura;
- rutas;
- nombres de propiedades;
- Panel Admin.

## NO hacer

- inventar datos;
- inventar partidos;
- inventar equipos;
- inventar estadísticas;
- inventar sedes;
- romper reportes;
- tocar lógica porque “es más cómodo rehacerla”;
- cambiar funcionalidades existentes;
- degradar performance de forma importante;
- instalar dependencias grandes sin justificación;
- hacer deploy automático;
- hacer merge a la rama productiva;
- ejecutar acciones destructivas;
- cambiar cosas fuera del alcance solicitado.

## REGLA MAESTRA

Si una mejora visual parece requerir cambios de lógica, entonces:

1. primero intenta resolverlo únicamente a nivel de presentación;
2. si no es posible, conserva el funcionamiento actual;
3. reporta la limitación;
4. no rompas nada para lograr el efecto visual.

---

# 5. USO OBLIGATORIO DE SUBAGENTES

Quiero que uses subagentes para acelerar el trabajo y repartir investigación, auditoría y pruebas.

## Subagente A — UI/UX Audit

Debe:

- auditar la página pública actual;
- identificar por qué se sigue sintiendo dashboard;
- detectar dónde falta emoción visual;
- proponer una nueva jerarquía;
- detectar abuso de cards, pills, bordes y cajas.

**No edita archivos. Solo analiza.**

---

## Subagente B — Creative / Visual Direction

Debe:

- definir una dirección de arte coherente;
- proponer moodboard conceptual;
- aterrizar paleta, tipografía, superficie, contraste y composición;
- proponer cómo elevar la experiencia sin copiar referencias.

**No toca lógica.**

---

## Subagente C — Architecture / Safe Integration

Debe:

- identificar qué componentes pertenecen exclusivamente a la página pública;
- detectar qué componentes son compartidos con Admin;
- proponer el camino más seguro para rehacer el frontend público sin afectar lo demás;
- recomendar wrappers, variantes y composición específica para público.

---

## Subagente D — Motion & Interaction

Debe:

- definir cómo implementar transiciones de secciones/pestañas;
- diseñar un sistema de animaciones elegante;
- definir swipe-like transitions o deslizamientos entre tabs;
- revisar que las transiciones no afecten accesibilidad ni rendimiento.

---

## Subagente E — Responsive Specialist

Debe revisar:

- 390px;
- 430px;
- tablet;
- laptop;
- desktop amplio.

Y proponer:

- layout móvil;
- tratamiento de tablas;
- navegación táctil;
- comportamiento del hero;
- secciones swipeables si aportan valor.

---

## Subagente F — Accessibility + Performance

Debe revisar:

- contraste;
- focus states;
- reduced motion;
- semántica;
- velocidad;
- peso de recursos;
- layout shifts;
- costo de animaciones.

---

## Subagente G — Regression QA

Debe preparar y ejecutar una lista de verificación de funciones que no deben romperse:

- cambio de temporada;
- cambio de categoría;
- posiciones;
- líderes;
- estadísticas;
- mi equipo;
- liguilla;
- calendario;
- PDF;
- navegación;
- acceso Admin.

---

## Coordinación

Los subagentes deben trabajar en paralelo para:

- investigación;
- revisión;
- QA;
- planificación.

El **agente principal** es el único responsable de integrar cambios principales en la rama de trabajo.

No permitas que varios agentes modifiquen simultáneamente los mismos archivos si eso puede crear conflictos.

---

# 6. NUEVA DIRECCIÓN DE DISEÑO

## Quiero que la página pública se rediseñe desde cero como una experiencia editorial-deportiva

Esto implica abandonar el enfoque:

- gran bloque central;
- demasiadas cajas;
- demasiadas cards;
- tabs demasiado simples;
- todo centrado como si fuera un panel.

## La nueva home debe sentirse más como una landing deportiva viva

Debe incluir:

- hero fuerte;
- navegación poderosa;
- secciones con más storytelling;
- mejor sensación de liga en curso;
- jerarquía visual mucho más marcada;
- equipos y jugadores más protagonistas;
- transición fluida entre pestañas;
- estética más impactante.

---

# 7. LAYOUT GENERAL

## Desktop

Quiero una composición mucho más ambiciosa que la actual.

Puedes reconstruir completamente la estructura visual del frontend público.

### Requisitos

- shell amplio;
- mejor aprovechamiento del ancho;
- grid moderna;
- secciones diferenciadas;
- bloques editoriales;
- ritmo visual;
- no todo metido dentro de una sola caja.

### Puedes usar

- hero full width o semi full width;
- secciones en grid 12 columnas;
- composiciones 7/5, 8/4, 6/6 según convenga;
- zonas de contenido destacadas y zonas secundarias;
- combinación de texto, datos y visual deportivo.

---

# 8. HERO — CAMBIO CRÍTICO

El hero actual no es suficientemente espectacular.

Quiero un **hero totalmente nuevo**, mucho más impactante y memorable.

## Debe incluir

- nombre de la liga;
- subtítulo institucional;
- temporada activa;
- categoría activa;
- datos reales destacados;
- presencia deportiva potente;
- un visual de básquetbol o ambiente de juego;
- composición cinematográfica/editorial.

## El hero debe transmitir

> “Esta es la plataforma oficial de una liga de básquetbol.”

No:

> “Este es un sistema bonito con datos.”

## Puedes apoyarte en

- imagen o ilustración deportiva ya disponible en el proyecto si existe;
- gradientes;
- overlays;
- sombras;
- máscaras;
- contraste;
- iluminación;
- tipografía grande;
- visual principal tipo poster/cover;
- paneles informativos secundarios.

## Si no hay un asset visual ideal

No inventes un recurso ilegal ni copies uno con copyright.

Puedes:

- reutilizar fondos existentes;
- construir una abstracción visual más potente;
- utilizar elementos gráficos genéricos de básquetbol si es seguro y propio del proyecto;
- reportar si un asset fotográfico propio elevaría aún más el resultado.

---

# 9. NAVEGACIÓN PRINCIPAL

Quiero que la navegación por pestañas mejore radicalmente.

## Debe sentirse más viva

- más clara;
- más moderna;
- más deportiva;
- más protagonista.

## Quiero una transición visual al cambiar de pestaña

Idealmente:

- efecto tipo **swipe / slide transition**;
- o deslizamiento horizontal elegante;
- o panel transition limpia;
- o animación de contenido entrante/saliente.

## RESTRICCIONES

La animación debe ser:

- rápida;
- fluida;
- profesional;
- no exagerada;
- accesible;
- eficiente.

## Permitido

- transform + opacity;
- slide/fade;
- content transition;
- animated underline;
- tab indicator;
- directional transitions.

## Evitar

- animaciones pesadas;
- saltos bruscos;
- largas esperas;
- efectos infantiles;
- transitions que oculten la información demasiado tiempo.

## Si el usuario toca una pestaña

Quiero una experiencia que se sienta moderna, no un simple cambio instantáneo y seco.

---

# 10. EXPERIENCIA “SWIPE” ENTRE PESTAÑAS

Sí, quiero que explores seriamente una experiencia de navegación con sensación de swipe.

## Objetivo

Que al cambiar entre:

- Posiciones
- Líderes
- Estadísticas
- Mi equipo
- Liguilla
- Calendario

se perciba una transición rica y elegante.

## Esto puede resolverse como

- horizontal slide;
- swipe-like panel animation;
- carousel-like controlled section transition;
- animated content stage;
- tab content switch con dirección.

## Pero

- sin romper navegación;
- sin romper SEO básico;
- sin convertirlo en un carrusel incómodo;
- sin afectar el rendimiento;
- sin obligar al usuario a esperar demasiado.

## Si hay soporte táctil

Puedes considerar swipe real en móvil **siempre que sea robusto y no cause errores**.

Si no es seguro, mantén únicamente la sensación visual de swipe al cambiar de pestaña.

---

# 11. HOME MUCHO MÁS INTERESANTE

La home debe dejar de ser solamente “selector + tabs + tabla”.

Quiero más vida y más contenido visualmente inteligente.

## Si los datos ya existen, quiero módulos como:

- **destacado principal**;
- **próximo partido**;
- **último resultado**;
- **líder general**;
- **mejor ofensiva**;
- **mejor defensiva**;
- **top jugador**;
- **racha o récord**;
- **equipos participantes**;
- **partidos disputados**.

## REGLA

Solo mostrar lo que pueda alimentarse con datos reales ya disponibles.

No inventes.

---

# 12. POSICIONES

La tabla debe seguir siendo muy importante, pero debe sentirse más oficial y mejor integrada en una experiencia deportiva.

## Mejoras esperadas

- mayor jerarquía visual;
- mejor encabezado;
- mejor densidad;
- mejor legibilidad;
- mejor alineación numérica;
- mejor tratamiento del líder;
- filas más elegantes;
- menos sensación de cards sueltas;
- integración con la nueva dirección visual.

## Quiero

- que la tabla se vea profesional;
- que sea fácil de escanear;
- que el líder destaque;
- que el resto no se vea plano;
- que no parezca una tabla genérica.

---

# 13. LÍDERES / ESTADÍSTICAS

Actualmente estas secciones pueden mejorar mucho.

## Deben ser más interesantes visualmente

- top scorers;
- top tripleros;
- récords;
- categorías destacadas;
- mejores jugadores;
- rankings.

## Quiero que estas pantallas se sientan valiosas

No solo tablas oscuras.

Puedes utilizar:

- paneles destacados;
- tarjetas de récord;
- bloques secundarios;
- jerarquías de top 3;
- columnas limpias;
- micrográficos si aportan valor.

---

# 14. MI EQUIPO / LIGUILLA / CALENDARIO

Estas vistas deben integrarse al mismo sistema visual renovado.

## Deben ser

- consistentes con la nueva identidad;
- claras;
- útiles;
- atractivas;
- bien espaciadas;
- bien adaptadas a móvil;
- con navegación fluida.

No cambiar lógica.

---

# 15. FONDO Y ATMÓSFERA

Quiero una atmósfera más impactante que la actual.

## Puedes usar

- fondos oscuros premium;
- gradientes;
- iluminación sutil;
- overlays;
- contraste controlado;
- detalles geométricos muy discretos;
- presencia de básquetbol.

## Evitar

- patrón repetitivo dominante en toda la página si empobrece el look;
- brillo excesivo;
- neón gamer;
- exceso de ornamento;
- estética recargada.

---

# 16. PALETA Y COLOR

Mantener una base oscura premium.

## Dorado

Seguir usándolo, pero con intención.

Debe funcionar como:

- acento;
- prestigio;
- selección;
- jerarquía;
- llamada visual.

No satures todo con dorado.

## Puedes ampliar el sistema con

- blancos / grises bien calibrados;
- azul oscuro / navy;
- acentos secundarios controlados;
- indicadores funcionales limpios.

---

# 17. TIPOGRAFÍA

Quiero una tipografía con más carácter y mejor jerarquía.

## Recomendación

- una tipografía display/institucional para el nombre de la liga y grandes titulares;
- una sans serif moderna, deportiva y limpia para navegación, estadísticas, equipos y datos.

## Objetivo

Que la página tenga:

- más impacto;
- más contraste;
- más personalidad;
- más legibilidad.

---

# 18. MOTION DESIGN

Quiero motion design mejor pensado.

## Debe incluir

- transición entre pestañas;
- hover states elegantes;
- activación de navegación;
- aparición de secciones;
- posibles contadores o microtransiciones numéricas;
- cambios de contenido más agradables.

## Debe ser

- premium;
- rápida;
- suave;
- coherente;
- sin volverse molesta.

## Respetar

- `prefers-reduced-motion`;
- rendimiento;
- accesibilidad.

---

# 19. RESPONSIVE

Quiero que la nueva experiencia sea excelente en:

- móvil;
- tablet;
- laptop;
- desktop.

## Revisión mínima

- 390px;
- 430px;
- 768px;
- 1024px;
- 1366px;
- 1440px;
- 1920px.

## En móvil

- hero reestructurado;
- navegación usable;
- tablas adaptadas;
- secciones bien apiladas;
- swipe o transición táctil bien pensada si es segura;
- sin overflow horizontal innecesario;
- sin texto diminuto.

---

# 20. ACCESIBILIDAD

No sacrifiques usabilidad por espectacularidad.

## Mantener o mejorar

- contraste;
- teclado;
- focus-visible;
- jerarquía de headings;
- etiquetas correctas;
- áreas táctiles;
- reduced motion;
- semántica de tablas y controles.

---

# 21. PERFORMANCE

No quiero que la página se vuelva pesada por querer hacerla espectacular.

## Regla

La espectacularidad debe venir de:

- composición;
- tipografía;
- jerarquía;
- motion ligero;
- superficies;
- contenido;
- atmósfera;

más que de:

- efectos pesados;
- librerías gigantes;
- fondos innecesarios;
- scripts excesivos.

## Evitar

- dependencias pesadas si no son necesarias;
- múltiples animaciones simultáneas costosas;
- layout shift;
- vídeo de fondo salvo que ya exista y sea justificable;
- filtros extremos.

---

# 22. IMPLEMENTACIÓN SEGURA

Puedes reconstruir visualmente la página pública desde cero, **pero de forma segura**.

## Estrategia recomendada

1. auditar;
2. mapear componentes;
3. detectar shared components con Admin;
4. aislar la página pública;
5. crear nuevo shell/layout público;
6. reconstruir hero + navegación + tabs;
7. integrar secciones existentes bajo la nueva experiencia;
8. añadir motion;
9. revisar responsive;
10. ejecutar pruebas funcionales;
11. dejar listo para preview.

## Si un componente compartido con Admin puede verse afectado

No lo cambies de forma global.

Crea:

- variantes;
- wrappers;
- props visuales;
- estilos específicos para la página pública.

---

# 23. NO QUIERO SOLO UN LAVADO DE CARA

Esto es importante.

No quiero únicamente:

- cambiar bordes;
- cambiar paddings;
- cambiar colores;
- agregar un par de gradientes;
- mover la tabla un poco.

Quiero un cambio visual claro y profundo.

Cuando compare el “antes” y “después”, debe sentirse como una nueva versión importante del producto público.

---

# 24. QA FUNCIONAL OBLIGATORIO

Antes de considerar terminado el trabajo, verificar:

- carga inicial;
- compilación correcta;
- navegación general;
- cambio de temporada;
- cambio de categoría;
- Posiciones;
- Líderes;
- Estadísticas;
- Mi equipo;
- Liguilla;
- Calendario;
- Reporte PDF;
- acceso al Admin;
- versión móvil;
- versión desktop;
- ausencia de errores nuevos en consola.

Si algo se rompe:

- arréglalo;
- o revierte la parte visual que lo rompe.

Nunca priorices estética sobre funcionamiento.

---

# 25. QA TÉCNICO OBLIGATORIO

Ejecutar, si existen:

```bash
npm run build
npm run lint
npm test
```

Si un script no existe, reportarlo.

La página pública debe quedar **LISTA PARA PREVIEW**, no simplemente “bonita en local”.

---

# 26. GIT Y SEGURIDAD

Trabaja en la rama de rediseño del usuario.

Antes de empezar, revisar:

```bash
git status
git branch --show-current
```

## No ejecutar sin autorización explícita

- `git reset --hard`
- `git clean -fd`
- `git push --force`
- despliegues a producción
- merges a `main`
- acciones destructivas
- cambios fuera del workspace
- manipulación de secretos

---

# 27. AUTONOMÍA Y PERMISOS

Una vez que el usuario haya configurado Antigravity para autoaprobar operaciones normales y seguras:

- no detengas el trabajo por confirmaciones triviales;
- continúa de forma autónoma;
- usa subagentes;
- ejecuta pruebas y verificaciones necesarias;
- trabaja hasta dejar el proyecto listo para preview.

## PERO

La autonomía **NO** autoriza:

- deploy;
- merge productivo;
- acciones destructivas;
- acceso a secretos;
- cambios fuera de alcance.

En esos casos, detente y pide autorización.

---

# 28. ENTREGA FINAL

Al terminar, quiero un reporte corto y claro con:

## 1. Resumen del rediseño
Qué cambió a nivel visual y de experiencia.

## 2. Archivos modificados
Lista exacta.

## 3. Subagentes utilizados
Qué tarea hizo cada uno.

## 4. Mejoras de motion
Qué animaciones/transiciones se implementaron.

## 5. Responsive
Qué adaptaciones importantes se hicieron.

## 6. Accesibilidad
Qué mejoras se aplicaron.

## 7. Performance
Qué se cuidó o mejoró.

## 8. Regression checklist
Qué funciones se probaron.

## 9. Estado final
Termina obligatoriamente con una de estas frases:

- `LISTO PARA PREVIEW`
- `NO LISTO PARA PREVIEW`

Si no está listo, explica por qué.

No hagas deploy ni merge.

---

# 29. INSTRUCCIÓN FINAL AL AGENTE

Lee este documento completo.

Después:

1. invoca subagentes;
2. audita la situación actual;
3. define una nueva dirección visual;
4. rehace visualmente la página pública desde cero si es necesario;
5. conserva intacta la lógica;
6. implementa transición rica entre pestañas, idealmente con sensación de swipe;
7. asegura una experiencia mucho más espectacular e interesante;
8. prueba todo;
9. deja el resultado listo para preview;
10. entrega el reporte final.

La prioridad absoluta es:

# REDISEÑO TOTAL DE LA PÁGINA PÚBLICA + IMPACTO VISUAL MUCHO MAYOR + CERO REGRESIONES FUNCIONALES

---

# INSTRUCCIONES PARA EL USUARIO — PLAN DE EJECUCIÓN

## Paso 1 — Guardar tu versión estable

Desde la raíz del proyecto:

```bash
git status
git add .
git commit -m "backup: stable version before full public redesign"
git push
```

Si no hay cambios pendientes, puedes omitir `git add` y `git commit`.

---

## Paso 2 — Crear una rama nueva para esta tercera iteración

```bash
git checkout -b redesign/public-v3-sports-portal
```

Si ya existe:

```bash
git checkout redesign/public-v3-sports-portal
```

---

## Paso 3 — Guardar este archivo dentro del proyecto

Nombre recomendado:

```text
MEGAPROMPT_LIGA_NOCHIXTLAN_V3.md
```

---

## Paso 4 — Prompt inicial para Antigravity

Pégale exactamente esto:

```text
Lee completamente el archivo MEGAPROMPT_LIGA_NOCHIXTLAN_V3.md.

Quiero que ejecutes todo el plan descrito ahí.

Tienes permiso para rehacer completamente la página pública/oficial desde cero a nivel visual y estructural, SIEMPRE QUE no rompas ninguna funcionalidad existente ni modifiques lógica, backend, base de datos, autenticación, rutas, PDF o Panel Admin.

Usa subagentes para:
- auditoría UI/UX;
- dirección visual;
- motion;
- responsive;
- accesibilidad/performance;
- regression QA.

Quiero una experiencia mucho más espectacular, más parecida a un portal deportivo oficial, y menos a un dashboard.

Explora una transición rica entre pestañas con sensación de swipe o slide, siempre que sea segura, fluida y no afecte rendimiento ni accesibilidad.

No hagas deploy.
No hagas merge a producción.
Trabaja de forma autónoma dentro del workspace hasta dejar el proyecto LISTO PARA PREVIEW.
```

---

# CONFIGURACIÓN RECOMENDADA DE PERMISOS PARA EVITAR TENER QUE DAR “SUBMIT” CADA RATO

## 1. Terminal Command Auto Execution

En Antigravity, entra a:

**Settings → Agent Settings → Terminal Command Auto Execution**

Configúralo en:

**Always Proceed**

Esto permite que Antigravity ejecute comandos normales sin detenerse a cada rato, excepto los que estén bloqueados por reglas más estrictas.

---

## 2. Mantén DESACTIVADO el acceso fuera del workspace

Busca:

**Agent Non-Workspace File Access**

Déjalo en:

**OFF**

Para este proyecto no necesita acceso a otras carpetas personales fuera del repositorio.

---

## 3. Autoaprobar comandos normales y bloquear los peligrosos

Permitir normalmente:

- `git status`
- `git diff`
- `git log`
- `git branch`
- `git add`
- `git commit`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm test`
- `node`
- `npx`

Mantener bloqueados o con aprobación manual:

- `rm -rf`
- `git reset --hard`
- `git clean -fd`
- `git push --force`
- despliegues
- merges a producción
- cambios fuera del workspace
- manipulación de credenciales
- acciones administrativas sensibles

---

## 4. Si tienes modo multiagente / teamwork

Si tu versión de Antigravity lo soporta, puedes iniciar:

```text
/teamwork-preview
```

y luego darle el prompt inicial.

Eso puede ayudar a que use subagentes más cómodamente para auditoría, diseño y QA.

---

# CHECKLIST ANTES DE PREVIEW

Cuando Antigravity termine, revisa:

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

Prueba manualmente:

- home;
- temporada;
- categoría;
- posiciones;
- líderes;
- estadísticas;
- mi equipo;
- liguilla;
- calendario;
- reporte PDF;
- acceso Admin;
- móvil;
- desktop.

---

# COMMIT FINAL DE ESTA ITERACIÓN

Si todo quedó bien:

```bash
git add .
git commit -m "feat: full redesign public sports portal v3"
git push -u origin redesign/public-v3-sports-portal
```

---

# PREVIEW Y PRODUCCIÓN

## Preview
Primero revisa la preview deployment de esa rama.

## Producción
Solo después de que realmente te convenza el resultado y hayas comprobado que no rompió nada.

No dejes que Antigravity haga deploy o merge a producción automáticamente.

---

# REGLA DE ORO

**Autonomía para analizar, construir y probar.  
Aprobación humana para destruir, desplegar o afectar producción.**
