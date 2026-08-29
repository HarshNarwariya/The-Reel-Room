/* Android TV / D-pad spatial navigation for Hyakutake */
(function () {
    "use strict";

    var FOCUSABLE =
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    var KEY_ACTION = {
        19: "up",
        38: "up",
        20: "down",
        40: "down",
        21: "left",
        37: "left",
        22: "right",
        39: "right",
        23: "select",
        13: "select",
        66: "select",
        4: "back",
        27: "back",
        461: "back",
        10009: "back",
    };

    var active = false;
    var tvMode = false;

    function detectTV() {
        var ua = navigator.userAgent || "";
        if (/Android TV|AFT[A-Z]|GoogleTV|CrKey|Tizen|Web0S|SmartTV|BRAVIA|HbbTV/i.test(ua)) {
            return true;
        }
        try {
            return window.matchMedia("(pointer: coarse) and (hover: none)").matches;
        } catch (err) {
            return false;
        }
    }

    function isEditable(el) {
        if (!el) return false;
        var tag = el.tagName;
        return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    }

    function isVisible(el) {
        if (!el || !el.isConnected) return false;
        if (el.disabled || el.getAttribute("aria-disabled") === "true") return false;
        if (el.tabIndex === -1 && !el.matches("a[href], button")) return false;

        var style = window.getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") return false;

        var rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function isFocusable(el) {
        if (!isVisible(el)) return false;
        if (el.matches(FOCUSABLE)) return true;
        return el.tabIndex >= 0;
    }

    function getFocusables(root) {
        var scope = root || document;
        return Array.prototype.filter.call(scope.querySelectorAll(FOCUSABLE), isFocusable);
    }

    function rectCenter(rect) {
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };
    }

    function sameRowGroup(a, b) {
        var rowSelectors = [
            "[data-dpad-row]",
            ".nav-links",
            ".pagination",
            ".browse-filter-bar",
            ".tabs",
            ".hero-actions",
            ".carousel-nav-btns",
            ".player-nav-row",
            ".playback-mode",
            ".search-hero",
        ];

        for (var i = 0; i < rowSelectors.length; i++) {
            var sel = rowSelectors[i];
            var rowA = a.closest(sel);
            var rowB = b.closest(sel);
            if (rowA && rowB && rowA === rowB) return true;
        }
        return false;
    }

    function sameCarouselTrack(a, b) {
        var trackA = a.closest("[data-carousel-track]");
        var trackB = b.closest("[data-carousel-track]");
        return trackA && trackB && trackA === trackB;
    }

    function sameGrid(a, b) {
        var gridSelectors = [".media-grid", ".shelf-grid", ".ledger", "[data-dpad-grid]"];
        for (var i = 0; i < gridSelectors.length; i++) {
            var sel = gridSelectors[i];
            var gridA = a.closest(sel);
            var gridB = b.closest(sel);
            if (gridA && gridB && gridA === gridB) return true;
        }
        return false;
    }

    function directionAllowed(current, candidate, direction) {
        if (direction === "left" || direction === "right") {
            if (sameCarouselTrack(current, candidate)) return true;
            if (sameRowGroup(current, candidate)) return true;
        }
        if (direction === "up" || direction === "down") {
            if (sameGrid(current, candidate)) return true;
        }
        return true;
    }

    function findNext(current, direction) {
        var currentRect = current.getBoundingClientRect();
        var currentCenter = rectCenter(currentRect);
        var candidates = getFocusables().filter(function (el) {
            return el !== current;
        });

        var best = null;
        var bestScore = Infinity;
        var edge = 2;

        candidates.forEach(function (el) {
            var rect = el.getBoundingClientRect();
            var center = rectCenter(rect);
            var dx = center.x - currentCenter.x;
            var dy = center.y - currentCenter.y;

            if (direction === "left" && dx >= -edge) return;
            if (direction === "right" && dx <= edge) return;
            if (direction === "up" && dy >= -edge) return;
            if (direction === "down" && dy <= edge) return;

            if (!directionAllowed(current, el, direction)) return;

            var primary;
            var secondary;
            if (direction === "left" || direction === "right") {
                primary = Math.abs(dx);
                secondary = Math.abs(dy);
            } else {
                primary = Math.abs(dy);
                secondary = Math.abs(dx);
            }

            var groupBonus = 0;
            if (sameCarouselTrack(current, el) && (direction === "left" || direction === "right")) {
                groupBonus = -120;
            }
            if (sameRowGroup(current, el) && (direction === "left" || direction === "right")) {
                groupBonus = -80;
            }
            if (sameGrid(current, el) && (direction === "up" || direction === "down")) {
                groupBonus = -60;
            }

            var score = primary + secondary * 2.4 + groupBonus;
            if (score < bestScore) {
                bestScore = score;
                best = el;
            }
        });

        return best;
    }

    function scrollIntoViewSoft(el) {
        if (!el) return;

        var carouselTrack = el.closest("[data-carousel-track]");
        if (carouselTrack) {
            var trackRect = carouselTrack.getBoundingClientRect();
            var elRect = el.getBoundingClientRect();
            if (elRect.left < trackRect.left + 8) {
                carouselTrack.scrollLeft -= trackRect.left - elRect.left + 16;
            } else if (elRect.right > trackRect.right - 8) {
                carouselTrack.scrollLeft += elRect.right - trackRect.right + 16;
            }
        }

        var horizontalRow = el.closest(
            ".browse-filter-bar, .tabs, .nav-links, .pagination, .carousel-nav-btns"
        );
        if (horizontalRow && horizontalRow.scrollWidth > horizontalRow.clientWidth) {
            var rowRect = horizontalRow.getBoundingClientRect();
            var itemRect = el.getBoundingClientRect();
            if (itemRect.left < rowRect.left + 8) {
                horizontalRow.scrollLeft -= rowRect.left - itemRect.left + 16;
            } else if (itemRect.right > rowRect.right - 8) {
                horizontalRow.scrollLeft += itemRect.right - rowRect.right + 16;
            }
        }

        try {
            el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        } catch (err) {
            el.scrollIntoView(false);
        }
    }

    function setFocus(el) {
        if (!el) return;
        el.focus({ preventScroll: true });
        scrollIntoViewSoft(el);
        document.body.classList.add("dpad-active");
    }

    function getInitialFocusTarget() {
        var heroPrimary = document.querySelector(".hero-btn-primary");
        if (heroPrimary && isFocusable(heroPrimary)) return heroPrimary;

        var main = document.querySelector("main.container");
        if (!main) return null;

        var preferred = main.querySelector(
            ".hero-btn-primary, .carousel-card, .album-card, .media-card, .browse-filter-pill.active, .tab-stub.active, .back-btn"
        );
        if (preferred && isFocusable(preferred)) return preferred;

        var focusables = getFocusables(main);
        return focusables.length ? focusables[0] : null;
    }

    function focusInitial() {
        if (document.activeElement && document.activeElement !== document.body) return;
        var target = getInitialFocusTarget();
        if (target) setFocus(target);
    }

    function shouldIgnoreKeyEvent(e) {
        if (e.altKey || e.ctrlKey || e.metaKey) return true;
        if (isEditable(document.activeElement)) return true;

        var player = document.getElementById("player-container");
        if (player) {
            var active = document.activeElement;
            if (
                active &&
                (active.closest(".plyr") ||
                    active.id === "media-element" ||
                    active.closest(".plyr__controls"))
            ) {
                return true;
            }
        }

        return false;
    }

    function activateFocused() {
        var el = document.activeElement;
        if (!el || el === document.body) return;

        if (el.tagName === "A" || el.tagName === "BUTTON") {
            el.click();
            return;
        }

        if (el.tagName === "INPUT" && (el.type === "checkbox" || el.type === "radio")) {
            el.click();
        }
    }

    function handleBack() {
        if (window.history.length > 1) {
            window.history.back();
            return;
        }
        window.location.href = "/";
    }

    function keyAction(e) {
        if (e.key === "ArrowUp") return "up";
        if (e.key === "ArrowDown") return "down";
        if (e.key === "ArrowLeft") return "left";
        if (e.key === "ArrowRight") return "right";
        if (e.key === "Enter" || e.key === " ") return "select";
        if (e.key === "Escape" || e.key === "GoBack") return "back";
        return KEY_ACTION[e.keyCode] || null;
    }

    function onKeyDown(e) {
        var action = keyAction(e);
        if (!action) return;

        if (action === "up" || action === "down" || action === "left" || action === "right") {
            active = true;
            document.body.classList.add("dpad-active");
            if (tvMode) document.body.classList.add("tv-mode");
        }

        if (!active && !tvMode) return;
        if (shouldIgnoreKeyEvent(e)) return;

        if (action === "back") {
            e.preventDefault();
            handleBack();
            return;
        }

        if (action === "select") {
            e.preventDefault();
            activateFocused();
            return;
        }

        var current = document.activeElement;
        if (!current || current === document.body) {
            focusInitial();
            e.preventDefault();
            return;
        }

        var next = findNext(current, action);
        if (next) {
            e.preventDefault();
            setFocus(next);
        }
    }

    function onFocusIn(e) {
        if (!active && !tvMode) return;
        var el = e.target;
        if (!isFocusable(el)) return;
        scrollIntoViewSoft(el);
    }

    function init() {
        tvMode = detectTV();
        if (tvMode) {
            document.body.classList.add("tv-mode", "dpad-active");
            active = true;
            window.setTimeout(focusInitial, 120);
        }

        document.addEventListener("keydown", onKeyDown, true);
        document.addEventListener("focusin", onFocusIn, true);

        window.HyakutakeDpad = {
            enable: function () {
                active = true;
                document.body.classList.add("dpad-active");
            },
            focusInitial: focusInitial,
            isTV: function () {
                return tvMode;
            },
        };
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
