# MEGAPROMPT ADMIN V1 — Liga Nochixtlán
## Reparar captura + rediseñar el Panel Admin para máxima productividad

> **Meta:** primero reparar cualquier regresión que hoy impida crear, editar o guardar datos; después rediseñar el Panel de Administración para que sea rápido, intuitivo, ordenado, fácil de aprender y cómodo para capturar muchos datos desde computadora, sin perder información ni romper lo que ya funciona.

---

# 1. MISIÓN

Actúa como un equipo de:

- Senior Full-Stack Debugger
- Senior Product Designer para software administrativo
- UX Architect
- Front-End Engineer
- Data Flow / State Management Specialist
- Forms & Validation Specialist
- Search / Filter / Table Specialist
- Responsive & Accessibility Specialist
- QA / Regression Engineer

La prioridad es:

## ETAPA A — REPARAR
Reproducir y corregir la falla actual que impide modificar/capturar información.

## ETAPA B — REDISEÑAR
Crear un Admin moderno, muy claro y mucho más rápido para trabajar.

**Primero funcionar. Después embellecer.**

---

# 2. CONTEXTO ACTUAL

El Admin incluye:

- Dashboard
- Temporadas
- Equipos
- Calendario
- Captura
- Elegibilidad
- Accesos

Problemas percibidos:

- parece existir una regresión que impide modificar/capturar;
- navegación duplicada o redundante;
- mucho espacio vacío;
- demasiada búsqueda manual;
- Captura no guía suficientemente;
- filtros pueden estar dispersos;
- cuesta identificar rápidamente equipo, jornada o partido;
- quiero encontrar todo por orden alfabético y búsqueda rápida;
- quiero menos clics y menos posibilidad de perderme.

La página pública ya tiene diseño aprobado.

**NO modificar la página pública salvo una corrección mínima si comparte un bug real.**

---

# 3. RESTRICCIONES ABSOLUTAS

No:

- borrar datos reales;
- resetear base de datos;
- truncar tablas;
- correr seeds destructivos;
- hacer migraciones destructivas;
- cambiar proveedor de DB;
- cambiar secretos o `.env`;
- modificar autenticación sin causa comprobada;
- modificar permisos sin causa comprobada;
- rehacer lógica estable innecesariamente;
- reemplazar datos reales por mocks;
- hacer deploy;
- hacer merge a producción;
- usar `git reset --hard`;
- usar `git clean -fd`;
- usar force push.

No perder:

- temporadas;
- equipos;
- jugadores;
- partidos;
- resultados;
- estadísticas;
- elegibilidad;
- credenciales;
- usuarios/permisos.

Si una mejora visual necesita cambiar lógica, primero busca una solución de UI. Si no es segura, conserva la lógica y reporta la limitación.

---

# 4. USO OBLIGATORIO DE SUBAGENTES

Trabaja en paralelo para acelerar.

## Subagente A — Regression Investigator
Debe reproducir por qué ya no se puede modificar/capturar.

Revisar:

- consola;
- requests;
- handlers;
- botones disabled;
- formularios;
- estado;
- validaciones;
- permisos;
- APIs/Server Actions;
- revalidation/refresh.

Entregar:

```text
Problema reproducido:
Causa raíz:
Archivos implicados:
Solución mínima:
Riesgo:
```

## Subagente B — Data Flow Auditor
Mapear:

```text
UI → formulario/estado → handler → API/Server Action → DB → respuesta → refresh
```

para Temporadas, Equipos, Calendario, Captura, Elegibilidad y Accesos.

## Subagente C — Admin UX Auditor
Detectar:

- navegación redundante;
- duplicación sidebar/topbar;
- vacíos;
- mala jerarquía;
- filtros dispersos;
- tablas difíciles;
- acciones ambiguas;
- demasiados clics.

## Subagente D — Information Architecture
Proponer estructura para que el administrador siempre sepa:

- dónde está;
- qué temporada administra;
- qué está filtrando;
- cuál es la acción principal.

## Subagente E — Search / Filter / Table Specialist
Diseñar:

- A–Z;
- búsqueda instantánea;
- sorting;
- filtros claros;
- limpiar filtros;
- encabezados sticky;
- tablas densas pero legibles;
- acciones por fila claras.

## Subagente F — Capture Workflow Specialist
Auditar `Captura` y reducir pasos/carga mental.

## Subagente G — Responsive + Accessibility
Revisar 1366×768, 1920×1080, tablet, 430px y 390px.

## Subagente H — Regression QA
Crear y ejecutar pruebas de crear/editar/guardar/capturar/filtrar/navegar.

### Coordinación
Subagentes investigan y prueban.  
El agente principal integra código.  
No editar simultáneamente los mismos archivos sin aislamiento.

---

# 5. FASE 1 — BASELINE

Antes de tocar código:

```bash
git status
git branch --show-current
```

Luego:

1. inspeccionar `package.json`;
2. identificar scripts reales;
3. ejecutar app local;
4. abrir Admin;
5. recorrer todos los módulos;
6. reproducir el problema de escritura;
7. registrar errores;
8. invocar subagentes.

No iniciar el rediseño hasta entender la falla.

---

# 6. FASE 2 — REPARAR CAPACIDAD DE ESCRITURA

Comprobar de forma controlada:

## Temporadas
- crear;
- editar;
- activar si existe.

## Equipos
- crear;
- editar;
- abrir detalle;
- funciones de jugadores/cédula existentes.

## Calendario
- crear;
- editar;
- filtrar.

## Captura
- seleccionar temporada;
- seleccionar jornada;
- seleccionar partido;
- editar datos;
- guardar;
- recibir confirmación;
- recargar;
- confirmar persistencia.

## Elegibilidad
- operaciones actuales.

## Accesos
- operaciones permitidas por rol.

### Prueba segura
Preferir entorno local/dev y datos de prueba existentes.  
No modificar datos productivos de forma riesgosa para “probar”.

No considerar solucionado porque el botón responda: el dato debe persistir después de recargar.

---

# 7. NUEVO OBJETIVO DE UX

Después de reparar:

# ADMIN RÁPIDO + CLARO + COMPACTO + INTUITIVO

Diseñar pensando en:

> “Tengo que capturar muchos datos y no quiero perder tiempo buscando ni recordando dónde está cada cosa.”

Priorizar:

- menos clics;
- menos scroll;
- menos memoria;
- búsqueda rápida;
- teclado;
- contexto visible;
- feedback inmediato;
- errores claros.

---

# 8. NUEVO APP SHELL

En desktop:

## Sidebar
Única navegación principal:

- Dashboard
- Temporadas
- Equipos
- Calendario
- Captura
- Elegibilidad
- Accesos

## Topbar contextual
Usar para:

- breadcrumb;
- temporada/contexto;
- búsqueda si aplica;
- acción principal;
- usuario.

### Evitar
Duplicar los mismos enlaces en sidebar y topbar sin necesidad.

---

# 9. CONTEXTO DE TEMPORADA SIEMPRE VISIBLE

El usuario debe saber siempre qué administra.

Ejemplo:

```text
Liga Tercera Fuerza 2026 · 3ra
```

Si una selección global es segura, reutilizarla.

Si la arquitectura actual requiere selector por módulo, conservar la lógica y mejorar solo la presentación.

---

# 10. BREADCRUMBS

Usar donde ayude:

```text
Admin / Equipos / Muebles Carlitos / Jugadores
Admin / Calendario / Jornada 31 / Partido
```

No ponerlos si son redundantes.

---

# 11. DASHBOARD

Convertirlo en centro de operaciones.

Reducir vacíos.

Priorizar:

- temporada actual;
- pendientes;
- alertas;
- progreso;
- accesos rápidos.

Acciones frecuentes reales:

- Nueva temporada
- Nuevo equipo
- Nuevo partido
- Capturar resultado
- Revisar elegibilidad

---

# 12. TEMPORADAS

Añadir:

- búsqueda `Buscar temporada...`;
- filtro categoría;
- filtro año;
- activa/inactiva;
- tabla fácil de escanear.

Acciones:

- Editar
- Activar
- Eliminar solo si ya existe y está permitido

Separar acciones destructivas.

---

# 13. EQUIPOS — PRIORIDAD ALTA

Default:

# A → Z

Añadir búsqueda prominente:

```text
Buscar equipo...
```

Debe filtrar mientras se escribe si es viable.

Filtros:

- temporada;
- categoría;
- estado relevante;
- credenciales pendientes si existe.

Mostrar con claridad:

- equipo;
- categoría;
- jugadores;
- permisos;
- W.O.;
- credenciales;
- acciones.

---

# 14. ACCIONES POR FILA

Evitar grupos de iconos ambiguos.

Preferir:

- acción principal visible;
- tooltips;
- labels cuando haya espacio;
- menú `⋯` para secundarias.

Ejemplo conceptual:

```text
MUEBLES CARLITOS
17 jugadores · 5 pendientes

[Ver equipo] [Cédula] [⋯]
```

Adaptar a funciones reales.

---

# 15. JUGADORES

Si existe detalle/expansión:

- búsqueda por nombre/apellido;
- búsqueda por dorsal si existe;
- orden A–Z;
- credencial;
- elegibilidad;
- acciones claras.

---

# 16. FILTRO ALFABÉTICO

Donde aporte valor, mostrar:

```text
Todos  A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
```

Principalmente para:

- equipos;
- jugadores.

En móvil, convertirlo en control compacto.

---

# 17. BUSCADOR INSTANTÁNEO

En listas grandes:

- case-insensitive;
- rápido;
- `contains`/prefix según convenga;
- tolerancia razonable a acentos.

Objetivo:

**escribir 2–3 letras y encontrar el registro.**

No complicar backend si el dataset puede filtrarse localmente.

---

# 18. FILTROS

Toda pantalla con múltiples filtros debe tener:

```text
Limpiar filtros
```

Y mostrar:

```text
8 de 17 equipos
```

o equivalente.

---

# 19. CALENDARIO

Reestructurar jerarquía.

## Encabezado
- título;
- temporada;
- resumen.

## Filtros agrupados
- equipo;
- vuelta;
- estado;
- cancha;
- jornada.

## Acciones
Primaria:
- `+ Nuevo Partido`

Secundarias:
- Partidos faltantes
- Asistente de jornada
- WhatsApp
- Rol
- Liguilla

No dar el mismo peso a todos.

---

# 20. PROGRESO DE TEMPORADA

Mantener porque aporta valor.

Hacer fácil distinguir:

- Jornada actual
- Partidos jugados
- Avance
- Faltantes
- Conflictos

---

# 21. LISTADO DE PARTIDOS

Debe permitir encontrar rápidamente por:

- equipo;
- jornada;
- cancha si existe.

Orden útil por:

- jornada;
- fecha.

Encabezado sticky si ayuda.

---

# 22. CAPTURA — PRIORIDAD MÁXIMA

Rediseñar completamente la presentación de `Captura`.

No inventar campos ni lógica.

Debe sentirse como un flujo guiado:

```text
1. Temporada
2. Jornada
3. Partido
4. Datos
5. Revisar
6. Guardar
```

No necesariamente wizard rígido.

---

# 23. SELECCIÓN DE TEMPORADA

Mostrar claramente:

```text
Temporada: Liga Tercera Fuerza 2026 · 3ra
```

Si hay contexto global seguro, precargarlo.

---

# 24. SELECCIÓN DE JORNADA

Facilitar:

- orden numérico;
- jornada actual primero;
- búsqueda si existen muchas;
- estado si ya existe en datos.

---

# 25. SELECCIÓN DE PARTIDO

No quiero un dropdown interminable.

Preferir un buscador/lista rica:

```text
Buscar partido...

J31
Muebles Carlitos vs M-Sport
Cancha Techada · 20:00
```

Filtrar por:

- equipo;
- jornada;
- pendiente de captura;

solo si esos datos existen.

Si el sistema conoce partidos pendientes:

## PENDIENTES
primero.

## CAPTURADOS / FINALIZADOS
después.

---

# 26. CONTEXTO DEL PARTIDO

Una vez elegido:

mostrar encabezado claro/sticky:

```text
Jornada 31
MUEBLES CARLITOS vs M-SPORT
Cancha Techada
```

El usuario nunca debe olvidar qué está capturando.

---

# 27. FORMULARIO DE CAPTURA

Tomar los campos reales actuales y reorganizarlos.

Objetivos:

- grupos lógicos;
- labels claros;
- menos scroll;
- tab order natural;
- inputs apropiados;
- validación junto al campo;
- teclado primero.

---

# 28. TECLADO

Como el uso principal será computadora:

- `Tab` lógico;
- `Shift+Tab`;
- focus visible;
- Enter solo donde sea seguro;
- inputs numéricos cómodos.

No obligar a usar mouse para cada dato.

---

# 29. AUTOFOCUS

Al abrir el formulario, focus al primer campo editable relevante.

No robar focus inesperadamente.

---

# 30. VALIDACIONES

Evitar:

```text
Error
```

Preferir mensajes concretos basados en reglas reales:

```text
Falta capturar el marcador del visitante.
```

---

# 31. GUARDADO

Botón principal inequívoco.

Ejemplo:

```text
Guardar resultado
```

Debe:

- mostrar loading;
- impedir doble envío;
- mostrar éxito;
- mostrar error;
- conservar datos ingresados ante fallo cuando sea viable.

---

# 32. ÉXITO

Después de guardar:

```text
✓ Resultado guardado correctamente
```

Opciones útiles si son seguras:

- Volver a lista
- Siguiente partido pendiente

---

# 33. CAMBIOS SIN GUARDAR

Si es seguro detectar dirty state:

```text
Tienes cambios sin guardar.
```

Advertir antes de salir.

No implementar si causa falsos positivos.

No autosave de resultados a DB sin autorización.

---

# 34. ELEGIBILIDAD

Optimizar para encontrar:

- pendientes;
- vigentes;
- problemas;
- equipo;
- jugador.

Mantener reglas intactas.

---

# 35. ACCESOS

Mejorar presentación pero no autorización.

Debe verse claramente:

- usuario;
- rol;
- módulos;
- estado.

No tocar seguridad salvo bug reproducido.

---

# 36. MODALES / DRAWERS

Para operaciones cortas, usar modal/drawer solo si reduce navegación y funciona bien con teclado.

Operaciones largas → vista propia.

---

# 37. JERARQUÍA DE BOTONES

- Primario: una acción principal
- Secundario: acciones normales
- Destructivo: rojo y separado

---

# 38. EMPTY / LOADING / ERROR STATES

## Empty
```text
No se encontraron equipos con estos filtros.
[Limpiar filtros]
```

## Loading
Skeletons/loaders discretos.

## Error
Explicar qué falló y cómo reintentar.

---

# 39. DESKTOP FIRST, RESPONSIVE REAL

Principal objetivo:

## 1366×768

Debe ser compacto y productivo.

También probar:

- 1920×1080;
- tablet;
- 430px;
- 390px.

---

# 40. 1366×768

Evitar grandes vacíos.

Usar:

- sidebar compacta;
- topbar compacta;
- filtros en línea;
- tablas densas;
- sticky headers;
- formularios de 2 columnas cuando tenga sentido.

---

# 41. MOBILE

En móvil:

- sidebar → drawer;
- tablas → cards/listas o scroll controlado;
- filtros → panel plegable;
- captura → una columna;
- acciones principales fáciles de tocar;
- nada de texto diminuto.

---

# 42. ACCESIBILIDAD

Objetivo razonable: **WCAG AA**

Revisar:

- contraste;
- teclado;
- focus-visible;
- labels;
- aria;
- errores;
- touch targets;
- tablas.

---

# 43. PERFORMANCE

El Admin debe sentirse instantáneo.

Evitar:

- animaciones innecesarias;
- librerías pesadas;
- filtros lentos;
- request por cada tecla sin debounce cuando aplique;
- re-renders excesivos.

---

# 44. ESTILO

No necesita parecer la landing pública.

Debe ser:

- dark premium;
- limpio;
- moderno;
- profesional;
- deportivo de forma sutil;
- muy funcional.

## Prioridad:

# PRODUCTIVIDAD > ESPECTÁCULO

---

# 45. DESIGN SYSTEM ADMIN

Consolidar:

- background;
- sidebar;
- surface;
- fields;
- table;
- accent;
- success;
- warning;
- error;
- focus;
- spacing;
- radius.

---

# 46. REGRESSION TEST MATRIX

Crear y ejecutar una matriz similar a:

| Módulo | Acción | Esperado |
|---|---|---|
| Temporadas | Crear | Se guarda |
| Temporadas | Editar | Persiste |
| Equipos | Crear | Aparece |
| Equipos | Editar | Persiste |
| Calendario | Crear partido | Aparece |
| Calendario | Editar | Persiste |
| Captura | Elegir partido | Formulario carga |
| Captura | Guardar | Persiste |
| Elegibilidad | Acción existente | Funciona |
| Accesos | Acción permitida | Funciona |

Adaptarla al código real.

---

# 47. PRUEBA CRÍTICA DE CAPTURA

Happy path:

```text
Temporada
→ Jornada
→ Partido
→ Captura
→ Guardar
→ Confirmación
→ Recargar
→ Confirmar persistencia
```

Probar también:

- validaciones;
- fallo de request;
- doble click;
- refresh;
- salir con cambios;
- permisos.

---

# 48. QA TÉCNICO

Ejecutar solo scripts existentes:

```bash
npm run build
npm run lint
npm test
```

Si no existen, reportarlo.

Browser QA:

- console errors;
- requests fallidos;
- hydration;
- botones disabled inesperados;
- modales;
- filtros;
- focus.

---

# 49. CRITERIOS DE ACEPTACIÓN

No terminar hasta que:

## Funcional
- se pueda crear/editar;
- la captura funcione;
- el guardado persista;
- filtros funcionen;
- no haya regresiones críticas.

## UX
- encontrar equipo sea rápido;
- encontrar jugador sea rápido;
- encontrar partido sea rápido;
- temporada visible;
- captura guiada;
- navegación sin redundancia innecesaria;
- usuario siempre sabe dónde está.

---

# 50. FASES

1. Baseline
2. Subagentes paralelos
3. Diagnóstico
4. Reparación funcional
5. Prueba mínima de escritura
6. Arquitectura Admin
7. App shell
8. Tablas/búsqueda/filtros
9. Captura V2
10. Otros módulos
11. Responsive
12. Accessibility/performance
13. Regression QA
14. Build
15. Reporte

---

# 51. ENTREGA FINAL

Entregar:

1. causa raíz del problema;
2. solución aplicada;
3. archivos modificados;
4. rediseño UX realizado;
5. nuevo flujo de Captura;
6. búsquedas/filtros;
7. responsive;
8. subagentes usados;
9. tests ejecutados;
10. regresiones verificadas;
11. riesgos pendientes.

Terminar con:

```text
LISTO PARA PREVIEW
```

o:

```text
NO LISTO PARA PREVIEW
```

No hacer deploy ni merge.

---

# 52. INSTRUCCIÓN FINAL AL AGENTE PRINCIPAL

Lee este archivo completo.

Después:

1. reproduce el bug;
2. usa subagentes;
3. encuentra la causa;
4. restaura la escritura;
5. comprueba persistencia;
6. rediseña el Admin;
7. prioriza A–Z, búsqueda, filtros y teclado;
8. rediseña especialmente Captura;
9. conserva datos, lógica y seguridad;
10. prueba desktop y móvil;
11. ejecuta build;
12. ejecuta regression QA;
13. deja el resultado listo para Preview.

# PRIORIDAD ABSOLUTA

## CAPTURA FUNCIONAL + ADMIN ULTRARRÁPIDO + BÚSQUEDA INTUITIVA + CERO PÉRDIDA DE DATOS + CERO REGRESIONES

---

# APÉNDICE A — PROMPT DE ARRANQUE PARA ANTIGRAVITY

```text
Lee COMPLETAMENTE MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md antes de modificar archivos.

Ejecuta todo el plan.

Objetivos en orden obligatorio:

1. REPARAR: actualmente parece haberse roto la capacidad de modificar/capturar datos. Reproduce el problema, encuentra la causa raíz y restaura todos los flujos de escritura/guardado.
2. REDISEÑAR: después crea un Admin moderno, rápido, intuitivo y orientado a productividad.

Quiero especialmente:
- búsqueda instantánea;
- orden A–Z;
- filtros claros;
- limpiar filtros;
- temporada actual siempre visible;
- navegación sin redundancias;
- tablas fáciles de escanear;
- acciones claras;
- flujo de Captura guiado;
- selección rápida de jornada y partido;
- excelente navegación por teclado;
- feedback claro al guardar;
- protección contra doble envío;
- estados loading/error/success;
- excelente uso en 1366×768;
- responsive real para 390px y 430px.

Usa subagentes en paralelo para:
1. Regression Investigator;
2. Data Flow Auditor;
3. Admin UX Auditor;
4. Information Architecture;
5. Search/Filter/Table Specialist;
6. Capture Workflow Specialist;
7. Responsive/Accessibility;
8. Regression QA.

El agente principal debe ser el integrador final.

NO borres ni resetees datos.
NO hagas migraciones destructivas.
NO modifiques secretos.
NO cambies autenticación/permisos salvo bug específico reproducido.
NO modifiques el diseño público aprobado.
NO hagas deploy.
NO hagas merge.
NO uses comandos destructivos.

Trabaja autónomamente dentro del workspace para tareas seguras.

No declares éxito hasta comprobar en un entorno seguro que:
- se puede crear/editar;
- se puede capturar;
- el dato persiste después de recargar;
- no se rompieron módulos;
- el build de producción pasa.

Continúa hasta dejar el resultado LISTO PARA PREVIEW.
```

---

# APÉNDICE B — PLAN DEL USUARIO

## 1. Respaldo

```bash
git status
git add .
git commit -m "backup: stable public v5 before admin redesign"
git push
```

Si no hay cambios, no crear commit vacío.

## 2. Rama

```bash
git checkout -b redesign/admin-productivity-v1
```

## 3. Guardar este archivo en la raíz

```text
MEGAPROMPT_ADMIN_LIGA_NOCHIXTLAN_V1.md
```

## 4. Dar a Antigravity el prompt del Apéndice A

Permitir autonomía para:

- inspección;
- edición;
- ejecución local;
- build;
- lint;
- tests;
- QA.

Mantener aprobación manual para:

- deploy;
- merge;
- force push;
- destructivos;
- secretos;
- infraestructura;
- datos irreversibles.

## 5. Antes de Preview

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

## 6. Prueba manual

- Temporadas: crear/editar seguro y comprobar persistencia.
- Equipos: buscar A–Z, filtrar, editar.
- Calendario: localizar y editar partido.
- Captura: temporada → jornada → partido → capturar → guardar → recargar.
- Elegibilidad: funciones actuales.
- Accesos: autorización.
- Página pública: smoke test.

# REGLA DE ORO

**Primero recuperar la escritura. Después optimizar la captura. Nunca sacrificar datos o funcionalidad por diseño.**
