/* Carousel — arrow-button navigation for all [data-carousel] wrappers */
(function () {
    'use strict';

    function initCarousel(wrap) {
        var track = wrap.querySelector('[data-carousel-track]');
        var prevBtn = wrap.querySelector('[data-carousel-prev]');
        var nextBtn = wrap.querySelector('[data-carousel-next]');
        if (!track) return;

        function cardWidth() {
            var card = track.querySelector('.carousel-card, .album-card');
            if (!card) return 200;
            var style = window.getComputedStyle(track);
            var gap = parseFloat(style.columnGap || style.gap) || 16;
            return card.offsetWidth + gap;
        }

        function scrollBy(dir) {
            var amount = cardWidth() * 3;
            track.scrollBy({ left: dir * amount, behavior: 'smooth' });
        }

        function updateButtons() {
            var atStart = track.scrollLeft <= 2;
            var atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
            if (prevBtn) prevBtn.disabled = atStart;
            if (nextBtn) nextBtn.disabled = atEnd;
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function () { scrollBy(-1); });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function () { scrollBy(1); });
        }

        track.addEventListener('scroll', updateButtons, { passive: true });

        /* Update on resize */
        if (window.ResizeObserver) {
            new ResizeObserver(updateButtons).observe(track);
        } else {
            window.addEventListener('resize', updateButtons);
        }

        /* Touch / pointer drag — wait for movement so card links stay clickable */
        var startX = 0, startScroll = 0, isDragging = false, didDrag = false;

        function endDrag(e) {
            isDragging = false;
            if (didDrag && e && track.hasPointerCapture(e.pointerId)) {
                track.releasePointerCapture(e.pointerId);
            }
            didDrag = false;
            track.style.scrollSnapType = '';
            track.style.cursor = '';
            updateButtons();
        }

        track.addEventListener('pointerdown', function (e) {
            if (e.button !== 0) return;
            isDragging = true;
            didDrag = false;
            startX = e.clientX;
            startScroll = track.scrollLeft;
        });

        track.addEventListener('pointermove', function (e) {
            if (!isDragging) return;
            var delta = e.clientX - startX;
            if (!didDrag && Math.abs(delta) > 8) {
                didDrag = true;
                track.setPointerCapture(e.pointerId);
                track.style.scrollSnapType = 'none';
                track.style.cursor = 'grabbing';
            }
            if (didDrag) {
                e.preventDefault();
                track.scrollLeft = startScroll - delta;
            }
        });

        track.addEventListener('pointerup', endDrag);
        track.addEventListener('pointercancel', endDrag);

        updateButtons();
    }

    function init() {
        document.querySelectorAll('[data-carousel]').forEach(initCarousel);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
