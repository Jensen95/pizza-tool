/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
	return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus(): NotificationPermission | 'unsupported' {
	if (!isNotificationSupported()) return 'unsupported';
	return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
	if (!isNotificationSupported()) return 'unsupported';

	if (Notification.permission === 'granted') {
		return 'granted';
	}

	if (Notification.permission === 'denied') {
		return 'denied';
	}

	try {
		const permission = await Notification.requestPermission();
		return permission;
	} catch {
		return 'denied';
	}
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
	return getPermissionStatus() === 'granted';
}

interface NotificationOptions {
	body?: string;
	icon?: string;
	badge?: string;
	tag?: string;
	requireInteraction?: boolean;
	silent?: boolean;
	vibrate?: number[];
	data?: Record<string, unknown>;
}

/**
 * Send a notification
 */
export async function sendNotification(
	title: string,
	options: NotificationOptions = {}
): Promise<boolean> {
	if (!isNotificationSupported()) return false;

	const permission = await requestPermission();
	if (permission !== 'granted') return false;

	try {
		// Try to use service worker notification if available
		if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
			const registration = await navigator.serviceWorker.ready;
			// Cast to include vibrate which is supported but not in TS definitions
			await registration.showNotification(title, {
				body: options.body,
				icon: options.icon || '/icons/icon.svg',
				badge: options.badge || '/icons/icon.svg',
				tag: options.tag,
				requireInteraction: options.requireInteraction ?? true,
				silent: options.silent,
				data: options.data,
				vibrate: options.vibrate || [200, 100, 200]
			} as globalThis.NotificationOptions & { vibrate?: number[] });
			return true;
		}

		// Fallback to regular notification
		const notification = new Notification(title, {
			body: options.body,
			icon: options.icon || '/icons/icon.svg',
			tag: options.tag,
			requireInteraction: options.requireInteraction,
			silent: options.silent
		});

		// Handle notification click
		notification.onclick = () => {
			window.focus();
			notification.close();
		};

		return true;
	} catch (error) {
		console.error('Failed to send notification:', error);
		return false;
	}
}

/**
 * Send a timer completion notification
 */
export async function sendTimerNotification(timerName: string, timerId: string): Promise<boolean> {
	return sendNotification('Timer faerdig!', {
		body: `${timerName} er faerdig`,
		tag: `timer-${timerId}`,
		requireInteraction: true,
		vibrate: [200, 100, 200, 100, 200],
		data: {
			type: 'timer',
			timerId,
			url: '/timers'
		}
	});
}
