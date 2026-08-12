import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp,
  collection, addDoc, deleteDoc, getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getMessaging, getToken, onMessage, isSupported,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging.js";

import { firebaseConfig, VAPID_KEY } from "./firebase-config.js";
import {
  CATEGORY_COLORS, LEGEND, SHOPPING, TAG_COLOR, BUDGET, RULES,
  WEEKDAY_A, FRIDAY_A, WEEKEND_A, GYM_A, GYM_WEEKEND, WEEKDAY_B, FRIDAY_B,
  getSchedule, isGymDayForA, isReminderDueToday, PHASE_1_START, PHASE_2_START,
} from "./scheduleData.js";

// ── Firebase ────────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── State ───────────────────────────────────────────────────────────────
let scenario = localStorage.getItem("scenario") || "A";
let currentView = "today";
let clockTimer = null;
let customReminders = []; // [{ id, label, time, repeat, days, date }]
const REPEAT_LABEL = { daily: "Every day", weekly: "Specific days", once: "One time" };
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Helpers ─────────────────────────────────────────────────────────────
function istNow() {
  // Build a Date whose getHours/getMinutes/getDay read as IST, regardless
  // of the device's own timezone.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return {
    hh: parseInt(map.hour, 10) % 24,
    mm: parseInt(map.minute, 10),
    ss: parseInt(map.second, 10),
    dow: new Date(`${map.year}-${map.month}-${map.day}T00:00:00+05:30`).getDay(),
    dateStr: `${map.year}-${map.month}-${map.day}`,
  };
}

function getPhase(dateStr) {
  if (dateStr < PHASE_1_START) return 0;
  if (dateStr < PHASE_2_START) return 1;
  return 2;
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToLabel(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function stripEmoji(s) {
  return s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
}

function todayDayInfo() {
  const { dow, dateStr } = istNow();
  const phase = getPhase(dateStr);
  return { dow, phase, isGym: isGymDayForA(dow), dateStr };
}

function msUntilLaunch() {
  // Compares against real IST wall-clock time, not just the date, so the
  // countdown is accurate down to the minute rather than jumping in whole days.
  const launch = new Date(PHASE_1_START + "T00:00:00+05:30").getTime();
  const nowIstMs = Date.now();
  return launch - nowIstMs;
}

function formatCountdown(ms) {
  if (ms <= 0) return "0d 0h";
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Merge today's custom reminders into a schedule array (each becomes a
// { time, label, type: "custom" } item), sorted by time.
function withReminders(schedule, dow, dateStr) {
  const due = customReminders
    .filter(r => isReminderDueToday(r, dow, dateStr))
    .map(r => ({ time: r.time, label: `🔔 ${r.label}`, type: "custom" }));
  if (due.length === 0) return schedule;
  return [...schedule, ...due].sort((a, b) => a.time.localeCompare(b.time));
}

// ── Header ──────────────────────────────────────────────────────────────
function renderHeader() {
  const { dateStr, hh, mm } = istNow();
  const phase = getPhase(dateStr);
  const d = new Date(`${dateStr}T00:00:00+05:30`);
  const dateLabel = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  document.getElementById("date-label").textContent = dateLabel;
  document.getElementById("phase-label").textContent =
    phase === 0 ? `Starts in ${formatCountdown(msUntilLaunch())}` : phase === 1 ? "Phase 1" : "Phase 2 · Gym";
  document.getElementById("scenario-label").textContent = `Scenario ${scenario}`;

  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const granted = Notification.permission === "granted";
  statusDot.className = "status-dot " + (granted ? "live" : "off");
  statusText.textContent = granted ? `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} IST` : "Notifs off";
}

// ── Today view ──────────────────────────────────────────────────────────
function renderToday() {
  const info = todayDayInfo();
  const railHead = document.querySelector(".rail-head .eyebrow");
  const existingBadge = document.getElementById("preview-badge");
  if (existingBadge) existingBadge.remove();

  if (info.phase === 0) {
    // Preview mode: show what a normal weekday would look like, computed
    // as if Phase 1 had already started, so the app isn't a dead end
    // before Aug 18. No real pushes fire for this — only custom reminders do.
    railHead.textContent = "Routine starts in";
    document.getElementById("now-block-time").innerHTML =
      `<span id="preview-countdown">${formatCountdown(msUntilLaunch())}</span>`;
    const launchLabel = new Date(PHASE_1_START + "T00:00:00+05:30").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
    const badge = document.createElement("div");
    badge.id = "preview-badge";
    badge.className = "preview-badge";
    badge.textContent = "Preview — starts " + launchLabel;
    document.querySelector(".rail-card").insertBefore(badge, document.querySelector(".rail-card").firstChild);

    const previewInfo = { ...info, phase: 1 };
    const previewSchedule = withReminders(getSchedule(scenario, previewInfo), info.dow, info.dateStr);
    document.getElementById("now-block-label").textContent =
      `This is what your ${DOW_SHORT[info.dow] === "Sat" || DOW_SHORT[info.dow] === "Sun" ? "weekend" : "weekday"} will look like once the routine starts.`;
    document.getElementById("next-chip").style.visibility = "hidden";
    renderRailItems(previewSchedule, -1, 0);
    document.getElementById("rail-now-indicator").style.display = "none";
    return;
  }

  railHead.textContent = "Right now";
  document.getElementById("next-chip").style.visibility = "visible";
  const schedule = withReminders(getSchedule(scenario, info), info.dow, info.dateStr);
  const { hh, mm } = istNow();
  const nowMin = hh * 60 + mm;

  // Determine current + next block
  let currentIdx = -1;
  for (let i = 0; i < schedule.length; i++) {
    if (timeToMinutes(schedule[i].time) <= nowMin) currentIdx = i;
  }
  const current = currentIdx >= 0 ? schedule[currentIdx] : schedule[schedule.length - 1];
  const next = schedule[currentIdx + 1] || schedule[0];

  document.getElementById("now-block-time").textContent = current.time;
  document.getElementById("now-block-label").innerHTML =
    `<span class="dot-inline" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${CATEGORY_COLORS[current.type]};margin-right:7px;"></span>${current.label}`;

  const nextMin = timeToMinutes(next.time) > nowMin ? timeToMinutes(next.time) : timeToMinutes(next.time) + 1440;
  document.getElementById("next-countdown").textContent = minutesToLabel(nextMin - nowMin);

  // Rail
  const dayStartMin = timeToMinutes(schedule[0].time);
  const dayEndMin = timeToMinutes(schedule[schedule.length - 1].time) + 30;
  const railPct = Math.min(100, Math.max(0, ((nowMin - dayStartMin) / (dayEndMin - dayStartMin)) * 100));
  const indicator = document.getElementById("rail-now-indicator");
  indicator.style.display = "block";
  indicator.style.top = `calc(${railPct}% - 6px)`;

  renderRailItems(schedule, currentIdx);
}

function renderRailItems(schedule, currentIdx) {
  const railHTML = schedule.map((item, i) => {
    const cls = i < currentIdx ? "past" : i === currentIdx ? "current" : "";
    return `<div class="rail-item ${cls}">
      <span class="rail-dot" style="--dot-color:${CATEGORY_COLORS[item.type]}"></span>
      <div class="rail-time">${item.time}</div>
      <div class="rail-label">${item.label}</div>
    </div>`;
  }).join("");
  document.getElementById("rail-items").innerHTML = railHTML;
}

// ── Schedule view ───────────────────────────────────────────────────────
function scheduleFor(kind) {
  const info = todayDayInfo();
  const effectiveInfo = info.phase === 0 ? { ...info, phase: 1 } : info;
  if (kind === "today") return withReminders(getSchedule(scenario, effectiveInfo), info.dow, info.dateStr);
  if (kind === "weekday") return scenario === "A" ? WEEKDAY_A : WEEKDAY_B;
  if (kind === "friday") return scenario === "A" ? FRIDAY_A : FRIDAY_B;
  if (kind === "weekend") return WEEKEND_A;
  if (kind === "gym") return scenario === "A" ? GYM_A : GYM_WEEKEND;
  return WEEKDAY_A;
}

function renderLegend() {
  document.getElementById("legend").innerHTML = LEGEND.map(([type, label]) => `
    <span class="legend-chip">
      <span class="legend-dot" style="background:${CATEGORY_COLORS[type]}"></span>${label}
    </span>`).join("");
}

function renderSchedule(kind = "today") {
  const schedule = scheduleFor(kind);
  let currentIdx = -1;
  if (kind === "today") {
    const { hh, mm } = istNow();
    const nowMin = hh * 60 + mm;
    for (let i = 0; i < schedule.length; i++) {
      if (timeToMinutes(schedule[i].time) <= nowMin) currentIdx = i;
    }
  }
  document.getElementById("schedule-list").innerHTML = schedule.map((item, i) => {
    const cls = kind !== "today" ? "" : i < currentIdx ? "past" : i === currentIdx ? "current" : "";
    return `
    <div class="sched-row ${cls}">
      <div class="sched-time">${item.time}</div>
      <div class="sched-dot" style="background:${CATEGORY_COLORS[item.type]}"></div>
      <div class="sched-label">${item.label}</div>
    </div>`;
  }).join("");
}

// ── Budget view ─────────────────────────────────────────────────────────
function renderBudget() {
  const sectionsHTML = BUDGET.map(sec => {
    const total = sec.rows.reduce((a, r) => a + r[1], 0);
    const rows = sec.rows.map(([name, cost, tag]) => `
      <div class="budget-row">
        <span class="label"><span class="legend-dot" style="background:${TAG_COLOR[tag] || "#6b7280"}"></span>${name}</span>
        <span class="amount" style="color:${sec.color}">₹${cost}</span>
      </div>`).join("");
    return `<div class="budget-card">
      <div class="budget-card-title" style="color:${sec.color}">${sec.title}</div>
      ${rows}
      <div class="budget-total-row" style="color:${sec.color}"><span>Monthly total</span><span>₹${total}</span></div>
    </div>`;
  }).join("");
  document.getElementById("budget-sections").innerHTML = sectionsHTML;

  const p1 = BUDGET[0].rows.reduce((a, r) => a + r[1], 0);
  const p2 = p1 + BUDGET[1].rows.reduce((a, r) => a + r[1], 0);
  document.getElementById("budget-summary").innerHTML = `
    <div class="budget-card-title" style="color:#facc15">📊 Summary</div>
    <div class="budget-row"><span class="label">First week one-time spend</span><span class="amount">₹3,200–3,800</span></div>
    <div class="budget-row"><span class="label">Phase 1 monthly running cost</span><span class="amount">~₹${p1}</span></div>
    <div class="budget-row"><span class="label">Phase 2 monthly (+ gym + creatine)</span><span class="amount">~₹${p2}</span></div>
  `;

  const shopRow = (item) => `
    <div class="shop-row">
      <div><div class="shop-name">${item.name}</div><div class="shop-where">📍 ${item.where}</div></div>
      <div class="shop-cost" style="color:${TAG_COLOR[item.tag]}">${item.cost}</div>
    </div>`;
  document.getElementById("shopping-immediate").innerHTML = SHOPPING.immediate.map(shopRow).join("");
  document.getElementById("shopping-phase2").innerHTML = SHOPPING.phase2.map(shopRow).join("");
}

// ── Rules view ──────────────────────────────────────────────────────────
function renderRules() {
  document.getElementById("rules-sections").innerHTML = RULES.map(sec => `
    <div class="rules-card">
      <div class="rules-card-title" style="color:${sec.color}">${sec.title}</div>
      ${sec.rules.map(r => `<div class="rule-row"><span class="rule-arrow" style="color:${sec.color}">→</span>${r}</div>`).join("")}
    </div>`).join("");
}

// ── Settings view ───────────────────────────────────────────────────────
async function renderSettings() {
  renderReminders();
  document.querySelectorAll("#scenario-toggle button").forEach(b => {
    b.classList.toggle("active", b.dataset.scenario === scenario);
  });

  const info = todayDayInfo();
  document.getElementById("gym-day-pill").textContent =
    info.phase === 2 && info.isGym ? "Yes — today" : info.phase === 2 ? "No — rest/study day" : "Phase 1 (no gym yet)";

  document.getElementById("phase-hint").textContent =
    info.phase === 0 ? `Starts ${PHASE_1_START}` :
    info.phase === 1 ? `Diet · Skincare · Study · Chess — until ${PHASE_2_START}` :
    "Diet · Skincare · Study · Chess · Gym";

  const hint = document.getElementById("notif-status-hint");
  const btn = document.getElementById("notif-toggle-btn");
  if (!("Notification" in window)) {
    hint.textContent = "Not supported in this browser";
    btn.style.display = "none";
    return;
  }
  if (Notification.permission === "granted") {
    hint.textContent = "Enabled — this device will receive reminders";
    btn.textContent = "On";
    btn.classList.add("on");
  } else if (Notification.permission === "denied") {
    hint.textContent = "Blocked — re-enable in your browser/site settings";
    btn.textContent = "Blocked";
    btn.classList.add("on");
  } else {
    hint.textContent = "Off — reminders won't reach this device";
    btn.textContent = "Enable";
    btn.classList.remove("on");
  }
}

// ── Custom reminders ────────────────────────────────────────────────────
async function loadReminders() {
  try {
    const snap = await getDocs(collection(db, "reminders"));
    customReminders = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.time.localeCompare(b.time));
  } catch (e) {
    console.warn("Could not load reminders:", e);
  }
}

function reminderRepeatText(r) {
  if (r.repeat === "daily") return REPEAT_LABEL.daily;
  if (r.repeat === "weekly") return (r.days || []).slice().sort().map(d => DOW_SHORT[d]).join(", ") || "No days set";
  if (r.repeat === "once") return r.date || "One time";
  return "";
}

function renderReminders() {
  const list = document.getElementById("reminders-list");
  if (customReminders.length === 0) {
    list.innerHTML = `<div class="reminders-empty">No custom reminders yet — add one below.</div>`;
    return;
  }
  list.innerHTML = customReminders.map(r => `
    <div class="reminder-row">
      <div class="reminder-time">${r.time}</div>
      <div class="reminder-body">
        <div class="reminder-label">${r.label}</div>
        <div class="reminder-repeat">${reminderRepeatText(r)}</div>
      </div>
      <button class="reminder-delete" data-id="${r.id}" aria-label="Delete">✕</button>
    </div>`).join("");
  list.querySelectorAll(".reminder-delete").forEach(btn => {
    btn.addEventListener("click", () => deleteReminder(btn.dataset.id));
  });
}

async function deleteReminder(id) {
  try {
    await deleteDoc(doc(db, "reminders", id));
    customReminders = customReminders.filter(r => r.id !== id);
    renderReminders();
    renderAll();
  } catch (e) {
    console.error("Could not delete reminder:", e);
    alert("Couldn't delete that reminder — check your connection and try again.");
  }
}

let selectedDays = [];

function openReminderForm() {
  document.getElementById("rf-label").value = "";
  document.getElementById("rf-time").value = "";
  document.getElementById("rf-date").value = "";
  selectedDays = [];
  document.querySelectorAll("#rf-days-wrap button").forEach(b => b.classList.remove("active"));
  document.querySelectorAll("#rf-repeat button").forEach(b => b.classList.toggle("active", b.dataset.repeat === "daily"));
  document.getElementById("rf-days-wrap").classList.add("hidden");
  document.getElementById("rf-date").classList.add("hidden");
  document.getElementById("reminder-form-backdrop").classList.remove("hidden");
}

function closeReminderForm() {
  document.getElementById("reminder-form-backdrop").classList.add("hidden");
}

async function saveReminderForm() {
  const label = document.getElementById("rf-label").value.trim();
  const time = document.getElementById("rf-time").value;
  const repeat = document.querySelector("#rf-repeat button.active")?.dataset.repeat || "daily";
  const date = document.getElementById("rf-date").value;

  if (!label) return alert("Give the reminder a short label.");
  if (!time) return alert("Pick a time.");
  if (repeat === "weekly" && selectedDays.length === 0) return alert("Pick at least one day.");
  if (repeat === "once" && !date) return alert("Pick a date.");

  const payload = { label, time, repeat, createdAt: serverTimestamp() };
  if (repeat === "weekly") payload.days = selectedDays.slice();
  if (repeat === "once") payload.date = date;

  try {
    await addDoc(collection(db, "reminders"), payload);
    closeReminderForm();
    await loadReminders();
    renderReminders();
    renderAll();
  } catch (e) {
    console.error("Could not save reminder:", e);
    alert("Couldn't save that reminder — check your connection and try again.");
  }
}

function sendTestNotification() {
  if (!("Notification" in window)) return alert("Notifications aren't supported in this browser.");
  if (Notification.permission === "granted") {
    new Notification("🔔 Surya Remind", { body: "Test notification — this device can display them.", icon: "/icons/icon-192.png" });
  } else if (Notification.permission === "denied") {
    alert("Notifications are blocked for this site — re-enable them in your browser settings first.");
  } else {
    registerPush().then(() => {
      if (Notification.permission === "granted") {
        new Notification("🔔 Surya Remind", { body: "Test notification — this device can display them.", icon: "/icons/icon-192.png" });
      }
    });
  }
}

async function saveScenario(next) {
  scenario = next;
  localStorage.setItem("scenario", scenario);
  try {
    await setDoc(doc(db, "state", "settings"), { scenario, updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn("Could not sync scenario to Firestore (will still work locally):", e);
  }
  renderHeader();
  renderAll();
}

// ── FCM registration ────────────────────────────────────────────────────
async function registerPush() {
  try {
    const supported = await isSupported();
    if (!supported) return;
    const permission = await Notification.requestPermission();
    renderSettings();
    renderHeader();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    if (token) {
      await setDoc(doc(db, "devices", "main"), { token, updatedAt: serverTimestamp() }, { merge: true });
    }
    onMessage(messaging, (payload) => {
      // Foreground push — the SW handles background pushes.
      const { title, body } = payload.notification || {};
      if (Notification.permission === "granted") {
        new Notification(title || "Surya Remind", { body: body || "", icon: "/icons/icon-192.png" });
      }
    });
  } catch (e) {
    console.error("Push registration failed:", e);
  }
}

// ── Nav / views ─────────────────────────────────────────────────────────
function renderAll() {
  renderHeader();
  if (currentView === "today") renderToday();
  if (currentView === "schedule") renderSchedule(document.querySelector("#schedule-day-toggle button.active")?.dataset.day || "today");
  if (currentView === "budget") renderBudget();
  if (currentView === "rules") renderRules();
  if (currentView === "settings") renderSettings();
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById(`view-${view}`).classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  renderAll();
}

function init() {
  renderLegend();
  document.querySelectorAll(".nav-btn").forEach(b => b.addEventListener("click", () => switchView(b.dataset.view)));

  document.querySelectorAll("#schedule-day-toggle button").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#schedule-day-toggle button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      renderSchedule(b.dataset.day);
    });
  });

  document.querySelectorAll("#scenario-toggle button").forEach(b => {
    b.addEventListener("click", () => saveScenario(b.dataset.scenario));
  });

  document.getElementById("notif-toggle-btn").addEventListener("click", registerPush);
  document.getElementById("test-notif-btn").addEventListener("click", sendTestNotification);

  document.getElementById("legend-toggle").addEventListener("click", () => {
    const legend = document.getElementById("legend");
    const btn = document.getElementById("legend-toggle");
    const showing = legend.classList.toggle("hidden") === false;
    btn.textContent = showing ? "Hide legend ▴" : "Show legend ▾";
  });

  document.getElementById("add-reminder-btn").addEventListener("click", openReminderForm);
  document.getElementById("rf-cancel").addEventListener("click", closeReminderForm);
  document.getElementById("rf-save").addEventListener("click", saveReminderForm);
  document.getElementById("reminder-form-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "reminder-form-backdrop") closeReminderForm();
  });

  document.querySelectorAll("#rf-repeat button").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#rf-repeat button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      document.getElementById("rf-days-wrap").classList.toggle("hidden", b.dataset.repeat !== "weekly");
      document.getElementById("rf-date").classList.toggle("hidden", b.dataset.repeat !== "once");
    });
  });

  document.querySelectorAll("#rf-days-wrap button").forEach(b => {
    b.addEventListener("click", () => {
      const dow = parseInt(b.dataset.dow, 10);
      b.classList.toggle("active");
      selectedDays = selectedDays.includes(dow) ? selectedDays.filter(d => d !== dow) : [...selectedDays, dow];
    });
  });

  const banner = document.getElementById("permission-banner");
  document.getElementById("enable-notifs-btn").addEventListener("click", () => {
    banner.classList.add("hidden");
    registerPush();
  });
  document.getElementById("dismiss-banner-btn").addEventListener("click", () => banner.classList.add("hidden"));
  if ("Notification" in window && Notification.permission === "default") {
    banner.classList.remove("hidden");
  }

  // Load remote scenario + custom reminders, then render.
  Promise.all([
    getDoc(doc(db, "state", "settings")).then(snap => {
      if (snap.exists() && snap.data().scenario) {
        scenario = snap.data().scenario;
        localStorage.setItem("scenario", scenario);
      }
    }).catch(() => {}),
    loadReminders(),
  ]).finally(renderAll);

  clockTimer = setInterval(() => {
    if (currentView === "today") renderToday();
    renderHeader();
  }, 15000);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(e => console.warn("sw.js registration failed:", e));
  }
}

document.addEventListener("DOMContentLoaded", init);
