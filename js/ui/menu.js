// Handles mobile hamburger menu functionality

export function initializeMenu() {
    const hamburgerToggle = document.getElementById('hamburger-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMenuBtn = document.getElementById('close-menu');

    function openMenu() {
        mobileMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
    }

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
}
