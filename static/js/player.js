(function () {
    "use strict";

    const container = document.getElementById("player-container");
    if (!container) return;

    const mediaId = container.dataset.mediaId;
    const mediaType = container.dataset.mediaType;
    const updateUrl = container.dataset.updateUrl;
    const startPosition = parseFloat(container.dataset.position) || 0;
    const element = document.getElementById("media-element");

    function getCsrfToken() {
        const match = document.cookie.match(/csrftoken=([^;]+)/);
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

    if (element && (mediaType === "video" || mediaType === "audio")) {
        const vinyl = document.getElementById("vinylDisc");

        function syncVinyl() {
            if (!vinyl) return;
            vinyl.classList.toggle("spinning", !element.paused && !element.ended);
        }

        element.addEventListener("play", syncVinyl);
        element.addEventListener("pause", syncVinyl);
        element.addEventListener("ended", syncVinyl);

        element.addEventListener("loadedmetadata", function () {
            if (startPosition > 0 && startPosition < element.duration) {
                element.currentTime = startPosition;
            }
        });

        let lastSaved = 0;
        element.addEventListener("timeupdate", function () {
            const now = Math.floor(element.currentTime);
            if (now - lastSaved >= 5) {
                lastSaved = now;
                saveProgress(element.currentTime, false);
            }
        });

        element.addEventListener("ended", function () {
            saveProgress(element.duration || 0, true);
        });

        window.addEventListener("beforeunload", function () {
            if (!element.paused && !element.ended) {
                saveProgress(element.currentTime, false);
            }
        });
    } else if (mediaType === "image" || mediaType === "text") {
        saveProgress(0, true);
    }
})();
