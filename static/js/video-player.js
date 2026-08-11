(function () {
    "use strict";

    var player = document.getElementById("cinemaPlayer");
    var video = document.getElementById("media-element");
    if (!player || !video) return;

    var playBig = document.getElementById("cinemaPlayBig");
    var playPause = document.getElementById("cinemaPlayPause");
    var skipBack = document.getElementById("cinemaSkipBack");
    var skipFwd = document.getElementById("cinemaSkipFwd");
    var muteBtn = document.getElementById("cinemaMute");
    var volume = document.getElementById("cinemaVolume");
    var fullscreenBtn = document.getElementById("cinemaFullscreen");
    var progressWrap = document.getElementById("cinemaProgressWrap");
    var fill = document.getElementById("cinemaFill");
    var buffer = document.getElementById("cinemaBuffer");
    var timeEl = document.getElementById("cinemaTime");
    var dim = document.getElementById("cinemaDim");
    var container = document.getElementById("player-container");

    var hideTimer = null;

    function formatTime(sec) {
        if (!isFinite(sec) || sec < 0) return "0:00";
        var h = Math.floor(sec / 3600);
        var m = Math.floor((sec % 3600) / 60);
        var s = Math.floor(sec % 60);
        if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
        return m + ":" + String(s).padStart(2, "0");
    }

    function updateTime() {
        timeEl.textContent = formatTime(video.currentTime) + " / " + formatTime(video.duration);
    }

    function updateProgress() {
        if (!video.duration) return;
        var pct = (video.currentTime / video.duration) * 100;
        fill.style.width = pct + "%";
    }

    function updateBuffer() {
        if (!video.duration || !video.buffered.length) {
            buffer.style.width = "0%";
            return;
        }
        var end = video.buffered.end(video.buffered.length - 1);
        buffer.style.width = (end / video.duration) * 100 + "%";
    }

    function syncPlayingState() {
        var playing = !video.paused && !video.ended;
        player.classList.toggle("is-playing", playing);
        player.classList.toggle("is-paused", !playing);
        muteBtn.classList.toggle("is-muted", video.muted || video.volume === 0);
    }

    function showControls() {
        player.classList.add("show-controls");
        clearTimeout(hideTimer);
        if (!video.paused) {
            hideTimer = setTimeout(function () {
                player.classList.remove("show-controls");
            }, 3000);
        }
    }

    function togglePlay() {
        if (video.paused || video.ended) {
            video.play();
        } else {
            video.pause();
        }
    }

    function seekTo(clientX) {
        var rect = progressWrap.getBoundingClientRect();
        var ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        if (video.duration) video.currentTime = ratio * video.duration;
    }

    playBig.addEventListener("click", togglePlay);
    playPause.addEventListener("click", togglePlay);
    dim.addEventListener("click", togglePlay);

    skipBack.addEventListener("click", function () {
        video.currentTime = Math.max(0, video.currentTime - 10);
    });

    skipFwd.addEventListener("click", function () {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
    });

    muteBtn.addEventListener("click", function () {
        video.muted = !video.muted;
        syncPlayingState();
    });

    volume.addEventListener("input", function () {
        video.volume = parseFloat(volume.value);
        video.muted = video.volume === 0;
        syncPlayingState();
    });

    fullscreenBtn.addEventListener("click", function () {
        var target = player;
        if (!document.fullscreenElement) {
            (target.requestFullscreen || target.webkitRequestFullscreen).call(target);
        } else {
            document.exitFullscreen();
        }
    });

    progressWrap.addEventListener("click", function (e) {
        seekTo(e.clientX);
    });

    var dragging = false;
    progressWrap.addEventListener("mousedown", function (e) {
        dragging = true;
        seekTo(e.clientX);
    });
    document.addEventListener("mousemove", function (e) {
        if (dragging) seekTo(e.clientX);
    });
    document.addEventListener("mouseup", function () {
        dragging = false;
    });

    video.addEventListener("timeupdate", function () {
        updateTime();
        updateProgress();
    });
    video.addEventListener("progress", updateBuffer);
    video.addEventListener("loadedmetadata", function () {
        updateTime();
        updateBuffer();
    });
    video.addEventListener("play", function () {
        syncPlayingState();
        showControls();
    });
    video.addEventListener("pause", function () {
        syncPlayingState();
        showControls();
    });
    video.addEventListener("ended", syncPlayingState);

    player.addEventListener("mousemove", showControls);
    player.addEventListener("touchstart", showControls, { passive: true });

    document.addEventListener("keydown", function (e) {
        if (e.target.tagName === "INPUT") return;
        if (e.code === "Space") {
            e.preventDefault();
            togglePlay();
        }
        if (e.code === "ArrowLeft") video.currentTime = Math.max(0, video.currentTime - 5);
        if (e.code === "ArrowRight") video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
        if (e.code === "KeyF") fullscreenBtn.click();
        if (e.code === "KeyM") muteBtn.click();
        if (e.key === "ArrowLeft" && e.shiftKey && container.dataset.prevUrl) {
            window.location.href = container.dataset.prevUrl;
        }
        if (e.key === "ArrowRight" && e.shiftKey && container.dataset.nextUrl) {
            window.location.href = container.dataset.nextUrl;
        }
    });

    syncPlayingState();
    updateTime();
})();
