// Landing page — hero slideshow + parallax, nav active state, scroll reveal.
// More sections (store, ranks, leaderboard, profile, cta) are static markup;
// they only need the .reveal class hook here.

import './imgFallback.js';

// ── Hero slideshow source data ──
const SLIDES = [
    { src: 'images/supreme_model2.jpeg',           brand: 'SUPREME',         name: 'Box Logo Hoodie — Red',  price: '₦185,000', tag: '// SUPREME · SS26 DROP' },
    { src: 'images/grey_nikeXcarhatt_model5.jpeg', brand: 'NIKE × CARHARTT', name: 'Double-Knee Workpant',   price: '₦155,000', tag: '// NIKE × CARHARTT COLLAB' },
    { src: 'images/supreme_model3.jpeg',           brand: 'SUPREME',         name: 'Skull Pile Tee — White', price: '₦72,000',  tag: '// SUPREME · LIMITED RUN' },
    { src: 'images/red_model.jpeg',                brand: 'CORTEIZ',         name: 'Alcatraz Hoodie — Red',  price: '₦210,000', tag: '// CORTEIZ · ALCATRAZ DROP' },
    { src: 'images/nike_model4.jpeg',              brand: 'NIKE',            name: 'Oversized Tee — Green',  price: '₦80,000',  tag: '// NIKE · STREETWEAR EDIT' },
];

const SLIDE_INTERVAL_MS = 4000;
const META_FADE_MS = 400;

function initHero() {
    const heroLeft = document.getElementById('lpHeroLeft');
    const stack = document.getElementById('lpImgStack');
    const dotsContainer = document.getElementById('lpDots');
    const meta = {
        brand:  document.getElementById('lpImgBrand'),
        name:   document.getElementById('lpImgName'),
        price:  document.getElementById('lpImgPrice'),
        corner: document.getElementById('lpImgCorner'),
    };
    if (!heroLeft || !stack || !dotsContainer) return;

    // Build slides + progress dots together so indexes always line up.
    SLIDES.forEach((s, i) => {
        const slide = document.createElement('div');
        slide.className = 'img-slide' + (i === 0 ? ' active' : '');
        const img = document.createElement('img');
        img.src = s.src;
        img.alt = `${s.brand} ${s.name}`;
        img.loading = i === 0 ? 'eager' : 'lazy';
        img.decoding = 'async';
        slide.appendChild(img);
        stack.appendChild(slide);

        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Show slide ${i + 1}: ${s.brand} ${s.name}`);
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i, true));
        dotsContainer.appendChild(dot);
    });

    const slides = stack.querySelectorAll('.img-slide');
    const dots = dotsContainer.querySelectorAll('button');
    let current = 0;
    let timer = null;

    function goToSlide(idx, fromUser = false) {
        const next = ((idx % SLIDES.length) + SLIDES.length) % SLIDES.length;
        if (next === current) return;
        slides[current].classList.remove('active');
        dots[current].classList.remove('active');
        current = next;
        slides[current].classList.add('active');
        dots[current].classList.add('active');

        // Fade meta out, swap text, fade back in.
        const els = [meta.brand, meta.name, meta.price, meta.corner];
        els.forEach((el) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(8px)';
        });
        setTimeout(() => {
            const s = SLIDES[current];
            meta.brand.textContent  = s.brand;
            meta.name.textContent   = s.name;
            meta.price.textContent  = s.price;
            meta.corner.textContent = s.tag;
            els.forEach((el) => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
        }, META_FADE_MS);

        if (fromUser) restartTimer();
    }

    function startTimer() { timer = setInterval(() => goToSlide(current + 1), SLIDE_INTERVAL_MS); }
    function stopTimer()  { if (timer) { clearInterval(timer); timer = null; } }
    function restartTimer() { stopTimer(); startTimer(); }

    heroLeft.addEventListener('mouseenter', stopTimer);
    heroLeft.addEventListener('mouseleave', startTimer);

    // Don't run the slideshow when the tab is backgrounded — saves CPU/battery.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopTimer();
        else startTimer();
    });

    startTimer();

    // Parallax on hero images — only on hover-capable, motion-allowing devices.
    const supportsHover = window.matchMedia('(hover: hover)').matches;
    const reduceMotion  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (supportsHover && !reduceMotion) {
        let ticking = false;
        function applyParallax() {
            const rect = heroLeft.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, -rect.top / (rect.height * 0.6)));
            const offset = -pct * 15;
            stack.querySelectorAll('img').forEach((img) => {
                img.style.transform = `translateY(${offset}%)`;
            });
            ticking = false;
        }
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(applyParallax);
                ticking = true;
            }
        }, { passive: true });
    }
}

function initNavObserver() {
    const navLinks = document.querySelectorAll('.lp-nav-link');
    const sections = document.querySelectorAll('main section[id]');
    if (!navLinks.length || !sections.length) return;

    const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            navLinks.forEach((link) => {
                link.classList.toggle('active', link.getAttribute('href') === '#' + id);
            });
        });
    }, { threshold: 0.4 });
    sections.forEach((s) => obs.observe(s));
}

function initScrollReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });
    els.forEach((el) => obs.observe(el));
}

initHero();
initNavObserver();
initScrollReveal();
