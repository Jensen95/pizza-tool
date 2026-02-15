type ScreenWakeLock = {
	released: boolean;
	release: () => Promise<void>;
	addEventListener: (type: 'release', listener: () => void) => void;
	removeEventListener: (type: 'release', listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
	wakeLock?: {
		request: (type: 'screen') => Promise<ScreenWakeLock>;
	};
};

let wakeLock: ScreenWakeLock | null = null;
let shouldHoldWakeLock = false;
let releaseListener: (() => void) | null = null;

function getWakeLockApi() {
	if (typeof navigator === 'undefined') return null;
	const nav = navigator as WakeLockNavigator;
	return nav.wakeLock ?? null;
}

export function isWakeLockSupported(): boolean {
	return typeof document !== 'undefined' && getWakeLockApi() !== null;
}

function detachReleaseListener() {
	if (wakeLock && releaseListener) {
		wakeLock.removeEventListener('release', releaseListener);
		releaseListener = null;
	}
}

async function requestWakeLock(): Promise<boolean> {
	if (!shouldHoldWakeLock) return false;
	const api = getWakeLockApi();

	if (!api || typeof document === 'undefined') return false;
	if (document.visibilityState !== 'visible') return false;
	if (wakeLock) return true;

	try {
		const sentinel = await api.request('screen');
		wakeLock = sentinel;
		releaseListener = () => {
			detachReleaseListener();
			wakeLock = null;

			if (shouldHoldWakeLock && document.visibilityState === 'visible') {
				void requestWakeLock();
			}
		};
		sentinel.addEventListener('release', releaseListener);
		return true;
	} catch {
		wakeLock = null;
		releaseListener = null;
		return false;
	}
}

export async function releaseWakeLock(): Promise<void> {
	detachReleaseListener();

	if (!wakeLock) return;

	try {
		await wakeLock.release();
	} catch {
		// Ignore release errors
	} finally {
		wakeLock = null;
	}
}

export async function syncWakeLock(keepAwake: boolean): Promise<boolean> {
	shouldHoldWakeLock = keepAwake;

	if (keepAwake) {
		return await requestWakeLock();
	}

	await releaseWakeLock();
	return false;
}

export function setupWakeLockVisibilityHandler(): () => void {
	if (typeof document === 'undefined') return () => {};

	const onVisibilityChange = () => {
		if (shouldHoldWakeLock) {
			void requestWakeLock();
		}
	};

	document.addEventListener('visibilitychange', onVisibilityChange);

	return () => {
		document.removeEventListener('visibilitychange', onVisibilityChange);
	};
}
