/**
 * Surya Remind — free scheduler (GitHub Actions edition)
 *
 * This replaces the Cloud Functions + Cloud Scheduler approach, which
 * requires Firebase's Blaze plan. This script does the exact same job —
 * check the routine, send an FCM push for anything due — but is triggered
 * by a GitHub Actions cron job instead, which is free. Firestore reads/
 * writes and FCM sends are both free on the Spark plan at this volume.
 *
 * Because GitHub Actions cron isn't precise to the minute (it can fire a
 * few minutes late, especially under load), this doesn't match a single
 * exact minute. Instead it tracks the last time it successfully ran
 * (state/runlog in Firestore) and sends a push for every schedule item
 * whose time falls in the window between "last run" and "now" — so
 * nothing gets missed even if a run is delayed or occasionally skipped.
 */

const admin = require("firebase-admin");
const {
  getSchedule,
  isGymDayForA,
  isReminderDueToday,
  PHASE_1_START,
  PHASE_2_START,
} = require("./scheduleData");

const IST_TZ = "Asia/Kolkata";

function initFirebase() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON env var is missing.");
  }
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

function istParts(date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TZ, hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
  });
  const map = {};
  for (const p of fmt.formatToParts(date)) map[p.type] = p.value;
  const dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hh: parseInt(map.hour, 10), mm: parseInt(map.minute, 10), dow: dowMap[map.weekday] };
}

function istDateString(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST_TZ }).format(date); // yyyy-mm-dd
}

function getPhase(dateStr) {
  if (dateStr < PHASE_1_START) return 0;
  if (dateStr < PHASE_2_START) return 1;
  return 2;
}

function minutesOfDay({ hh, mm }) {
  return hh * 60 + mm;
}

async function main() {
  const db = initFirebase();
  const now = new Date();
  const nowParts = istParts(now);
  const todayStr = istDateString(now);
  const phase = getPhase(todayStr);
  const nowMin = minutesOfDay(nowParts);

  const runlogRef = db.doc("state/runlog");
  const runlogSnap = await runlogRef.get();
  const lastRun = runlogSnap.exists ? runlogSnap.data() : null;

  // Window start: minutes-of-day of the last successful run today, or the
  // start of the day if this is the first run today (or ever).
  let windowStartMin = 0;
  if (lastRun && lastRun.dateStr === todayStr) {
    windowStartMin = lastRun.minOfDay;
  }

  const inWindow = (t) => t > windowStartMin && t <= nowMin;

  // Routine schedule — only once the routine has actually launched.
  let due = [];
  if (phase !== 0) {
    const settingsSnap = await db.doc("state/settings").get();
    const scenario = settingsSnap.exists ? settingsSnap.data().scenario || "A" : "A";
    const dayInfo = { dow: nowParts.dow, phase, isGym: isGymDayForA(nowParts.dow) };
    const schedule = getSchedule(scenario, dayInfo);
    due = schedule.filter((item) => {
      const [h, m] = item.time.split(":").map(Number);
      return inWindow(h * 60 + m);
    });
  } else {
    console.log("Before launch date — routine skipped, custom reminders still checked.");
  }

  // Custom reminders — independent of the routine's launch date, so a
  // one-time test reminder works even before Aug 18.
  const remindersSnap = await db.collection("reminders").get();
  const firedOnceRefs = [];
  for (const docSnap of remindersSnap.docs) {
    const r = docSnap.data();
    if (!r.time || !isReminderDueToday(r, nowParts.dow, todayStr)) continue;
    const [h, m] = r.time.split(":").map(Number);
    if (!inWindow(h * 60 + m)) continue;
    due.push({ time: r.time, label: r.label, type: "custom" });
    if (r.repeat === "once") firedOnceRefs.push(docSnap.ref); // consume after sending
  }
  due.sort((a, b) => a.time.localeCompare(b.time));

  console.log(`IST ${String(nowParts.hh).padStart(2, "0")}:${String(nowParts.mm).padStart(2, "0")} — window (${windowStartMin}, ${nowMin}] — ${due.length} due`);

  if (due.length > 0) {
    const deviceSnap = await db.doc("devices/main").get();
    const token = deviceSnap.exists ? deviceSnap.data().token : null;

    if (!token) {
      console.warn("No registered device token — skipping send (routine still advances).");
    } else {
      for (const item of due) {
        const cleanLabel = item.label.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim();
        try {
          await admin.messaging().send({
            token,
            notification: {
              title: item.type === "custom" ? `🔔 ${item.time} — REMINDER` : `⏰ ${item.time} — ${item.type.toUpperCase()}`,
              body: cleanLabel,
            },
            webpush: {
              fcmOptions: { link: "/" },
              notification: { icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" },
            },
          });
          console.log(`Sent: ${item.time} ${cleanLabel}`);
        } catch (err) {
          console.error(`FCM send failed for ${item.time}:`, err.message);
        }
      }
    }
  }

  if (firedOnceRefs.length > 0) {
    await Promise.all(firedOnceRefs.map((ref) => ref.delete()));
    console.log(`Removed ${firedOnceRefs.length} fired one-time reminder(s).`);
  }

  await runlogRef.set({
    dateStr: todayStr,
    minOfDay: nowMin,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

main().catch((err) => {
  console.error("Scheduler run failed:", err);
  process.exit(1);
});
