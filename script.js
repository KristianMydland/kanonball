// ----------------------------
// GLOBALT
// ----------------------------
const teamColors = [
  "#e6194B", "#3cb44b", "#ffe119", "#4363d8",
  "#f58231", "#911eb4", "#46f0f0", "#f032e6",
  "#bcf60c", "#fabebe"
];

let matchResults = {};
let lastSchedule = null;

const defaultPublishedScheduleSource = {
  owner: "KristianMydland",
  repo: "kanonball",
  branch: "main",
  path: "kampoppsett.json"
};

const defaultPublishedResultsSource = {
  owner: "KristianMydland",
  repo: "kanonball",
  branch: "main",
  path: "resultater.json"
};

// ----------------------------
// LOCALSTORAGE
// ----------------------------
// Logg inn og logg ut
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h.toString(16);
}

function isAdmin() {
  return localStorage.getItem("is_admin") === "true";
}

function isIndexPage() {
  const path = window.location.pathname.toLowerCase();
  return path.endsWith("/index.html") || path.endsWith("/");
}

function requireAdmin() {
  if (!isAdmin()) {
    if (!isIndexPage()) {
      window.location.href = "index.html";
    }
    return false;
  }

  return true;
}

function logout() {
  localStorage.removeItem("is_admin");
  updateAdminVisibility();
  if (!isIndexPage()) {
    window.location.href = "index.html";
  } else {
    window.location.reload();
  }
}

// ----------------------------
// ADMIN VISIBILITY
// ----------------------------
function updateAdminVisibility() {
  const isAdminUser = isAdmin();
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  
  // Toggle login/logout buttons
  if (adminLoginBtn) {
    adminLoginBtn.style.display = isAdminUser ? "none" : "inline-block";
  }

  if (logoutBtn) {
    logoutBtn.style.display = isAdminUser ? "inline-block" : "none";
  }
  
  // Enable/disable all action buttons
  const actionButtons = document.querySelectorAll(".adminAction");
  actionButtons.forEach(btn => {
    btn.disabled = !isAdminUser;
    btn.style.opacity = isAdminUser ? "1" : "0.5";
    btn.style.cursor = isAdminUser ? "pointer" : "not-allowed";
    btn.title = isAdminUser ? "" : "Du må logge inn for å bruke denne funksjonen.";
  });
  
  // Disable all admin input fields (select, input)
  const adminInputs = document.querySelectorAll(".adminOnly");
  adminInputs.forEach(input => {
    input.disabled = !isAdminUser;
    input.style.opacity = isAdminUser ? "1" : "0.5";
  });
}

function initAdminLogin() {
  const loginBtn = document.getElementById("adminLoginBtn");
  const loginBox = document.getElementById("adminLoginBox");
  const passwordInput = document.getElementById("adminPassword");
  const submitBtn = document.getElementById("adminSubmitBtn");
  const messageEl = document.getElementById("adminMsg");
  if (!loginBtn || !loginBox || !passwordInput || !submitBtn || !messageEl) return;

  const DEFAULT_HASH = "-7c4b0527";

  loginBtn.addEventListener("click", () => {
    loginBox.style.display = loginBox.style.display === "none" ? "block" : "none";
  });

  submitBtn.addEventListener("click", () => {
    const pw = passwordInput.value;

    if (hash(pw) === DEFAULT_HASH) {
      localStorage.setItem("is_admin", "true");
      messageEl.style.color = "green";
      messageEl.textContent = "Innlogging vellykket";

      updateAdminVisibility();
      setTimeout(() => window.location.reload(), 500);
    } else {
      messageEl.style.color = "red";
      messageEl.textContent = "Feil passord.";
    }
  });
}

function normalizeResultsMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const normalized = {};
  Object.entries(raw).forEach(([id, value]) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;

    const scoreA = Number(value.scoreA);
    const scoreB = Number(value.scoreB);
    if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) return;

    normalized[id] = { scoreA, scoreB };
  });

  return normalized;
}

function getPayloadRevision(payload) {
  return typeof payload?.revision === "string" && payload.revision.trim()
    ? payload.revision.trim()
    : null;
}

function formatRevision(revision) {
  if (!revision) return "ukjent";
  return revision.slice(0, 7);
}

function createResultsPayload(results, savedAt, revision) {
  const payload = {
    results: normalizeResultsMap(results),
    savedAt: typeof savedAt === "string" && savedAt.trim() ? savedAt.trim() : new Date().toISOString()
  };

  const normalizedRevision = typeof revision === "string" && revision.trim() ? revision.trim() : "";
  if (normalizedRevision) payload.revision = normalizedRevision;

  return payload;
}

function normalizeResultsPayload(rawPayload) {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return null;

  if (rawPayload.results && typeof rawPayload.results === "object" && !Array.isArray(rawPayload.results)) {
    return createResultsPayload(rawPayload.results, getScheduleSavedAt(rawPayload), getPayloadRevision(rawPayload));
  }

  return createResultsPayload(rawPayload, null, null);
}

function saveResults(savedAt, revision) {
  let effectiveRevision = revision;
  if (effectiveRevision === undefined) {
    try {
      const existingRaw = localStorage.getItem("kanonball_results");
      const existingParsed = existingRaw ? JSON.parse(existingRaw) : null;
      effectiveRevision = getPayloadRevision(normalizeResultsPayload(existingParsed));
    } catch (err) {
      effectiveRevision = null;
    }
  }

  localStorage.setItem(
    "kanonball_results",
    JSON.stringify(createResultsPayload(matchResults, savedAt, effectiveRevision))
  );
}

function loadResults() {
  const saved = localStorage.getItem("kanonball_results");
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    const normalized = normalizeResultsPayload(parsed);
    if (!normalized) throw new Error("Invalid result payload");

    matchResults = normalized.results;
    saveResults(normalized.savedAt, normalized.revision);
    return normalized;
  } catch (err) {
    matchResults = {};
    localStorage.removeItem("kanonball_results");
    return null;
  }
}

function getScheduleSavedAt(payload) {
  return typeof payload?.savedAt === "string" && payload.savedAt.trim()
    ? payload.savedAt.trim()
    : null;
}

function createSchedulePayload(schedule, teams, savedAt) {
  const payload = { schedule, teams };
  payload.savedAt = typeof savedAt === "string" && savedAt.trim()
    ? savedAt.trim()
    : new Date().toISOString();
  return payload;
}

function createSchedulePayloadWithRevision(schedule, teams, savedAt, revision) {
  const payload = createSchedulePayload(schedule, teams, savedAt);
  const normalizedRevision = typeof revision === "string" && revision.trim() ? revision.trim() : "";
  if (normalizedRevision) payload.revision = normalizedRevision;
  return payload;
}

function formatSavedAt(savedAt) {
  if (typeof savedAt !== "string" || !savedAt.trim()) return "ukjent";

  const parsed = new Date(savedAt);
  if (Number.isNaN(parsed.getTime())) return "ukjent";

  return parsed.toLocaleString("nb-NO", {
    dateStyle: "short",
    timeStyle: "medium"
  });
}

function saveSchedule(schedule, teams, savedAt, revision) {
  let effectiveRevision = revision;
  if (effectiveRevision === undefined) {
    try {
      const existingRaw = localStorage.getItem("kanonball_schedule");
      const existingParsed = existingRaw ? JSON.parse(existingRaw) : null;
      effectiveRevision = getPayloadRevision(existingParsed);
    } catch (err) {
      effectiveRevision = null;
    }
  }

  localStorage.setItem(
    "kanonball_schedule",
    JSON.stringify(createSchedulePayloadWithRevision(schedule, teams, savedAt, effectiveRevision))
  );
}

function loadSchedule() {
  const saved = localStorage.getItem("kanonball_schedule");
  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch (err) {
    localStorage.removeItem("kanonball_schedule");
    return null;
  }
}

function isValidSchedulePayload(data) {
  return !!data && Array.isArray(data.schedule) && Array.isArray(data.teams);
}

function getPublishedScheduleSource() {
  const saved = localStorage.getItem("kanonball_github_publish_config");
  if (!saved) return defaultPublishedScheduleSource;

  try {
    const parsed = JSON.parse(saved);
    return {
      owner: parsed.owner || defaultPublishedScheduleSource.owner,
      repo: parsed.repo || defaultPublishedScheduleSource.repo,
      branch: parsed.branch || defaultPublishedScheduleSource.branch,
      path: parsed.path || defaultPublishedScheduleSource.path
    };
  } catch (err) {
    return defaultPublishedScheduleSource;
  }
}

function getPublishedResultsSource() {
  const saved = localStorage.getItem("kanonball_github_results_publish_config");
  if (!saved) return defaultPublishedResultsSource;

  try {
    const parsed = JSON.parse(saved);
    return {
      owner: parsed.owner || defaultPublishedResultsSource.owner,
      repo: parsed.repo || defaultPublishedResultsSource.repo,
      branch: parsed.branch || defaultPublishedResultsSource.branch,
      path: parsed.path || defaultPublishedResultsSource.path
    };
  } catch (err) {
    return defaultPublishedResultsSource;
  }
}

function buildGitHubRawUrl(config) {
  const owner = encodeURIComponent((config.owner || "").trim());
  const repo = encodeURIComponent((config.repo || "").trim());
  const branch = encodeURIComponent((config.branch || "main").trim());
  const path = (config.path || "kampoppsett.json")
    .split("/")
    .filter(Boolean)
    .map(part => encodeURIComponent(part))
    .join("/");

  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

function buildGitHubContentsApiUrl(config) {
  const owner = encodeURIComponent((config.owner || "").trim());
  const repo = encodeURIComponent((config.repo || "").trim());
  const branch = encodeURIComponent((config.branch || "main").trim());
  const path = (config.path || "kampoppsett.json")
    .split("/")
    .filter(Boolean)
    .map(part => encodeURIComponent(part))
    .join("/");

  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
}

function base64ToUtf8(base64Text) {
  const binary = atob(base64Text);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parseGitHubContentsPayload(payload) {
  if (!payload || typeof payload !== "object" || typeof payload.content !== "string") {
    return null;
  }

  try {
    const decoded = base64ToUtf8(payload.content.replace(/\n/g, ""));
    return JSON.parse(decoded);
  } catch (err) {
    return null;
  }
}

async function loadPublishedSchedule() {
  const source = getPublishedScheduleSource();

  try {
    const apiUrl = `${buildGitHubContentsApiUrl(source)}&t=${Date.now()}`;
    const response = await fetch(apiUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json"
      }
    });

    if (response.ok) {
      const apiPayload = await response.json();
      const parsedPayload = parseGitHubContentsPayload(apiPayload);
      if (isValidSchedulePayload(parsedPayload)) {
        return createSchedulePayloadWithRevision(
          parsedPayload.schedule,
          parsedPayload.teams,
          getScheduleSavedAt(parsedPayload),
          apiPayload.sha || getPayloadRevision(parsedPayload)
        );
      }
    }

    const rawUrl = `${buildGitHubRawUrl(source)}?t=${Date.now()}`;
    const rawResponse = await fetch(rawUrl, { cache: "no-store" });
    if (!rawResponse.ok) return null;

    const rawPayload = await rawResponse.json();
    if (!isValidSchedulePayload(rawPayload)) return null;

    return createSchedulePayloadWithRevision(
      rawPayload.schedule,
      rawPayload.teams,
      getScheduleSavedAt(rawPayload),
      getPayloadRevision(rawPayload)
    );
  } catch (err) {
    return null;
  }
}

async function loadPublishedResults() {
  const source = getPublishedResultsSource();

  try {
    const apiUrl = `${buildGitHubContentsApiUrl(source)}&t=${Date.now()}`;
    const response = await fetch(apiUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json"
      }
    });

    if (response.ok) {
      const apiPayload = await response.json();
      const parsedPayload = parseGitHubContentsPayload(apiPayload);
      const normalized = normalizeResultsPayload(parsedPayload);
      if (normalized) {
        return createResultsPayload(
          normalized.results,
          normalized.savedAt,
          apiPayload.sha || normalized.revision
        );
      }
    }

    const rawUrl = `${buildGitHubRawUrl(source)}?t=${Date.now()}`;
    const rawResponse = await fetch(rawUrl, { cache: "no-store" });
    if (!rawResponse.ok) return null;

    const rawPayload = await rawResponse.json();
    return normalizeResultsPayload(rawPayload);
  } catch (err) {
    return null;
  }
}

async function loadScheduleWithFallback() {
  const cached = loadSchedule();
  if (isValidSchedulePayload(cached)) {
    const normalized = createSchedulePayloadWithRevision(
      cached.schedule,
      cached.teams,
      getScheduleSavedAt(cached),
      getPayloadRevision(cached)
    );
    saveSchedule(normalized.schedule, normalized.teams, normalized.savedAt, normalized.revision);
    return normalized;
  }

  try {
    const response = await fetch("kampoppsett.json", { cache: "no-store" });
    if (!response.ok) return null;

    const fromFile = await response.json();
    if (!isValidSchedulePayload(fromFile)) return null;

    const normalized = createSchedulePayloadWithRevision(
      fromFile.schedule,
      fromFile.teams,
      getScheduleSavedAt(fromFile),
      getPayloadRevision(fromFile)
    );
    saveSchedule(normalized.schedule, normalized.teams, normalized.savedAt, normalized.revision);
    return normalized;
  } catch (err) {
    return null;
  }
}

async function loadSharedScheduleWithFallback() {
  const loaded = await loadSharedScheduleWithSource();
  return loaded ? loaded.payload : null;
}

async function loadSharedScheduleWithSource() {
  const published = await loadPublishedSchedule();
  if (isValidSchedulePayload(published)) {
    const normalized = createSchedulePayloadWithRevision(
      published.schedule,
      published.teams,
      getScheduleSavedAt(published),
      getPayloadRevision(published)
    );
    saveSchedule(normalized.schedule, normalized.teams, normalized.savedAt, normalized.revision);
    return { payload: normalized, source: "github" };
  }

  const fromFile = await (async () => {
    try {
      const response = await fetch("kampoppsett.json", { cache: "no-store" });
      if (!response.ok) return null;

      const payload = await response.json();
      return isValidSchedulePayload(payload) ? payload : null;
    } catch (err) {
      return null;
    }
  })();

  if (isValidSchedulePayload(fromFile)) {
    const normalized = createSchedulePayloadWithRevision(
      fromFile.schedule,
      fromFile.teams,
      getScheduleSavedAt(fromFile),
      getPayloadRevision(fromFile)
    );
    saveSchedule(normalized.schedule, normalized.teams, normalized.savedAt, normalized.revision);
    return { payload: normalized, source: "local-file" };
  }

  const cached = loadSchedule();
  if (isValidSchedulePayload(cached)) {
    const normalized = createSchedulePayloadWithRevision(
      cached.schedule,
      cached.teams,
      getScheduleSavedAt(cached),
      getPayloadRevision(cached)
    );
    saveSchedule(normalized.schedule, normalized.teams, normalized.savedAt, normalized.revision);
    return { payload: normalized, source: "local-cache" };
  }

  return null;
}

async function loadResultsWithSource() {
  const published = await loadPublishedResults();
  if (published) {
    matchResults = published.results;
    saveResults(published.savedAt, published.revision);
    return { payload: published, source: "github" };
  }

  try {
    const response = await fetch("resultater.json", { cache: "no-store" });
    if (response.ok) {
      const rawPayload = await response.json();
      const normalized = normalizeResultsPayload(rawPayload);
      if (normalized) {
        matchResults = normalized.results;
        saveResults(normalized.savedAt, normalized.revision);
        return { payload: normalized, source: "local-file" };
      }
    }
  } catch (err) {
    // ignore and continue to local cache fallback
  }

  const cached = loadResults();
  if (cached) {
    matchResults = cached.results;
    return { payload: cached, source: "local-cache" };
  }

  return null;
}

function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach(b => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function normalizeGitHubPath(path) {
  return path
    .split("/")
    .filter(Boolean)
    .map(part => encodeURIComponent(part))
    .join("/");
}

async function publishJsonToGitHub(payload, config, token, commitMessagePrefix) {
  const owner = (config.owner || "").trim();
  const repo = (config.repo || "").trim();
  const branch = (config.branch || "main").trim();
  const path = (config.path || "").trim();

  if (!owner || !repo || !path || !token) {
    throw new Error("Mangler GitHub-innstillinger eller token.");
  }

  const encodedPath = normalizeGitHubPath(path);
  const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  async function fetchLatestSha() {
    try {
      const getResp = await fetch(`${baseUrl}?ref=${encodeURIComponent(branch)}&t=${Date.now()}`, {
        method: "GET",
        headers,
        cache: "no-store"
      });

      if (getResp.ok) {
        const existing = await getResp.json();
        return existing.sha;
      }

      if (getResp.status === 404) return undefined;

      const getErr = await getResp.json().catch(() => ({}));
      throw new Error(getErr.message || "Kunne ikke hente eksisterende GitHub-fil.");
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error("Feil ved kommunikasjon med GitHub.");
    }
  }

  async function putContent(sha) {
    const body = {
      message: `${commitMessagePrefix} ${new Date().toISOString()}`,
      content: toBase64Utf8(JSON.stringify(payload, null, 2)),
      branch
    };

    if (sha) body.sha = sha;

    return fetch(baseUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
      cache: "no-store"
    });
  }

  let sha = await fetchLatestSha();
  let putResp = await putContent(sha);

  if (!putResp.ok) {
    const putErr = await putResp.json().catch(() => ({}));
    const message = putErr.message || "Kunne ikke publisere til GitHub.";

    if (/does not match/i.test(message) || /sha/i.test(message)) {
      sha = await fetchLatestSha();
      putResp = await putContent(sha);
      if (putResp.ok) return putResp.json();
    }

    const retryErr = await putResp.json().catch(() => putErr);
    throw new Error(retryErr.message || message);
  }

  return putResp.json();
}

async function publishScheduleToGitHub(payload, config, token) {
  return publishJsonToGitHub(payload, config, token, "Update schedule");
}

async function publishResultsToGitHub(payload, config, token) {
  return publishJsonToGitHub(payload, config, token, "Update results");
}

// ----------------------------
// TID
// ----------------------------
function parseTimeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTimeStr(m) {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return String(h).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}

// ----------------------------
// ROUND ROBIN
// ----------------------------
function generateRoundRobin(teams) {
  let list = [...teams];
  if (list.length % 2 === 1) list.push("BYE");

  const n = list.length;
  const rounds = [];

  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      round.push([list[i], list[n - 1 - i]]);
    }
    rounds.push(round);

    const fixed = list[0];
    const rest = list.slice(1);
    rest.unshift(rest.pop());
    list = [fixed, ...rest];
  }

  return rounds;
}

// ----------------------------
// ANTI BACK-TO-BACK + SCHEDULE
// ----------------------------
function getRestStats(match, teamLastPlayedSlot, currentSlotIndex) {
  const [teamA, teamB] = match;
  const lastA = teamLastPlayedSlot.get(teamA);
  const lastB = teamLastPlayedSlot.get(teamB);

  const restA = lastA === undefined ? Number.MAX_SAFE_INTEGER : currentSlotIndex - lastA - 1;
  const restB = lastB === undefined ? Number.MAX_SAFE_INTEGER : currentSlotIndex - lastB - 1;

  return {
    minRest: Math.min(restA, restB),
    totalRest: restA + restB,
    maxRest: Math.max(restA, restB)
  };
}

function compareMatchesByRest(matchA, matchB, teamLastPlayedSlot, currentSlotIndex) {
  const statsA = getRestStats(matchA, teamLastPlayedSlot, currentSlotIndex);
  const statsB = getRestStats(matchB, teamLastPlayedSlot, currentSlotIndex);

  if (statsA.minRest !== statsB.minRest) return statsB.minRest - statsA.minRest;
  if (statsA.totalRest !== statsB.totalRest) return statsB.totalRest - statsA.totalRest;
  if (statsA.maxRest !== statsB.maxRest) return statsB.maxRest - statsA.maxRest;

  const keyA = `${matchA[0]}|${matchA[1]}`;
  const keyB = `${matchB[0]}|${matchB[1]}`;
  return keyA.localeCompare(keyB);
}

function getCourtLabel(index) {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

function getTeamCourtMap(teamCourtCounts, team) {
  if (!teamCourtCounts.has(team)) {
    teamCourtCounts.set(team, new Map());
  }

  return teamCourtCounts.get(team);
}

function getTeamCourtCount(teamCourtCounts, team, court) {
  return getTeamCourtMap(teamCourtCounts, team).get(court) || 0;
}

function incrementTeamCourtCount(teamCourtCounts, team, court) {
  const teamMap = getTeamCourtMap(teamCourtCounts, team);
  teamMap.set(court, (teamMap.get(court) || 0) + 1);
}

function compareMatchesByCourtPressure(matchA, matchB, teamCourtCounts) {
  const totalA = Array.from(getTeamCourtMap(teamCourtCounts, matchA[0]).values()).reduce((sum, count) => sum + count, 0)
    + Array.from(getTeamCourtMap(teamCourtCounts, matchA[1]).values()).reduce((sum, count) => sum + count, 0);
  const totalB = Array.from(getTeamCourtMap(teamCourtCounts, matchB[0]).values()).reduce((sum, count) => sum + count, 0)
    + Array.from(getTeamCourtMap(teamCourtCounts, matchB[1]).values()).reduce((sum, count) => sum + count, 0);

  if (totalA !== totalB) return totalB - totalA;

  const keyA = `${matchA[0]}|${matchA[1]}`;
  const keyB = `${matchB[0]}|${matchB[1]}`;
  return keyA.localeCompare(keyB);
}

function assignCourtsFairly(slotMatches, numCourts, teamCourtCounts) {
  const availableCourts = Array.from(
    { length: Math.min(numCourts, slotMatches.length) },
    (_, idx) => getCourtLabel(idx)
  );
  const assignments = [];
  const orderedMatches = [...slotMatches].sort((a, b) => compareMatchesByCourtPressure(a, b, teamCourtCounts));

  orderedMatches.forEach(match => {
    let bestCourt = availableCourts[0];
    let bestScore = null;

    availableCourts.forEach(court => {
      const countA = getTeamCourtCount(teamCourtCounts, match[0], court);
      const countB = getTeamCourtCount(teamCourtCounts, match[1], court);
      const score = {
        total: countA + countB,
        max: Math.max(countA, countB),
        min: Math.min(countA, countB)
      };

      if (
        !bestScore ||
        score.total < bestScore.total ||
        (score.total === bestScore.total && score.max < bestScore.max) ||
        (score.total === bestScore.total && score.max === bestScore.max && score.min < bestScore.min) ||
        (score.total === bestScore.total && score.max === bestScore.max && score.min === bestScore.min && court < bestCourt)
      ) {
        bestCourt = court;
        bestScore = score;
      }
    });

    assignments.push({ court: bestCourt, match });
    incrementTeamCourtCount(teamCourtCounts, match[0], bestCourt);
    incrementTeamCourtCount(teamCourtCounts, match[1], bestCourt);

    const courtIndex = availableCourts.indexOf(bestCourt);
    if (courtIndex >= 0) availableCourts.splice(courtIndex, 1);
  });

  assignments.sort((a, b) => a.court.localeCompare(b.court));
  return assignments;
}

function buildSchedule(teams, numCourts, matchMinutes, breakMinutes, startTime, breakBetweenMatches = 0) {
  const rounds = generateRoundRobin(teams);
  let t = parseTimeToMinutes(startTime);
  const schedule = [];
  const teamLastPlayedSlot = new Map();
  const teamCourtCounts = new Map();

  rounds.forEach((round, ri) => {
    let matches = round.filter(([a, b]) => a !== "BYE" && b !== "BYE");
    const hadMatchesInRound = matches.length > 0;

    while (matches.length > 0) {
      const currentSlotIndex = schedule.length;
      const sortedMatches = [...matches].sort((matchA, matchB) =>
        compareMatchesByRest(matchA, matchB, teamLastPlayedSlot, currentSlotIndex)
      );

      const slotMatches = sortedMatches.slice(0, numCourts);
      const courtAssignments = assignCourtsFairly(slotMatches, numCourts, teamCourtCounts);
      const slot = {
        round: ri + 1,
        start: t,
        end: t + matchMinutes,
        matches: []
      };

      courtAssignments.forEach(({ court, match: m }) => {
        slot.matches.push({
          court,
          teamA: m[0],
          teamB: m[1]
        });

        teamLastPlayedSlot.set(m[0], currentSlotIndex);
        teamLastPlayedSlot.set(m[1], currentSlotIndex);
      });

      schedule.push(slot);
      matches = matches.filter(match => !slotMatches.includes(match));
      t += matchMinutes + breakBetweenMatches;
    }

    if (hadMatchesInRound) t += breakMinutes;
  });

  return { schedule, totalMinutes: t - parseTimeToMinutes(startTime) };
}

// ----------------------------
// RESULTATREGISTRERING
// ----------------------------
function registerResult(id, scoreA, scoreB) {
  if (!isAdmin()) return;
  matchResults[id] = { scoreA, scoreB };
  saveResults();
}

function resetResult(id) {
  if (!isAdmin()) return;
  delete matchResults[id];
  saveResults();
}

// ----------------------------
// POENGTABELL (2–1–0)
// ----------------------------
function calculateStandings(teams) {
  const standings = {};
  teams.forEach(t => {
    standings[t] = {
      team: t,
      played: 0,
      points: 0
    };
  });

  Object.keys(matchResults).forEach(id => {
    const r = matchResults[id];
    if (!r) return;

    const [round, teamA, teamB] = id.split("|");

    const A = standings[teamA];
    const B = standings[teamB];
    if (!A || !B) return;

    const scoreA = Number(r.scoreA);
    const scoreB = Number(r.scoreB);
    if (Number.isNaN(scoreA) || Number.isNaN(scoreB)) return;

    A.played++;
    B.played++;

    if (scoreA > scoreB) {
      A.points += 2;
    } else if (scoreB > scoreA) {
      B.points += 2;
    } else {
      A.points += 1;
      B.points += 1;
    }
  });

  const sortMode = document.getElementById("sortStandings")?.value || "points";

  return Object.values(standings).sort((a, b) => {
    if (sortMode === "team") return a.team.localeCompare(b.team);
    if (sortMode === "played") return b.played - a.played;
    return b.points - a.points;
  });
}

function renderStandings(teams) {
  const container = document.getElementById("standingsContainer");
  if (!container) return;

  const sorted = calculateStandings(teams);

  let html = `
    <table>
      <thead>
        <tr>
          <th>Lag</th>
          <th>K</th>
          <th>Poeng</th>
        </tr>
      </thead>
      <tbody>
  `;

  sorted.forEach(row => {
    html += `
      <tr>
        <td>${row.team}</td>
        <td>${row.played}</td>
        <td>${row.points}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}



// ----------------------------
// DARK MODE
// ----------------------------
function initDarkMode() {
  const btn = document.getElementById("darkToggle");
  if (!btn) return;

  // Restore saved preference before first paint
  if (localStorage.getItem("kanonball_darkmode") === "true") {
    document.body.classList.add("dark");
  }
  btn.textContent = document.body.classList.contains("dark") ? "Light mode" : "Dark mode";

  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    btn.textContent = isDark ? "Light mode" : "Dark mode";
    localStorage.setItem("kanonball_darkmode", isDark);
  });
}

// ----------------------------
// FIL-LAGRING
// ----------------------------
function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadHTML(filename, htmlContent) {
  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
// ----------------------------
// IMPORT-FUNKSJONER
// ----------------------------

// Leser en JSON-fil og returnerer objektet
function importJSONFile(callback) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = e => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        callback(data);
      } catch (err) {
        alert("Kunne ikke lese JSON-filen.");
      }
    };

    reader.onerror = () => {
      alert("Kunne ikke lese filen.");
    };

    reader.readAsText(file);
  };

  input.click();
}

// Importer kampoppsett
function importScheduleFromFile() {
  importJSONFile(data => {
    if (!data.schedule || !data.teams) {
      alert("Filen inneholder ikke et gyldig kampoppsett.");
      return;
    }

    saveSchedule(data.schedule, data.teams, getScheduleSavedAt(data), getPayloadRevision(data));

    if (typeof window.handleScheduleImported === "function") {
      window.handleScheduleImported(data);
      alert("Kampoppsett importert!");
      return;
    }

    alert("Kampoppsett importert!");
    location.reload();
  });
}

async function importScheduleFromGitHub() {
  const published = await loadPublishedSchedule();
  if (!published || !isValidSchedulePayload(published)) {
    alert("Fant ikke gyldig kampoppsett på GitHub.");
    return;
  }

  saveSchedule(
    published.schedule,
    published.teams,
    getScheduleSavedAt(published),
    getPayloadRevision(published)
  );

  if (typeof window.handleScheduleImported === "function") {
    window.handleScheduleImported(published, "github");
    alert("Kampoppsett lastet fra GitHub!");
    return;
  }

  alert("Kampoppsett lastet fra GitHub!");
  location.reload();
}

// Importer resultater
function importResultsFromFile() {
  importJSONFile(data => {
    const normalized = normalizeResultsPayload(data);
    if (!normalized) {
      alert("Filen inneholder ikke gyldige resultater.");
      return;
    }

    matchResults = normalized.results;
    saveResults(normalized.savedAt, normalized.revision);
    alert("Resultater importert!");
    location.reload();
  });
}

async function importResultsFromGitHub() {
  const published = await loadPublishedResults();
  if (!published) {
    alert("Fant ikke gyldige resultater på GitHub.");
    return;
  }

  matchResults = published.results;
  saveResults(published.savedAt, published.revision);

  if (typeof window.handleResultsImported === "function") {
    window.handleResultsImported(published, "github");
    alert("Resultater lastet fra GitHub!");
    return;
  }

  alert("Resultater lastet fra GitHub!");
  location.reload();
}
