export default {
  async fetch(request, env) {

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin":  "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    const url    = new URL(request.url);

    // ── Path-based shortcut routes (no query param mangling) ─────────────────
    // Format: /<secret>/<command>
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length === 2) {
      const [pathSecret, command] = pathParts;
      if (pathSecret === env.ADMIN_SECRET) {
        const CORS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
        const ok  = d => new Response(JSON.stringify({ ok: true,  ...d }), { headers: CORS });
        const err = (m, s=400) => new Response(JSON.stringify({ ok: false, error: m }), { status: s, headers: CORS });

        if (command === "focus-on") {
          const now = new Date().toISOString();
          let existing = null;
          try { existing = await env.KV.get("focus-state", { type: "json" }); } catch(e) {}
          const updated = { active: true, since: now, lastSeen: existing?.lastSeen || null };
          await env.KV.put("focus-state", JSON.stringify(updated));
          return ok({ active: true, since: updated.since, lastSeen: updated.lastSeen });
        }

        if (command === "focus-off") {
          const now = new Date().toISOString();
          let existing = null;
          try { existing = await env.KV.get("focus-state", { type: "json" }); } catch(e) {}
          const updated = { active: false, since: existing?.since || null, lastSeen: now };
          await env.KV.put("focus-state", JSON.stringify(updated));
          return ok({ active: false, since: updated.since, lastSeen: updated.lastSeen });
        }

        if (command === "sync") {
          // delegate to the existing syncTodoistCompleted handler
          url.searchParams.set("action", "syncTodoistCompleted");
          return await handleTasks(request, url, env, "syncTodoistCompleted");
        }

        return err("Unknown command. Valid: focus-on, focus-off, sync");
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const action = url.searchParams.get("action");
    if (action) {
      try {
        return await handleTasks(request, url, env, action);
      } catch(e) {
        return new Response(JSON.stringify({ ok: false, error: e.message, stack: e.stack }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    const CACHE_TTL_MS = 5 * 60 * 1000;

    const COMMENTS = [
      { videoId: "74cOUSKXMz0", commentId: "UgxF0KPvWWYwo7j94zB4AaABAg", hoursPerLike: 3,   label: "iCanStudy - 3 Hours Study With Me",                       commentUrl: "https://www.youtube.com/watch?v=74cOUSKXMz0&lc=UgxF0KPvWWYwo7j94zB4AaABAg" },
      { videoId: "Qo7N-HbEMxE", commentId: "Ugx3xU18178Wck4xmSZ4AaABAg", hoursPerLike: 4,   label: "james vinh scholz - 4 a.m. 4 hours of deep work!",         commentUrl: "https://www.youtube.com/watch?v=Qo7N-HbEMxE&lc=Ugx3xU18178Wck4xmSZ4AaABAg" },
      { videoId: "OO14VSx74MU", commentId: "Ugx2M-E6c3ebpBY1hdl4AaABAg", hoursPerLike: 2,   label: "Radical Living - 2 Hours German WW2 Officer",              commentUrl: "https://www.youtube.com/watch?v=OO14VSx74MU&lc=Ugx2M-E6c3ebpBY1hdl4AaABAg" },
      { videoId: "3RGEo2Kohb8", commentId: "Ugz_A4uhz1mLxFzZwDx4AaABAg", hoursPerLike: 4,   label: "TwoSetViolin - 4 Hours of Asian Mum",                      commentUrl: "https://www.youtube.com/watch?v=3RGEo2Kohb8&lc=Ugz_A4uhz1mLxFzZwDx4AaABAg" },
      { videoId: "-dik8SwrOEQ", commentId: "UgyvFqAUR_flh1QcSPd4AaABAg", hoursPerLike: 1,   label: "TwoSetViolin - 1 Hour of Asian Mum Cooking",               commentUrl: "https://www.youtube.com/watch?v=-dik8SwrOEQ&lc=UgyvFqAUR_flh1QcSPd4AaABAg" },
      { videoId: "Gd1J8B3ncJo", commentId: "UgzD8Gc7hGr22oUMPvp4AaABAg", hoursPerLike: 4,   label: "Radical Living - 4 Hours German WW2 Officer",              commentUrl: "https://www.youtube.com/watch?v=Gd1J8B3ncJo&lc=UgzD8Gc7hGr22oUMPvp4AaABAg" },
      { videoId: "Ui7Hb4cvamY", commentId: "UgzSxlqQz8njr1O58AV4AaABAg", hoursPerLike: 1,   label: "Cinematic Focus - Oppenheimer Soundtrack",                 commentUrl: "https://www.youtube.com/watch?v=Ui7Hb4cvamY&lc=UgzSxlqQz8njr1O58AV4AaABAg" },
      { videoId: "IZGlY3jcnWg", commentId: "UgxyaS7xRsZkkdJ7qxt4AaABAg", hoursPerLike: 2,   label: "The Focus Warden - 2 Hours Soviet WW2 Officer",            commentUrl: "https://www.youtube.com/watch?v=IZGlY3jcnWg&lc=UgxyaS7xRsZkkdJ7qxt4AaABAg" },
      { videoId: "0WpItD25lvo", commentId: "Ugzij5gbqwh8mhgxM9h4AaABAg", hoursPerLike: 1,   label: "The Focus Warden - German Soldier Helps You Study",        commentUrl: "https://www.youtube.com/watch?v=0WpItD25lvo&lc=Ugzij5gbqwh8mhgxM9h4AaABAg" },
      { videoId: "KFHgNMG502I", commentId: "Ugx5-4wHx6Bw8Xcas0J4AaABAg", hoursPerLike: 3,   label: "tani study - 3-HR STUDY WITH ME",                          commentUrl: "https://www.youtube.com/watch?v=KFHgNMG502I&lc=Ugx5-4wHx6Bw8Xcas0J4AaABAg" },
      { videoId: "QrJkA8yQJzI", commentId: "UgxMEkeQxXCDUwggoF14AaABAg", hoursPerLike: 8,   label: "messydeskhours - Shut out the world For next 8 hours",     commentUrl: "https://www.youtube.com/watch?v=QrJkA8yQJzI&lc=UgxMEkeQxXCDUwggoF14AaABAg" },
      { videoId: "bSkzWpcWz-o", commentId: "UgztoCiD8AMd9KeQmNd4AaABAg", hoursPerLike: 1,   label: "MUNDI OPUS - SUITS - You are proving everyone wrong",      commentUrl: "https://www.youtube.com/watch?v=bSkzWpcWz-o&lc=UgztoCiD8AMd9KeQmNd4AaABAg" },
      { videoId: "O5f0pIlCKww", commentId: "UgxMsL2Em7_pmzWNH4F4AaABAg", hoursPerLike: 1,   label: "Shanti Instrumentals - Sitar For Brain Fog",              commentUrl: "https://www.youtube.com/watch?v=O5f0pIlCKww&lc=UgxMsL2Em7_pmzWNH4F4AaABAg" },
      { videoId: "GTdOjscC1bg", commentId: "Ugx4LJz3buMjVvFqtvx4AaABAg", hoursPerLike: 10,  label: "Celine - 10 Hour Study With Me",                           commentUrl: "https://www.youtube.com/watch?v=GTdOjscC1bg&lc=Ugx4LJz3buMjVvFqtvx4AaABAg" },
      { videoId: "0Dv3hE7HOeA", commentId: "UgzvowsiWGsRmDb7IZt4AaABAg", hoursPerLike: 2,   label: "Focus Room - Deep Work Music",                             commentUrl: "https://www.youtube.com/watch?v=0Dv3hE7HOeA&lc=UgzvowsiWGsRmDb7IZt4AaABAg" },
      { videoId: "Nccu0m9daRg", commentId: "UgzCOEIuuUq24t6y1Ep4AaABAg", hoursPerLike: 4,   label: "Slow life sound - Academic Validation",                    commentUrl: "https://www.youtube.com/watch?v=Nccu0m9daRg&lc=UgzCOEIuuUq24t6y1Ep4AaABAg" },
      { videoId: "J00ICfdH7s0", commentId: "Ugyf34xSfedbaQgqrXt4AaABAg", hoursPerLike: 2.5, label: "Ray Hon - Study With Me 2.5hrs",                            commentUrl: "https://www.youtube.com/watch?v=J00ICfdH7s0&lc=Ugyf34xSfedbaQgqrXt4AaABAg" },
      { videoId: "yHd3uxqKaF4", commentId: "Ugx523JxhkDEqfd6C5B4AaABAg", hoursPerLike: 3,   label: "Ray Hon - Study With Me 3hrs",                             commentUrl: "https://www.youtube.com/watch?v=yHd3uxqKaF4&lc=Ugx523JxhkDEqfd6C5B4AaABAg" },
    ];

    let cacheEntry = null;
    try { cacheEntry = await env.KV.get("cacheV2", { type: "json" }); } catch (e) {}

    if (cacheEntry && (Date.now() - cacheEntry.cachedAt) < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify({ ...cacheEntry.payload, cachedAt: cacheEntry.cachedAt }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } }
      );
    }

    let stored = {};
    let lastChange = null;
    try {
      stored     = JSON.parse(await env.KV.get("counts")     || "{}") || {};
      lastChange = JSON.parse(await env.KV.get("lastChange") || "null") || null;
    } catch (e) {}

    let totalLikes = 0;
    let totalHours = 0;
    const breakdown = [];

    const testRes  = await fetch(`https://www.googleapis.com/youtube/v3/comments?part=snippet&id=${COMMENTS[0].commentId}&key=${env.YOUTUBE_API_KEY}`).catch(() => null);
    const testData = testRes ? await testRes.json().catch(() => null) : null;
    const quotaOK  = testData && !testData.error;

    const results = await Promise.all(COMMENTS.map(async (c, i) => {
      if (i === 0) {
        if (!quotaOK) return { c, likes: stored[c.commentId] || 0, error: true };
        const item      = (testData.items || [])[0];
        const apiLikes  = item ? (item.snippet.likeCount || 0) : null;
        const safeLikes = apiLikes !== null ? Math.max(apiLikes, stored[c.commentId] || 0) : (stored[c.commentId] || 0);
        return { c, likes: safeLikes, error: apiLikes === null };
      }
      if (!quotaOK) return { c, likes: stored[c.commentId] || 0, error: true };
      try {
        const res  = await fetch(`https://www.googleapis.com/youtube/v3/comments?part=snippet&id=${c.commentId}&key=${env.YOUTUBE_API_KEY}`);
        const data = await res.json();
        if (data.error) return { c, likes: stored[c.commentId] || 0, error: true };
        const item      = (data.items || [])[0];
        const apiLikes  = item ? (item.snippet.likeCount || 0) : null;
        const safeLikes = apiLikes !== null ? Math.max(apiLikes, stored[c.commentId] || 0) : (stored[c.commentId] || 0);
        return { c, likes: safeLikes, error: apiLikes === null };
      } catch (e) {
        return { c, likes: stored[c.commentId] || 0, error: true };
      }
    }));

    let changed = false;
    for (const { c, likes, error } of results) {
      if (!error) {
        const prevLikes = stored[c.commentId] || 0;
        if (likes > prevLikes) {
          lastChange = {
            label: c.label, commentUrl: c.commentUrl, from: prevLikes, to: likes,
            detectedAt: new Date().toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata", day: "2-digit", month: "short",
              year: "numeric", hour: "2-digit", minute: "2-digit"
            })
          };
          stored[c.commentId] = likes;
          changed = true;
        }
      }
      totalLikes += likes;
      totalHours += likes * c.hoursPerLike;
      if ((likes * c.hoursPerLike) >= 10) {
        breakdown.push({
          label: c.label, commentUrl: c.commentUrl, likes,
          hoursPerLike: c.hoursPerLike, hours: likes * c.hoursPerLike,
          ...(error && { error: true })
        });
      }
    }

    if (changed) {
      try {
        await env.KV.put("counts",     JSON.stringify(stored));
        await env.KV.put("lastChange", JSON.stringify(lastChange));
      } catch (e) {}
    }

    const cachedAt = Date.now();
    const payload  = { totalLikes, totalHours, breakdown, lastChange, cachedAt };
    try { await env.KV.put("cacheV2", JSON.stringify({ cachedAt, payload })); } catch (e) {}

    if (quotaOK) {
      try {
        const histRaw  = await env.KV.get("hours-history");
        const history  = histRaw ? JSON.parse(histRaw) : [];
        const last     = history[history.length - 1];
        const sixHours = 6 * 60 * 60 * 1000;
        if (!last || last.h !== totalHours || (cachedAt - last.t) > sixHours) {
          history.push({ t: cachedAt, h: totalHours });
          if (history.length > 365) history.splice(0, history.length - 365);
          await env.KV.put("hours-history", JSON.stringify(history));
        }
      } catch (e) {}
    }

    if (quotaOK) {
      try {
        const ghHeaders = {
          Authorization: `token ${env.GITHUB_TOKEN}`,
          "User-Agent":  "study-tracker-worker",
          Accept:        "application/vnd.github.v3+json"
        };
        const ghRes = await fetch(
          "https://api.github.com/repos/arushmangal/study-tracker/contents/data.json",
          { headers: ghHeaders }
        );
        let hoursCompleted = 0;
        if (ghRes.ok) {
          const ghFile = await ghRes.json();
          if (ghFile.content) {
            const decoded = JSON.parse(atob(ghFile.content.replace(/\n/g, "")));
            hoursCompleted = Number(decoded.hoursCompleted || 0);
          }
        }
        const remaining  = Math.max(0, totalHours - hoursCompleted);
        const remHistRaw = await env.KV.get("remaining-history");
        const remHistory = remHistRaw ? JSON.parse(remHistRaw) : [];
        const lastRem    = remHistory[remHistory.length - 1];
        const oneHour    = 60 * 60 * 1000;
        const valChanged = !lastRem || lastRem.owed !== totalHours || lastRem.done !== hoursCompleted || lastRem.remaining !== remaining;
        const hourPassed = !lastRem || (cachedAt - lastRem.t) >= oneHour;
        if (valChanged || hourPassed) {
          remHistory.push({ t: cachedAt, owed: totalHours, done: hoursCompleted, remaining });
          if (remHistory.length > 2160) remHistory.splice(0, remHistory.length - 2160);
          await env.KV.put("remaining-history", JSON.stringify(remHistory));
        }
      } catch (e) {}
    }

    return new Response(
      JSON.stringify(payload),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } }
    );
  }
};


// ════════════════════════════════════════════════════════════════════════════
// ADMIN AUTH — signed, expiring session tokens (HMAC-SHA256 via Web Crypto)
// ════════════════════════════════════════════════════════════════════════════

const ADMIN_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function b64url(bytes) {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign", "verify"]
  );
}

async function signToken(payload, secret) {
  const key        = await hmacKey(secret);
  const payloadB64 = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig        = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${b64url(sig)}`;
}

async function verifyToken(token, secret) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;
  try {
    const key   = await hmacKey(secret);
    const valid = await crypto.subtle.verify("HMAC", key, b64urlToBytes(sigB64), new TextEncoder().encode(payloadB64));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64)));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// Accepts either the raw admin secret (legacy bookmark-URL compatibility)
// or a signed session token issued by the adminLogin action.
async function checkAdmin({ secret, token }, env) {
  if (secret && env.ADMIN_SECRET && secret === env.ADMIN_SECRET) return true;
  if (token) {
    const payload = await verifyToken(token, env.ADMIN_SECRET);
    if (payload) return true;
  }
  return false;
}


// ════════════════════════════════════════════════════════════════════════════
// TODOIST + MISC ACTION HANDLER
// ════════════════════════════════════════════════════════════════════════════
async function handleTasks(request, url, env, action) {
  const CORS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
  const ok  = d          => new Response(JSON.stringify({ ok: true,  ...d }), { headers: CORS });
  const err = (m, s=400) => new Response(JSON.stringify({ ok: false, error: m }), { status: s, headers: CORS });

  if (action === "getConfig") {
    const target = (await env.KV.get("config-target-project")) || "JEE";
    return ok({ targetProject: target });
  }

  if (action === "setConfig") {
    const authed = await checkAdmin({ secret: url.searchParams.get("secret"), token: url.searchParams.get("token") }, env);
    if (!authed) return err("Unauthorized", 401);
    const project = url.searchParams.get("project");
    if (!project) return err("Missing ?project= param");
    await env.KV.put("config-target-project", project.trim());
    await env.KV.delete("todoist-cache").catch(() => {});
    return ok({ updated: true, targetProject: project.trim() });
  }

  if (action === "adminLogin") {
    const secret = url.searchParams.get("secret");
    if (!env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) return err("Unauthorized", 401);
    const expiresAt = Date.now() + ADMIN_TOKEN_TTL_MS;
    const token     = await signToken({ exp: expiresAt }, env.ADMIN_SECRET);
    return ok({ token, expiresAt });
  }

  if (action === "getFocusState") {
    let state = null;
    try { state = await env.KV.get("focus-state", { type: "json" }); } catch(e) {}
    if (!state) return ok({ active: false, since: null, lastSeen: null });
    return ok({ active: state.active, since: state.since || null, lastSeen: state.lastSeen || null });
  }

  if (action === "setFocusState") {
    const authed = await checkAdmin({ secret: url.searchParams.get("secret"), token: url.searchParams.get("token") }, env);
    if (!authed) return err("Unauthorized", 401);
    const state  = url.searchParams.get("state");
    if (state !== "on" && state !== "off") return err("?state= must be 'on' or 'off'");
    const now    = new Date().toISOString();
    let existing = null;
    try { existing = await env.KV.get("focus-state", { type: "json" }); } catch(e) {}
    const updated = state === "on"
      ? { active: true,  since: now,                      lastSeen: existing?.lastSeen || null }
      : { active: false, since: existing?.since || null,  lastSeen: now };
    await env.KV.put("focus-state", JSON.stringify(updated));
    return ok({ active: updated.active, since: updated.since, lastSeen: updated.lastSeen });
  }

  if (action === "logSession") {
    let body = {};
    try { body = await request.json(); } catch(e) {}

    const authed = await checkAdmin({ token: body.token }, env);
    if (!authed) return err("Unauthorized", 401);

    const topic  = String(body.topic || "").trim();
    const hours  = Number(body.hours);
    const labels = Array.isArray(body.labels) ? body.labels.filter(l => typeof l === "string") : [];

    if (!topic)                              return err("Missing topic");
    if (!Number.isFinite(hours) || hours <= 0) return err("Invalid hours");
    if (!env.TODOIST_TOKEN) return err("TODOIST_TOKEN not configured");
    if (!env.GITHUB_TOKEN)  return err("GITHUB_TOKEN not configured");

    const th = { Authorization: `Bearer ${env.TODOIST_TOKEN}` };
    const LEDGER_PROJECT_NAME = "The Ledger";

    let projectId = await env.KV.get("ledger-project-id");
    if (!projectId) {
      const projRes  = await fetch("https://api.todoist.com/api/v1/projects", { headers: th });
      const projData = await projRes.json();
      const projects = Array.isArray(projData) ? projData : (projData.results || []);
      let project = projects.find(p => p.name === LEDGER_PROJECT_NAME);
      if (!project) {
        const createRes = await fetch("https://api.todoist.com/api/v1/projects", {
          method:  "POST",
          headers: { ...th, "Content-Type": "application/json" },
          body:    JSON.stringify({ name: LEDGER_PROJECT_NAME })
        });
        project = await createRes.json();
      }
      if (!project?.id) return err("Failed to resolve/create the Ledger Todoist project");
      projectId = project.id;
      try { await env.KV.put("ledger-project-id", String(projectId)); } catch(e) {}
    }

    const createRes = await fetch("https://api.todoist.com/api/v1/tasks", {
      method:  "POST",
      headers: { ...th, "Content-Type": "application/json" },
      body:    JSON.stringify({
        content:     topic,
        project_id:  projectId,
        description: `* ${hours}h`,
        due_string:  "today",
        labels
      })
    });
    const task = await createRes.json();
    if (!task?.id) return err("Failed to create Todoist task: " + JSON.stringify(task).slice(0, 200));

    try {
      await fetch(`https://api.todoist.com/api/v1/tasks/${task.id}/close`, { method: "POST", headers: th });
    } catch(e) {
      return err("Task created but could not be marked complete: " + e.message, 500);
    }

    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const ist    = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const date   = `${ist.getDate()} ${MONTHS[ist.getMonth()]} ${ist.getFullYear()}`;
    const session = { date, topic, hours, labels };

    let result;
    try {
      result = await commitSessionsBatch(env, [session]);
    } catch(e) {
      return err("Todoist task logged and completed, but data.json commit failed: " + e.message, 500);
    }

    try {
      const processedRaw = await env.KV.get("todoist-processed");
      const processed    = new Set(processedRaw ? JSON.parse(processedRaw) : []);
      processed.add(String(task.id));
      await env.KV.put("todoist-processed", JSON.stringify([...processed].slice(-1000)));
    } catch(e) {}

    return ok({ hoursCompleted: result.newTotal, session });
  }

  if (action === "getHoursHistory") {
    let history = [];
    try { history = JSON.parse(await env.KV.get("hours-history") || "[]"); } catch(e) {}
    return ok({ history });
  }

  if (action === "getRemainingHistory") {
    let history = [];
    try { history = JSON.parse(await env.KV.get("remaining-history") || "[]"); } catch(e) {}
    return ok({ history });
  }

  if (action === "backfillRemainingHistory") {
    const authed = await checkAdmin({ secret: url.searchParams.get("secret"), token: url.searchParams.get("token") }, env);
    if (!authed) return err("Unauthorized", 401);

    const histRaw     = await env.KV.get("hours-history");
    const owedHistory = histRaw ? JSON.parse(histRaw) : [];

    function owedAt(ts) {
      if (!owedHistory.length) return 0;
      let best = owedHistory[0].h;
      for (const { t, h } of owedHistory) {
        if (t <= ts) best = h;
        else break;
      }
      return best;
    }

    const ghHeaders = {
      Authorization: `token ${env.GITHUB_TOKEN}`,
      "User-Agent":  "study-tracker-worker",
      Accept:        "application/vnd.github.v3+json"
    };
    const ghRes  = await fetch(
      "https://api.github.com/repos/arushmangal/study-tracker/contents/data.json",
      { headers: ghHeaders }
    );
    const ghFile = await ghRes.json();
    if (!ghFile.content) return err("GitHub read failed");
    const dataJson = JSON.parse(atob(ghFile.content.replace(/\n/g, "")));
    const sessions = dataJson.sessions || [];

    const MONTHS = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
    function sessionTimestamp(s) {
      if (s.loggedAt) return new Date(s.loggedAt).getTime();
      if (s.dateISO)  return new Date(s.dateISO).getTime();
      if (s.date) {
        const m = String(s.date).trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
        if (m && MONTHS[m[2]]) {
          return new Date(Number(m[3]), MONTHS[m[2]] - 1, Number(m[1]), 23, 59, 0).getTime();
        }
      }
      return null;
    }

    const sessionPts = sessions
      .map(s => ({ t: sessionTimestamp(s), h: Number(s.hours) || 0 }))
      .filter(s => s.t !== null)
      .sort((a, b) => a.t - b.t);

    const backfilled = [];
    let runningDone = 0;
    for (const { t, h } of sessionPts) {
      runningDone += h;
      const done      = Math.round(runningDone * 100) / 100;
      const owed      = owedAt(t);
      const remaining = Math.max(0, Math.round((owed - done) * 100) / 100);
      backfilled.push({ t, owed, done, remaining });
    }

    for (const { t, h: owed } of owedHistory) {
      const done      = Math.round(sessionPts.filter(s => s.t <= t).reduce((sum, s) => sum + s.h, 0) * 100) / 100;
      const remaining = Math.max(0, Math.round((owed - done) * 100) / 100);
      backfilled.push({ t, owed, done, remaining });
    }

    const existingRaw = await env.KV.get("remaining-history");
    const existing    = existingRaw ? JSON.parse(existingRaw) : [];
    const existingTs  = new Set(existing.map(p => p.t));
    const merged = [...backfilled.filter(p => !existingTs.has(p.t)), ...existing]
      .sort((a, b) => a.t - b.t);

    const trimmed = merged.length > 2160 ? merged.slice(merged.length - 2160) : merged;
    await env.KV.put("remaining-history", JSON.stringify(trimmed));

    return ok({
      sessions:   sessionPts.length,
      backfilled: backfilled.length,
      merged:     trimmed.length,
      earliest:   trimmed[0] ? new Date(trimmed[0].t).toISOString() : null
    });
  }

  if (action === "debugTodoist") {
    const h    = { Authorization: `Bearer ${env.TODOIST_TOKEN}` };
    const res  = await fetch("https://api.todoist.com/api/v1/projects", { headers: h });
    const text = await res.text();
    return new Response(JSON.stringify({ status: res.status, body: text.slice(0, 500) }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  if (action === "debugSync") {
    const h     = { Authorization: `Bearer ${env.TODOIST_TOKEN}` };
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const until = new Date().toISOString();
    const res   = await fetch(
      `https://api.todoist.com/api/v1/tasks/completed/by_completion_date?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&limit=5`,
      { headers: h }
    );
    const text = await res.text();
    return new Response(JSON.stringify({ status: res.status, body: text.slice(0, 1000) }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  if (action === "debugCommit") {
    if (!env.GITHUB_TOKEN) return new Response(JSON.stringify({ error: "GITHUB_TOKEN not set" }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
    const ghHeaders = {
      Authorization: `token ${env.GITHUB_TOKEN}`,
      "User-Agent":  "study-tracker-worker",
      Accept:        "application/vnd.github.v3+json"
    };
    const getRes   = await fetch("https://api.github.com/repos/arushmangal/study-tracker/contents/data.json", { headers: ghHeaders });
    const fileData = await getRes.json();
    if (!fileData.content) {
      return new Response(JSON.stringify({ step: "read", status: getRes.status, response: fileData }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    let current;
    try { current = JSON.parse(atob(fileData.content.replace(/\n/g, ""))); }
    catch(e) {
      return new Response(JSON.stringify({ step: "parse", error: e.message }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    const putRes  = await fetch("https://api.github.com/repos/arushmangal/study-tracker/contents/data.json", {
      method:  "PUT",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body:    JSON.stringify({
        message: "debug: no-op commit test",
        content: btoa(unescape(encodeURIComponent(JSON.stringify(current, null, 2)))),
        sha:     fileData.sha
      })
    });
    const putData = await putRes.json();
    return new Response(JSON.stringify({
      step: "write", status: putRes.status, committed: !!putData.content,
      sha: fileData.sha, sessions: current.sessions?.length, hours: current.hoursCompleted,
      putResponse: putData.content ? "OK" : putData
    }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }

  if (action === "getTodoistTasks") {
    if (!env.TODOIST_TOKEN) return err("TODOIST_TOKEN not configured");
    const TTL = 3 * 60 * 1000;
    let cached = null;
    try { cached = await env.KV.get("todoist-cache", { type: "json" }); } catch(e) {}
    if (cached && (Date.now() - cached.cachedAt) < TTL) return ok({ tasks: cached.tasks, cachedAt: cached.cachedAt });

    const h = { Authorization: `Bearer ${env.TODOIST_TOKEN}` };

    const projRes  = await fetch("https://api.todoist.com/api/v1/projects", { headers: h });
    const projData = await projRes.json();
    const projects = Array.isArray(projData) ? projData : (projData.results || []);
    const targetProjectName = (await env.KV.get("config-target-project")) || "JEE";
    const { allowedIds, targetName } = getTargetProjectIds(projects, targetProjectName);
    const projectMap = {};
    for (const p of projects) projectMap[p.id] = p.name;

    let allTasks = [];
    let cursor   = null;
    do {
      const taskUrl = cursor
        ? `https://api.todoist.com/api/v1/tasks?cursor=${encodeURIComponent(cursor)}`
        : `https://api.todoist.com/api/v1/tasks`;
      const taskRes  = await fetch(taskUrl, { headers: h });
      const taskData = await taskRes.json();
      const batch    = Array.isArray(taskData) ? taskData : (taskData.results || []);
      allTasks = allTasks.concat(batch);
      cursor   = taskData.next_cursor || null;
    } while (cursor);

    const todayISO = new Date().toISOString().slice(0, 10);
    function tier(t) {
      if (!t.due?.date) return 3;
      const d = t.due.date.slice(0, 10);
      if (d === todayISO) return 0;
      if (d < todayISO)   return 1;
      return 2;
    }

    const tasks = allTasks
      .filter(t => allowedIds.size === 0 || allowedIds.has(t.project_id))
      .sort((a, b) => {
        const ta = tier(a), tb = tier(b);
        if (ta !== tb) return ta - tb;
        if (b.priority !== a.priority) return b.priority - a.priority;
        const aD = a.due?.date || "9999";
        const bD = b.due?.date || "9999";
        return aD < bD ? -1 : aD > bD ? 1 : 0;
      })
      .slice(0, 8)
      .map(t => ({
        id:       t.id,
        content:  t.content,
        priority: t.priority,
        project:  projectMap[t.project_id] || "?",
        due:      t.due ? (t.due.string || t.due.date) : null,
        dueDate:  t.due?.date || null,
        url:      t.url,
        labels:   t.labels || []
      }));

    const cachedAt = Date.now();
    try { await env.KV.put("todoist-cache", JSON.stringify({ tasks, cachedAt, targetProject: targetName })); } catch(e) {}
    return ok({ tasks, cachedAt, targetProject: targetName });
  }

  if (action === "syncTodoistCompleted") {
    if (!env.TODOIST_TOKEN) return ok({ synced: 0, message: "TODOIST_TOKEN not set" });
    if (!env.GITHUB_TOKEN)  return ok({ synced: 0, message: "GITHUB_TOKEN not set"  });

    try {
      const lock = await env.KV.get("todoist-sync-lock");
      if (lock) return ok({ synced: 0, message: "sync already in progress" });
      await env.KV.put("todoist-sync-lock", "1", { expirationTtl: 60 });
    } catch(e) {}

    try {
      const ah = { Authorization: `Bearer ${env.TODOIST_TOKEN}` };
      const allowedIds = new Set();

      const lastSyncRaw = await env.KV.get("todoist-last-sync");
      const since       = lastSyncRaw || new Date(Date.now() - 86400000).toISOString();
      const until       = new Date().toISOString();

      let allDone = [];
      let cursor  = null;
      do {
        const base    = `https://api.todoist.com/api/v1/tasks/completed/by_completion_date?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&limit=200`;
        const doneUrl = cursor ? `${base}&cursor=${encodeURIComponent(cursor)}` : base;
        const doneRes  = await fetch(doneUrl, { headers: ah });
        const doneText = await doneRes.text();
        let doneData;
        try { doneData = JSON.parse(doneText); }
        catch(e) {
          await env.KV.delete("todoist-sync-lock").catch(() => {});
          return ok({ synced: 0, message: "completed API parse error: " + doneText.slice(0, 200) });
        }
        if (doneData.error || doneData.detail) {
          await env.KV.delete("todoist-sync-lock").catch(() => {});
          return ok({ synced: 0, message: "completed API error: " + JSON.stringify(doneData).slice(0, 200) });
        }
        const batch = doneData.results || doneData.items || [];
        allDone = allDone.concat(batch);
        cursor  = doneData.next_cursor || null;
      } while (cursor);

      const processedRaw = await env.KV.get("todoist-processed");
      const processed    = new Set(processedRaw ? JSON.parse(processedRaw) : []);
      const newItems = allDone.filter(t => !processed.has(String(t.id)));

      if (!newItems.length) {
        await env.KV.put("todoist-last-sync", new Date().toISOString());
        try { await env.KV.delete("todoist-sync-lock"); } catch(e) {}
        return ok({ synced: 0, message: "no new completed tasks" });
      }

      const MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const sessions = [];

      for (const item of newItems) {
        const taskId = String(item.id);
        processed.add(taskId);

        let hours = parseTaskTime(item.description || "");

        if (hours === null) {
          try {
            const commRes  = await fetch(`https://api.todoist.com/api/v1/comments?task_id=${taskId}`, { headers: ah });
            const commData = await commRes.json();
            const comments = commData.results || commData.items || (Array.isArray(commData) ? commData : []);
            for (const c of comments) {
              const p = parseTaskTime(c.content || "");
              if (p !== null) { hours = p; break; }
            }
          } catch(e) {}
        }

        if (hours === null) continue;

        const dueDateStr  = item.due?.date || item.due_date || null;
        const completedAt = item.completed_at || item.date_completed;
        let date;
        if (dueDateStr) {
          const [dy, dm, dd] = dueDateStr.slice(0, 10).split("-").map(Number);
          date = `${dd} ${MONTHS[dm - 1]} ${dy}`;
        } else {
          if (!completedAt) continue;
          const ist = new Date(new Date(completedAt).toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
          date = `${ist.getDate()} ${MONTHS[ist.getMonth()]} ${ist.getFullYear()}`;
        }
        sessions.push({ date, topic: item.content, hours, labels: item.labels || [] });
      }

      await env.KV.put("todoist-processed", JSON.stringify([...processed].slice(-1000)));
      await env.KV.put("todoist-last-sync", new Date().toISOString());

      if (!sessions.length) {
        try { await env.KV.delete("todoist-sync-lock"); } catch(e) {}
        return ok({ synced: 0, message: "tasks found but no * prefixed time in description/comments" });
      }

      const result = await commitSessionsBatch(env, sessions);
      try { await env.KV.delete("todoist-sync-lock"); } catch(e) {}
      return ok({ synced: sessions.length, sessions, ...result });

    } catch(e) {
      try { await env.KV.delete("todoist-sync-lock"); } catch(_) {}
      return err("sync failed: " + e.message);
    }
  }

  return err("Unknown action");
}


// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function getTargetProjectIds(projects, targetName) {
  const names = (targetName || "JEE")
    .split(",")
    .map(n => n.trim())
    .filter(Boolean);

  const allowedIds = new Set();
  for (const name of names) {
    const target = projects.find(p => p.name === name);
    if (!target) continue;
    allowedIds.add(target.id);
    for (const p of projects) {
      if (p.parent_id === target.id) allowedIds.add(p.id);
    }
  }

  return { allowedIds, targetName: names.join(", ") };
}

// Recognizes an optional hours + optional minutes + optional seconds sequence
// (in that order) right after the "*" marker, in any spelling: h/hr/hrs/hour/hours,
// m/min/mins/minute/minutes, s/sec/secs/second/seconds. Spacing between the number
// and its unit, and between components, is optional. A decimal is only allowed on
// whichever unit ends up being the last one present (e.g. "2.5h" and "1h30.5m" are
// fine, but "2.5h30m" is rejected as ambiguous).
const TASK_TIME_RE = new RegExp(
  "\\*\\s*" +
  "(?:(\\d+(?:\\.\\d+)?)\\s*h(?:r|rs|our|ours)?)?\\s*" +
  "(?:(\\d+(?:\\.\\d+)?)\\s*m(?:in|ins|inute|inutes)?)?\\s*" +
  "(?:(\\d+(?:\\.\\d+)?)\\s*s(?:ec|ecs|econd|econds)?)?" +
  "\\b"
);

function parseTaskTime(text) {
  if (!text) return null;
  const t = text.toLowerCase();

  const m = t.match(TASK_TIME_RE);
  if (!m) return null;

  const [, hStr, mStr, sStr] = m;
  if (!hStr && !mStr && !sStr) return null;

  const present = [hStr, mStr, sStr].filter(Boolean);
  const lastPresent = present[present.length - 1];
  for (const v of present) {
    if (v !== lastPresent && v.includes(".")) return null; // ambiguous decimal on a non-final unit
  }

  const hrs  = hStr ? parseFloat(hStr) : 0;
  const mins = mStr ? parseFloat(mStr) : 0;
  const secs = sStr ? parseFloat(sStr) : 0;

  const totalHours = hrs + mins / 60 + secs / 3600;
  if (totalHours <= 0) return null;

  return Math.round(totalHours * 100) / 100;
}

async function commitSessionsBatch(env, sessions) {
  const ghHeaders = {
    Authorization: `token ${env.GITHUB_TOKEN}`,
    "User-Agent":  "study-tracker-worker",
    Accept:        "application/vnd.github.v3+json"
  };
  const getRes   = await fetch(
    "https://api.github.com/repos/arushmangal/study-tracker/contents/data.json",
    { headers: ghHeaders }
  );
  const fileData = await getRes.json();
  if (!fileData.content) throw new Error("GitHub read failed: " + JSON.stringify(fileData).slice(0, 200));

  const current = JSON.parse(atob(fileData.content.replace(/\n/g, "")));
  for (const s of sessions) current.sessions.push(s);
  current.hoursCompleted = Math.round(
    current.sessions.reduce((sum, s) => sum + (Number(s.hours) || 0), 0) * 100
  ) / 100;

  const putRes  = await fetch(
    "https://api.github.com/repos/arushmangal/study-tracker/contents/data.json",
    {
      method:  "PUT",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body:    JSON.stringify({
        message: sessions.length === 1
          ? `auto: ${sessions[0].topic} (${sessions[0].hours}h)`
          : `auto: ${sessions.length} sessions synced`,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(current, null, 2)))),
        sha:     fileData.sha
      })
    }
  );
  const putData = await putRes.json();
  if (!putData.content) throw new Error("Commit failed: " + JSON.stringify(putData).slice(0, 200));
  return { committed: true, newTotal: current.hoursCompleted };
}
