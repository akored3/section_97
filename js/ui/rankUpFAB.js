// Rank-up FAB — floating action button prompting guests to sign up
import { getCurrentUser, onAuthStateChange } from '../auth/auth.js';

export async function initializeRankUpFAB() {
    const rankBtn = document.getElementById('rank-up-btn');
    const modal = document.getElementById('rankup-modal');
    const overlay = document.getElementById('rankup-overlay');
    const closeBtn = document.getElementById('rankup-close');
    if (!rankBtn || !modal) return;

    const user = await getCurrentUser();
    if (!user) {
        rankBtn.classList.remove('hidden');
    }

    function openModal() {
        modal.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeModal() {
        modal.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    rankBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);

    // Hide button when user logs in
    onAuthStateChange((event, session) => {
        if (session?.user) {
            rankBtn.classList.add('hidden');
            closeModal();
        } else {
            rankBtn.classList.remove('hidden');
        }
    });

    // Periodic vibrate on desktop to draw attention
    if (window.matchMedia('(hover: hover)').matches) {
        setInterval(() => {
            if (rankBtn.classList.contains('hidden')) return;
            rankBtn.classList.add('fab-vibrate');
            rankBtn.addEventListener('animationend', () => {
                rankBtn.classList.remove('fab-vibrate');
            }, { once: true });
        }, 6000);
    }

    // Collapse FAB while scrolling on touch devices
    if (window.matchMedia('(hover: none)').matches) {
        let scrollTimer;
        window.addEventListener('scroll', () => {
            rankBtn.classList.add('fab-collapsed');
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                rankBtn.classList.remove('fab-collapsed');
                rankBtn.classList.add('fab-vibrate');
                rankBtn.addEventListener('animationend', () => {
                    rankBtn.classList.remove('fab-vibrate');
                }, { once: true });
            }, 800);
        }, { passive: true });
    }
}
