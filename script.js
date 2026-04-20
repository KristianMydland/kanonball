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

// ----------------------------
// LOCALSTORAGE
// ----------------------------
function saveResults() {
  localStorage.setItem("kanonball_results", JSON.stringify(matchResults));
}

function loadResults() {
  const saved = localStorage.getItem("kanonball_results");
  if (saved) matchResults = JSON.parse(saved);
}

function saveSchedule(schedule, teams) {
  localStorage.setItem("kanonball_schedule", JSON.stringify({ schedule, teams }));
}

function loadSchedule() {
  const saved = localStorage.getItem("kanonball_schedule");
  return saved ? JSON.parse(saved) : null;
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
function buildSchedule(teams, numCourts, matchMinutes, breakMinutes, startTime) {
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
          court: numCourts === 1 ? "A" : (idx === 0 ? "A" : "B"),
          teamA: m[0],
          teamB: m[1]
        });
      });

      schedule.push(slot);
      t += matchMinutes;
    }

    if (matches.length > 0) t += breakMinutes;
  });

  return { schedule, totalMinutes: t - parseTimeToMinutes(startTime) };
}

// ----------------------------
// RESULTATREGISTRERING
// ----------------------------
function registerResult(id, scoreA, scoreB) {
  matchResults[id] = { scoreA, scoreB };
  saveResults();
}

function resetResult(id) {
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

    A.played++;
    B.played++;

    A.points += r.scoreA;
    B.points += r.scoreB;
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

  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    btn.textContent = document.body.classList.contains("dark")
      ? "Light mode"
      : "Dark mode";
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
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = event => {
      try {
        const data = JSON.parse(event.target.result);
        callback(data);
      } catch (err) {
        alert("Kunne ikke lese JSON-filen.");
      }
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
    alert("Kampoppsett importert!");
    location.reload();
  });
}

// Importer resultater
function importResultsFromFile() {
  importJSONFile(data => {
    matchResults = data;
    saveResults();
    alert("Resultater importert!");
    location.reload();
  });
}
