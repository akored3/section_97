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
    // Gate the initial-hidden state on JS so .reveal content stays visible
    // if anything in this module fails before observing.
    document.documentElement.classList.add('lp-js');
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

function initMobileDrawer() {
    const btn = document.getElementById('lpHamburger');
    const drawer = document.getElementById('lpDrawer');
    const scrim = document.getElementById('lpScrim');
    if (!btn || !drawer || !scrim) return;

    function setOpen(open) {
        drawer.classList.toggle('open', open);
        scrim.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', String(open));
        drawer.setAttribute('aria-hidden', String(!open));
        scrim.toggleAttribute('hidden', !open);
        document.body.style.overflow = open ? 'hidden' : '';
    }

    btn.addEventListener('click', () => setOpen(!drawer.classList.contains('open')));
    scrim.addEventListener('click', () => setOpen(false));
    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('open')) setOpen(false);
    });
}

// ── Rank timeline data ──
// Marketing display values per design handoff. NOT the same as the in-game
// XP scale in js/data/ranks.js (handoff shows 25x scale: 50 XP = ₦50K spent).
// Names + colors match RANK_DATA exactly. Revisit if we want to align them.
const LP_RANKS = [
    { tier: 1,  name: 'NEWBIE',         color: '#4a9eff', xp: '0',      chevs: 1, desc: 'Your first step. Just joined the community.' },
    { tier: 2,  name: 'FIT_ROOKIE',     color: '#22c55e', xp: '50',     chevs: 1, desc: 'Getting started. A few purchases in.' },
    { tier: 3,  name: 'STREET_STYLER',  color: '#cd7f32', xp: '125',    chevs: 2, desc: "You know what you're doing. Regulars know your name." },
    { tier: 4,  name: 'NEON_DRIPPER',   color: '#e86e2a', xp: '250',    chevs: 2, desc: "Neon-lit and dripping. Can't be ignored." },
    { tier: 5,  name: 'FIT_COMMANDER',  color: '#b0b0b0', xp: '450',    chevs: 3, desc: 'You command the fit. Others take notes.' },
    { tier: 6,  name: 'CYBER_SWAGLORD', color: '#a78bfa', xp: '750',    chevs: 3, desc: 'Full cyber mode. The board watches you.' },
    { tier: 7,  name: 'DRIP_ARCHITECT', color: '#ffd700', xp: '1.2K',   chevs: 4, desc: 'You design the wave others ride.' },
    { tier: 8,  name: 'OUTFIT_WARLORD', color: '#ff6b35', xp: '1.8K',   chevs: 4, desc: 'No negotiation. The fits speak for themselves.' },
    { tier: 9,  name: 'FITBOSS_2099',   color: '#b9f2ff', xp: '2.6K',   chevs: 5, desc: 'Two steps from the top. Legendary status near.' },
    { tier: 10, name: 'GODOFDRIP.EXE',  color: '#ff44cc', xp: '5.25K+', chevs: 5, desc: 'You are the leaderboard. Permanent top-tier.' },
];

function initRankPath() {
    const root = document.getElementById('lpRankPath');
    if (!root) return;
    root.innerHTML = LP_RANKS.map((r) => `
        <li class="rp-row" style="--rcolor: ${r.color}">
            <div class="rp-dot"><span class="rp-dot-inner"></span></div>
            <div class="rp-info">
                <span class="rp-tier">T-${String(r.tier).padStart(2, '0')}</span>
                <span class="rp-name" style="color: ${r.color}">${r.name}</span>
                <span class="rp-desc">${r.desc}</span>
            </div>
            <div class="rp-right">
                <div class="rp-xp">${r.xp} XP</div>
                <div class="rp-chevs">${'▶'.repeat(r.chevs)}</div>
            </div>
        </li>
    `).join('');
}

// Reveals first so JS-gated CSS applies before paint.
initScrollReveal();
initHero();
initNavObserver();
initMobileDrawer();
initRankPath();
