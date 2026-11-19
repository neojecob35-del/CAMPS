'use strict';

/**
 * Builds preview.html — a self-contained copy of the dashboard that can be
 * shown in the Review pane (or opened by double-click) without typing a URL.
 *
 * The preview embeds the latest data snapshot, and still refreshes live from
 * the local server when it can reach it.
 *
 *   node build-preview.js
 */

const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 4173);
const API = `http://127.0.0.1:${PORT}`;
const ROOT = __dirname;

(async () => {
  const res = await fetch(`${API}/api/campaigns`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API answered HTTP ${res.status}`);
  const board = await res.json();

  const index = await fs.promises.readFile(path.join(ROOT, 'index.html'), 'utf8');

  // escape "<" so a campaign title can never break out of the script tag
  const snapshot = JSON.stringify(board).replace(/</g, '\\u003c');

  const inject = `<script>
window.__BOOTSTRAP__ = ${snapshot};
(function () {
  var API = ${JSON.stringify(API)};
  window.__CAMPAIGN_API_BASE__ = API;
  var realFetch = window.fetch.bind(window);
  function snap() {
    return new Response(JSON.stringify(window.__BOOTSTRAP__), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var local = url.charAt(0) === '/';
    if (local) url = API + url;
    var request = realFetch(url, init);
    // Only the campaign board has a usable offline snapshot. Login calls must
    // fail honestly when server.js is not running.
    if (!local || !/^\\/api\\/(campaigns|refresh)\\b/.test(input)) return request;
    return request.catch(snap);
  };
})();
</script>`;

  if (!index.includes('<script>')) throw new Error('index.html has no <script> block');

  const out = index.replace('<script>', inject + '\n<script>');
  await fs.promises.writeFile(path.join(ROOT, 'preview.html'), out, 'utf8');

  console.log(
    `preview.html written — ${board.campaigns.length} campaigns @ ${board.updatedAt}`
  );
})().catch((err) => {
  console.error('preview build failed:', err.message);
  process.exit(1);
});
