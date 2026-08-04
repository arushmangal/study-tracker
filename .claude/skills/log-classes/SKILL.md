---
name: log-classes
description: Weekly manual log of class-attendance hours into study-tracker's data.json, working around a Todoist API gap that stops these recurring tasks' completions from being picked up by the automatic sync.
---

# Log classes

Run this once a week (normally Sunday evening, after the week's classes are
done) to log study hours for class attendance. These tasks use Todoist's
native recurrence, and their completions don't reliably show up via
Todoist's `/tasks/completed/*` REST endpoints — confirmed by extensive
testing (see worker.js comments near `getClassSchedule`/`addSessions`). So
instead of relying on the normal Todoist sync, this skill reads the *current
schedule* (which the regular active-tasks API returns fine) and lets you
confirm attendance directly.

## Steps

1. Read the admin secret from the gitignored `.dev.vars` file in the repo
   root (`ADMIN_SECRET=...`). Never print its value or commit it anywhere.

2. Fetch the current class schedule:
   ```
   curl -s "https://study-tracker-likes.mangalarush.workers.dev/<ADMIN_SECRET>/class-schedule"
   ```
   Each entry has `label` (clean topic, e.g. "Attend BITS U103 Lecture"),
   `project`, `weekdays` (array like `["tue","thu"]`), and `hours` (parsed
   duration).

3. Figure out the date range to log for: the most recent Monday through
   today (or through the most recent Sunday if run later). Use the actual
   current date, not an assumption from a prior run.

4. For every schedule entry, compute the actual calendar date(s) within that
   range matching its `weekdays`. This gives you a full list of "expected"
   class sessions for the week — e.g. "Attend BITS U103 Lecture, Tue 4 Aug
   2026, 0.83h".

5. Show the user this full expected list and ask which ones they *missed*
   (skipped/cancelled) rather than asking them to confirm every single one —
   assume attendance by default, since that's the common case, and let them
   name exceptions. Wait for their answer.

6. Build the session list to add: `{ date: "4 Aug 2026", topic: label, hours,
   labels: [] }` for every attended occurrence, excluding anything the user
   flagged as missed. Use the exact `date` string format already used in
   `data.json` (`D MMM YYYY`, e.g. "4 Aug 2026").

7. Show the user the final list as a preview and confirm before writing
   anything — this commits directly to the live `data.json` on GitHub.

8. Once confirmed, POST it:
   ```
   curl -s -X POST "https://study-tracker-likes.mangalarush.workers.dev/<ADMIN_SECRET>/add-sessions" \
     -H "Content-Type: application/json" \
     -d '{"sessions": [...]}'
   ```
   The endpoint dedups against existing `data.json` entries by
   date+topic+hours, so re-running this skill mid-week or twice by accident
   is safe — it won't double-log anything already recorded.

9. Report what was actually added (the response's `added` count and
   `sessions` list) versus what was skipped as already-recorded.
