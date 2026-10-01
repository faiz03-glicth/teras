/**
 * Writes public/acknowledgements/index.html from the project's actual dependencies.
 *
 * Run after adding or removing a package:  node scripts/build-acknowledgements.js
 * Reads each dependency's own package.json, so the licence and version are what is installed rather
 * than what someone remembered.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.dirname(__dirname);
const OUT = path.join(REPO, 'public', 'acknowledgements', 'index.html');

const manifest = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));

/** The licence a package declares, however it declares it. */
function licenceOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license && typeof pkg.license.type === 'string') return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type || l).join(', ');
  return null;
}

const escape = (text) =>
  String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const rows = [];
const unknown = [];

for (const name of Object.keys(manifest.dependencies ?? {}).sort()) {
  const installed = path.join(REPO, 'node_modules', name, 'package.json');
  if (!fs.existsSync(installed)) {
    unknown.push(name);
    continue;
  }
  const pkg = JSON.parse(fs.readFileSync(installed, 'utf8'));
  const licence = licenceOf(pkg);
  if (!licence) unknown.push(name);
  rows.push({
    name,
    version: pkg.version ?? '',
    licence: licence ?? 'see the package',
    url: pkg.homepage || `https://www.npmjs.com/package/${name}`,
  });
}

const MARK = `<svg viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="var(--orb)">
          <circle cx="50" cy="50" r="12" fill="var(--orb)" stroke="none" />
          <circle cx="50" cy="50" r="24" stroke-width="9" />
          <path d="M50 18a32 32 0 0 1 27 49" stroke-width="10" stroke-linecap="round" />
          <path d="M50 82a32 32 0 0 1-27-49" stroke-width="10" stroke-linecap="round" />
        </svg>`;

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Acknowledgements — Teras &amp; Streak</title>
    <meta name="description" content="The open-source software the Teras and Streak apps are built on." />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <header>
      <a class="mark" href="/">
        ${MARK}
        <span>Teras &amp; Streak</span>
      </a>
    </header>

    <main>
      <h1>Acknowledgements</h1>
      <p class="updated">Generated from the project's dependencies on ${new Date().toISOString().slice(0, 10)}</p>

      <p>
        These apps are built on open-source software. We are grateful to everyone who wrote and maintains
        it. Each package below is used under its own licence; follow a link for the full text.
      </p>

      <p>The typeface is <a href="https://rsms.me/inter/">Inter</a>, used under the SIL Open Font License 1.1.</p>

      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Version</th>
            <th>Licence</th>
          </tr>
        </thead>
        <tbody>
${rows
  .map(
    (r) =>
      `          <tr>\n            <td><a href="${escape(r.url)}">${escape(r.name)}</a></td>\n` +
      `            <td>${escape(r.version)}</td>\n            <td>${escape(r.licence)}</td>\n          </tr>`,
  )
  .join('\n')}
        </tbody>
      </table>

      <p>
        This list covers direct dependencies. Each of those brings its own, and the complete tree is in the
        project's lockfile.
      </p>
    </main>

    <footer>
      <a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/help/">Help</a>
      <a href="/acknowledgements/">Acknowledgements</a>
    </footer>
  </body>
</html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`Acknowledgements written for ${rows.length} packages.`);
if (unknown.length) {
  console.warn(`No licence found for: ${unknown.join(', ')} — check these by hand.`);
}
