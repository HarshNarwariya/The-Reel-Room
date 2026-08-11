(function () {
    "use strict";

    var container = document.getElementById("player-container");
    if (!container) return;

    var mediaId = container.dataset.mediaId;
    var mediaType = container.dataset.mediaType;
    var updateUrl = container.dataset.updateUrl;
    var startPosition = parseFloat(container.dataset.position) || 0;
    var element = document.getElementById("media-element");
    var vinyl = document.getElementById("vinylDisc");
    var plyrInstance = null;

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
                media_id: parseInt(mediaId, 10),
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

    function syncVinyl(playing) {
        if (!vinyl) return;
        vinyl.classList.toggle("spinning", playing);
    }

    function bindProgressTracking() {
        var media = getMediaElement();
        if (!media) return;

        var lastSaved = 0;

        function onLoaded() {
            if (startPosition > 0 && startPosition < media.duration) {
                if (plyrInstance) {
                    plyrInstance.currentTime = startPosition;
                } else {
                    media.currentTime = startPosition;
                }
            }
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
        bindProgressTracking();
        bindEpisodeShortcuts();
    } else if (element && (mediaType === "video" || mediaType === "audio")) {
        bindProgressTracking();
        bindEpisodeShortcuts();
    } else if (mediaType === "image" || mediaType === "text") {
        saveProgress(0, true);
    }
})();
