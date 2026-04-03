// Global image error handler — replaces all inline onerror attributes
// Handles: placeholder fallback, avatar fallback reveal, hide on fail

document.addEventListener('error', function(e) {
    const img = e.target;
    if (img.tagName !== 'IMG') return;

    // Avatar images with a sibling fallback element
    const fallback = img.nextElementSibling;
    if (fallback && fallback.classList.contains('lb-avatar-fallback')) {
        img.style.display = 'none';
        fallback.style.display = 'flex';
        return;
    }

    // Product images — swap to placeholder
    if (img.dataset.fallback !== 'done' && img.src.indexOf('placeholder.png') === -1) {
        img.dataset.fallback = 'done';
        img.src = 'images/placeholder.png';
        return;
    }

    // Everything else — just hide
    img.style.display = 'none';
}, true);
