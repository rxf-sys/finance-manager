const CACHE_NAME = 'finance-manager-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/api.js',
    '/js/auth.js',
    '/js/dashboard.js',
    '/js/main.js',
    '/images/icon-192x192.png',
    '/images/icon-512x512.png',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Service Worker Installation
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Öffne Cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Service Worker Aktivierung und Cache-Bereinigung
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Lösche alten Cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Netzwerk-Anfragen abfangen
self.addEventListener('fetch', event => {
    // API-Anfragen nicht cachen
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(error => {
                    console.log('Fehler beim Abrufen der API-Daten, versuche Offline-Fallback', error);
                    return new Response(
                        JSON.stringify({
                            error: 'Du bist offline. Diese Daten können nur online abgerufen werden.'
                        }),
                        {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
        return;
    }

    // Cache-First-Strategie für statische Assets
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then(response => {
                        // Nur gültige Antworten zwischenspeichern
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Kopieren, da der Response-Body nur einmal gelesen werden kann
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(error => {
                        console.log('Offline: Fehler beim Abrufen', error);
                        // Für HTML-Seiten eine Offline-Seite anzeigen
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/offline.html');
                        }
                    });
            })
    );
});

// Periodische Synchronisierung für Daten-Updates
self.addEventListener('periodicsync', event => {
    if (event.tag === 'sync-transactions') {
        event.waitUntil(syncTransactions());
    }
});

// Hintergrund-Synchronisierung für Offline-Änderungen
self.addEventListener('sync', event => {
    if (event.tag === 'sync-pending-changes') {
        event.waitUntil(syncPendingChanges());
    }
});

// Push-Benachrichtigungen
self.addEventListener('push', event => {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/images/icon-192x192.png',
        badge: '/images/badge-72x72.png',
        data: {
            url: data.actionUrl
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Klick auf Benachrichtigung
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});

// Hilfsfunktionen für die Synchronisierung
async function syncTransactions() {
    // Implementiere die Logik zur Synchronisierung der Transaktionen
    console.log('Synchronisiere Transaktionen im Hintergrund');
}

async function syncPendingChanges() {
    // Implementiere die Logik zur Synchronisierung von Offline-Änderungen
    console.log('Synchronisiere ausstehende Änderungen');

    // Hole alle ausstehenden Änderungen aus IndexedDB
    const db = await openDatabase();
    const pendingChanges = await db.getAll('pendingChanges');

    // Sende jede Änderung an den Server
    for (const change of pendingChanges) {
        try {
            const response = await fetch(change.url, {
                method: change.method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getStoredToken()}`
                },
                body: JSON.stringify(change.data)
            });

            if (response.ok) {
                // Erfolgreich synchronisiert, lösche die Änderung
                await db.delete('pendingChanges', change.id);
            }
        } catch (error) {
            console.error('Fehler beim Synchronisieren:', error);
        }
    }
}

// Hilfsfunktionen für die Offline-Unterstützung
async function openDatabase() {
    // Vereinfachte IndexedDB-Wrapper-Funktion
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('financeManagerOfflineDB', 1);

        request.onupgradeneeded = event => {
            const db = event.target.result;
            db.createObjectStore('pendingChanges', { keyPath: 'id', autoIncrement: true });
            db.createObjectStore('offlineData', { keyPath: 'id' });
        };

        request.onsuccess = event => resolve({
            db: event.target.result,
            async getAll(storeName) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(storeName, 'readonly');
                    const store = transaction.objectStore(storeName);
                    const request = store.getAll();

                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            },
            async delete(storeName, key) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(storeName, 'readwrite');
                    const store = transaction.objectStore(storeName);
                    const request = store.delete(key);

                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }
        });

        request.onerror = () => reject(request.error);
    });
}

async function getStoredToken() {
    // Hole das gespeicherte Token aus dem Cache
    try {
        const cache = await caches.open('auth-cache');
        const response = await cache.match('/auth-token');
        if (response) {
            const data = await response.json();
            return data.token;
        }
    } catch (error) {
        console.error('Fehler beim Abrufen des Tokens:', error);
    }
    return null