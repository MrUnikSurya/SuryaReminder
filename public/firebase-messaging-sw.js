/* eslint-disable no-undef */

importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyCZZFIRBzE9PZs6esW_USehsqNc9dCewxI",
  authDomain: "suryaremind.firebaseapp.com",
  projectId: "suryaremind",
  storageBucket: "suryaremind.firebasestorage.app",
  messagingSenderId: "723743011037",
  appId: "1:723743011037:web:dd9405103bd4554633eb34",
  measurementId: "G-25BNX6Y89W"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};

  const icon = "/icons/icon-192.png";

  self.registration.showNotification(title || "Surya Remind", {
    body: body || "",
    icon,
    badge: icon,
    tag: "surya-remind"
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }

      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});
