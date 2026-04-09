// Global image error handler — replaces all inline onerror attributes
// Handles: placeholder fallback, avatar fallback reveal, hide on fail

document.addEventListener('error', function(e) {
    const img = e.target;
    if (img.tagName !== 'IMG') return;

    // Avatar images with a sibling fallback element (leaderboard + reviews)
    const fallback = img.nextElementSibling;
    if (fallback && (fallback.classList.contains('lb-avatar-fallback') || fallback.classList.contains('rv-avatar-fallback'))) {
        img.style.display = 'none';
        fallback.style.display = 'flex';
        return;
    }

    // Failed image — hide it
    img.style.display = 'none';
}, true);
