(function () {
    "use strict";

    const MAX_MARKERS = 2;
    const markers = {};
    let wavesurfer = null;
    let overlay = null;
    let refreshFrame = 0;

    function getContainer() {
        return document.querySelector(".pk_av");
    }

    function getDuration() {
        return wavesurfer && wavesurfer.getDuration
            ? wavesurfer.getDuration()
            : 0;
    }

    function getVisibleRange() {
        const duration = getDuration();

        if (!duration) {
            return { start: 0, end: 0 };
        }

        const start = Number(wavesurfer.LeftProgress) || 0;
        const visible = Number(wavesurfer.VisibleDuration) || duration;

        return {
            start: start,
            end: Math.min(start + visible, duration)
        };
    }

    function formatTime(seconds) {
        seconds = Math.max(0, Number(seconds) || 0);

        const minutes = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3).padStart(6, "0");

        return String(minutes).padStart(2, "0") + ":" + secs;
    }

    function parseTime(value) {
        const parts = String(value).trim().split(":");

        if (parts.length !== 2) {
            return NaN;
        }

        const minutes = Number(parts[0]);
        const seconds = Number(parts[1]);

        if (
            !Number.isFinite(minutes) ||
            !Number.isFinite(seconds) ||
            minutes < 0 ||
            seconds < 0 ||
            seconds >= 60
        ) {
            return NaN;
        }

        return minutes * 60 + seconds;
    }

    function ensureOverlay() {
        const container = getContainer();

        if (!container) {
            return null;
        }

        if (getComputedStyle(container).position === "static") {
            container.style.position = "relative";
        }

        if (!overlay || !container.contains(overlay)) {
            overlay = document.createElement("div");
            overlay.className = "pmr-markers-overlay";

            Object.assign(overlay.style, {
                position: "absolute",
                inset: "0",
                zIndex: "20",
                pointerEvents: "none"
            });

            container.appendChild(overlay);
        }

        return overlay;
    }

    function createMarker(number) {
        const root = document.createElement("div");

        Object.assign(root.style, {
            position: "absolute",
            top: "0",
            bottom: "0",
            width: "2px",
            background: number === 1 ? "#ff453a" : "#0a84ff",
            pointerEvents: "none"
        });

        const label = document.createElement("div");

        label.textContent = String(number);

        Object.assign(label.style, {
            position: "absolute",
            top: "26px",
            left: "2px",
            padding: "3px 6px",
            color: "#fff",
            background: number === 1 ? "#ff453a" : "#0a84ff",
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: "bold",
            whiteSpace: "nowrap",
            pointerEvents: "auto",
            cursor: "ew-resize",
            touchAction: "none"
        });

        const input = document.createElement("input");

        input.type = "text";
        input.value = "00:00.000";
        input.title = "Время маркера";
        input.setAttribute("aria-label", "Время маркера " + number);

        Object.assign(input.style, {
            width: "86px",
            marginLeft: "5px",
            padding: "2px 4px",
            fontSize: "12px",
            color: "#fff",
            background: "#222",
            border: "1px solid #777",
            borderRadius: "3px"
        });

        label.appendChild(input);
        root.appendChild(label);

        const marker = {
            number: number,
            time: 0,
            root: root,
            label: label,
            input: input
        };

        input.addEventListener("change", function () {
            const time = parseTime(input.value);
            const duration = getDuration();

            if (!Number.isFinite(time) || time > duration) {
                input.value = formatTime(marker.time);
                return;
            }

            marker.time = time;
            refresh();
        });

        let dragging = false;

        label.addEventListener("pointerdown", function (event) {
            if (event.target === input) {
                return;
            }

            dragging = true;
            label.setPointerCapture(event.pointerId);
            event.preventDefault();
        });

        label.addEventListener("pointermove", function (event) {
            if (!dragging) {
                return;
            }

            const container = getContainer();

            if (!container) {
                return;
            }

            const rect = container.getBoundingClientRect();
            const range = getVisibleRange();

            if (!rect.width || range.end <= range.start) {
                return;
            }

            const x = Math.max(
                0,
                Math.min(event.clientX - rect.left, rect.width)
            );

            marker.time = range.start +
                (x / rect.width) * (range.end - range.start);

            marker.time = Math.max(
                0,
                Math.min(marker.time, getDuration())
            );

            refresh();
        });

        label.addEventListener("pointerup", function () {
            dragging = false;
        });

        label.addEventListener("pointercancel", function () {
            dragging = false;
        });

        return marker;
    }

    function refresh() {
        if (refreshFrame) {
            cancelAnimationFrame(refreshFrame);
        }

        refreshFrame = requestAnimationFrame(function () {
            refreshFrame = 0;

            const host = ensureOverlay();

            if (!host || !wavesurfer) {
                return;
            }

            const rect = host.getBoundingClientRect();
            const range = getVisibleRange();

            Object.keys(markers).forEach(function (key) {
                const marker = markers[key];

                if (
                    marker.time < range.start ||
                    marker.time > range.end ||
                    range.end <= range.start
                ) {
                    marker.root.style.display = "none";
                    return;
                }

                const x = (
                    (marker.time - range.start) /
                    (range.end - range.start)
                ) * rect.width;

                marker.root.style.display = "block";
                marker.root.style.left = x + "px";
                marker.input.value = formatTime(marker.time);
            });
        });
    }

    function set(number, ws) {
        if (number < 1 || number > MAX_MARKERS || !ws) {
            return;
        }

        wavesurfer = ws;

        const duration = getDuration();

        if (!duration) {
            return;
        }

        if (!markers[number]) {
            markers[number] = createMarker(number);

            const host = ensureOverlay();

            if (host) {
                host.appendChild(markers[number].root);
            }
        }

        markers[number].time = Math.max(
            0,
            Math.min(ws.getCurrentTime(), duration)
        );

        refresh();
    }

    function clear() {
        Object.keys(markers).forEach(function (key) {
            markers[key].root.remove();
            delete markers[key];
        });

        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    }

    window.PMRMarkers = {
        set: set,
        refresh: refresh,
        clear: clear
    };
})();
