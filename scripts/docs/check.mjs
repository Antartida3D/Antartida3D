import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DECISION_DIRECTORY = 'docs/decisiones/';
const STATUSES = new Set(['proposed', 'accepted', 'superseded', 'rejected']);
const DECLARATION = /<!-- documentation:start -->\s*```json\s*\n([\s\S]*?)\n```\s*<!-- documentation:end -->/g;

function filled(value) {
  return typeof value === 'string' && value.trim().length > 0 &&
    !/^(?:pendiente|pending|todo|completar|\[completar\]|<[^>]*>|\.\.\.)[.!]?$/i.test(value.trim());
}

function stringList(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0) &&
    new Set(value).size === value.length;
}

function withoutCode(text) {
  return text.replace(/<!--[^]*?-->/g, '').replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, '');
}

// Only local Markdown destinations are checked; URL availability and heading anchors need review.
function localLinks(text, source) {
  const links = [];
  const markdown = withoutCode(text);
  const patterns = [
    /!?\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^\s()]+))(?:\s+["'][^\n]*?["'])?\s*\)/g,
    /^\s{0,3}\[[^\]\n]+\]:\s*(?:<([^>\n]+)>|([^\s]+))/gm,
  ];
  for (const pattern of patterns) {
    for (const match of markdown.matchAll(pattern)) {
      const target = match[1] ?? match[2];
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) continue;
      const file = target.split(/[?#]/, 1)[0];
      if (!file) continue;
      try {
        const decoded = decodeURIComponent(file);
        const resolved = decoded.startsWith('/') ? decoded.slice(1) : path.posix.join(path.posix.dirname(source), decoded);
        links.push(path.posix.normalize(resolved));
      } catch {
        links.push(file);
      }
    }
  }
  return new Set(links);
}

function hasTarget(snapshot, target) {
  return target === '.' || snapshot.files.has(target) ||
    [...snapshot.files].some((file) => file.startsWith(target.replace(/\/$/, '') + '/'));
}

function decisions(snapshot, errors) {
  const records = new Map();
  for (const [file, text] of snapshot.texts) {
    if (!file.startsWith(DECISION_DIRECTORY) || !file.endsWith('.md')) continue;
    let record;
    try {
      const metadata = text.match(/^```json\s*\n([\s\S]*?)\n```\s*$/m);
      if (!metadata) throw new Error('Falta el bloque JSON de metadatos.');
      record = JSON.parse(metadata[1]);
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Metadatos inválidos.');
    } catch (error) {
      errors.push(`${file}: ${error.message}`);
      continue;
    }
    const required = ['id', 'date', 'status', 'issue', 'supersedes', 'supersededBy'];
    if (Object.keys(record).some((key) => !required.includes(key)) || required.some((key) => !(key in record))) {
      errors.push(`${file}: usar exactamente los campos ${required.join(', ')}.`);
    }
    if (!Number.isSafeInteger(record.issue) || record.issue <= 0 ||
        typeof record.id !== 'string' || !new RegExp(`^DEC-${record.issue}(?:-[1-9]\\d*)?$`).test(record.id)) {
      errors.push(`${file}: id debe ser DEC-<issue> o DEC-<issue>-<número>, con issue positivo.`);
      continue;
    }
    if (records.has(record.id)) errors.push(`${file}: identificador duplicado ${record.id}.`);
    const timestamp = typeof record.date === 'string' ? Date.parse(record.date) : NaN;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date) || !Number.isFinite(timestamp) ||
        new Date(timestamp).toISOString().slice(0, 10) !== record.date) errors.push(`${file}: fecha inválida; usar AAAA-MM-DD.`);
    if (!STATUSES.has(record.status)) errors.push(`${file}: estado inválido.`);
    if (!stringList(record.supersedes) || record.supersedes.includes(record.id)) errors.push(`${file}: supersedes debe listar identificadores distintos, sin incluirse a sí mismo.`);
    if (record.supersededBy !== null && (typeof record.supersededBy !== 'string' || !/^DEC-[1-9]\d*(?:-[1-9]\d*)?$/.test(record.supersededBy) || record.supersededBy === record.id)) {
      errors.push(`${file}: supersededBy debe ser otro identificador o null.`);
    }
    if ((record.status === 'superseded') !== (typeof record.supersededBy === 'string' && record.supersededBy.length > 0)) {
      errors.push(`${file}: solo una decisión superseded debe tener supersededBy.`);
    }
    for (const heading of ['Decisión', 'Motivo', 'Referencias']) {
      const section = text.match(new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm'));
      if (!section || !filled(section[1])) errors.push(`${file}: falta contenido en «${heading}».`);
    }
    records.set(record.id, { ...record, file });
  }
  return records;
}

export function validateDocumentation({ body, before, after }) {
  const errors = [];
  const matches = [...(body ?? '').matchAll(DECLARATION)];
  let declaration;
  try {
    if (matches.length !== 1 || (body.match(/<!-- documentation:start -->/g) ?? []).length !== 1 ||
        (body.match(/<!-- documentation:end -->/g) ?? []).length !== 1) throw new Error('Debe haber una sola declaración documental completa en el PR.');
    declaration = JSON.parse(matches[0][1]);
    if (!declaration || typeof declaration !== 'object' || Array.isArray(declaration)) throw new Error('La declaración debe ser un objeto JSON.');
    const keys = ['impact', 'documents', 'decisions', 'reason'];
    if (Object.keys(declaration).some((key) => !keys.includes(key)) || keys.some((key) => !(key in declaration))) throw new Error(`La declaración necesita exactamente: ${keys.join(', ')}.`);
    if (!['updated', 'none'].includes(declaration.impact)) errors.push('Elegir impact: updated o none; la plantilla pendiente no es válida.');
    if (!filled(declaration.reason)) errors.push('Explicar el impacto documental o justificar por qué no existe.');
    if (!stringList(declaration.documents) || !stringList(declaration.decisions)) throw new Error('documents y decisions deben ser listas de textos sin duplicados.');
    if (declaration.impact === 'none' && (declaration.documents.length || declaration.decisions.length)) errors.push('Con impact: none, documents y decisions deben estar vacíos.');
    if (declaration.impact === 'updated' && !declaration.documents.length) errors.push('Con impact: updated, indicar al menos un documento actualizado.');
    for (const file of declaration.documents) {
      if (file.startsWith('/') || file.includes('\\') || file.split('/').includes('..') || !file.endsWith('.md') ||
          !after.texts.has(file)) errors.push(`Documento inexistente o ruta inválida: ${JSON.stringify(file)}.`);
      else if (before.texts.get(file) === after.texts.get(file)) errors.push(`Documento declarado sin cambios en el PR: ${file}.`);
    }
  } catch (error) {
    errors.push(error.message);
    declaration = null;
  }

  const previous = decisions(before, []);
  const current = decisions(after, errors);
  for (const [id, old] of previous) {
    const next = current.get(id);
    if (!next) errors.push(`${id}: conservar el registro histórico; marcarlo como reemplazado o descartado en vez de borrarlo.`);
    else if (['accepted', 'superseded'].includes(old.status) && !['accepted', 'superseded'].includes(next.status)) {
      errors.push(`${id}: una decisión aceptada se reemplaza con otro registro; no vuelve a propuesta ni se descarta.`);
    } else if (old.status === 'superseded' && next.status !== 'superseded') errors.push(`${id}: conservar el estado histórico de reemplazada.`);
  }
  for (const [id, record] of current) {
    const changed = before.texts.get(record.file) !== after.texts.get(record.file);
    if (changed && declaration && (!declaration.decisions.includes(id) || !declaration.documents.includes(record.file))) {
      errors.push(`${id}: incluir la decisión modificada y su archivo en la declaración del PR.`);
    }
    if (Array.isArray(record.supersedes)) for (const predecessor of record.supersedes) {
      const old = current.get(predecessor);
      if (!old) errors.push(`${id}: no existe la decisión reemplazada ${JSON.stringify(predecessor)}.`);
      else if (['accepted', 'superseded'].includes(record.status) && (old.status !== 'superseded' || old.supersededBy !== id)) {
        errors.push(`${id}: ${predecessor} debe estar superseded y apuntar a ${id}.`);
      }
    }
    if (record.status === 'superseded') {
      const next = current.get(record.supersededBy);
      if (!next || !['accepted', 'superseded'].includes(next.status) || !Array.isArray(next.supersedes) || !next.supersedes.includes(id)) {
        errors.push(`${id}: el reemplazo debe existir, estar aceptado o reemplazado y declarar supersedes: ${id}.`);
      }
      const seen = new Set([id]);
      let cursor = record;
      while (cursor?.supersededBy) {
        if (seen.has(cursor.supersededBy)) { errors.push(`${id}: hay un ciclo de reemplazos.`); break; }
        seen.add(cursor.supersededBy);
        cursor = current.get(cursor.supersededBy);
      }
    }
  }
  if (declaration) for (const id of declaration.decisions) {
    const record = current.get(id);
    if (!record) errors.push(`Decisión declarada inexistente: ${JSON.stringify(id)}.`);
    else if (before.texts.get(record.file) === after.texts.get(record.file)) errors.push(`${id}: la decisión declarada no cambió en este PR.`);
  }

  for (const [file, text] of after.texts) {
    const oldLinks = localLinks(before.texts.get(file) ?? '', file);
    for (const target of localLinks(text, file)) {
      if (!hasTarget(after, target) && (!oldLinks.has(target) || hasTarget(before, target))) {
        errors.push(`${file}: enlace local nuevo o roto por este PR: ${target}.`);
      }
    }
  }
  return errors;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function snapshot(revision) {
  const names = git(revision ? ['ls-tree', '-r', '-z', '--name-only', revision] : ['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean);
  const files = new Set();
  const texts = new Map();
  for (const file of names) {
    if (!revision && !existsSync(file)) continue;
    files.add(file);
    if (file.endsWith('.md') && (revision || !lstatSync(file).isSymbolicLink())) {
      texts.set(file, revision ? git(['show', `${revision}:${file}`]) : readFileSync(file, 'utf8'));
    }
  }
  return { files, texts };
}

function main() {
  const options = {};
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 2) {
    if (!['--body-file', '--base', '--head'].includes(args[index]) || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Uso: node scripts/docs/check.mjs --body-file <PR.md> --base <rama> [--head <commit>]');
    options[args[index]] = args[index + 1];
  }
  const event = !options['--body-file'] && process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : null;
  const base = options['--base'] ?? event?.pull_request?.base?.sha;
  const head = options['--head'] ?? event?.pull_request?.head?.sha;
  const body = options['--body-file'] ? readFileSync(options['--body-file'], 'utf8') : event?.pull_request?.body;
  if (!base || typeof body !== 'string') throw new Error('Falta el cuerpo del PR o su base. Usar --body-file y --base, o un evento pull_request.');
  const resolve = (ref) => git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]).trim();
  const headRevision = head ? resolve(head) : null;
  const ancestor = git(['merge-base', resolve(base), headRevision ?? 'HEAD']).trim();
  const errors = validateDocumentation({ body, before: snapshot(ancestor), after: snapshot(headRevision) });
  if (errors.length) {
    console.error('Control documental fallido:\n' + errors.map((error) => `- ${error}`).join('\n'));
    process.exitCode = 1;
  } else console.log('Control documental correcto. La coherencia del contenido y las excepciones requieren revisión humana.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
