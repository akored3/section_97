// Session idle timeout — logs out after 30 minutes of inactivity
import { signOut } from './auth.js';

export function initializeIdleTimeout(isLoggedInFn, onTimeout) {
    const IDLE_LIMIT = 30 * 60 * 1000; // 30 minutes
    let idleTimer;

    function resetTimer() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(async () => {
            if (isLoggedInFn()) {
                await signOut();
                if (onTimeout) onTimeout();
                window.location.href = 'auth.html';
            }
        }, IDLE_LIMIT);
    }

    ['click', 'keydown', 'mousemove', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();
}
