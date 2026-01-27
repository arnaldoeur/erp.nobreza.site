const CACHE_NAME = 'nobreza-erp-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/index.css',
    '/favicon.png',
    '/nobreza_erp_logo_white_horizontal.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
