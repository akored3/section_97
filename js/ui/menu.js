// Handles mobile hamburger menu functionality

export function initializeMenu() {
    const hamburgerToggle = document.getElementById('hamburger-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMenuBtn = document.getElementById('close-menu');

    function openMenu() {
        mobileMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
        if (hamburgerToggle) hamburgerToggle.setAttribute('aria-expanded', 'true');
        // Focus the close button (or first focusable) when menu opens
        const firstFocusable = mobileMenu.querySelector('button, a, [tabindex="0"]');
        if (firstFocusable) firstFocusable.focus();
    }

    function closeMenu() {
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
        if (hamburgerToggle) {
            hamburgerToggle.setAttribute('aria-expanded', 'false');
            hamburgerToggle.focus();
        }
    }

    // Set initial aria-expanded
    if (hamburgerToggle) hamburgerToggle.setAttribute('aria-expanded', 'false');

    if (hamburgerToggle && mobileMenu) {
        hamburgerToggle.addEventListener('click', function() {
            if (mobileMenu.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
    }

    if (closeMenuBtn && mobileMenu) {
        closeMenuBtn.addEventListener('click', closeMenu);
    }

    // Close menu when clicking outside
    if (mobileMenu) {
        mobileMenu.addEventListener('click', function(e) {
            if (e.target === mobileMenu) {
                closeMenu();
            }
        });
    }

    // Close menu on Escape key + focus trap
    document.addEventListener('keydown', (e) => {
        if (!mobileMenu?.classList.contains('active')) return;

        if (e.key === 'Escape') {
            closeMenu();
            return;
        }

        // Focus trap: cycle Tab within the menu
        if (e.key === 'Tab') {
            const focusable = mobileMenu.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]');
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    // Close menu when a mobile filter button is clicked
    const mobileFilters = document.querySelectorAll('.mobile-filter');
    mobileFilters.forEach(btn => {
        btn.addEventListener('click', () => {
            setTimeout(closeMenu, 150);
        });
    });
}
