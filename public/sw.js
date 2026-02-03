const CACHE_NAME = 'kp-stammtisch-v3'; // Updated for gallery restructure
const URLS_TO_CACHE = [
    '/',
    '/manifest.json',
    '/kanpai-icon.jpg',
    '/landing-icon.jpg',
    '/kanpai-logo.png',
    '/login',
    '/dashboard',
    '/cash',
    '/events',
    '/feedback',
    '/gallery',
    '/hall-of-fame',
    '/members',
    '/options',
    '/stats'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) return;

    // Network First Strategy for pages (try network, fall back to cache)
    // This ensures fresh content when online, but works without it.
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If valid response, clone and cache it
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request)
                    .then((response) => {
                        if (response) {
                            return response;
                        }
                        // If both fail, and it's a navigation request, could return a custom offline page
                        // For now, we rely on the cache.
                    });
            })
    );
});

// Listen for push events
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

// Handle notification click
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    if (event.notification.data?.url) {
        event.waitUntil(clients.openWindow(event.notification.data.url));
    }
});
