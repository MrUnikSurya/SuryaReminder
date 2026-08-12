/* eslint-disable no-undef */
// ONE service worker, doing two jobs: FCM push handling + offline caching.
//
// This file used to be paired with a separate public/sw.js registered at
// the same "/" scope for offline caching. Two service workers at the same
// scope is unsupported — only one can be "the" active worker for that
// scope, so the second registration could silently replace the one that
// knew how to display a push notification. Merging both jobs into this
// single file removes that whole class of bug.
//
// This file MUST be named firebase-messaging-sw.js and live at the site
// root — that's the default path the FCM SDK expects.

importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

// Service workers can't use ES module imports, so the config is duplicated
// here in plain form. Keep this in sync with firebase-config.js.
firebase.initializeApp({
  apiKey: "AIzaSyCZZFIRBzE9PZs6esW_USehsqNc9dCewxI",
  authDomain: "suryaremind.firebaseapp.com",
  projectId: "suryaremind",
  storageBucket: "suryaremind.firebasestorage.app",
  messagingSenderId: "723743011037",
  appId: "1:723743011037:web:dd9405103bd4554633eb34",
  measurementId: "G-25BNX6Y89W"
});

const messaging = firebase.messaging();

// ── Push notifications ──────────────────────────────────────────────────
// Fires when a push arrives while the app is closed / backgrounded.
// (Foreground pushes are handled in app.js via onMessage, also routed
// through this same worker's showNotification — see app.js.)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const icon = "/icons/icon-192.png";
  self.registration.showNotification(title || "Surya Remind", {
    body: body || "",
    icon,
    badge: icon,
    tag: "surya-remind-" + Date.now(), // unique tag so rapid reminders don't collapse into one
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});

// ── Offline caching (previously public/sw.js) ───────────────────────────
const CACHE = "surya-remind-v2";
const ASSETS = [
  "/", "/index.html", "/styles.css", "/app.js",
  "/scheduleData.js", "/firebase-config.js", "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
            return res;
          })
          .catch(() => cached)
    )
  );
});
