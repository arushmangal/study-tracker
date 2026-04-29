# 📚 Arush's Study Tracker

A personal, public-facing study accountability tracker — built from scratch with vanilla HTML, CSS, and JavaScript. Deployed as a static page. No frameworks, no build tools.

**Live site:** [mangalarush.github.io/study-tracker](https://mangalarush.github.io/study-tracker) *(or wherever you host it)*

***

## What It Does

The tracker answers one question at a glance: **how many hours are left to study?**

Hours are *earned* by collecting likes on YouTube comments. Every like on a tracked comment adds a fixed number of hours to the obligation. Hours are *completed* by logging Todoist study tasks. The gap between owed and done is the remaining debt displayed in big red numbers at the top.

This creates a public accountability loop — anyone who likes a comment is directly contributing to the study goal.

***

## Features

### Core Stats
- **Hours remaining** — owed minus completed, shown prominently
- **Progress bar** — visual fill from 0 → 100% as hours are completed
- **Hours owed / hours done** — side-by-side breakdown

### Clock & Status
- Live IST clock with date display
- **Sleep detection** — between 12 AM and 8 AM, if no active focus session is running, the clock card shows a sleeping notice. If a focus session *is* active during those hours (all-nighter mode), it switches to an encouraging message instead
- **Focus dot** — a live green pulsing indicator when a focus session is active, with elapsed time; shows "last seen X ago" when on a break

### Study Insights
- **Today's hours** with day-of-year counter
- **This week's hours** with ISO week number
- **90-day study heatmap** — GitHub-style grid, hoverable, colour-coded by intensity; only shows days from the deploy date onwards

### Todoist Integration
- **Active tasks panel** — pulls your current Todoist inbox tasks with priority colour coding and due dates (overdue tasks highlighted red)
- **Auto-sync completed tasks** — periodically calls the worker to check for newly completed Todoist study tasks and writes them to the session log automatically; no manual entry needed

### Like Sources
- Collapsible breakdown of every tracked YouTube comment
- Shows per-comment like count, hours earned, and a `+Xh` badge linking directly to the comment so visitors can like it

### Recent Sessions
- Last 6 logged study sessions with topic and duration

### Maintenance Mode
- Uncomment a single `<script>` block in `index.html` to display a full-screen maintenance overlay with an animated message; no visible content underneath

***

## How the Date Logging Works

When a Todoist task is synced as a completed session, the date used for the study log follows this priority:

1. **Assigned due date on the task** (most relevant — this is when the work was *meant to happen*)
2. **Completion timestamp** (fallback — used only if no due date is set)

This means if you complete a task on Wednesday that was due Monday, it logs under Monday.

***

## Architecture

```
Browser (index.html)
    │
    ├── GitHub Raw (data.json)          — completed hours & session log
    │
    └── Cloudflare Worker               — all live data + API actions
            ├── GET /                   — like counts, hours owed, last change, cache timestamp
            ├── ?action=getFocusState   — current focus session state
            ├── ?action=getTodoistTasks — active Todoist tasks
            └── ?action=syncTodoistCompleted — pull & write completed tasks → data.json
```

### `data.json` (GitHub)
Stores the completed side of the tracker:
```json
{
  "hoursCompleted": 86.5,
  "sessions": [
    { "topic": "Maths — Limits", "hours": 2, "date": "28 Apr 2026", "loggedAt": "2026-04-28T14:00:00Z" }
  ]
}
```

### Cloudflare Worker
Handles everything that needs a secret (YouTube API key, Todoist token, GitHub PAT for writing `data.json`). The browser never touches any credential directly.

### Caching
Worker responses are cached for **5 minutes**. A live countdown in the UI shows time until the next refresh. The countdown turns orange under 60 seconds and green when a re-fetch is imminent.

***

## Refresh Intervals

| Data | Interval |
|---|---|
| Hours owed / like counts | 5 min (worker cache TTL) |
| Active Todoist tasks | 3 min |
| Todoist completed sync | 5 min |
| Focus state | 60 sec (30 sec while active) |
| Clock | 1 sec |

***

## Local Development

No build step needed. Open `index.html` directly in a browser or serve it with any static server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

The page will load but live data (likes, focus state, Todoist) requires the Cloudflare Worker to be running.

***

## Enabling Maintenance Mode

In `index.html`, uncomment the block near the top:

```html
<script>
  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("maintenance-screen").style.display = "flex";
    document.body.style.overflow = "hidden";
  });
</script>
```

Re-comment it to restore the live page.

***

## Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML · CSS · JavaScript |
| Hosting | GitHub Pages |
| Worker / API | Cloudflare Workers |
| Session data | GitHub (raw `data.json` via PAT) |
| Task tracking | Todoist REST API |
| Like tracking | YouTube Data API v3 |
| Timezone | All times in IST (Asia/Kolkata) |

***

## Motivation

Built to stay honest. The study hours aren't self-reported — they're driven by real Todoist completions and a public like-count anyone can verify. The sleep/focus status makes the accountability live: visitors can see in real time whether work is actually happening.

***
