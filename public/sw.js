importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyCFa09-8DVF8o2OQssr15lZJ-aCIvh21HM",
    authDomain: "webapp-stammtisch.firebaseapp.com",
    projectId: "webapp-stammtisch",
    storageBucket: "webapp-stammtisch.firebasestorage.app",
    messagingSenderId: "112239637478",
    appId: "1:112239637478:web:78a18a3671f33605801c27",
    measurementId: "G-HGCS3PGQDY"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// ============================================
// CACHING STRATEGY
// ============================================
// v8: Nuclear reset — clear ALL old caches, only cache static assets,
// NEVER cache page HTML (navigation requests).
const CACHE_NAME = 'kp-v8';
const STATIC_ASSETS = [
    '/manifest.json',
    '/kanpai-icon.jpg',
    '/landing-icon.jpg',
    '/kanpai-logo.png',
];

// ============================================
// INSTALL — cache static assets only, skip waiting immediately
// ============================================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ============================================
// ACTIVATE — delete ALL old caches, claim clients immediately
// ============================================
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
            ))
            .then(() => self.clients.claim())
    );
});

// ============================================
// FETCH — network only for pages, network-first for assets
// ============================================
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    // HTML page navigations: ALWAYS network, NEVER cache
    if (event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request));
        return;
    }

    // Static assets (_next/static, images, etc.): network first, cache fallback
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================
self.addEventListener('push', function (event) {
    const data = event.data?.json() ?? {};
    const title = data.title || 'Stammtisch Benachrichtigung';
    const options = {
        body: data.body || '',
        icon: '/kanpai-logo.png',
        badge: '/kanpai-logo.png',
        data: data.url ? { url: data.url } : undefined
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    if (event.notification.data?.url) {
        event.waitUntil(clients.openWindow(event.notification.data.url));
    }
});
