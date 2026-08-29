(function () {
    "use strict";

    var STORAGE_AUTOPLAY = "hyakutake_autoplay";
    var STORAGE_MODE = "hyakutake_autoplay_mode";
    var RESUME_PROMPT_MS = 10000;
    var CONTROLS_HIDE_MS = 5000;

    var container = document.getElementById("player-container");
    if (!container) return;

    var mediaId = parseInt(container.dataset.mediaId, 10);
    var mediaType = container.dataset.mediaType;
    var updateUrl = container.dataset.updateUrl;
    var useDrivePreview = container.dataset.useDrivePreview === "true";
    var element = document.getElementById("media-element");
    var resumePrompt = document.getElementById("resumePrompt");
    var resumeSeconds = resumePrompt
        ? parseFloat(resumePrompt.dataset.resumeSeconds) || 0
        : 0;
    var audioWrap = document.querySelector(".media-player-audio-wrap");
    var playerStage =
        document.querySelector("[data-dpad-player-stage]") ||
        document.querySelector(".media-player-stage, .media-player-audio-stage");

    var autoplayAttempted = false;
    var advancing = false;
    var resumeHideTimer = null;
    var resumePromptShown = false;
    var controlsHideTimer = null;
    var lastSaved = 0;
    var lastBarFocusId = "playerPlayBtn";

    var ui = {
        loader: document.getElementById("mediaLoader"),
        loaderLabel: document.getElementById("mediaLoaderLabel"),
        bar: document.getElementById("playerBar"),
        playBtn: document.getElementById("playerPlayBtn"),
        seekBack: document.getElementById("playerSeekBack"),
        seekForward: document.getElementById("playerSeekForward"),
        fullscreenBtn: document.getElementById("playerFullscreenBtn"),
        progress: document.getElementById("playerProgress"),
        buffer: document.getElementById("playerBuffer"),
        timeCurrent: document.getElementById("playerTimeCurrent"),
        timeDuration: document.getElementById("playerTimeDuration"),
    };

    var siblingIds = [];
    try {
        siblingIds = JSON.parse(container.dataset.siblingIds || "[]");
    } catch (err) {
        siblingIds = [];
    }

    function getCsrfToken() {
        var match = document.cookie.match(/csrftoken=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : "";
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
        var total = Math.floor(seconds);
        var h = Math.floor(total / 3600);
        var m = Math.floor((total % 3600) / 60);
        var s = total % 60;
        if (h > 0) {
            return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
        }
        return m + ":" + String(s).padStart(2, "0");
    }

    function getMediaElement() {
        return element;
    }

    function touchViewHistory() {
        if (useDrivePreview) {
            saveProgress(0, true);
            return;
        }
        if (mediaType === "image" || mediaType === "text") {
            saveProgress(0, true);
            return;
        }
        if (mediaType === "video" || mediaType === "audio") {
            saveProgress(resumeSeconds > 0 ? resumeSeconds : 0, false);
        }
    }

    function saveProgress(position, completed) {
        fetch(updateUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCsrfToken(),
            },
            body: JSON.stringify({
                media_id: mediaId,
                position_seconds: position,
                completed: completed,
            }),
        }).catch(function () {});
    }

    function isAutoplayEnabled() {
        var stored = localStorage.getItem(STORAGE_AUTOPLAY);
        if (stored === null) return true;
        return stored === "true";
    }

    function getAutoplayMode() {
        return localStorage.getItem(STORAGE_MODE) || "order";
    }

    function setAutoplayEnabled(enabled) {
        localStorage.setItem(STORAGE_AUTOPLAY, enabled ? "true" : "false");
    }

    function setAutoplayMode(mode) {
        localStorage.setItem(STORAGE_MODE, mode);
    }

    function playUrl(id) {
        return "/play/" + id + "/";
    }

    function syncPlayingState(playing) {
        if (audioWrap) audioWrap.classList.toggle("is-playing", playing);
        if (playerStage) playerStage.classList.toggle("is-playing", playing);
        if (ui.bar) ui.bar.classList.toggle("is-playing", playing);
    }

    function isControlsPinned() {
        return !!(resumePrompt && resumePrompt.classList.contains("is-visible"));
    }

    function areControlsVisible() {
        return !!(ui.bar && ui.bar.classList.contains("is-visible"));
    }

    function rememberBarFocus(el) {
        if (!el || !ui.bar || !ui.bar.contains(el)) return;
        if (el.id) lastBarFocusId = el.id;
    }

    function focusBarControl() {
        if (!ui.bar) return null;
        var target = document.getElementById(lastBarFocusId);
        if (!target || !ui.bar.contains(target)) {
            target = ui.playBtn;
        }
        if (target) {
            target.focus({ preventScroll: true });
        }
        return target;
    }

    function hideControls() {
        if (!ui.bar || !playerStage) return false;
        if (isControlsPinned()) return false;

        var active = document.activeElement;
        if (active && ui.bar.contains(active)) {
            rememberBarFocus(active);
            active.blur();
        }

        ui.bar.classList.remove("is-visible");
        playerStage.classList.remove("controls-visible");
        return true;
    }

    function scheduleControlsHide() {
        if (controlsHideTimer) window.clearTimeout(controlsHideTimer);
        controlsHideTimer = null;
        if (isControlsPinned()) return;
        controlsHideTimer = window.setTimeout(function () {
            controlsHideTimer = null;
            hideControls();
        }, CONTROLS_HIDE_MS);
    }

    function showControls(options) {
        options = options || {};
        if (!ui.bar || !playerStage) return;
        ui.bar.classList.add("is-visible");
        playerStage.classList.add("controls-visible");
        scheduleControlsHide();
        if (options.focusBar !== false) {
            window.requestAnimationFrame(function () {
                focusBarControl();
            });
        }
    }

    function bumpControlsActivity() {
        if (!ui.bar || !playerStage) return;
        ui.bar.classList.add("is-visible");
        playerStage.classList.add("controls-visible");
        scheduleControlsHide();
    }

    function setLoading(active, message) {
        if (!ui.loader) return;
        ui.loader.classList.toggle("is-active", active);
        ui.loader.setAttribute("aria-hidden", active ? "false" : "true");
        if (message && ui.loaderLabel) ui.loaderLabel.textContent = message;
    }

    function updateProgressUi() {
        var media = getMediaElement();
        if (!media) return;

        var current = media.currentTime || 0;
        var duration = media.duration;
        var pct = Number.isFinite(duration) && duration > 0 ? (current / duration) * 100 : 0;

        if (ui.progress) ui.progress.style.width = pct + "%";

        var buffered = media.buffered;
        if (ui.buffer && buffered && buffered.length) {
            var end = buffered.end(buffered.length - 1);
            var bufPct = Number.isFinite(duration) && duration > 0 ? (end / duration) * 100 : 0;
            ui.buffer.style.width = Math.min(100, bufPct) + "%";
        }

        var currentLabel = formatTime(current);
        var durationLabel = Number.isFinite(duration) ? formatTime(duration) : "--:--";

        if (ui.timeCurrent) ui.timeCurrent.textContent = currentLabel;
        if (ui.timeDuration) ui.timeDuration.textContent = durationLabel;
    }

    function clampTime(time) {
        var media = getMediaElement();
        if (!media) return 0;
        var duration = media.duration;
        if (Number.isFinite(duration)) {
            return Math.max(0, Math.min(duration, time));
        }
        return Math.max(0, time);
    }

    function seekTo(seconds) {
        var media = getMediaElement();
        if (!media) return;
        media.currentTime = clampTime(seconds);
        updateProgressUi();
    }

    function seekBy(seconds) {
        var media = getMediaElement();
        if (!media) return;
        media.currentTime = clampTime(media.currentTime + seconds);
        updateProgressUi();
    }

    function startPlayback(options) {
        options = options || {};
        var media = getMediaElement();
        if (!media) return;
        autoplayAttempted = true;
        if (options.showControls !== false) {
            bumpControlsActivity();
        }
        var playPromise = media.play();
        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function () {
                autoplayAttempted = false;
            });
        }
    }

    function tryAutoplay() {
        if (!isAutoplayEnabled() || autoplayAttempted) return;
        startPlayback();
    }

    function ensurePlaying() {
        var media = getMediaElement();
        if (!media || !media.paused) return;
        startPlayback();
    }

    function togglePlay(options) {
        options = options || {};
        var media = getMediaElement();
        if (!media) return;
        if (options.showControls !== false) {
            bumpControlsActivity();
        }
        if (media.paused || media.ended) {
            startPlayback(options);
        } else {
            media.pause();
        }
    }

    function navigateToNext() {
        if (advancing || !isAutoplayEnabled()) return;

        var mode = getAutoplayMode();
        var targetUrl = null;

        if (mode === "order") {
            targetUrl = container.dataset.nextUrl || null;
        } else if (siblingIds.length <= 1) {
            targetUrl = playUrl(mediaId);
        } else {
            var candidates = siblingIds.filter(function (id) {
                return id !== mediaId;
            });
            targetUrl = playUrl(candidates[Math.floor(Math.random() * candidates.length)]);
        }

        if (!targetUrl) return;

        advancing = true;
        window.setTimeout(function () {
            window.location.href = targetUrl;
        }, 400);
    }

    function clearResumeTimer() {
        if (resumeHideTimer) {
            window.clearTimeout(resumeHideTimer);
            resumeHideTimer = null;
        }
    }

    function hideResumePrompt() {
        if (!resumePrompt) return;
        clearResumeTimer();
        resumePrompt.classList.remove("is-visible");
        var countdown = resumePrompt.querySelector(".resume-prompt-countdown");
        if (countdown) countdown.classList.remove("is-running");
    }

    function showResumePrompt() {
        if (!resumePrompt || resumeSeconds <= 0 || resumePromptShown) return;
        resumePromptShown = true;
        resumePrompt.classList.add("is-visible");
        var countdown = resumePrompt.querySelector(".resume-prompt-countdown");
        if (countdown) {
            countdown.classList.remove("is-running");
            void countdown.offsetWidth;
            countdown.classList.add("is-running");
        }
        clearResumeTimer();
        resumeHideTimer = window.setTimeout(hideResumePrompt, RESUME_PROMPT_MS);
    }

    function startFromBeginningWithPrompt() {
        if (resumePromptShown) return;
        seekTo(0);
        autoplayAttempted = false;
        startPlayback();
        showResumePrompt();
    }

    function bindResumePrompt() {
        if (!resumePrompt || resumeSeconds <= 0) return;

        var continueBtn = document.getElementById("resumeContinue");
        var startOverBtn = document.getElementById("resumeStartOver");
        var dismissBtn = document.getElementById("resumeDismiss");

        if (continueBtn) {
            continueBtn.addEventListener("click", function () {
                hideResumePrompt();
                seekTo(resumeSeconds);
                ensurePlaying();
            });
        }
        if (startOverBtn) {
            startOverBtn.addEventListener("click", function () {
                hideResumePrompt();
                seekTo(0);
                ensurePlaying();
            });
        }
        if (dismissBtn) {
            dismissBtn.addEventListener("click", hideResumePrompt);
        }
    }

    function bindPlaybackOptions() {
        var toggle = document.getElementById("autoplayToggle");
        var modeGroup = document.getElementById("autoplayModeGroup");
        if (!toggle || !modeGroup) return;

        toggle.checked = isAutoplayEnabled();
        var activeMode = getAutoplayMode();

        modeGroup.querySelectorAll("[data-mode]").forEach(function (btn) {
            btn.classList.toggle("active", btn.getAttribute("data-mode") === activeMode);
        });

        toggle.addEventListener("change", function () {
            setAutoplayEnabled(toggle.checked);
            if (toggle.checked) tryAutoplay();
        });

        modeGroup.addEventListener("click", function (e) {
            var btn = e.target.closest("[data-mode]");
            if (!btn) return;
            setAutoplayMode(btn.getAttribute("data-mode"));
            modeGroup.querySelectorAll("[data-mode]").forEach(function (el) {
                el.classList.toggle("active", el === btn);
            });
        });
    }

    function getFullscreenElement() {
        return (
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement ||
            null
        );
    }

    function getFullscreenTarget() {
        return document.querySelector('.media-player-stage[data-player-type="video"]') || playerStage;
    }

    function isFullscreen() {
        var target = getFullscreenTarget();
        var active = getFullscreenElement();
        return !!(active && target && (active === target || target.contains(active)));
    }

    function syncFullscreenUi() {
        if (!ui.fullscreenBtn) return;
        ui.fullscreenBtn.classList.toggle("is-fullscreen", isFullscreen());
        ui.fullscreenBtn.setAttribute("aria-label", isFullscreen() ? "Exit fullscreen" : "Fullscreen");
    }

    function enterFullscreen() {
        if (mediaType !== "video") return;
        var target = getFullscreenTarget();
        if (!target) return;
        var request =
            target.requestFullscreen ||
            target.webkitRequestFullscreen ||
            target.mozRequestFullScreen ||
            target.msRequestFullscreen;
        if (request) {
            Promise.resolve(request.call(target)).then(syncFullscreenUi).catch(function () {});
        }
    }

    function exitFullscreen() {
        var exit =
            document.exitFullscreen ||
            document.webkitExitFullscreen ||
            document.mozCancelFullScreen ||
            document.msExitFullscreen;
        if (exit) {
            Promise.resolve(exit.call(document)).then(syncFullscreenUi).catch(function () {});
        }
    }

    function toggleFullscreen() {
        if (mediaType !== "video") return;
        bumpControlsActivity();
        if (isFullscreen()) {
            exitFullscreen();
        } else {
            enterFullscreen();
        }
    }

    function bindControlsAutoHide() {
        if (!ui.bar) return;

        ui.bar.addEventListener("focusin", function (e) {
            rememberBarFocus(e.target);
            if (!areControlsVisible()) {
                showControls({ focusBar: false });
            } else {
                scheduleControlsHide();
            }
        });

        ui.bar.addEventListener("keydown", bumpControlsActivity);
        ui.bar.addEventListener("click", bumpControlsActivity);

        document.addEventListener("keydown", function (e) {
            if (e.defaultPrevented) return;
            if (!container) return;
            var active = document.activeElement;
            if (active && !container.contains(active) && !(playerStage && playerStage.contains(active))) return;
            if (active && active.closest(".playback-options, .player-nav-row, .resume-prompt, .site-nav")) return;
            if (active && ui.bar && ui.bar.contains(active)) return;
            if (
                e.key === "ArrowUp" ||
                e.key === "ArrowDown" ||
                e.key === "ArrowLeft" ||
                e.key === "ArrowRight" ||
                e.key === "Enter" ||
                e.key === " "
            ) {
                showControls();
            }
        });

        showControls();
    }

    function bindControls() {
        function wirePlay(el) {
            if (!el) return;
            el.addEventListener("click", function (e) {
                e.stopPropagation();
                togglePlay();
            });
        }

        wirePlay(ui.playBtn);

        [ui.seekBack, ui.seekForward].forEach(function (btn) {
            if (!btn) return;
            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                seekBy(parseInt(btn.getAttribute("data-seek"), 10) || 0);
            });
        });

        if (ui.fullscreenBtn) {
            ui.fullscreenBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                toggleFullscreen();
            });
        }

        document.addEventListener("fullscreenchange", syncFullscreenUi);
        document.addEventListener("webkitfullscreenchange", syncFullscreenUi);

        if (playerStage && mediaType === "audio") {
            playerStage.addEventListener("click", function (e) {
                if (e.target.closest("button, a, input, .resume-prompt")) return;
                togglePlay();
            });
        }
    }

    function bindMediaEvents() {
        var media = getMediaElement();
        if (!media) return;

        media.volume = 1;
        media.muted = false;

        var poster = media.getAttribute("data-poster");
        if (poster && mediaType === "video") {
            media.setAttribute("poster", poster);
        }

        media.addEventListener("loadstart", function () {
            setLoading(true, "Loading…");
        });

        media.addEventListener("waiting", function () {
            setLoading(true, "Buffering…");
        });

        media.addEventListener("seeking", function () {
            setLoading(true, "Seeking…");
        });

        media.addEventListener("seeked", function () {
            if (media.readyState >= 2 && !media.seeking) setLoading(false);
            updateProgressUi();
        });

        media.addEventListener("canplay", function () {
            setLoading(false);
            if (resumeSeconds > 0) {
                startFromBeginningWithPrompt();
            } else {
                tryAutoplay();
            }
        });

        media.addEventListener("canplaythrough", function () {
            setLoading(false);
        });

        media.addEventListener("playing", function () {
            setLoading(false);
            syncPlayingState(true);
            scheduleControlsHide();
        });

        media.addEventListener("pause", function () {
            syncPlayingState(false);
            showControls();
        });

        media.addEventListener("ended", function () {
            syncPlayingState(false);
            showControls();
            saveProgress(media.duration || 0, true);
            navigateToNext();
        });

        media.addEventListener("loadedmetadata", function () {
            updateProgressUi();
            if (resumeSeconds <= 0) tryAutoplay();
        });

        media.addEventListener("timeupdate", function () {
            updateProgressUi();
            var now = Math.floor(media.currentTime);
            if (now - lastSaved >= 5) {
                lastSaved = now;
                saveProgress(media.currentTime, false);
            }
        });

        media.addEventListener("progress", updateProgressUi);

        media.addEventListener("error", function () {
            setLoading(false);
        });

        window.addEventListener("beforeunload", function () {
            if (!media.paused && !media.ended) {
                saveProgress(media.currentTime, false);
            }
        });
    }

    function exposeApi() {
        window.hyakutakePlayer = {
            getMediaElement: getMediaElement,
            togglePlay: togglePlay,
            seekTo: seekTo,
            showControls: showControls,
            hideControls: hideControls,
            areControlsVisible: areControlsVisible,
            focusBarControl: focusBarControl,
            bumpControlsActivity: bumpControlsActivity,
            goPrev: function () {
                if (container.dataset.prevUrl) {
                    window.location.href = container.dataset.prevUrl;
                }
            },
            goNext: function () {
                if (container.dataset.nextUrl) {
                    window.location.href = container.dataset.nextUrl;
                }
            },
            toggleFullscreen: toggleFullscreen,
            isFullscreen: isFullscreen,
            exitFullscreen: exitFullscreen,
            isLoading: function () {
                return ui.loader && ui.loader.classList.contains("is-active");
            },
        };
    }

    if (useDrivePreview) {
        touchViewHistory();
        return;
    }

    if (element && (mediaType === "video" || mediaType === "audio")) {
        bindControls();
        bindControlsAutoHide();
        bindMediaEvents();
        bindResumePrompt();
        bindPlaybackOptions();
        exposeApi();
        touchViewHistory();
        updateProgressUi();
    } else if (mediaType === "image" || mediaType === "text") {
        touchViewHistory();
    }
})();
