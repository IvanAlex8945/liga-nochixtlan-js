# ADMIN UI ANT DESIGN GUARDRAILS — Liga Nochixtlán

## Propósito

Este documento debe leerse **antes de cualquier rediseño del Panel Admin**. Existe una regresión histórica ya identificada: los dropdowns de Ant Design sí se montaban en el DOM, pero `rc-trigger` los posicionaba fuera del viewport, llegando a estados temporales equivalentes a `-1000vw/-1000vh`. Por eso parecía que los Select no abrían, los filtros quedaban “vacíos”, había saltos visuales y la captura se volvía inutilizable.

El comportamiento corregido debe considerarse desde ahora un **contrato funcional no negociable**.

---

# 1. Prioridad

1. Interacción.
2. Escritura.
3. Formularios.
4. Persistencia.
5. Productividad.
6. Estética.

**Nunca sacrifiques interacción por diseño.**

---

# 2. Archivos sensibles

Antes de cambiar UI, inspecciona:

- `app/components/AntdProvider.tsx`
- `app/globals.css`
- `app/admin/capture/page.tsx`
- `app/admin/calendar/page.tsx`
- `app/admin/teams/page.tsx`
- `app/admin/eligibility/page.tsx`
- `app/components/AdminLayout.tsx`
- `app/components/SeasonSelector.tsx`

No los modifiques en masa sin comprender su efecto sobre portales, Select, Dropdown, Popover, scroll y stacking contexts.

---

# 3. Regresión conocida

La causa raíz anterior fue:

- cambio de layout/UI del Admin;
- `rc-trigger` recalculó mal la posición;
- el popup existía;
- el popup quedaba fuera del viewport;
- el usuario percibía el control como roto.

Por tanto, cualquier rediseño debe asumir que estos elementos son de alto riesgo:

```css
transform
translate
scale
filter
perspective
position
overflow
contain
isolation
will-change
backdrop-filter
z-index
```

especialmente en ancestros de controles AntD.

---

# 4. Reglas críticas para `AntdProvider`

El provider de Ant Design es infraestructura crítica.

Antes de modificar:

- entiende `ConfigProvider`;
- entiende `getPopupContainer`;
- entiende dónde se monta cada popup;
- entiende la relación con layout/scroll;
- prueba al menos Dashboard, Calendario y Captura.

No elimines ni reemplaces configuración de popup porque “se ve más simple”.

---

# 5. `getPopupContainer`

No cambies el contenedor global de popups a ciegas.

Antes de tocarlo:

1. abre un Select;
2. identifica dónde se monta;
3. inspecciona su `getBoundingClientRect()`;
4. comprueba que quede dentro del viewport;
5. prueba scroll;
6. prueba sidebar;
7. prueba mobile.

No montes dropdowns dentro de contenedores con:

```css
overflow: hidden;
overflow: clip;
transform: ...;
```

sin validación real.

---

# 6. `transform` — alto riesgo

Evita transforms en wrappers principales del Admin:

```css
transform: translate(...)
transform: scale(...)
transform: translateZ(0)
```

Un transform puede crear un nuevo stacking context y alterar posicionamiento de elementos flotantes.

Si necesitas motion:

- preferirlo en elementos decorativos;
- no en ancestros de Select/Dropdown;
- probar browser QA inmediatamente.

---

# 7. `overflow` — alto riesgo

No agregues `overflow: hidden` o `overflow: clip` a:

- AdminLayout;
- page shell;
- toolbar;
- filter bar;
- form container;
- capture shell;

sin comprobar popups.

---

# 8. Stacking contexts

No usar `z-index: 999999` como parche.

Define una jerarquía coherente para:

- base;
- sticky;
- dropdown;
- popover;
- modal;
- toast.

Si un popup no aparece, primero verifica si:

- está en DOM;
- está fuera del viewport;
- está detrás de otra capa;
- está siendo recortado.

---

# 9. Body / scrollbar / “temblor”

Abrir/cerrar Select NO debe provocar:

- salto horizontal;
- scrollbar que aparece/desaparece bruscamente;
- padding-right extraño;
- flash gris;
- reflow visible.

Audita:

```css
body {
  overflow:
  padding-right:
  width:
}
```

y cualquier scroll lock.

---

# 10. Select no debe sentirse como input roto

Revisar con intención:

- `showSearch`
- `mode`
- `searchValue`
- `onSearch`
- `filterOption`
- `open`
- `onOpenChange`
- `value`
- `defaultValue`

No mezclar accidentalmente comportamiento de Combobox/Input con un Select normal.

---

# 11. Controlled vs uncontrolled

Cada Select debe tener estrategia clara.

Evitar combinaciones inconsistentes de:

```tsx
value
defaultValue
```

Revisar tipos:

- string;
- number;
- null;
- undefined;
- id;
- label.

No permitir que el cambio de temporada deje valores inválidos silenciosamente.

---

# 12. Keys y remounts

Evitar `key` inestables en:

- SeasonSelector;
- filtros;
- Select;
- formularios;
- tabs.

Un remount inesperado puede:

- cerrar popup;
- perder focus;
- borrar estado;
- producir salto visual.

---

# 13. Botones dentro de `<form>`

Todo botón que NO sea submit debe usar:

```tsx
type="button"
```

Especialmente:

- abrir filtros;
- limpiar;
- editar;
- expandir;
- cancelar;
- abrir modal.

Evitar submits accidentales.

---

# 14. Estados disabled

Si un control queda gris debe existir una razón clara.

Revisar:

- `disabled`;
- `aria-disabled`;
- loading;
- pending;
- permisos;
- guards;
- request state.

Debe ser posible explicar:

```text
¿Qué lo deshabilitó?
¿Por qué?
¿Cuándo se habilita otra vez?
```

---

# 15. CSS global

Toda modificación a `globals.css` debe revisar posibles efectos sobre:

```css
button
input
select
[role]
[data-state]
.ant-select
.ant-select-dropdown
.ant-dropdown
.ant-popover
.ant-modal
body
html
*
```

Preferir estilos scopeados:

```css
.admin-shell ...
```

No aplicar reglas agresivas globales.

---

# 16. Aislamiento público / Admin

La web pública y el Admin deben estar visualmente aislados.

No permitir que la landing pública filtre hacia Admin:

- animations;
- transforms;
- overlays;
- backdrop effects;
- pointer-events;
- global transitions;
- hero styles.

---

# 17. No `transition: all`

Prohibido en el Admin:

```css
* {
  transition: all ...
}
```

Preferir transiciones específicas.

---

# 18. Subagentes obligatorios

Usa subagentes en paralelo:

## A — AntD / rc-trigger Auditor
Revisar Provider, portals, popup container y posicionamiento.

## B — CSS / Stacking Context Auditor
Revisar transform, overflow, z-index, fixed, absolute, body y scroll locks.

## C — Admin UX
Diseñar mejoras sin tocar contratos de interacción.

## D — Capture Workflow
Optimizar captura sin alterar lógica.

## E — Responsive
Revisar 1366×768, 1920×1080, 430×932 y 390×844.

## F — Regression QA
Probar todos los controles.

El agente principal integra los cambios.

---

# 19. Browser QA obligatorio

No basta con compilar.

Después de CADA bloque de rediseño, probar en navegador real.

## Dashboard
- selector de temporada.

## Temporadas
- botones;
- Select/Dropdown existentes.

## Equipos
- temporada;
- filtros;
- acciones;
- expansión.

## Calendario
- temporada;
- equipo;
- vuelta;
- estado;
- cancha;
- status;
- jornada;
- acciones.

## Captura
- temporada;
- jornada;
- partido.

## Elegibilidad
- filtros.

## Accesos
- controles.

---

# 20. Stress test obligatorio

Para cada Select crítico:

1. abrir;
2. cerrar;
3. repetir 10 veces;
4. seleccionar A;
5. seleccionar B;
6. volver a A;
7. navegar a otro módulo;
8. regresar;
9. repetir.

Si falla una vez de forma reproducible, el rediseño NO está aprobado.

---

# 21. Prueba del DOM del popup

Al abrir dropdown:

- confirmar que existe;
- comprobar `getBoundingClientRect()`;
- confirmar que no está en `-1000vw`;
- confirmar que no está en `-1000vh`;
- confirmar width/height válidos;
- confirmar que recibe clicks;
- confirmar que no está recortado.

---

# 22. Si un click no responde

Usar inspector o equivalente a:

```js
document.elementFromPoint(x, y)
```

para ver qué elemento intercepta el click.

No adivinar.

---

# 23. Captura es criterio de aprobación

No considerar el Admin estable hasta repetir varias veces:

```text
Temporada
→ Jornada
→ Partido
→ Formulario
```

Debe funcionar sin:

- dropdowns invisibles;
- focus extraño;
- botones grises sin razón;
- layout shake.

---

# 24. Prueba de escritura

En entorno seguro:

```text
editar
→ guardar
→ recargar
→ verificar persistencia
```

No modificar datos oficiales reales sin autorización.

---

# 25. Implementación por bloques

No rediseñar todo de golpe.

Orden recomendado:

1. App shell
2. Sidebar/topbar
3. Dashboard
4. Temporadas
5. Equipos
6. Calendario
7. Captura
8. Elegibilidad
9. Accesos
10. Responsive

Después de cada bloque, ejecutar smoke test de los Select críticos.

---

# 26. Checkpoint obligatorio

Registrar después de cada fase:

```text
Dashboard SeasonSelect: PASS/FAIL
Teams SeasonSelect: PASS/FAIL
Calendar filters: PASS/FAIL
Capture Season: PASS/FAIL
Capture Jornada: PASS/FAIL
Capture Partido: PASS/FAIL
Eligibility filters: PASS/FAIL
```

Si alguno da FAIL:

**detener el rediseño y reparar antes de continuar.**

---

# 27. Build no es suficiente

Aunque pasen:

```bash
npm run lint
npm run build
npm run test
```

también debe pasar Browser QA.

---

# 28. Git safety

Antes de empezar:

```bash
git status
git branch --show-current
git log --oneline -20
```

Mantener como baseline la versión que contiene el hotfix validado de interacciones.

No usar:

```text
git reset --hard
git clean -fd
git push --force
```

---

# 29. Productividad permitida

Después de preservar interacción, sí se permite mejorar:

- búsqueda;
- A–Z;
- filtros;
- tablas;
- breadcrumbs;
- contexto de temporada;
- captura guiada;
- responsive;
- jerarquía visual.

Pero nunca a costa del comportamiento AntD.

---

# 30. Responsive

No usar `scale()` para hacer caber el Admin.

Preferir:

- grid;
- flex;
- media queries;
- widths;
- drawers;
- responsive layout.

---

# 31. Criterios de aceptación

## Visual
- moderno;
- claro;
- rápido.

## Funcional
- Select abre;
- Select selecciona;
- Select vuelve a abrir;
- filtros funcionan;
- no shake;
- no popup fuera de viewport;
- no disabled injustificado;
- Captura funciona.

## Técnico
- lint pasa;
- build pasa;
- tests pasan;
- Browser QA pasa.

---

# 32. Reporte final obligatorio

Entregar:

1. UI modificada.
2. Archivos modificados.
3. Cambios en AntD/Provider, si hubo.
4. Resultado de popup tests.
5. Resultado del stress test.
6. Resultado de Captura.
7. Resultado responsive.
8. Resultado build/lint/tests.
9. Riesgos pendientes.

Solo terminar con:

```text
ADMIN UI VALIDADA SIN REGRESIONES DE INTERACCIÓN
```

si todos los controles fueron probados realmente.

Si falla algo:

```text
ADMIN UI NO LISTA — REGRESIÓN DE INTERACCIÓN DETECTADA
```

---

# 33. Prompt de arranque para Antigravity

```text
Lee COMPLETAMENTE ADMIN_UI_ANTD_GUARDRAILS.md antes de realizar cualquier modificación del Panel Admin.

Existe una regresión histórica ya diagnosticada: los Select/Dropdown de Ant Design quedaron fuera del viewport por el posicionamiento de rc-trigger después de un rediseño del Admin. Los popups existían en DOM, pero podían quedar temporalmente en posiciones equivalentes a -1000vw/-1000vh.

Ese problema YA fue corregido y no debe volver a introducirse.

Antes de rediseñar:
1. inspecciona AntdProvider.tsx;
2. inspecciona globals.css;
3. inspecciona AdminLayout;
4. inspecciona SeasonSelector;
5. entiende cómo se monta y posiciona cada popup;
6. toma el comportamiento actual funcional como baseline.

Usa subagentes en paralelo para:
- AntD/rc-trigger audit;
- CSS/stacking context audit;
- Admin UX;
- Capture workflow;
- Responsive;
- Regression QA.

Puedes rediseñar profundamente el Admin, pero está PROHIBIDO continuar si una fase rompe:
- selector de temporada;
- filtros;
- dropdowns;
- jornada;
- selector de partido;
- captura.

Después de cada bloque de cambios, ejecuta Browser QA.

Prueba cada Select crítico abriendo/cerrando 10 veces y cambiando valores varias veces.

No declares éxito solo por build/lint.

No hagas deploy.
No hagas merge.

La prioridad es:

ADMIN MODERNO + CAPTURA RÁPIDA + ANT DESIGN POPUPS 100% ESTABLES.
```

---

# REGLA FINAL

**El diseño puede cambiar. El contrato de interacción no.**

Nunca aceptar un Admin visualmente mejor si Select, Dropdown, Popover, filtros o Captura dejan de funcionar.
