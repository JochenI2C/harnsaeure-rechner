/*
  Service Worker – sorgt dafür, dass der Harnsäure-Rechner auch ohne Internet startet.
  - HTML-Seiten: zuerst aus dem Netz (damit Updates sofort ankommen), sonst aus dem Speicher.
  - Icons, Manifest usw.: zuerst aus dem Speicher (schnell), sonst aus dem Netz.
  Bei jeder Änderung an den Dateien die VERSION hochzählen, dann wird der Speicher erneuert.
*/
var VERSION = "hr-v1";

var DATEIEN = [
  "./",
  "./index.html",
  "./harnsaeure-rechner.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

// Installation: alle Dateien in den Speicher legen
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (speicher) { return speicher.addAll(DATEIEN); })
      .then(function () { return self.skipWaiting(); })
  );
});

// Aktivierung: alte Speicherstände löschen
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (namen) {
        return Promise.all(namen.filter(function (n) { return n !== VERSION; })
          .map(function (n) { return caches.delete(n); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var anfrage = e.request;
  if (anfrage.method !== "GET" || new URL(anfrage.url).origin !== self.location.origin) return;

  // Seiten: Netz zuerst, bei Funkloch aus dem Speicher
  if (anfrage.mode === "navigate") {
    e.respondWith(
      fetch(anfrage)
        .then(function (antwort) {
          var kopie = antwort.clone();
          caches.open(VERSION).then(function (s) { s.put(anfrage, kopie); });
          return antwort;
        })
        .catch(function () {
          return caches.match(anfrage).then(function (treffer) {
            return treffer || caches.match("./harnsaeure-rechner.html");
          });
        })
    );
    return;
  }

  // Alles andere: Speicher zuerst
  e.respondWith(
    caches.match(anfrage).then(function (treffer) {
      return treffer || fetch(anfrage);
    })
  );
});
