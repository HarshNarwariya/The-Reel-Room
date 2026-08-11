(function () {
    "use strict";

    var STORAGE_AUTOPLAY = "hyakutake_autoplay";
    var STORAGE_MODE = "hyakutake_autoplay_mode";

    var container = document.getElementById("player-container");
    if (!container) return;

    var mediaId = parseInt(container.dataset.mediaId, 10);
    var mediaType = container.dataset.mediaType;
    var updateUrl = container.dataset.updateUrl;
    var startPosition = parseFloat(container.dataset.position) || 0;
    var element = document.getElementById("media-element");
    var vinyl = document.getElementById("vinylDisc");
    var plyrInstance = null;
    var autoplayAttempted = false;
    var advancing = false;

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
        }).catch(function () {
            /* silent fail for progress saves */
        });
    }

    function getMediaElement() {
        return plyrInstance ? plyrInstance.media : element;
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

    function syncVinyl(playing) {
        if (!vinyl) return;
        vinyl.classList.toggle("spinning", playing);
    }

    function tryAutoplay() {
        if (!isAutoplayEnabled() || autoplayAttempted) return;
        autoplayAttempted = true;

        var playPromise;
        if (plyrInstance) {
            playPromise = plyrInstance.play();
        } else if (element) {
            playPromise = element.play();
        }

        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function () {
                autoplayAttempted = false;
            });
        }
    }

    function navigateToNext() {
        if (advancing || !isAutoplayEnabled()) return;

        var mode = getAutoplayMode();
        var targetUrl = null;

        if (mode === "order") {
            targetUrl = container.dataset.nextUrl || null;
        } else {
            if (siblingIds.length <= 1) {
                targetUrl = playUrl(mediaId);
            } else {
                var candidates = siblingIds.filter(function (id) {
                    return id !== mediaId;
                });
                var nextId = candidates[Math.floor(Math.random() * candidates.length)];
                targetUrl = playUrl(nextId);
            }
        }

        if (!targetUrl) return;

        advancing = true;
        window.setTimeout(function () {
            window.location.href = targetUrl;
        }, 400);
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
            if (toggle.checked) {
                tryAutoplay();
            }
        });

        modeGroup.addEventListener("click", function (e) {
            var btn = e.target.closest("[data-mode]");
            if (!btn) return;
            var mode = btn.getAttribute("data-mode");
            setAutoplayMode(mode);
            modeGroup.querySelectorAll("[data-mode]").forEach(function (el) {
                el.classList.toggle("active", el === btn);
            });
        });
    }

    function bindBufferingLoader() {
        var loader = document.getElementById("mediaLoader");
        var loaderLabel = document.getElementById("mediaLoaderLabel");
        if (!loader) return;

        function setLoading(active, message) {
            loader.classList.toggle("is-active", active);
            loader.setAttribute("aria-hidden", active ? "false" : "true");
            if (message && loaderLabel) {
                loaderLabel.textContent = message;
            }
        }

        function bindEvent(eventName, handler) {
            if (plyrInstance) {
                plyrInstance.on(eventName, handler);
            } else if (element) {
                element.addEventListener(eventName, handler);
            }
        }

        bindEvent("loadstart", function () {
            setLoading(true, "Loading…");
        });

        bindEvent("waiting", function () {
            setLoading(true, "Buffering…");
        });

        bindEvent("seeking", function () {
            setLoading(true, "Seeking…");
        });

        bindEvent("canplay", function () {
            setLoading(false);
            tryAutoplay();
        });

        bindEvent("canplaythrough", function () {
            setLoading(false);
        });

        bindEvent("playing", function () {
            setLoading(false);
        });

        bindEvent("seeked", function () {
            var media = getMediaElement();
            if (media && media.readyState >= 2 && !media.seeking) {
                setLoading(false);
            }
        });

        bindEvent("error", function () {
            setLoading(false);
        });
    }

    function bindProgressTracking() {
        var media = getMediaElement();
        if (!media) return;

        var lastSaved = 0;
        var resumeApplied = false;

        function applyResume() {
            if (resumeApplied || startPosition <= 0) return;
            if (startPosition >= media.duration) return;
            resumeApplied = true;
            if (plyrInstance) {
                plyrInstance.currentTime = startPosition;
            } else {
                media.currentTime = startPosition;
            }
        }

        function onLoaded() {
            applyResume();
            tryAutoplay();
        }

        function onTimeUpdate() {
            var current = plyrInstance ? plyrInstance.currentTime : media.currentTime;
            var now = Math.floor(current);
            if (now - lastSaved >= 5) {
                lastSaved = now;
                saveProgress(current, false);
            }
        }

        function onEnded() {
            var duration = plyrInstance ? plyrInstance.duration : media.duration;
            saveProgress(duration || 0, true);
            syncVinyl(false);
            navigateToNext();
        }

        function onPlay() {
            syncVinyl(true);
        }

        function onPause() {
            syncVinyl(false);
        }

        if (plyrInstance) {
            plyrInstance.on("loadedmetadata", onLoaded);
            plyrInstance.on("timeupdate", onTimeUpdate);
            plyrInstance.on("ended", onEnded);
            plyrInstance.on("play", onPlay);
            plyrInstance.on("pause", onPause);
        } else {
            media.addEventListener("loadedmetadata", onLoaded);
            media.addEventListener("timeupdate", onTimeUpdate);
            media.addEventListener("ended", onEnded);
            media.addEventListener("play", onPlay);
            media.addEventListener("pause", onPause);
        }

        window.addEventListener("beforeunload", function () {
            var current = plyrInstance ? plyrInstance.currentTime : media.currentTime;
            var paused = plyrInstance ? plyrInstance.paused : media.paused;
            var ended = plyrInstance ? plyrInstance.ended : media.ended;
            if (!paused && !ended) {
                saveProgress(current, false);
            }
        });
    }

    function bindEpisodeShortcuts() {
        document.addEventListener("keydown", function (e) {
            if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
            if (e.shiftKey && e.key === "ArrowLeft" && container.dataset.prevUrl) {
                window.location.href = container.dataset.prevUrl;
            }
            if (e.shiftKey && e.key === "ArrowRight" && container.dataset.nextUrl) {
                window.location.href = container.dataset.nextUrl;
            }
        });
    }

    if (element && (mediaType === "video" || mediaType === "audio") && typeof Plyr !== "undefined") {
        var poster = element.getAttribute("data-poster");
        var options = {
            seekTime: 10,
            keyboard: { focused: true, global: mediaType === "video" },
            tooltips: { controls: true, seek: true },
            clickToPlay: true,
            hideControls: true,
            resetOnEnd: false,
            autoplay: isAutoplayEnabled(),
        };

        if (mediaType === "video") {
            options.controls = [
                "play-large",
                "play",
                "progress",
                "current-time",
                "duration",
                "mute",
                "volume",
                "settings",
                "pip",
                "airplay",
                "fullscreen",
            ];
            if (poster) {
                options.poster = poster;
            }
        } else {
            options.controls = [
                "play",
                "progress",
                "current-time",
                "duration",
                "mute",
                "volume",
            ];
        }

        plyrInstance = new Plyr(element, options);
        bindPlaybackOptions();
        bindBufferingLoader();
        bindProgressTracking();
        bindEpisodeShortcuts();
    } else if (element && (mediaType === "video" || mediaType === "audio")) {
        bindPlaybackOptions();
        bindBufferingLoader();
        bindProgressTracking();
        bindEpisodeShortcuts();
    } else if (mediaType === "image" || mediaType === "text") {
        saveProgress(0, true);
    }
})();
