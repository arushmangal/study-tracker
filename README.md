# 📚 Arush's Study Tracker

A live accountability page that turns YouTube likes into study hours made for personal use as a passion project. Every time someone likes one of my comments on a study-with-me video, hours get added to my queue — and I have to sit down and clear them.

**Live → [arushmangal.github.io/study-tracker](https://arushmangal.github.io/study-tracker)**

***

## Why this exists

I struggle with binge-watching and wasting time on YouTube. This tracker flips that habit: I post comments on study-with-me videos I actually use, and each like on those comments adds real study hours to my schedule. Strangers on the internet become my accountability partners — without them having to do anything except click a button they were going to click anyway.

***

## How it works

```
YouTube likes
     │
     ▼
Cloudflare Worker  ──── YouTube Data API v3 ────► fetches live like counts
     │                                             for each tracked comment
     │  stores counts in KV, detects new likes
     ▼
raw.githubusercontent.com/data.json   ◄──── I log sessions via a hidden
     │                                       admin panel (Shift + A + D)
     ▼
index.html  (GitHub Pages)
  ├── hours owed  =  Σ(likes × hoursPerLike)  across all tracked comments
  ├── hours done  =  hoursCompleted in data.json
  ├── remaining   =  owed − done
  ├── progress bar
  ├── study heatmap (last 90 days)
  ├── today / this-week stats
  ├── like-sources breakdown
  └── recent sessions log
```

***

## Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Vanilla HTML / CSS / JS | No build step, zero dependencies, works anywhere |
| Data store | `data.json` in this repo | Free, version-controlled, no database needed |
| Like counter | Cloudflare Worker + KV | Edge-cached, detects new likes, holds API key securely |
| Like source | YouTube Data API v3 | Real-time `likeCount` per comment |
| Hosting | GitHub Pages | Free static hosting, deploys on every push |

***

## Repo structure

```
study-tracker/
├── index.html      ← entire frontend (single file, no build)
├── data.json       ← session log, updated by me
└── README.md
```

### `data.json` shape

```json
{
  "hoursCompleted": 14.5,
  "sessions": [
    {
      "date": "01 Apr 2026",
      "topic": "Electrostatics — Gauss's Law",
      "hours": 2.5
    }
  ]
}
```

***

## Cloudflare Worker

Hosted at `study-tracker-likes.mangalarush.workers.dev`. On every request it:

1. Calls the YouTube Data API for the live `likeCount` on each tracked comment
2. Compares against previous counts stored in KV and records any new likes
3. Returns a JSON payload — `totalLikes`, `totalHours`, a per-comment `breakdown`, and `lastChange` metadata

The worker is the **only** component that touches an API key. The frontend is entirely read-only and makes no authenticated requests.

***

## Tracked comments

Each comment has a `hoursPerLike` rate. Longer, harder videos I need more motivation to sit through get higher rates.

| Video | Channel | Rate |
|---|---|---|
| Shut out the world For next 8 hours | messydeskhours | **8h / like** |
| 4 a.m. 4 hours of deep work | james vinh scholz | **4h / like** |
| 4 Hours of Asian Mum to Help You Focus | TwoSetViolin | **4h / like** |
| 4 Hours of German WW2 Officer | Radical Living | **4h / like** |
| 3 Hours Study With Me | iCanStudy | **3h / like** |
| 3-HR STUDY WITH ME | tani study | **3h / like** |
| 2 Hours of German WW2 Officer | Radical Living | **2h / like** |
| 2 Hours of Soviet WW2 Officer | The Focus Warden | **2h / like** |
| You Are Solving the Unsolvable \| Oppenheimer Soundtrack | Cinematic Focus | **1h / like** |
| German Soldier Helps You Study | The Focus Warden | **1h / like** |
| SUITS — You are proving everyone wrong | MUNDI OPUS | **1h / like** |
| Sitar For Brain Fog | Shanti Instrumentals | **1h / like** |
| 1 Hour of Asian Mum Cooking | TwoSetViolin | **1h / like** |

***

## Logging a session

Sessions are logged via a hidden admin panel — press **Shift + A + D** on the live page. It commits directly to `data.json` via the GitHub API using a personal access token stored only in my browser's `localStorage`. No credentials are ever shipped in the code.

After logging, GitHub Pages redeploys in seconds and the progress bar updates.

***

## Maintenance mode

When the page needs an update, I wrap a one-line script block in HTML comments at the top of `index.html`. Visitors see a 🔧 overlay instead of broken data.

To **activate**: remove the `<!--` and `-->` around the block in `index.html`.  
To **deactivate**: put them back.

```html
<!--
<script>
  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("maintenance-screen").style.display = "flex";
    document.body.style.overflow = "hidden";
  });
</script>
-->
```

***

## Local development

No build tools needed. Just open `index.html` in a browser — it loads live data from the Cloudflare Worker and GitHub as normal.

```bash
git clone https://github.com/arushmangal/study-tracker.git
cd study-tracker
open index.html
```

***
