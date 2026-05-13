self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
    // Basic passthrough, we don't cache locally for this desktop app
    // since the server is running on localhost anyway.
    e.respondWith(fetch(e.request));
});
