// Static Pages packaging and release verification.
// No network, credentials, database, or source mutation.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
function option(name, fallback) {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1];
}

const revision = option(
  "--revision",
  execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repo,
    encoding: "utf8",
  }).trim(),
);
if (!/^[a-zA-Z0-9-]{1,80}$/.test(revision))
  throw new Error("Invalid release identifier");
const out = path.resolve(
  option("--out", path.join(os.tmpdir(), "ratemycourse-pages-" + revision)),
);
if (
  out === repo ||
  out.startsWith(repo + path.sep) ||
  repo.startsWith(out + path.sep)
)
  throw new Error("Output must be outside the source repository");
if (fs.existsSync(out))
  throw new Error("Output already exists; use a fresh directory");

const config = JSON.parse(
  fs.readFileSync(path.join(repo, "src/site/pages-compatibility.json")),
);
const roots = [
  ".nojekyll",
  "index.html",
  "community.html",
  "courses-shell.html",
  "guide.html",
  "analytics.html",
  "src",
  "assets",
];
const excludedExact = new Set([
  "src/site/build-pages.mjs",
  "src/site/pages-compatibility.json",
  "src/site/landing/student-carousel/README.md",
]);
const excludedPrefixes = ["src/site/landing/student-carousel/src/"];

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "rmc-pages-"));
const history = new Map();

function normalizeRel(relative) {
  return relative.split(path.sep).join("/");
}

function isExcluded(relative) {
  const rel = normalizeRel(relative);
  return (
    excludedExact.has(rel) ||
    excludedPrefixes.some(
      (prefix) => rel === prefix.slice(0, -1) || rel.startsWith(prefix),
    )
  );
}

function historic(commit) {
  if (!/^[0-9a-f]{40}$/.test(commit))
    throw new Error("History must be pinned to a full commit");
  if (history.has(commit)) return history.get(commit);
  const dir = path.join(temporary, commit);
  fs.mkdirSync(dir);
  const archive = execFileSync("git", ["archive", commit], {
    cwd: repo,
    maxBuffer: 64 * 1024 * 1024,
  });
  const tar = path.join(temporary, commit + ".tar");
  fs.writeFileSync(tar, archive);
  execFileSync("tar", ["-xf", tar, "-C", dir]);
  history.set(commit, dir);
  return dir;
}

function copy(source, relative, destination) {
  if (isExcluded(relative)) return;
  const input = path.join(source, relative);
  if (!fs.existsSync(input)) throw new Error("Missing release input: " + relative);
  const stat = fs.lstatSync(input);
  if (stat.isSymbolicLink())
    throw new Error("Symlinks are not published: " + relative);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(input))
      copy(source, path.join(relative, name), destination);
  } else {
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(input, target);
  }
}

function site(source, destination) {
  for (const relative of roots) copy(source, relative, destination);
}

function hashFiles(base, folder = base) {
  return fs
    .readdirSync(folder)
    .sort()
    .flatMap((name) => {
      const file = path.join(folder, name);
      if (fs.statSync(file).isDirectory()) return hashFiles(base, file);
      return [
        {
          path: normalizeRel(path.relative(base, file)),
          sha256: createHash("sha256")
            .update(fs.readFileSync(file))
            .digest("hex"),
        },
      ];
    });
}

function verifyRelease(files, { releasePath, rollback }) {
  const paths = new Set(files.map((entry) => entry.path));
  const forbidden = [
    /(^|\/)(Private|QA|Reference|Archive|design-demos|\.github|\.codex|\.agents)(\/|$)/,
    /(^|\/)(build-pages\.mjs|pages-compatibility\.json)$/,
    /(^|\/)student-carousel\/src(\/|$)/,
    /\.jsx$/,
    /(^|\/)homepage\.(js|css)$/,
    /(^|\/)tokyo-hero\.(js|css)$/,
  ];
  for (const rel of paths) {
    for (const pattern of forbidden) {
      if (pattern.test(rel))
        throw new Error("Forbidden file in Pages release: " + rel);
    }
  }
  const foliagePath = `${releasePath}/src/site/landing/assets/bay/background-min-3.png`;
  const foliageEntry = files.find((entry) => entry.path === foliagePath);
  if (
    foliageEntry?.sha256 !==
    "891385ddaf596b55e087533e7d6adf252416158d43e2bb93275a9a291dac7ac5"
  ) {
    throw new Error("Approved bay foliage asset SHA-256 mismatch");
  }
  const requiredActive = [
    `${releasePath}/src/site/index.js`,
    `${releasePath}/src/site/landing/index.js`,
    `${releasePath}/src/site/landing/bay-hero.js`,
    `${releasePath}/src/site/landing/previews.js`,
    `${releasePath}/src/site/landing/landing.css`,
    `${releasePath}/src/site/landing/student-carousel/index.js`,
    `${releasePath}/src/site/landing/assets/bay/background-min-3.png`,
    `${releasePath}/src/site/workspace.js`,
    "site-entry.js",
  ];
  for (const req of requiredActive) {
    if (!paths.has(req))
      throw new Error("Missing required release file: " + req);
  }
  for (const commit of config.previousModuleReleases) {
    const prevEntry = `releases/${commit}/src/site/index.js`;
    if (!paths.has(prevEntry))
      throw new Error("Missing retained previous release graph: " + prevEntry);
  }
  const indexHtml = fs.readFileSync(path.join(out, "index.html"), "utf8");
  if (!rollback && !indexHtml.includes(`${releasePath}/src/site/index.js`)) {
    throw new Error("Root index.html does not reference immutable release path");
  }
}

try {
  fs.mkdirSync(out);
  const baseline = historic(config.classicBaseline);
  // Keep only resources the last published classic entry points may still request.
  for (const relative of [...config.classicFiles, ...config.classicTrees])
    copy(baseline, relative, out);
  site(repo, out);
  const releasePath = "releases/" + revision;
  site(repo, path.join(out, releasePath));
  for (const commit of config.previousModuleReleases)
    site(historic(commit), path.join(out, "releases", commit));
  // Public root HTML addresses immutable module graphs. A release-local shell keeps
  // its original src paths because its loader resolves them from that release root.
  for (const file of config.classicHtml) {
    const target = path.join(out, file);
    const html = fs
      .readFileSync(target, "utf8")
      .replace(/((?:src|href)=["'])src\//g, "$1" + releasePath + "/src/");
    fs.writeFileSync(target, html);
  }
  const rollback = args.includes("--rollback");
  if (rollback) {
    // Restore old root pages while retaining new release URLs for cached new HTML.
    for (const file of config.classicHtml) copy(baseline, file, out);
  }
  const files = hashFiles(out);
  verifyRelease(files, { releasePath, rollback });
  fs.writeFileSync(
    path.join(out, "release-manifest.json"),
    JSON.stringify(
      {
        revision,
        mode: rollback ? "classic-rollback" : "modules",
        classicBaseline: config.classicBaseline,
        retainedModuleReleases: config.previousModuleReleases,
        files,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      out,
      revision,
      files: files.length,
      mode: rollback ? "classic-rollback" : "modules",
    }),
  );
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
