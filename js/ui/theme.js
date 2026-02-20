// Handles dark/light theme toggle

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const svg = themeToggle.querySelector('svg');
    if (!svg) return;

    // Auth page uses 24x24 Feather icons; other pages use 64x64 blueprint
    const isAuthPage = themeToggle.classList.contains('theme-toggle');

    if (isAuthPage) {
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('stroke-width', '2');

        if (theme === 'dark') {
            svg.innerHTML = `
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            `;
        } else {
            svg.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
        }
    } else {
        svg.setAttribute('viewBox', '0 0 64 64');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        svg.setAttribute('stroke-width', '1.5');

        if (theme === 'dark') {
            svg.innerHTML = `
                <circle cx="32" cy="32" r="12"/>
                <line x1="32" y1="6" x2="32" y2="16"/>
                <line x1="32" y1="48" x2="32" y2="58"/>
                <line x1="6" y1="32" x2="16" y2="32"/>
                <line x1="48" y1="32" x2="58" y2="32"/>
                <line x1="14" y1="14" x2="20" y2="20"/>
                <line x1="44" y1="44" x2="50" y2="50"/>
                <line x1="14" y1="50" x2="20" y2="44"/>
                <line x1="44" y1="20" x2="50" y2="14"/>
                <circle cx="32" cy="32" r="6" stroke-width="0.6" stroke-dasharray="2 2" opacity="0.25"/>
            `;
        } else {
            svg.innerHTML = `
                <path d="M38 6C22 6 10 18 10 32C10 46 22 58 38 58C30 52 26 42 26 32C26 22 30 12 38 6Z"/>
                <circle cx="44" cy="16" r="1.5" stroke-width="0.9" opacity="0.4"/>
                <circle cx="50" cy="26" r="1" stroke-width="0.75" opacity="0.3"/>
            `;
        }
    }
}

export function initializeTheme() {
    const themeToggle = document.getElementById('theme-toggle');

    if (!themeToggle) return;

    // Check for saved theme or default to light
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    themeToggle.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const newTheme = theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}
