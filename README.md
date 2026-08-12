# Surya Remind — setup & deployment (100% free version)

A rebuild of your daily routine reminder as a real app: Firestore stores
your scenario toggle + this device's push token, and a scheduler sends a
real push notification via **Firebase Cloud Messaging (FCM)** whenever
something in your routine is due. This is the part that fixes the Android
problem — the old app used `setTimeout()` in the browser tab, which Android
kills the moment the screen locks or the tab is backgrounded. A server-sent
push wakes the phone regardless of whether the app is open.

**This version needs no Firebase billing plan at all.** Instead of a Cloud
Function on Cloud Scheduler (which requires the Blaze plan and, in India,
a ₹1000 prepaid deposit as Google's fraud check on a new billing account),
the "every few minutes, check the routine" job runs as a **free GitHub
Actions cron workflow** that talks to Firestore/FCM directly using a free
service account key. Same result, ₹0.

Everything below is meant to be run on your **laptop** in a terminal, and
in your GitHub repo's settings — not inside this chat.

---

## 0. What you need

- [Node.js](https://nodejs.org) 20 LTS (includes `npm`)
- Firebase CLI: `npm install -g firebase-tools`
- A Google account and a GitHub account (you already have both — this repo
  lives at `MrUnikSurya/SuryaReminder`)

## 1. Create the Firebase project (free Spark plan — no card needed)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → name it e.g. `surya-remind` → finish the wizard (skip Analytics).
2. **⚙️ Project settings** → **Your apps** → click the Web icon (`</>`) → register app (nickname: `surya-remind-web`). Copy the `firebaseConfig` object it shows you.
3. Still in Project settings → **Cloud Messaging** tab → **Web configuration** → **Generate key pair** → this is your `VAPID_KEY`.
4. **Build → Firestore Database** → **Create database** → production mode → region close to India (e.g. `asia-south1`) → Enable. (Firestore's free tier — 50K reads/20K writes per day — is far more than this app uses.)

Nothing above needs a billing card. Skip/ignore any "Upgrade to Blaze" prompt.

## 2. Generate a free service account key (for the GitHub Action)

Project settings → **Service accounts** tab → **Generate new private key** →
it downloads a `.json` file. This is free and doesn't touch billing — it's
just a credential that lets a script act as your Firebase project.

**Keep this file secret** — anyone with it can read/write your Firestore
and send pushes. Don't commit it to the repo.

## 3. Add it as a GitHub Actions secret

In your repo (`MrUnikSurya/SuryaReminder`) on github.com:
**Settings → Secrets and variables → Actions → New repository secret**
- Name: `FIREBASE_SERVICE_ACCOUNT_JSON`
- Value: paste the **entire contents** of the JSON file from Step 2

## 4. Fill in your config files

**`.firebaserc`** — your real project id:
```json
{ "projects": { "default": "surya-remind-xxxxx" } }
```

**`public/firebase-config.js`** — the `firebaseConfig` + `VAPID_KEY` from Step 1.

**`public/firebase-messaging-sw.js`** — paste the **same** `firebaseConfig`
values into the `firebase.initializeApp({...})` call near the top (service
workers can't import the other file, so it's duplicated — keep both in sync).

## 5. Push to GitHub and deploy Hosting

```bash
git add .
git commit -m "Rebuild as Firebase PWA with free GitHub Actions scheduler"
git push
firebase login
firebase deploy --only hosting,firestore
```

(No `--only functions` — there are none in this version.) It prints your
live URL, e.g. `https://surya-remind-xxxxx.web.app`.

Once you `git push`, the workflow in `.github/workflows/check-schedule.yml`
is live — check the **Actions** tab on GitHub to see it running every 5
minutes.

## 6. Install it on your phone

Open the URL in **Chrome on Android** → menu (⋮) → **Add to Home screen**.
Open it once from the home screen icon and tap **Enable** on the
notification banner — grant the permission when Android asks.

## 7. Confirm it's wired up correctly

- Firestore Console → `devices/main` should show a `token` field after you enable notifications.
- GitHub repo → **Actions** tab → the latest `Check schedule and send reminders` run → its log shows lines like `IST 18:05 — window (1080, 1085] — 1 due` and `Sent: 18:05 ...`.
- To test quickly without waiting: Actions tab → select the workflow → **Run workflow** button (this is the `workflow_dispatch` trigger) to fire it on demand.
- For an end-to-end test: temporarily edit one time in `public/scheduleData.js` (and the matching line in `scripts/scheduleData.js`) to ~5 minutes from now, `git push` + `firebase deploy --only hosting`, and wait for the next Action run.

## Notes on how it's built

- **No login/auth** — deliberately a single-user app. `firestore.rules`
  locks client writes to exactly two documents (`state/settings`,
  `devices/main`) with field validation. The GitHub Action uses admin
  credentials and bypasses these rules entirely (that's normal and expected
  for a trusted server-side script) — which is exactly why the service
  account JSON must stay secret.
- **Reliability trade-off vs. Cloud Functions**: GitHub Actions cron is
  "best effort" — it can occasionally run a few minutes late, or (rarely,
  if the repo goes fully idle) get throttled by GitHub. `checkSchedule.js`
  is written to tolerate this: it tracks the last time it ran in
  Firestore (`state/runlog`) and sends a push for anything due since then,
  so a late or slightly-delayed run doesn't lose a reminder. If this ever
  bothers you and you want to move to guaranteed-timely Cloud Functions
  later, that's a small, self-contained change — say the word.
- **Scenario A/B** is a manual toggle in Settings — it writes to Firestore
  so the scheduler script knows which routine to check against.
- **Editing the routine**: everything lives in `public/scheduleData.js`.
  If you change it, copy the same edits into `scripts/scheduleData.js`
  (the Node/CommonJS copy the GitHub Action reads) — the two must match.
- **Free hosting**: Firebase Hosting's free tier (10 GB storage, 360 MB/day
  transfer) comfortably covers a single-user app.
- **Custom reminders** (Settings → Custom reminders) write to a `reminders`
  Firestore collection and are picked up by the same GitHub Actions script —
  daily, specific weekdays, or one-time. A one-time reminder is a good way
  to test the *real* end-to-end push pipeline: set one for a couple minutes
  from now and see if it actually arrives (allow up to 5 min for the next
  Action run). One-time reminders delete themselves after firing.
- **Before Aug 18**: the Today tab shows a countdown + a preview of what a
  normal day will look like — no real routine pushes are sent yet, but
  custom reminders work immediately regardless of the launch date.
