import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateDocumentation } from './check.mjs';

const CHECKER = fileURLToPath(new URL('./check.mjs', import.meta.url));
const recordPath = (id) => `docs/decisiones/${id}.md`;
const snapshot = (entries = {}) => ({
  files: new Set(Object.keys(entries)),
  texts: new Map(Object.entries(entries).filter(([file]) => file.endsWith('.md'))),
});
const declaration = (fields = {}) => `<!-- documentation:start -->\n\`\`\`json\n${JSON.stringify({
  impact: 'none', documents: [], decisions: [], reason: 'Solo se corrige una prueba; no cambia el comportamiento documentado.', ...fields,
})}\n\`\`\`\n<!-- documentation:end -->`;
const record = (id = 'DEC-1', fields = {}) => `# ${id}: Ejemplo\n\n\`\`\`json\n${JSON.stringify({
  id, date: '2026-11-14', status: 'accepted', issue: Number(id.split('-')[1]), supersedes: [], supersededBy: null, ...fields,
})}\n\`\`\`\n\n## Decisión\nUsar un control de documentación.\n\n## Motivo\nConservar las decisiones que cambian el proyecto.\n\n## Referencias\n[Issue](https://github.com/Roolivero/Antartida3D/issues/1)\n`;
const impact = (ids) => declaration({ impact: 'updated', documents: ids.map(recordPath), decisions: ids, reason: 'Se registra la decisión y su relación con los antecedentes.' });
const validate = (body = declaration(), before = {}, after = {}) => validateDocumentation({ body, before: snapshot(before), after: snapshot(after) });

test('acepta un arreglo interno con justificación y una actualización documentada', () => {
  assert.deepEqual(validate(), []);
  assert.deepEqual(validate(declaration({ impact: 'updated', documents: ['README.md'] }), { 'README.md': 'Antes' }, { 'README.md': 'Después' }), []);
});

test('rechaza declaraciones ausentes, duplicadas, incompletas o JSON inválido', () => {
  for (const body of ['', declaration() + declaration(), declaration() + '<!-- documentation:start -->', declaration().replace('"none"', 'no-json')]) {
    assert.ok(validate(body).length, body);
  }
});

test('la plantilla pendiente y una justificación vacía no aprueban', () => {
  for (const fields of [{ impact: 'pending' }, { reason: '' }, { reason: '[completar]' }, { impact: 'updated' }, { unexpected: true }]) {
    assert.ok(validate(declaration(fields)).length);
  }
});

test('los documentos declarados deben existir y cambiar en el PR', () => {
  const body = declaration({ impact: 'updated', documents: ['README.md'] });
  assert.match(validate(body).join('\n'), /inexistente/);
  assert.match(validate(body, { 'README.md': 'Igual' }, { 'README.md': 'Igual' }).join('\n'), /sin cambios/);
  for (const file of ['../secreto.md', '/README.md', 'docs\\fuentes.md', 'src/code.ts']) {
    assert.match(validate(declaration({ impact: 'updated', documents: [file] }), {}, { [file]: 'Texto' }).join('\n'), /ruta inválida/);
  }
});

test('rechaza listas inválidas, duplicados y contradicciones con sin impacto', () => {
  for (const fields of [{ documents: 'README.md' }, { decisions: [1] }, { documents: ['README.md', 'README.md'] }, { decisions: ['DEC-1'] }]) {
    assert.ok(validate(declaration(fields)).length);
  }
});

test('una decisión nueva válida debe estar declarada junto con su archivo', () => {
  const after = { [recordPath('DEC-1')]: record() };
  assert.deepEqual(validate(impact(['DEC-1']), {}, after), []);
  assert.match(validate(declaration(), {}, after).join('\n'), /incluir la decisión modificada/);
  assert.match(validate(impact(['DEC-2']), {}, after).join('\n'), /Decisión declarada inexistente/);
  assert.match(validate(impact(['DEC-1']), after, after).join('\n'), /no cambió/);
});

test('valida metadatos, fechas reales y contenido de cada decisión', () => {
  for (const fields of [{ date: '2026-02-30' }, { date: 'ayer' }, { status: 'terminado' }, { issue: 2 }, { supersedes: {} }, { supersededBy: '' }, { extra: 1 }]) {
    assert.ok(validate(impact(['DEC-1']), {}, { [recordPath('DEC-1')]: record('DEC-1', fields) }).length, JSON.stringify(fields));
  }
  for (const text of ['# Sin metadatos', record().replace('## Motivo', '## Otro'), record().replace('Usar un control de documentación.', '[completar]')]) {
    assert.ok(validate(impact(['DEC-1']), {}, { [recordPath('DEC-1')]: text }).length);
  }
});

test('permite más de una decisión para un issue y detecta identificadores repetidos', () => {
  assert.deepEqual(validate(impact(['DEC-1-2']), {}, { [recordPath('DEC-1-2')]: record('DEC-1-2') }), []);
  assert.match(validate(impact(['DEC-1']), {}, { [recordPath('DEC-1')]: record(), 'docs/decisiones/copia.md': record() }).join('\n'), /duplicado/);
});

test('reemplazar una decisión exige actualizar los dos registros', () => {
  const before = { [recordPath('DEC-1')]: record() };
  const after = {
    [recordPath('DEC-1')]: record('DEC-1', { status: 'superseded', supersededBy: 'DEC-2' }),
    [recordPath('DEC-2')]: record('DEC-2', { supersedes: ['DEC-1'] }),
  };
  assert.deepEqual(validate(impact(['DEC-1', 'DEC-2']), before, after), []);
  assert.match(validate(impact(['DEC-2']), before, { ...before, [recordPath('DEC-2')]: after[recordPath('DEC-2')] }).join('\n'), /debe estar superseded/);
});

test('una propuesta puede mencionar un reemplazo sin invalidar la decisión aceptada', () => {
  const before = { [recordPath('DEC-1')]: record() };
  assert.deepEqual(validate(impact(['DEC-2']), before, { ...before, [recordPath('DEC-2')]: record('DEC-2', { status: 'proposed', supersedes: ['DEC-1'] }) }), []);
});

test('rechaza pérdida del historial, vuelta a propuesta y reemplazos inexistentes', () => {
  const before = { [recordPath('DEC-1')]: record() };
  assert.match(validate(declaration(), before).join('\n'), /conservar el registro histórico/);
  assert.match(validate(impact(['DEC-1']), before, { [recordPath('DEC-1')]: record('DEC-1', { status: 'proposed' }) }).join('\n'), /no vuelve a propuesta/);
  assert.match(validate(impact(['DEC-1']), {}, { [recordPath('DEC-1')]: record('DEC-1', { supersedes: ['DEC-5'] }) }).join('\n'), /no existe la decisión reemplazada/);
});

test('acepta una cadena de reemplazos y rechaza ciclos', () => {
  const chain = {
    [recordPath('DEC-1')]: record('DEC-1', { status: 'superseded', supersededBy: 'DEC-2' }),
    [recordPath('DEC-2')]: record('DEC-2', { status: 'superseded', supersedes: ['DEC-1'], supersededBy: 'DEC-3' }),
    [recordPath('DEC-3')]: record('DEC-3', { supersedes: ['DEC-2'] }),
  };
  assert.deepEqual(validate(impact(['DEC-1', 'DEC-2', 'DEC-3']), {}, chain), []);
  const cycle = {
    [recordPath('DEC-1')]: record('DEC-1', { status: 'superseded', supersedes: ['DEC-2'], supersededBy: 'DEC-2' }),
    [recordPath('DEC-2')]: record('DEC-2', { status: 'superseded', supersedes: ['DEC-1'], supersededBy: 'DEC-1' }),
  };
  assert.match(validate(impact(['DEC-1', 'DEC-2']), {}, cycle).join('\n'), /ciclo/);
});

test('metadatos malformados en un reemplazo producen errores controlados', () => {
  const entries = {
    [recordPath('DEC-1')]: record('DEC-1', { status: 'superseded', supersededBy: 'DEC-2' }),
    [recordPath('DEC-2')]: record('DEC-2', { supersedes: {} }),
  };
  assert.ok(validate(impact(['DEC-1', 'DEC-2']), {}, entries).length);
});

test('detecta enlaces locales nuevos rotos y destinos borrados en documentos sin cambios', () => {
  assert.match(validate(declaration(), {}, { 'README.md': '[Manual](docs/inexistente.md)' }).join('\n'), /enlace local/);
  const before = { 'README.md': '[Manual](docs/manual.md)', 'docs/manual.md': 'Contenido' };
  assert.match(validate(declaration(), before, { 'README.md': before['README.md'] }).join('\n'), /enlace local/);
});

test('no bloquea deuda histórica previa ni confunde ejemplos, URL y anclas con archivos', () => {
  const text = '[Viejo](ausente.md)\n[Web](https://example.org)\n[Sección](#seccion)\n```md\n[Ejemplo](otro-ausente.md)\n```\n';
  assert.deepEqual(validate(declaration(), { 'README.md': text }, { 'README.md': text + '\nTexto adicional.' }), []);
});

test('resuelve rutas relativas, espacios, imágenes y enlaces de referencia', () => {
  const entries = {
    'docs/manual.md': '[Inicio](../README.md)\n[Detalle](<Mi nota.md>)\n![Imagen](img.png)\n[Fuente][ref]\n\n[ref]: Mi%20nota.md#seccion\n',
    'README.md': '# Inicio', 'docs/Mi nota.md': '# Sección', 'docs/img.png': '',
  };
  assert.deepEqual(validate(declaration(), {}, entries), []);
  delete entries['docs/Mi nota.md'];
  assert.match(validate(declaration(), {}, entries).join('\n'), /Mi nota.md/);
});

function fixture(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'antartida-docs-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: os.devNull, GIT_CONFIG_NOSYSTEM: '1' };
  const git = (...args) => execFileSync('git', ['-c', 'user.name=Pruebas', '-c', 'user.email=pruebas@example.invalid', '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${os.devNull}`, ...args], { cwd: directory, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (file, content) => { mkdirSync(path.dirname(path.join(directory, file)), { recursive: true }); writeFileSync(path.join(directory, file), content); };
  git('init', '--initial-branch=main');
  write('README.md', '# Inicio\n');
  git('add', '.'); git('commit', '-m', 'Base');
  const base = git('rev-parse', 'HEAD');
  return { directory, env, git, write, base };
}

test('CLI local incluye documentos nuevos sin stage y devuelve código no cero ante omisiones', (t) => {
  const f = fixture(t);
  f.write('docs/manual.md', '# Manual\n');
  f.write('pr.txt', declaration({ impact: 'updated', documents: ['docs/manual.md'] }));
  const run = () => spawnSync(process.execPath, [CHECKER, '--body-file', 'pr.txt', '--base', 'main'], { cwd: f.directory, env: f.env, encoding: 'utf8' });
  const result = run();
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  f.write('pr.txt', 'Sin declaración');
  assert.equal(run().status, 1);
});

test('CLI de CI valida el merge integrado contra la base actual y detecta destinos borrados por main', (t) => {
  const f = fixture(t);
  f.write('docs/manual.md', '# Manual\n');
  f.git('add', '.'); f.git('commit', '-m', 'Manual base');
  f.git('switch', '-c', 'cambio');
  f.write('README.md', '# Inicio actualizado\n\n[Manual](docs/manual.md)\n');
  f.git('add', '.'); f.git('commit', '-m', 'Cambio');
  const head = f.git('rev-parse', 'HEAD');
  f.git('switch', 'main');
  f.git('rm', 'docs/manual.md'); f.git('commit', '-m', 'Borrar manual en main');
  const base = f.git('rev-parse', 'HEAD');
  f.git('merge', '--no-ff', 'cambio', '-m', 'Integrar PR');
  const integrated = f.git('rev-parse', 'HEAD');
  const body = declaration({ impact: 'updated', documents: ['README.md'], reason: 'Texto literal $(exit 99) `exit 98`; no se ejecuta.' });
  f.write('event.json', JSON.stringify({ pull_request: { base: { sha: base }, head: { sha: head }, body } }));
  const result = spawnSync(process.execPath, [CHECKER], { cwd: f.directory, env: { ...f.env, GITHUB_EVENT_PATH: path.join(f.directory, 'event.json'), GITHUB_SHA: integrated }, encoding: 'utf8' });
  assert.equal(result.status, 1, result.error?.message ?? result.stdout);
  assert.match(result.stderr, /enlace local/);
});

test('CLI de CI no atribuye al PR una decisión incorporada solo por main', (t) => {
  const f = fixture(t);
  f.git('switch', '-c', 'cambio');
  f.write('README.md', '# Inicio actualizado\n');
  f.git('add', '.'); f.git('commit', '-m', 'Cambio');
  const head = f.git('rev-parse', 'HEAD');
  f.git('switch', 'main');
  f.write(recordPath('DEC-1'), record());
  f.git('add', '.'); f.git('commit', '-m', 'Decisión ajena en main');
  const base = f.git('rev-parse', 'HEAD');
  f.git('merge', '--no-ff', 'cambio', '-m', 'Integrar PR');
  const integrated = f.git('rev-parse', 'HEAD');
  const body = declaration({ impact: 'updated', documents: ['README.md'], reason: 'Se actualiza solo la guía del PR.' });
  f.write('event.json', JSON.stringify({ pull_request: { base: { sha: base }, head: { sha: head }, body } }));
  const result = spawnSync(process.execPath, [CHECKER], { cwd: f.directory, env: { ...f.env, GITHUB_EVENT_PATH: path.join(f.directory, 'event.json'), GITHUB_SHA: integrated }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
});
