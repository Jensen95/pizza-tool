const CACHE_NAME = 'pizza-tool-v1';
const STATIC_ASSETS = [
	'/',
	'/manifest.json',
	'/icons/icon-192.png',
	'/icons/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(STATIC_ASSETS);
		})
	);
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((cacheName) => cacheName !== CACHE_NAME)
					.map((cacheName) => caches.delete(cacheName))
			);
		})
	);
	self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
	// Skip non-GET requests
	if (event.request.method !== 'GET') return;

	// Skip chrome-extension and other non-http requests
	if (!event.request.url.startsWith('http')) return;

	event.respondWith(
		caches.match(event.request).then((cachedResponse) => {
			if (cachedResponse) {
				// Return cached response and update cache in background
				event.waitUntil(
					fetch(event.request).then((response) => {
						if (response && response.status === 200) {
							const responseClone = response.clone();
							caches.open(CACHE_NAME).then((cache) => {
								cache.put(event.request, responseClone);
							});
						}
					}).catch(() => {
						// Network request failed, cached response is still good
					})
				);
				return cachedResponse;
			}

			// No cache, try network
			return fetch(event.request).then((response) => {
				// Don't cache non-successful responses
				if (!response || response.status !== 200 || response.type !== 'basic') {
					return response;
				}

				// Clone and cache the response
				const responseClone = response.clone();
				caches.open(CACHE_NAME).then((cache) => {
					cache.put(event.request, responseClone);
				});

				return response;
			}).catch(() => {
				// Network failed and no cache - return offline page if available
				return caches.match('/');
			});
		})
	);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(
		clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			// Focus existing window or open new one
			for (const client of clientList) {
				if ('focus' in client) {
					return client.focus();
				}
			}
			if (clients.openWindow) {
				return clients.openWindow('/timers');
			}
		})
	);
});

// Handle push notifications
self.addEventListener('push', (event) => {
	const data = event.data?.json() ?? { title: 'Timer', body: 'Din timer er faerdig!' };

	const options = {
		body: data.body,
		icon: '/icons/icon-192.png',
		badge: '/icons/icon-72.png',
		vibrate: [200, 100, 200],
		tag: data.tag || 'timer-notification',
		requireInteraction: true,
		data: {
			url: data.url || '/timers'
		}
	};

	event.waitUntil(
		self.registration.showNotification(data.title, options)
	);
});
