// Enhanced lazy loading with Intersection Observer and fade-in animations

export function initializeLazyLoading() {
    // Check for IntersectionObserver support
    if (!('IntersectionObserver' in window)) {
        // Fallback: load all images immediately
        loadAllImages();
        return;
    }

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                loadImage(img);
                observer.unobserve(img);
            }
        });
    }, {
        // Start loading 100px before image enters viewport
        rootMargin: '100px 0px',
        threshold: 0.01
    });

    // Observe all images with lazy-load class
    const lazyImages = document.querySelectorAll('img.lazy-load');
    lazyImages.forEach(img => imageObserver.observe(img));
}

function loadImage(img) {
    const src = img.dataset.src;
    if (!src) return;

    // Create a new image to preload
    const tempImg = new Image();

    tempImg.onload = () => {
        // Once loaded, swap the src and add loaded class for fade-in
        img.src = src;
        img.classList.add('loaded');
        img.classList.remove('lazy-load');
    };

    tempImg.onerror = () => {
        // Fallback to placeholder on error
        img.src = 'images/placeholder.png';
        img.classList.add('loaded');
        img.classList.remove('lazy-load');
    };

    // Start loading
    tempImg.src = src;
}

function loadAllImages() {
    // Fallback for browsers without IntersectionObserver
    const lazyImages = document.querySelectorAll('img.lazy-load');
    lazyImages.forEach(img => {
        if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.remove('lazy-load');
        }
    });
}
