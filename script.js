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

function saveResults() {
  localStorage.setItem("kanonball_results", JSON.stringify(matchResults));
}

function loadResults() {
  const saved = localStorage.getItem("kanonball_results");
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    matchResults = parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    matchResults = {};
    localStorage.removeItem("kanonball_results");
  }
}

function saveSchedule(schedule, teams) {
  localStorage.setItem("kanonball_schedule", JSON.stringify({ schedule, teams }));
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

async function loadPublishedSchedule() {
  const source = getPublishedScheduleSource();

  try {
    const response = await fetch(buildGitHubRawUrl(source), { cache: "no-store" });
    if (!response.ok) return null;

    const payload = await response.json();
    return isValidSchedulePayload(payload) ? payload : null;
  } catch (err) {
    return null;
  }
}

async function loadScheduleWithFallback() {
  const cached = loadSchedule();
  if (isValidSchedulePayload(cached)) return cached;

  try {
    const response = await fetch("kampoppsett.json", { cache: "no-store" });
    if (!response.ok) return null;

    const fromFile = await response.json();
    if (!isValidSchedulePayload(fromFile)) return null;

    saveSchedule(fromFile.schedule, fromFile.teams);
    return fromFile;
  } catch (err) {
    return null;
  }
}

async function loadSharedScheduleWithFallback() {
  const published = await loadPublishedSchedule();
  if (isValidSchedulePayload(published)) return published;

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

  if (isValidSchedulePayload(fromFile)) return fromFile;

  const cached = loadSchedule();
  return isValidSchedulePayload(cached) ? cached : null;
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

async function publishScheduleToGitHub(payload, config, token) {
  const owner = (config.owner || "").trim();
  const repo = (config.repo || "").trim();
  const branch = (config.branch || "main").trim();
  const path = (config.path || "kampoppsett.json").trim();

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
      message: `Update schedule ${new Date().toISOString()}`,
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
function buildSchedule(teams, numCourts, matchMinutes, breakMinutes, startTime, breakBetweenMatches = 0) {
  const rounds = generateRoundRobin(teams);
  let t = parseTimeToMinutes(startTime);
  const schedule = [];

  rounds.forEach((round, ri) => {
    let matches = round.filter(([a, b]) => a !== "BYE" && b !== "BYE");

    for (let i = 0; i < matches.length; i += numCourts) {
      if (i > 0) {
        const prevTeams = new Set();
        const prevSlot = schedule[schedule.length - 1];
        prevSlot.matches.forEach(m => {
          prevTeams.add(m.teamA);
          prevTeams.add(m.teamB);
        });

        for (let j = i; j < Math.min(i + numCourts, matches.length); j++) {
          const [a, b] = matches[j];
          if (prevTeams.has(a) || prevTeams.has(b)) {
            for (let k = j + 1; k < matches.length; k++) {
              const [aa, bb] = matches[k];
              if (!prevTeams.has(aa) && !prevTeams.has(bb)) {
                const tmp = matches[j];
                matches[j] = matches[k];
                matches[k] = tmp;
                break;
              }
            }
          }
        }
      }

      const slotMatches = matches.slice(i, i + numCourts);
      const slot = {
        round: ri + 1,
        start: t,
        end: t + matchMinutes,
        matches: []
      };

      slotMatches.forEach((m, idx) => {
        slot.matches.push({
          court: idx < 26 ? String.fromCharCode(65 + idx) : String(idx + 1),
          teamA: m[0],
          teamB: m[1]
        });
      });

      schedule.push(slot);
      t += matchMinutes + breakBetweenMatches;
    }

    if (matches.length > 0) t += breakMinutes;
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

    saveSchedule(data.schedule, data.teams);

    if (typeof window.handleScheduleImported === "function") {
      window.handleScheduleImported(data);
      alert("Kampoppsett importert!");
      return;
    }

    alert("Kampoppsett importert!");
    location.reload();
  });
}

// Importer resultater
function importResultsFromFile() {
  importJSONFile(data => {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      alert("Filen inneholder ikke gyldige resultater.");
      return;
    }

    matchResults = data;
    saveResults();
    alert("Resultater importert!");
    location.reload();
  });
}
