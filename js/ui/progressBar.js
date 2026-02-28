// HUD progress bar animation driver
// Animates .s97-progress bars within a given container element.
// Fills to ~85% over DURATION, then waits for completeS97Progress() to hit 100%.

const DURATION = 3000; // ms to reach ~85%

/**
 * Start animating a progress bar inside the given container.
 * Returns a controller object with a complete() method.
 */
export function startS97Progress(container) {
    const progress = container.querySelector('.s97-progress');
    if (!progress) return { complete() {} };

    const fill = progress.querySelector('.s97-progress__fill');
    const percent = progress.querySelector('.s97-progress__percent');
    const state = progress.querySelector('.s97-progress__state');
    const ticks = progress.querySelectorAll('.s97-progress__tick');
    const indicators = progress.querySelectorAll('.s97-progress__indicator');

    let cancelled = false;
    const start = performance.now();

    function updateBar(pct) {
        const rounded = Math.round(pct);
        fill.style.width = pct + '%';
        percent.textContent = rounded + '%';

        ticks.forEach(tick => {
            const val = parseInt(tick.dataset.tick, 10);
            const mark = tick.querySelector('.s97-progress__tick-mark');
            const label = tick.querySelector('.s97-progress__tick-label');
            mark.classList.toggle('active', pct >= val);
            label.classList.toggle('active', pct >= val);
        });

        indicators.forEach(ind => {
            const at = parseInt(ind.dataset.at, 10);
            const dot = ind.querySelector('.s97-progress__indicator-dot');
            const label = ind.querySelector('.s97-progress__indicator-label');
            dot.classList.toggle('active', pct >= at);
            label.classList.toggle('active', pct >= at);
        });

        if (pct >= 100) {
            state.textContent = 'COMPLETE';
            state.classList.add('complete');
        } else {
            state.textContent = 'LOADING';
            state.classList.remove('complete');
        }
    }

    // Animate to ~85% using easeOut curve
    function animate(now) {
        if (cancelled) return;
        const elapsed = now - start;
        // Ease out to 85% max — content load will push to 100%
        const raw = Math.min((elapsed / DURATION), 1);
        const eased = 1 - Math.pow(1 - raw, 3); // cubic ease-out
        const pct = eased * 85;
        updateBar(pct);

        if (raw < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);

    return {
        complete() {
            cancelled = true;
            // Animate from current to 100%
            updateBar(100);
        }
    };
}

/**
 * Auto-start progress bars that are visible on page load.
 * Called from each page's main script after DOM is ready.
 */
export function initPageLoader(loaderId) {
    const container = document.getElementById(loaderId);
    if (!container || container.classList.contains('hidden')) return null;
    return startS97Progress(container);
}
