// Static Pages packaging only. No network, credentials, database or source mutation.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
function option(name, fallback) {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1];
}
const revision = option('--revision', execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim());
if (!/^[a-zA-Z0-9-]{1,80}$/.test(revision)) throw new Error('Invalid release identifier');
const out = path.resolve(option('--out', path.join(os.tmpdir(), 'ratemycourse-pages-' + revision)));
if (out === repo || out.startsWith(repo + path.sep) || repo.startsWith(out + path.sep)) throw new Error('Output must be outside the source repository');
if (fs.existsSync(out)) throw new Error('Output already exists; use a fresh directory');
const config = JSON.parse(fs.readFileSync(path.join(repo, 'src/site/pages-compatibility.json')));
const roots = ['.nojekyll', 'index.html', 'community.html', 'courses-shell.html', 'guide.html', 'analytics.html', 'src', 'assets'];
const buildOnly = new Set(['src/site/build-pages.mjs', 'src/site/pages-compatibility.json']);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'rmc-pages-'));
const history = new Map();

function historic(commit) {
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('History must be pinned to a full commit');
  if (history.has(commit)) return history.get(commit);
  const dir = path.join(temporary, commit);
  fs.mkdirSync(dir);
  const archive = execFileSync('git', ['archive', commit], { cwd: repo, maxBuffer: 64 * 1024 * 1024 });
  const tar = path.join(temporary, commit + '.tar');
  fs.writeFileSync(tar, archive);
  execFileSync('tar', ['-xf', tar, '-C', dir]);
  history.set(commit, dir);
  return dir;
}
function copy(source, relative, destination) {
  const input = path.join(source, relative);
  if (!fs.existsSync(input)) throw new Error('Missing release input: ' + relative);
  const stat = fs.lstatSync(input);
  if (stat.isSymbolicLink()) throw new Error('Symlinks are not published: ' + relative);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(input)) copy(source, path.join(relative, name), destination);
  } else {
    if (buildOnly.has(relative.split(path.sep).join('/'))) return;
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(input, target);
  }
}
function site(source, destination) {
  for (const relative of roots) copy(source, relative, destination);
}
function hashFiles(base, folder = base) {
  return fs.readdirSync(folder).sort().flatMap(name => {
    const file = path.join(folder, name);
    if (fs.statSync(file).isDirectory()) return hashFiles(base, file);
    return [{ path: path.relative(base, file).split(path.sep).join('/'), sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') }];
  });
}
try {
  fs.mkdirSync(out);
  const baseline = historic(config.classicBaseline);
  // Keep only resources the last published classic entry points may still request.
  // Historical demos and retired interactive-slide code are not included.
  for (const relative of [...config.classicFiles, ...config.classicTrees]) copy(baseline, relative, out);
  site(repo, out);
  const releasePath = 'releases/' + revision;
  site(repo, path.join(out, releasePath));
  for (const commit of config.previousModuleReleases) site(historic(commit), path.join(out, 'releases', commit));
  // Public root HTML addresses immutable module graphs. A release-local shell keeps
  // its original src paths because its loader resolves them from that release root.
  for (const file of config.classicHtml) {
    const target = path.join(out, file);
    const html = fs.readFileSync(target, 'utf8').replace(/((?:src|href)=["'])src\//g, '$1' + releasePath + '/src/');
    fs.writeFileSync(target, html);
  }
  if (args.includes('--rollback')) {
    // Restore old root pages while retaining new release URLs for cached new HTML.
    for (const file of config.classicHtml) copy(baseline, file, out);
  }
  const files = hashFiles(out);
  fs.writeFileSync(path.join(out, 'release-manifest.json'), JSON.stringify({
    revision, mode: args.includes('--rollback') ? 'classic-rollback' : 'modules',
    classicBaseline: config.classicBaseline, retainedModuleReleases: config.previousModuleReleases, files
  }, null, 2) + '\n');
  console.log(JSON.stringify({ out, revision, files: files.length, mode: args.includes('--rollback') ? 'classic-rollback' : 'modules' }));
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
