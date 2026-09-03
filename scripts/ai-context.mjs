import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const maxItems = Number.parseInt(process.env.AI_CONTEXT_MAX_ITEMS ?? '180', 10);

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, '/');
}

function readJson(file) {
  return JSON.parse(readFileSync(path.join(root, file), 'utf8'));
}

function safeExec(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function walk(dir, options = {}) {
  const ignore = new Set([
    '.git',
    '.next',
    'node_modules',
    '.vercel',
    'exports',
    ...(options.ignore ?? []),
  ]);
  const out = [];

  function visit(current) {
    if (out.length >= maxItems) return;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (ignore.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      if (options.extensions && !options.extensions.some((ext) => entry.name.endsWith(ext))) {
        continue;
      }
      out.push(rel(full));
      if (out.length >= maxItems) return;
    }
  }

  if (existsSync(path.join(root, dir))) {
    visit(path.join(root, dir));
  }
  return out;
}

function routeFromAppFile(file) {
  let route = file
    .replace(/^app\//, '/')
    .replace(/\/(page|route)\.tsx?$/, '')
    .replace(/\/page\.tsx?$/, '')
    .replace(/\/route\.tsx?$/, '');
  route = route.replace(/\/\(([^)]+)\)/g, '');
  if (route === '') route = '/';
  return route;
}

function section(title, body) {
  return [`## ${title}`, body].filter(Boolean).join('\n\n');
}

const pkg = readJson('package.json');
const gitStatus = safeExec('git', ['status', '--short']);
const branch = safeExec('git', ['branch', '--show-current']);
const latestCommit = safeExec('git', ['log', '-1', '--pretty=%h %s']);
const appFiles = walk('app', { extensions: ['.tsx', '.ts'] });
const routes = appFiles
  .filter((file) => /\/(page|route)\.tsx?$/.test(file))
  .map(routeFromAppFile)
  .sort();
const libFiles = walk('lib', { extensions: ['.ts', '.tsx'] });
const testFiles = walk('tests', { extensions: ['.ts', '.tsx'] });
const scriptFiles = walk('scripts', { extensions: ['.mjs', '.js', '.ts'] });
const docs = readFileSync(path.join(root, 'docs', 'AI_CONTEXT.md'), 'utf8').trim();

const output = [
  '# Contexto optimizado del proyecto',
  `Generado: ${new Date().toISOString()}`,
  '',
  section('Resumen dinamico', [
    `- Proyecto: ${pkg.name} ${pkg.version}`,
    `- Next: ${pkg.dependencies?.next ?? 'no detectado'}`,
    `- React: ${pkg.dependencies?.react ?? 'no detectado'}`,
    `- Branch: ${branch || 'no disponible'}`,
    `- Ultimo commit: ${latestCommit || 'no disponible'}`,
    `- Estado git: ${gitStatus ? 'hay cambios locales, revisar antes de editar' : 'limpio'}`,
  ].join('\n')),
  section('Comandos npm', Object.entries(pkg.scripts ?? {})
    .map(([name, command]) => `- npm run ${name}: ${command}`)
    .join('\n')),
  section('Rutas detectadas', routes.map((route) => `- ${route}`).join('\n')),
  section('Archivos lib clave', libFiles.map((file) => `- ${file}`).join('\n')),
  section('Componentes y paginas admin clave', appFiles
    .filter((file) => file.startsWith('app/admin/') || file.startsWith('app/components/'))
    .slice(0, maxItems)
    .map((file) => `- ${file}`)
    .join('\n')),
  section('Pruebas', testFiles.length ? testFiles.map((file) => `- ${file}`).join('\n') : '- Sin pruebas detectadas'),
  section('Scripts auxiliares', scriptFiles.length ? scriptFiles.map((file) => `- ${file}`).join('\n') : '- Sin scripts detectados'),
  section('Estado git detallado', gitStatus || 'Sin cambios locales'),
  '---',
  docs,
  '',
  '> Nota: este comando evita node_modules, .next, .vercel y exports para reducir tokens.',
].join('\n\n');

console.log(output);
