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
    var lastNonInputFocus = null;
    var navigating = false;

    var HORIZONTAL_SCROLL_SELECTORS = [
        "[data-carousel-track]",
        ".browse-filter-bar",
        ".tabs",
        ".nav-links",
        ".pagination",
        ".carousel-nav-btns",
        ".search-hero",
        ".site-nav",
    ];

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

    function isRadioInput(el) {
        return !!(el && el.tagName === "INPUT" && el.type === "radio");
    }

    function isCheckboxInput(el) {
        return !!(el && el.tagName === "INPUT" && el.type === "checkbox");
    }

    function isChoiceInput(el) {
        return isRadioInput(el) || isCheckboxInput(el);
    }

    function getRadioGroupInputs(radio) {
        var container = radio.closest("[data-dpad-radio-group], .settings-options, fieldset");
        var radios;

        if (container) {
            radios = container.querySelectorAll('input[type="radio"]');
        } else if (radio.name) {
            radios = document.querySelectorAll('input[type="radio"][name="' + radio.name + '"]');
        } else {
            return [radio];
        }

        return Array.prototype.filter.call(radios, function (el) {
            return el.name === radio.name && isFocusable(el);
        });
    }

    function syncChoiceFocusVisual(input) {
        document.querySelectorAll(".settings-option.is-dpad-focused").forEach(function (el) {
            el.classList.remove("is-dpad-focused");
        });

        if (!input || !isChoiceInput(input)) return;

        var label = input.closest(".settings-option, label");
        if (label) label.classList.add("is-dpad-focused");
    }

    function handleChoiceInputKeyDown(e, action) {
        var input = document.activeElement;
        if (!isChoiceInput(input)) return false;

        if (action === "select") {
            e.preventDefault();
            if (isCheckboxInput(input)) {
                input.checked = !input.checked;
            } else {
                input.checked = true;
            }
            return true;
        }

        if (action === "back") {
            e.preventDefault();
            exitInput(input);
            return true;
        }

        if (isRadioInput(input) && (action === "up" || action === "down" || action === "left" || action === "right")) {
            var radios = getRadioGroupInputs(input);
            var idx = radios.indexOf(input);
            if (idx === -1) return false;

            var nextIdx = idx;
            if (action === "down" || action === "right") {
                nextIdx = Math.min(idx + 1, radios.length - 1);
            } else if (action === "up" || action === "left") {
                nextIdx = Math.max(idx - 1, 0);
            }

            if (nextIdx !== idx) {
                e.preventDefault();
                setFocus(radios[nextIdx]);
                return true;
            }

            e.preventDefault();
            exitInput(input, action);
            return true;
        }

        if (isCheckboxInput(input) && (action === "up" || action === "down" || action === "left" || action === "right")) {
            e.preventDefault();
            exitInput(input, action);
            return true;
        }

        return false;
    }

    function isEditable(el) {
        if (!el) return false;
        if (isChoiceInput(el)) return true;
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
            ".settings-actions",
            ".resume-prompt-actions",
            ".playback-options",
            ".tv-player-bar",
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

    function sameRadioGroup(a, b) {
        if (!isRadioInput(a) || !isRadioInput(b)) return false;
        if (a.name !== b.name) return false;
        var groupA = a.closest("[data-dpad-radio-group], .settings-options, fieldset");
        var groupB = b.closest("[data-dpad-radio-group], .settings-options, fieldset");
        return groupA && groupB && groupA === groupB;
    }

    function directionAllowed(current, candidate, direction) {
        if (direction === "left" || direction === "right") {
            if (sameCarouselTrack(current, candidate)) return true;
            if (sameRowGroup(current, candidate)) return true;
            if (sameRadioGroup(current, candidate)) return true;
        }
        if (direction === "up" || direction === "down") {
            if (sameGrid(current, candidate)) return true;
            if (sameRadioGroup(current, candidate)) return true;
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
            if (sameRadioGroup(current, el) && (direction === "up" || direction === "down")) {
                groupBonus = -100;
            }

            var score = primary + secondary * 2.4 + groupBonus;
            if (score < bestScore) {
                bestScore = score;
                best = el;
            }
        });

        return best;
    }

    function isInSiteHeader(el) {
        return !!(el && el.closest(".site-nav"));
    }

    function scrollPageToTop() {
        if (window.scrollY <= 2 && window.scrollX <= 2) return;

        try {
            window.scrollTo({ left: 0, top: 0, behavior: "smooth" });
        } catch (err) {
            window.scrollTo(0, 0);
        }
    }

    function getViewportPadding() {
        var nav = document.querySelector(".site-nav");
        var navHeight = nav ? nav.getBoundingClientRect().height : 62;
        var focusPad = 28;
        return {
            top: navHeight + 20 + focusPad,
            bottom: 24 + focusPad,
            left: 20 + focusPad,
            right: 20 + focusPad,
        };
    }

    function getVisibleRect(padding) {
        return {
            top: padding.top,
            left: padding.left,
            right: window.innerWidth - padding.right,
            bottom: window.innerHeight - padding.bottom,
            width: window.innerWidth - padding.left - padding.right,
            height: window.innerHeight - padding.top - padding.bottom,
        };
    }

    function isFullyVisible(el, padding) {
        var rect = el.getBoundingClientRect();
        var view = getVisibleRect(padding);
        return (
            rect.top >= view.top &&
            rect.bottom <= view.bottom &&
            rect.left >= view.left &&
            rect.right <= view.right
        );
    }

    function findHorizontalScroller(el) {
        for (var i = 0; i < HORIZONTAL_SCROLL_SELECTORS.length; i++) {
            var container = el.closest(HORIZONTAL_SCROLL_SELECTORS[i]);
            if (!container) continue;
            if (container.scrollWidth > container.clientWidth + 1) return container;
        }
        return null;
    }

    function scrollHorizontalContainer(container, el, pad) {
        var containerRect = container.getBoundingClientRect();
        var elRect = el.getBoundingClientRect();
        var targetLeft = container.scrollLeft;

        if (container.matches("[data-carousel-track]")) {
            var elCenter = elRect.left + elRect.width / 2;
            var containerCenter = containerRect.left + containerRect.width / 2;
            targetLeft += elCenter - containerCenter;
        } else if (elRect.left < containerRect.left + pad) {
            targetLeft -= containerRect.left - elRect.left + pad;
        } else if (elRect.right > containerRect.right - pad) {
            targetLeft += elRect.right - containerRect.right + pad;
        } else {
            return;
        }

        targetLeft = Math.max(0, Math.min(targetLeft, container.scrollWidth - container.clientWidth));

        try {
            container.scrollTo({ left: targetLeft, behavior: "smooth" });
        } catch (err) {
            container.scrollLeft = targetLeft;
        }
    }

    function scrollPageToElement(el, padding) {
        var rect = el.getBoundingClientRect();
        var view = getVisibleRect(padding);
        var nextX = window.scrollX;
        var nextY = window.scrollY;

        if (rect.top < view.top) {
            nextY += rect.top - view.top;
        } else if (rect.bottom > view.bottom) {
            nextY += rect.bottom - view.bottom;
        } else if (rect.height < view.height * 0.85) {
            var elCenterY = rect.top + rect.height / 2;
            var viewCenterY = view.top + view.height / 2;
            var offsetY = elCenterY - viewCenterY;
            if (Math.abs(offsetY) > view.height * 0.2) {
                nextY += offsetY;
            }
        }

        if (rect.left < view.left) {
            nextX += rect.left - view.left;
        } else if (rect.right > view.right) {
            nextX += rect.right - view.right;
        }

        nextX = Math.max(0, nextX);
        nextY = Math.max(0, nextY);

        if (nextX === window.scrollX && nextY === window.scrollY) return;

        try {
            window.scrollTo({ left: nextX, top: nextY, behavior: "smooth" });
        } catch (err) {
            window.scrollTo(nextX, nextY);
        }
    }

    function ensureVisible(el) {
        if (!el || !el.isConnected) return;

        if (isInSiteHeader(el)) {
            scrollPageToTop();
            var headerScroller = findHorizontalScroller(el);
            if (headerScroller) {
                scrollHorizontalContainer(headerScroller, el, 16);
                window.requestAnimationFrame(function () {
                    scrollHorizontalContainer(headerScroller, el, 16);
                });
            }
            return;
        }

        var padding = getViewportPadding();
        var horizontal = findHorizontalScroller(el);

        if (horizontal) {
            scrollHorizontalContainer(horizontal, el, 16);
        }

        window.requestAnimationFrame(function () {
            if (horizontal) {
                scrollHorizontalContainer(horizontal, el, 16);
            }

            if (!isFullyVisible(el, padding)) {
                scrollPageToElement(el, padding);
            }

            window.requestAnimationFrame(function () {
                if (!isFullyVisible(el, padding)) {
                    scrollPageToElement(el, padding);
                }
            });
        });
    }

    function scrollIntoViewSoft(el) {
        ensureVisible(el);
    }

    function setFocus(el) {
        if (!el) return;
        navigating = true;
        el.focus({ preventScroll: true });
        syncChoiceFocusVisual(el);
        document.body.classList.add("dpad-active");
        ensureVisible(el);
        window.setTimeout(function () {
            navigating = false;
        }, 180);
    }

    function getInitialFocusTarget() {
        var playBtn = document.getElementById("playerPlayBtn");
        if (playBtn && isFocusable(playBtn)) return playBtn;

        var heroPrimary = document.querySelector(".hero-btn-primary");
        if (heroPrimary && isFocusable(heroPrimary)) return heroPrimary;

        var main = document.querySelector("main.container");
        if (!main) return null;

        var preferred = main.querySelector(
            ".hero-btn-primary, .carousel-card, .album-card, .media-card, .browse-filter-pill.active, .tab-stub.active, .back-btn, .settings-options input[type=radio]:checked, .settings-options input[type=radio]"
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

    function isTextInput(el) {
        if (!el || el.tagName !== "INPUT") return false;
        var type = (el.type || "text").toLowerCase();
        return type === "text" || type === "search" || type === "url" || type === "email" || type === "tel" || type === "password" || type === "number";
    }

    function canExitInputHorizontally(input, direction) {
        if (!isTextInput(input)) return true;
        var start = input.selectionStart;
        var end = input.selectionEnd;
        var len = input.value.length;
        if (direction === "left") return start === 0 && end === 0;
        if (direction === "right") return start === len && end === len;
        return false;
    }

    function exitInput(input, direction) {
        var next =
            (direction && findNext(input, direction)) ||
            findNext(input, "down") ||
            findNext(input, "up") ||
            findNext(input, "right") ||
            findNext(input, "left");

        if (!next || next === input) {
            next =
                (lastNonInputFocus && lastNonInputFocus !== input && isFocusable(lastNonInputFocus)
                    ? lastNonInputFocus
                    : null) || getInitialFocusTarget();
        }

        input.blur();
        syncChoiceFocusVisual(null);
        if (next && next !== input) setFocus(next);
    }

    function handleInputKeyDown(e, action) {
        var input = document.activeElement;
        if (!isEditable(input)) return false;

        if (handleChoiceInputKeyDown(e, action)) return true;

        if (action === "back") {
            e.preventDefault();
            exitInput(input);
            return true;
        }

        if (action === "down" || action === "up") {
            e.preventDefault();
            exitInput(input, action);
            return true;
        }

        if (action === "left" || action === "right") {
            if (canExitInputHorizontally(input, action)) {
                var next = findNext(input, action);
                if (next) {
                    e.preventDefault();
                    exitInput(input, action);
                    return true;
                }
            }
            return false;
        }

        return false;
    }

    function getPlayerContainer() {
        return document.querySelector("[data-dpad-player]");
    }

    function getPlayerApi() {
        return window.hyakutakePlayer || null;
    }

    function isResumePromptVisible() {
        var prompt = document.getElementById("resumePrompt");
        return !!(prompt && prompt.classList.contains("is-visible"));
    }

    function isInPlayerUiControls(el) {
        if (!el) return false;
        return !!(
            el.closest(".tv-player-bar") ||
            el.closest(".playback-options") ||
            el.closest(".player-nav-row") ||
            el.closest(".resume-prompt") ||
            el.closest(".player-context-bar")
        );
    }

    function isInPlayerChrome(el) {
        if (!el) return false;
        return !!(
            el.closest(".playback-options") ||
            el.closest(".player-nav-row") ||
            el.closest(".player-context-bar") ||
            el.closest(".site-nav")
        );
    }

    function arePlayerControlsVisible() {
        var api = getPlayerApi();
        return !!(api && api.areControlsVisible && api.areControlsVisible());
    }

    function isPlayerImmersive() {
        if (!getPlayerContainer()) return false;
        if (isResumePromptVisible()) return false;
        var active = document.activeElement;
        if (isInPlayerChrome(active)) return false;
        if (active && active.closest(".tv-player-bar") && arePlayerControlsVisible()) return false;
        return true;
    }

    var MEDIA_KEY_ACTION = {
        85: "play_pause",
        126: "play",
        127: "pause",
    };

    function handlePlayerMediaKeys(e) {
        if (!getPlayerContainer()) return false;
        var mediaAction = MEDIA_KEY_ACTION[e.keyCode];
        if (!mediaAction) return false;

        var api = getPlayerApi();
        if (!api) return false;

        e.preventDefault();

        if (mediaAction === "play_pause" || mediaAction === "play") {
            api.togglePlay({ showControls: false });
        } else if (mediaAction === "pause") {
            var media = api.getMediaElement && api.getMediaElement();
            if (media && !media.paused) api.togglePlay({ showControls: false });
        }

        return true;
    }

    function handleImmersiveTransport(e, action) {
        if (!isPlayerImmersive()) return false;

        var api = getPlayerApi();

        if (action === "left" || action === "right" || action === "up") {
            e.preventDefault();
            focusPlayerControls();
            return true;
        }

        if (action === "select") {
            e.preventDefault();
            if (api && api.togglePlay) api.togglePlay({ showControls: false });
            return true;
        }

        if (action === "down") {
            e.preventDefault();
            focusPlaybackOptions();
            return true;
        }

        return false;
    }

    function focusPlayerControls() {
        var api = getPlayerApi();
        if (api && api.showControls) api.showControls({ focusBar: false });
        window.requestAnimationFrame(function () {
            var target = api && api.focusBarControl ? api.focusBarControl() : null;
            if (target && isFocusable(target)) setFocus(target);
        });
    }

    function focusResumePrompt() {
        var btn = document.getElementById("resumeContinue") || document.querySelector(".resume-prompt .resume-btn");
        if (btn && isFocusable(btn)) setFocus(btn);
    }

    function focusPlaybackOptions() {
        var toggle = document.getElementById("autoplayToggle");
        if (toggle && isFocusable(toggle)) {
            setFocus(toggle);
            return;
        }
        var modeBtn = document.querySelector(".playback-mode .mode-stub");
        if (modeBtn && isFocusable(modeBtn)) setFocus(modeBtn);
    }

    function handlePlayerKeyDown(e, action) {
        if (!getPlayerContainer()) return false;

        if (action === "back") {
            var api = getPlayerApi();
            if (api && api.isFullscreen && api.isFullscreen()) {
                e.preventDefault();
                api.exitFullscreen();
                return true;
            }
            if (api && api.areControlsVisible && api.areControlsVisible()) {
                if (api.hideControls && api.hideControls()) {
                    e.preventDefault();
                    return true;
                }
            }
        }

        if (isResumePromptVisible()) {
            var active = document.activeElement;
            var inPrompt = active && active.closest(".resume-prompt");
            if (
                !inPrompt &&
                (action === "select" || action === "down" || action === "up" || action === "left" || action === "right")
            ) {
                e.preventDefault();
                focusResumePrompt();
                return true;
            }
        }

        var activeEl = document.activeElement;
        var inControls = activeEl && activeEl.closest(".tv-player-bar");
        var inChrome = isInPlayerChrome(activeEl);

        if (handleImmersiveTransport(e, action)) return true;

        if (inChrome && action === "up") {
            e.preventDefault();
            focusPlayerControls();
            return true;
        }

        if (inControls) {
            if (action === "left" || action === "right") {
                if (activeEl.id === "playerSeekForward" && action === "left") {
                    e.preventDefault();
                    setFocus(document.getElementById("playerSeekBack") || document.getElementById("playerPlayBtn"));
                    return true;
                }
                if (activeEl.id === "playerSeekBack" && action === "right") {
                    e.preventDefault();
                    setFocus(document.getElementById("playerSeekForward"));
                    return true;
                }
                if (activeEl.id === "playerSeekForward" && action === "right" && document.getElementById("playerFullscreenBtn")) {
                    e.preventDefault();
                    setFocus(document.getElementById("playerFullscreenBtn"));
                    return true;
                }
                if (activeEl.id === "playerFullscreenBtn" && action === "left") {
                    e.preventDefault();
                    setFocus(document.getElementById("playerSeekForward"));
                    return true;
                }
            }
            if (action === "select") {
                return false;
            }
            if (action === "up") {
                e.preventDefault();
                var nextUp = findNext(activeEl, "up");
                if (nextUp) setFocus(nextUp);
                return true;
            }
            if (action === "down") {
                e.preventDefault();
                focusPlaybackOptions();
                return true;
            }
            return false;
        }

        return false;
    }

    function shouldIgnoreKeyEvent(e) {
        if (e.altKey || e.ctrlKey || e.metaKey) return true;
        if (isEditable(document.activeElement)) return true;
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

        if (isEditable(document.activeElement)) {
            if (handleInputKeyDown(e, action)) return;
            return;
        }

        if (handlePlayerMediaKeys(e)) return;

        if (handlePlayerKeyDown(e, action)) return;

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
        var el = e.target;
        if (isFocusable(el) && !isEditable(el)) {
            lastNonInputFocus = el;
        }
        syncChoiceFocusVisual(el);
        if (!active && !tvMode) return;
        if (!isFocusable(el)) return;
        if (navigating) return;
        ensureVisible(el);
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
