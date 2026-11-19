# Content Rewards — Auto-Updating Campaign Board

## Deploy to GitHub + Render

1. Upload or push the files in this folder to a GitHub repository.
2. In Render, choose **New → Blueprint**, connect that repository, and apply `render.yaml`.
3. Render builds the Node.js web service, starts `server.js`, and checks `/health`.
4. Open the Render service URL in an Android browser. The dashboard is a responsive website; this ZIP does not contain an installable APK.

The Render configuration binds the web server to `0.0.0.0` and uses Render's assigned `PORT`. The source project outside this ZIP was not changed.

A tiny self-hosted board that shows **new campaigns from `contentrewards.com/discover`**
posted in the **last 21 days** (today / 1 day / 2–7 days / 14 days / 21 days).

- Runs on **your own server only** — Node.js standard library, no npm install, no CDN.
- Live updates by SSE; the browser also checks every **20 seconds** as a safety net, and
  the server re-scrapes every **15 seconds**.
- Optional **auto-start at Windows sign-in** and automatic restart if the server stops.
- Filters: time window, **niche** (Gaming, Music, Entertainment, Finance & Crypto,
  Tech & Apps, Sports, Lifestyle, Other), 100K+ views, 1M+ views, search, sort
  (including **most paid to clippers**).
- Shows total campaign views and the best clip per campaign.
- Shows the **top 10 clips** exposed by each campaign's public page.
- **Campaign payout status:** each campaign shows how much has been paid out so far
  (`budgetSpentCents`) and the budget-used percentage.
- Flags campaigns that require a minimum creator-view count (pool campaigns).
- **Clipper leaderboard:** switch the board to **Leaderboard** to rank the creators
  attached to those campaigns by tracked views, campaign count, best single clip, or
  estimated earnings. Each row expands to show the campaigns that creator appears in.
- **New-campaign alerts:** when a campaign appears on the board for the first time you get
  an in-page toast, a short chime, an optional Windows desktop notification, and a
  persistent **NEW** badge on the card (24h). Toggle with the **Alerts** button in the
  header.

## Run

Double-click **`start.bat`** — or:

```bat
cd /d "G:\apps\auto update"
node watch-server.js
```

Then open <http://127.0.0.1:4173>.

`watch-server.js` keeps the server alive: it restarts the server if it stops and
restarts it when `server.js` changes. To start the board automatically when you sign
in to Windows, run **`install-autostart.bat`** once. Remove the shortcut from your
Startup folder to undo it. No additional packages are required.

## Files

| File | Purpose |
|---|---|
| `server.js` | Local HTTP server + campaign scraper (no dependencies) |
| `watch-server.js` | Starts the server, restarts it if it stops, and reloads it after code changes |
| `start-hidden.vbs` | Launches the watchdog without a console window (used by autostart) |
| `install-autostart.bat` | Adds the board to the Windows Startup folder |
| `index.html` | Dashboard UI (inline CSS/JS, no CDN) |
| `preview.html` | Self-contained snapshot for the Review pane / double-click |
| `build-preview.js` | Regenerates `preview.html` from the current board |
| `start.bat` | Windows launcher |
| `package.json` | Metadata / `npm start` |

## Preview without a link

`preview.html` is a full copy of the dashboard with the latest data baked in, so it
opens by double-click and shows everything immediately — no server needed. When the
local server is running it also picks up live refreshes.

Regenerate the snapshot any time with:

```bat
node build-preview.js
```

## API

| Endpoint | What it does |
|---|---|
| `GET /api/campaigns` | Campaign board JSON (cached ~15s) |
| `GET /api/refresh` | Force a fresh scrape |
| `GET /health` | Server + last error status |

## How it reads the site

`contentrewards.com` is a Next.js app, so the campaign list is embedded in the server
payload (`self.__next_f.push`) as JSON. The server:

1. Fetches the discover feed from every tab (`/discover`, `/c/discover/clipping`,
   `/c/discover/ugc`) and **every page of each tab** (`?page=1..N`), then merges the
   campaign objects. Each tab page embeds a different slice of the catalogue, so
   paging is what makes the board complete (~400 campaigns seen per refresh).
2. Opens each recent campaign page to read its real launch date, total views, top clips,
   budget, platforms, minimum-creator-views requirement, and amount paid to clippers.
3. Keeps the ones launched within the last 21 days.

### Earnings data

- `paidOut` = `metrics.budgetSpentCents / 100` — what the campaign has actually spent on
  clipper payouts so far (not the total budget).
- `budgetUsedPct` = `metrics.budgetProgressBps / 100`.
- `rate` is the campaign's published per-1K-view rate, built from the discover API's
  `cpmMinRateCents` / `cpmMaxRateCents` (or its `payouts[].rateCents`). Cards show it as
  `$1.50/1K`, `$1–$2/1K`, or `pool`.
- Some campaigns (especially pool campaigns, or ones that just launched) show `$0`
  until payouts are processed.

## Clipper leaderboard

The header switch (**Campaigns** / **Leaderboard**) opens a ranked view of the creators
whose clips appear in the board's top-clip data.

- Aggregates the clips exposed on public campaign pages (up to **10 per campaign**) in the
  chosen **time window** and **niche**.
- Ranks by **Most views** (default), **Most estimated earnings**, **Most campaigns**, or
  **Biggest single clip**. Search finds a clipper by name or handle.
- Each row shows total views, campaigns, best clip, estimated earnings, and the creator's
  share of all tracked clipper views. Expand a row to see every campaign they appear in;
  each campaign links to the campaign page and the creator's post, and its **Preview**
  button opens the clip in the same video player used on campaign cards.
- **Estimated earnings** apply each campaign's published rate per 1K views to the
  creator's tracked views on that campaign. They are estimates only: they ignore payout
  caps, take-rate differences between platforms, and campaigns with no published rate
  (shown as `—`).
- A creator with no display name is grouped by the site's creator id, so the same
  account's clips are counted together.

The view choice, window, niche, sort, and search are remembered in `localStorage`
(`cr-board`). The leaderboard is computed in the browser from the same snapshot as the
cards, so it updates live with the board.

If the site changes its payload shape, only `parseDiscover()` / `parseDetail()` in
`server.js` need updating.

## New-campaign alerts

The server records `firstSeenAt` the first time each campaign shows up in a feed, so the
board can tell "brand new" apart from "old campaign, recently ranked higher".

On the client (`index.html`):

- The first snapshot after a fresh browser profile **seeds** the known-campaign list and
  stays silent, so opening the board never spams alerts for the 232 existing campaigns.
- Any campaign whose id was not seen before triggers a toast, a two-tone chime
  (Web Audio, unlocked by your first click), and — if allowed — a Windows notification
  that opens the board and scrolls to the campaign when clicked.
- Campaigns are only announced if they launched in the last 48 hours; older ones are
  quietly added to the list.
- The **NEW** badge and card outline stay for 24 hours, or until you click the badge or
  the toast entry.
- The header **Alerts** button mutes/unmutes everything and is remembered in
  `localStorage` (`cr-alerts`, `cr-known-ids`, `cr-fresh-ids`).
- Desktop notifications need permission; the first new-campaign toast offers a
  **Desktop alerts** link that requests it. `127.0.0.1` counts as a secure origin, so
  this works without HTTPS.

Alerts only fire while the dashboard is open in a browser tab (SSE keeps it fresh in the
background). `stats.newCount` in the API is the number of campaigns first seen in the
last 24 hours.

## Notes

- Campaign **details/joining** still happen on contentrewards.com; this board only shows
  public campaign data and clips.
- This board is read-only; it never posts or joins anything.
- Change the port: `set PORT=8080` before starting.
