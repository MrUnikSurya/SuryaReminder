// scheduleData.js — single source of truth for Surya's daily routine.
// Used by the frontend (app.js) to render the schedule, and mirrored in
// functions/scheduleData.js (CommonJS) for the notification scheduler.
// Edit this file, then copy the array/object bodies into functions/scheduleData.js
// if you change the schedule — the two must stay in sync.

export const CATEGORY_COLORS = {
  meal:   "#facc15",
  study:  "#818cf8",
  gym:    "#f97316",
  sleep:  "#6b7280",
  work:   "#34d399",
  free:   "#e879f9",
  skin:   "#f9a8d4",
  chess:  "#38bdf8",
  supp:   "#a3e635",
  travel: "#fb7185",
  custom: "#2dd4bf",
};

export const LEGEND = [
  ["meal", "Food / Meal"], ["work", "TCS Work"], ["study", "IITM Study"],
  ["skin", "Skincare"], ["supp", "Supplements"], ["chess", "Chess"],
  ["travel", "Travel (productive)"], ["free", "Rest / Free"], ["sleep", "Sleep"],
  ["gym", "Gym"], ["custom", "My Reminders"],
];

// ─── CUSTOM REMINDERS ───────────────────────────────────────────────────────
// A reminder doc in Firestore looks like:
//   { label, time: "HH:MM", repeat: "daily" | "weekly" | "once",
//     days: [0-6] (weekly only), date: "YYYY-MM-DD" (once only) }
// This function decides whether a given reminder applies to today —
// used by the app (to merge reminders into the schedule view) and by
// scripts/checkSchedule.js (to decide whether to push it).
export function isReminderDueToday(reminder, dow, dateStr) {
  if (reminder.repeat === "daily") return true;
  if (reminder.repeat === "weekly") return Array.isArray(reminder.days) && reminder.days.includes(dow);
  if (reminder.repeat === "once") return reminder.date === dateStr;
  return false;
}

// ─── SCENARIO A (exit office 4 PM, home 5:30 PM) ──────────────────────────
export const WEEKDAY_A = [
  { time: "07:00", label: "Wake up — 2 glasses warm water", type: "meal" },
  { time: "07:10", label: "💊 Supplements: B12 + D3 with water (take with light food)", type: "supp" },
  { time: "07:15", label: "🧴 AM Skincare: Salicylic face wash → Sunscreen (2-finger rule, wait 10 min) → Pilgrim hair serum on dry temples", type: "skin" },
  { time: "07:35", label: "Breakfast: Banana + 1 glass full-fat milk + soaked almonds & walnuts", type: "meal" },
  { time: "08:15", label: "Isabgol 1 tsp in warm water (before leaving)", type: "supp" },
  { time: "08:30", label: "Freshen up, pack office dabba (roasted chana + banana)", type: "free" },
  { time: "09:30", label: "🚇 Leave home — Metro/Bus travel + IITM video lecture (offline)", type: "study" },
  { time: "10:15", label: "♟ Bus: Chess puzzles on Lichess/Chess.com — 45 min", type: "chess" },
  { time: "11:00", label: "💻 TCS Work", type: "work" },
  { time: "13:00", label: "Lunch: Rice + dal + paneer/soya sabzi + curd", type: "meal" },
  { time: "15:30", label: "Office snack: banana or roasted chana from dabba", type: "meal" },
  { time: "16:00", label: "🚇 Leave office — travel home + IITM problem solving / notes", type: "study" },
  { time: "16:45", label: "♟ Bus: Chess game or tactics — 45 min", type: "chess" },
  { time: "17:30", label: "Reach home — glass of milk or nimbu paani with sugar", type: "meal" },
  { time: "17:45", label: "Freshen up + short rest (20 min, no screen)", type: "free" },
  { time: "18:05", label: "📚 IITM Deep Study Block 1 — assignments / problems", type: "study" },
  { time: "19:30", label: "📚 IITM Deep Study Block 2 — project / weak subject", type: "study" },
  { time: "20:30", label: "Dinner: Roti (3–4) + dal + sabzi + curd", type: "meal" },
  { time: "21:15", label: "♟ Chess: 1 game or study an opening (30 min)", type: "chess" },
  { time: "21:45", label: "Free time / unwind / phone", type: "free" },
  { time: "22:30", label: "🧴 PM Skincare: Salicylic face wash → Caffeine eye cream (ring finger) → Hair serum", type: "skin" },
  { time: "22:45", label: "Warm milk + banana or 2 dates before bed", type: "meal" },
  { time: "23:00", label: "Sleep 😴", type: "sleep" },
];

export const FRIDAY_A = [
  { time: "07:00", label: "Wake up — warm water", type: "meal" },
  { time: "07:10", label: "💊 Supplements: B12 + D3", type: "supp" },
  { time: "07:15", label: "🧴 AM Skincare: Face wash → Sunscreen → Hair serum", type: "skin" },
  { time: "07:35", label: "Breakfast: Banana + milk + almonds & walnuts", type: "meal" },
  { time: "08:15", label: "Isabgol in warm water", type: "supp" },
  { time: "09:30", label: "🚇 Metro: IITM light revision / re-read notes", type: "study" },
  { time: "10:15", label: "♟ Bus: Chess puzzles", type: "chess" },
  { time: "11:00", label: "💻 TCS Work", type: "work" },
  { time: "13:00", label: "Lunch: Rice + dal + paneer/soya + curd", type: "meal" },
  { time: "15:30", label: "Snack: banana or chana", type: "meal" },
  { time: "16:00", label: "🚇 Travel home — IITM light / chess", type: "travel" },
  { time: "17:30", label: "Home — milk or nimbu paani", type: "meal" },
  { time: "17:45", label: "Rest / decompress (Friday = lighter day)", type: "free" },
  { time: "19:00", label: "Light IITM: watch 1 video only, no problems", type: "study" },
  { time: "20:00", label: "Dinner: Roti + dal + sabzi + curd", type: "meal" },
  { time: "21:00", label: "♟ Chess: Play 2–3 longer games, study endgames", type: "chess" },
  { time: "22:00", label: "Free — phone, music, unwind fully", type: "free" },
  { time: "22:30", label: "🧴 PM Skincare + warm milk + banana", type: "skin" },
  { time: "23:00", label: "Sleep 😴", type: "sleep" },
];

export const WEEKEND_A = [
  { time: "07:30", label: "Wake up (slight sleep-in) — warm water", type: "meal" },
  { time: "07:45", label: "💊 Supplements: B12 + D3", type: "supp" },
  { time: "07:50", label: "🧴 AM Skincare: Face wash → Sunscreen → Hair serum", type: "skin" },
  { time: "08:00", label: "Breakfast: Banana + milk + peanut butter on bread + almonds", type: "meal" },
  { time: "08:30", label: "☀️ 15 min sunlight (window or outside for Vitamin D)", type: "supp" },
  { time: "08:45", label: "📚 IITM Deep Study Block 1 — lectures / theory", type: "study" },
  { time: "11:00", label: "Snack: roasted chana or fruit", type: "meal" },
  { time: "11:15", label: "📚 IITM Study Block 2 — problem solving / assignments", type: "study" },
  { time: "13:00", label: "Lunch: Dal + rice + paneer sabzi + curd (power meal)", type: "meal" },
  { time: "14:00", label: "Rest / nap (20–30 min) / explore Kolkata", type: "free" },
  { time: "15:00", label: "♟ Chess: 1 hr — study an opening or watch analysis", type: "chess" },
  { time: "16:00", label: "📚 IITM Study Block 3 — project / Kaggle / Flask app", type: "study" },
  { time: "18:00", label: "Snack: peanut butter + banana", type: "meal" },
  { time: "18:30", label: "Cook / meal prep for week (dal bulk, soya chunks)", type: "free" },
  { time: "20:00", label: "Dinner: Roti (4–5) + dal + sabzi + curd", type: "meal" },
  { time: "21:00", label: "♟ Chess: 1 game or tactics practice", type: "chess" },
  { time: "21:30", label: "Free — unwind, phone", type: "free" },
  { time: "22:30", label: "🧴 PM Skincare + warm milk + banana", type: "skin" },
  { time: "23:00", label: "Sleep 😴", type: "sleep" },
];

export const GYM_A = [
  { time: "07:00", label: "Wake up — warm water", type: "meal" },
  { time: "07:10", label: "💊 Supplements: B12 + D3 + Creatine 5g in water", type: "supp" },
  { time: "07:15", label: "🧴 AM Skincare: Face wash → Sunscreen → Hair serum", type: "skin" },
  { time: "07:35", label: "Breakfast: Banana + milk + almonds & walnuts", type: "meal" },
  { time: "09:30", label: "🚇 Metro: IITM lecture", type: "study" },
  { time: "10:15", label: "♟ Bus: Chess puzzles", type: "chess" },
  { time: "11:00", label: "💻 TCS Work", type: "work" },
  { time: "13:00", label: "Lunch: Extra portion — rice + dal + paneer/soya + curd", type: "meal" },
  { time: "15:30", label: "Snack: banana + peanut butter biscuits", type: "meal" },
  { time: "16:00", label: "🚇 Travel home — light IITM review", type: "study" },
  { time: "17:30", label: "Home — Pre-workout snack: banana + peanut butter on bread", type: "meal" },
  { time: "17:50", label: "Change into gym clothes", type: "free" },
  { time: "18:00", label: "🏋 GYM SESSION — 60 min compound lifts", type: "gym" },
  { time: "19:00", label: "Post-workout: milk + soya chunks or paneer (within 30 min!)", type: "meal" },
  { time: "19:30", label: "Shower + freshen up", type: "free" },
  { time: "20:00", label: "Dinner: Roti (5–6) + dal + sabzi + curd (eat more today)", type: "meal" },
  { time: "21:00", label: "📚 IITM: Light video only — 45 min max after gym", type: "study" },
  { time: "21:45", label: "♟ Chess: 1 quick game or tactics", type: "chess" },
  { time: "22:15", label: "🧴 PM Skincare + warm milk + banana", type: "skin" },
  { time: "22:30", label: "Sleep 😴 (earlier on gym days)", type: "sleep" },
];

export const GYM_WEEKEND = [
  { time: "07:00", label: "Wake up — warm water", type: "meal" },
  { time: "07:10", label: "💊 Supplements: B12 + D3 + Creatine 5g", type: "supp" },
  { time: "07:15", label: "🧴 AM Skincare: Face wash → Sunscreen → Hair serum", type: "skin" },
  { time: "07:35", label: "Breakfast: Banana + milk + peanut butter on bread + almonds", type: "meal" },
  { time: "08:00", label: "Pre-workout snack: banana + light carbs", type: "meal" },
  { time: "08:30", label: "🏋 GYM SESSION — 60–75 min (no office today!)", type: "gym" },
  { time: "09:45", label: "Post-workout: milk + soya chunks / paneer", type: "meal" },
  { time: "10:15", label: "Shower + freshen up", type: "free" },
  { time: "11:00", label: "📚 IITM Deep Study Block 1", type: "study" },
  { time: "13:00", label: "Lunch: Heavy meal — dal + rice + paneer + curd", type: "meal" },
  { time: "14:00", label: "Rest / nap — recovery after gym", type: "free" },
  { time: "15:00", label: "♟ Chess: 1 hr focused study or games", type: "chess" },
  { time: "16:00", label: "📚 IITM Study Block 2 — assignments / project", type: "study" },
  { time: "18:00", label: "Snack: peanut butter + banana", type: "meal" },
  { time: "18:30", label: "Meal prep for week + errands", type: "free" },
  { time: "20:00", label: "Dinner: Roti (5–6) + dal + sabzi + curd", type: "meal" },
  { time: "21:00", label: "♟ Chess or free time", type: "chess" },
  { time: "22:00", label: "🧴 PM Skincare + warm milk + banana", type: "skin" },
  { time: "22:30", label: "Sleep 😴", type: "sleep" },
];

// ─── SCENARIO B (exit office 8 PM, home 9:30 PM) ──────────────────────────
export const WEEKDAY_B = [
  { time: "07:00", label: "Wake up — 2 glasses warm water", type: "meal" },
  { time: "07:10", label: "💊 Supplements: B12 + D3", type: "supp" },
  { time: "07:15", label: "🧴 AM Skincare: Face wash → Sunscreen → Hair serum", type: "skin" },
  { time: "07:35", label: "Breakfast: Banana + full-fat milk + almonds & walnuts", type: "meal" },
  { time: "08:15", label: "Isabgol in warm water", type: "supp" },
  { time: "08:30", label: "Pack office dabba (chana + banana + peanut butter bread)", type: "free" },
  { time: "09:30", label: "🚇 Metro: IITM video lecture (offline downloaded)", type: "study" },
  { time: "10:15", label: "♟ Bus: Chess puzzles / tactics on app", type: "chess" },
  { time: "11:00", label: "💻 TCS Work", type: "work" },
  { time: "13:00", label: "Lunch: Rice + dal + paneer/soya + curd", type: "meal" },
  { time: "15:30", label: "Office snack: banana or roasted chana from dabba", type: "meal" },
  { time: "18:00", label: "📚 IITM: Use any TCS downtime/break — notes or reading", type: "study" },
  { time: "19:00", label: "Dinner at office / order: roti + dal + sabzi (no junk)", type: "meal" },
  { time: "20:00", label: "🚇 Leave office — travel + IITM review of day's lecture", type: "study" },
  { time: "20:45", label: "♟ Bus: Chess — 1 game or endgame study", type: "chess" },
  { time: "21:30", label: "Reach home — warm milk or nimbu paani immediately", type: "meal" },
  { time: "21:45", label: "Freshen up", type: "free" },
  { time: "22:00", label: "🧴 PM Skincare: Face wash → Eye cream → Hair serum", type: "skin" },
  { time: "22:15", label: "Light IITM review: 30 min max (videos only, no heavy problems)", type: "study" },
  { time: "22:45", label: "Warm milk + banana or 2 dates", type: "meal" },
  { time: "23:00", label: "Sleep 😴 (non-negotiable even in Scenario B)", type: "sleep" },
];

export const FRIDAY_B = [
  { time: "07:00", label: "Wake up — warm water", type: "meal" },
  { time: "07:10", label: "💊 Supplements", type: "supp" },
  { time: "07:15", label: "🧴 AM Skincare", type: "skin" },
  { time: "07:35", label: "Breakfast: Banana + milk + almonds", type: "meal" },
  { time: "09:30", label: "🚇 Metro: Light IITM or just chess — it's Friday", type: "chess" },
  { time: "11:00", label: "💻 TCS Work", type: "work" },
  { time: "13:00", label: "Lunch", type: "meal" },
  { time: "15:30", label: "Snack", type: "meal" },
  { time: "19:00", label: "Dinner at office", type: "meal" },
  { time: "20:00", label: "🚇 Travel home — chess + music, minimal study", type: "chess" },
  { time: "21:30", label: "Home — milk + freshen up", type: "meal" },
  { time: "22:00", label: "🧴 PM Skincare", type: "skin" },
  { time: "22:15", label: "Free — phone, chess games, complete rest", type: "free" },
  { time: "23:00", label: "Sleep 😴", type: "sleep" },
];

// ─── SCHEDULE SELECTION ────────────────────────────────────────────────────
// dayInfo: { dow: 0-6 (Sun-Sat), isGym: bool, phase: 1|2 }
export function getSchedule(scenario, dayInfo) {
  const isWeekend = dayInfo.dow === 0 || dayInfo.dow === 6;
  const isFriday = dayInfo.dow === 5;
  const gymDay = dayInfo.phase === 2 && dayInfo.isGym;

  if (scenario === "A") {
    if (gymDay && !isWeekend) return GYM_A;
    if (isWeekend && dayInfo.phase === 2) return GYM_WEEKEND;
    if (isWeekend) return WEEKEND_A;
    if (isFriday) return FRIDAY_A;
    return WEEKDAY_A;
  }
  // Scenario B
  if (isWeekend && dayInfo.phase === 2) return GYM_WEEKEND;
  if (isWeekend) return WEEKEND_A;
  if (isFriday) return FRIDAY_B;
  return WEEKDAY_B;
}

// Scenario A gym days: Mon / Wed / Fri (Phase 2 only)
export function isGymDayForA(dow) {
  return dow === 1 || dow === 3 || dow === 5;
}

// ─── SHOPPING LIST ──────────────────────────────────────────────────────────
export const SHOPPING = {
  immediate: [
    { name: "Full-fat milk 1L (Amul/Mother Dairy)", where: "Local dairy/store daily", cost: "₹28/day → ₹840/month", tag: "diet" },
    { name: "Bananas (buy 8–10 at a time)", where: "Street vendor / market", cost: "₹3–4 each → ~₹400/month", tag: "diet" },
    { name: "Almonds 250g", where: "Kirana store / DMart / Amazon", cost: "₹180 (lasts 5–6 weeks)", tag: "diet" },
    { name: "Walnuts 250g", where: "Kirana store / DMart / Amazon", cost: "₹220 (lasts 5–6 weeks)", tag: "diet" },
    { name: "Peanut Butter 1kg (Alpino/Sundrop)", where: "DMart / Amazon / Big Basket", cost: "₹380 (lasts 6–8 weeks)", tag: "diet" },
    { name: "Soya Chunks 1kg (Nutrela)", where: "Kirana store / DMart", cost: "₹65 (lasts 3–4 weeks)", tag: "diet" },
    { name: "Roasted Chana 500g (office snack)", where: "Kirana store / Big Basket", cost: "₹80 (lasts 3 weeks)", tag: "diet" },
    { name: "Moong/Chana Dal 1kg", where: "Kirana store", cost: "₹120 (lasts 3 weeks)", tag: "diet" },
    { name: "Paneer 200g (buy 2–3x/week)", where: "Local dairy", cost: "₹120/200g → ₹320/month", tag: "diet" },
    { name: "Dates 200g", where: "Kirana store / DMart", cost: "₹80 (lasts 1 month)", tag: "diet" },
    { name: "Pumpkin seeds 250g (zinc source)", where: "Amazon / Health store", cost: "₹120 (lasts 6–8 weeks)", tag: "diet" },
    { name: "Flaxseeds (alsi) 250g (omega 3)", where: "Kirana store / Amazon", cost: "₹50 (lasts 2 months)", tag: "diet" },
    { name: "Sat Isabgol 100g (Patanjali/Dabur)", where: "Medical store / Kirana", cost: "₹50 (lasts 1.5 months)", tag: "supp" },
    { name: "Vitamin B12 Methylcobalamin 500mcg", where: "Medical store / Amazon", cost: "₹150–180/month", tag: "supp" },
    { name: "Vitamin D3 1000 IU daily", where: "Amazon / medical store", cost: "₹120–150/month", tag: "supp" },
    { name: "The Derma Co 1% Salicylic Face Wash", where: "Nykaa / Amazon", cost: "₹249 (lasts 2–3 months)", tag: "skin" },
    { name: "The Derma Co Hyaluronic Sunscreen Gel", where: "Nykaa / Amazon", cost: "₹399 (lasts 1–1.5 months)", tag: "skin" },
    { name: "The Derma Co Caffeine Under Eye Cream", where: "Nykaa / Amazon", cost: "₹349 (lasts 3 months)", tag: "skin" },
    { name: "Pilgrim Advanced Hair Serum 100ml", where: "Nykaa / Amazon", cost: "₹845 (lasts 2.5 months)", tag: "skin" },
  ],
  phase2: [
    { name: "Creatine Monohydrate 500g (AS-IT-IS brand)", where: "Amazon", cost: "₹600–700 (lasts 3–4 months)", tag: "supp" },
    { name: "Gym membership", where: "Local gym near home/office", cost: "₹600–1000/month", tag: "gym" },
    { name: "Gym shoes (any basic cross-trainer)", where: "Decathlon Kolkata", cost: "₹1,500–2,000 one-time", tag: "gym" },
  ],
};

export const TAG_COLOR = { diet: "#4ade80", supp: "#a3e635", skin: "#f9a8d4", gym: "#f97316" };
export const TAG_LABEL = { diet: "🥛 Diet", supp: "💊 Supplement", skin: "🧴 Skincare", gym: "🏋 Gym" };

// ─── BUDGET ─────────────────────────────────────────────────────────────────
export const BUDGET = [
  { title: "Phase 1 Monthly Cost", color: "#4ade80", rows: [
    ["Milk (1L/day)", 840, "diet"], ["Bananas (~5/day)", 400, "diet"],
    ["Soya chunks (monthly)", 65, "diet"], ["Paneer (2–3x/week)", 320, "diet"],
    ["Dal + misc groceries", 720, "diet"], ["Pumpkin seeds + flaxseeds", 80, "diet"],
    ["Roasted chana (office snack)", 80, "diet"], ["Peanut butter (amortized)", 65, "diet"],
    ["Dates", 80, "diet"], ["Isabgol (amortized)", 35, "supp"],
    ["B12 tablet", 160, "supp"], ["D3 tablet", 130, "supp"],
    ["Sunscreen (refill ~1.5 months)", 265, "skin"], ["Face wash (refill ~2.5 months)", 100, "skin"],
    ["Eye cream (refill ~3 months)", 116, "skin"], ["Hair serum (refill ~2.5 months)", 338, "skin"],
  ]},
  { title: "Phase 2 Additional Cost", color: "#f97316", rows: [
    ["Gym membership", 850, "gym"], ["Creatine (amortized, lasts 3–4 months)", 185, "supp"],
  ]},
];

// ─── RULES ──────────────────────────────────────────────────────────────────
export const RULES = [
  { title: "🍽 Eating Rules", color: "#facc15", rules: [
    "Set phone alarms for every meal slot — eat even when not hungry",
    "Carry office dabba daily: roasted chana + banana minimum",
    "Never leave home without eating breakfast (banana + milk takes 5 min)",
    "Dinner always before 9 PM — digestion suffers if too late",
    "Warm milk + banana/dates before bed every night without exception",
    "Ground flaxseed: mix 1 tbsp into roti atta for daily omega 3",
  ]},
  { title: "🧴 Skincare Rules", color: "#f9a8d4", rules: [
    "AM skincare before leaving home — sunscreen needs 10 min to set before sun exposure",
    "2-finger rule for sunscreen: squeeze two full lines on index + middle finger",
    "Dab sweat gently in Kolkata heat — never wipe. Wiping removes sunscreen shield",
    "PM skincare before bed every night — skin repairs during sleep",
    "Eye cream: ring finger only, gentle dab, never rub",
    "Hair serum: only on completely dry scalp/temples, not on wet hair",
  ]},
  { title: "📚 Study Rules", color: "#818cf8", rules: [
    "Metro time = IITM lectures (downloaded offline before leaving home)",
    "Bus time = Chess puzzles on Lichess or Chess.com",
    "3 hrs daily commute = 1.5 hrs study + 1.5 hrs chess — never waste it",
    "Friday evening = light review only, no heavy problems",
    "Weekend: 3 study blocks (8:30–11, 11:15–1, 4–6) + project work",
    "Scenario B: if too tired at 10 PM — skip study, sleep wins every time",
  ]},
  { title: "♟ Chess Rules", color: "#38bdf8", rules: [
    "Daily puzzle minimum: 5 tactical puzzles on bus (Lichess puzzle rush)",
    "Don't play blitz while tired — it builds bad habits. Puzzles are better",
    "Weekend: 1 hr dedicated study — opening theory or endgame technique",
    "Friday night: 2–3 longer games when relaxed (30 min each)",
    "Track rating weekly — consistency over months is what builds chess strength",
  ]},
  { title: "💊 Supplement Rules", color: "#a3e635", rules: [
    "B12 + D3: take in morning with food, never on empty stomach",
    "Isabgol: 1 tsp in warm water — always 30 min before or after meals, never with",
    "Creatine (Phase 2): 5g daily in plain water, any time, no loading needed",
    "D3: take with fatty food (milk/peanut butter) — fat-soluble, absorbs better",
    "15 min morning sunlight on arms/face before leaving — free Vitamin D",
  ]},
  { title: "🏋 Gym Rules (Phase 2)", color: "#f97316", rules: [
    "Scenario A: gym Mon/Wed/Fri, 6:00–7:00 PM. Never skip without replacing",
    "Scenario B: gym Saturday + Sunday morning. Weekdays too late to gym safely",
    "Post-workout meal within 30 minutes of finishing — non-negotiable",
    "Progressive overload: add 2.5kg every week on lifts that felt easy",
    "Form over weight always — especially first 4 weeks",
    "Rest days are not wasted days — muscle builds during recovery",
  ]},
  { title: "😴 Sleep Rules", color: "#6b7280", rules: [
    "Sleep by 11 PM every single night — both scenarios",
    "8 hours sleep = muscle growth + skin repair + memory consolidation for IITM",
    "No screens 20 min before sleep if possible — blue light kills melatonin",
    "Gym days: try to sleep by 10:30 PM — body needs extra recovery",
    "Don't sacrifice sleep for study — a tired brain retains nothing",
  ]},
];

export const PHASE_1_START = "2026-08-18"; // Phase 1 begins (diet, skincare, study, chess)
export const PHASE_2_START = "2026-09-26"; // Phase 2 begins (adds gym)
