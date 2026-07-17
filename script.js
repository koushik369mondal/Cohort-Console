/* ==========================================================================
   COHORT CONSOLE — script.js
   Loads student data dynamically from students.json and renders the
   dashboard: search, sort, modal detail view, and theme toggle.
   ========================================================================== */

(() => {
    "use strict";

    // ---- State ----
    let allStudents = [];   // full dataset as fetched
    let currentSort = "default";
    let currentQuery = "";

    // ---- Accent color pairs used to color-code avatars per student ----
    const ACCENT_PAIRS = [
        ["#4fd8c4", "#f5b942"], // cyan -> amber
        ["#ff6b9d", "#f5b942"], // magenta -> amber
        ["#4fd8c4", "#ff6b9d"], // cyan -> magenta
        ["#8b7cf6", "#4fd8c4"], // violet -> cyan
        ["#f5b942", "#ff6b9d"], // amber -> magenta
        ["#5ba8f5", "#4fd8c4"], // blue -> cyan
    ];

    // ---- DOM references ----
    const cardGrid = document.getElementById("cardGrid");
    const loadingState = document.getElementById("loadingState");
    const emptyState = document.getElementById("emptyState");
    const emptyQuery = document.getElementById("emptyQuery");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const themeToggle = document.getElementById("themeToggle");
    const statTotal = document.getElementById("statTotal");
    const statShowing = document.getElementById("statShowing");
    const statusLine = document.getElementById("statusLine");

    const modalOverlay = document.getElementById("modalOverlay");
    const modalClose = document.getElementById("modalClose");
    const modalAvatar = document.getElementById("modalAvatar");
    const modalName = document.getElementById("modalName");
    const modalId = document.getElementById("modalId");
    const modalEmail = document.getElementById("modalEmail");
    const modalPhone = document.getElementById("modalPhone");
    const modalDob = document.getElementById("modalDob");
    const modalLeetcode = document.getElementById("modalLeetcode");
    const modalGithub = document.getElementById("modalGithub");

    // ==========================================================================
    // Helpers
    // ==========================================================================

    /** Return "Not Available" for null / empty / undefined values, else the value */
    function safe(value) {
        return value === null || value === undefined || value === ""
            ? "Not Available"
            : value;
    }

    /** Deterministic hash of a string -> index, so each student always gets the same accent */
    function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    function accentFor(student) {
        const idx = hashString(student.id || student.name) % ACCENT_PAIRS.length;
        return ACCENT_PAIRS[idx];
    }

    /** Build initials from a full name, e.g. "Aayush Kumar Prasad" -> "AK" */
    function initials(name) {
        if (!name) return "?";
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // ==========================================================================
    // Rendering
    // ==========================================================================

    function renderCards(students) {
        cardGrid.innerHTML = "";

        if (students.length === 0) {
            emptyState.hidden = false;
            emptyQuery.textContent = currentQuery;
            cardGrid.hidden = true;
        } else {
            emptyState.hidden = true;
            cardGrid.hidden = false;
        }

        students.forEach((student, i) => {
            const [c1, c2] = accentFor(student);
            const card = document.createElement("article");
            card.className = "profile-card";
            card.style.setProperty("--i", i);
            card.style.setProperty("--card-accent", c1);
            card.style.setProperty("--card-accent-2", c2);
            card.tabIndex = 0;
            card.setAttribute("role", "button");
            card.setAttribute("aria-label", `View profile for ${student.name || "Unknown Student"}`);

            const phoneAvailable = student.phoneNumber !== null && student.phoneNumber !== undefined && student.phoneNumber !== "";
            const hasLeetcode = student.leetcodeProfile !== null && student.leetcodeProfile !== undefined && student.leetcodeProfile !== "";
            const hasGithub = student.githubLink !== null && student.githubLink !== undefined && student.githubLink !== "";

            card.innerHTML = `
        <div class="card-top">
          <div class="avatar">${initials(student.name)}</div>
          <div class="card-name-wrap">
            <div class="card-name">${escapeHtml(safe(student.name))}</div>
            <span class="card-id">// ${escapeHtml(safe(student.id))}</span>
          </div>
        </div>
        <div class="card-divider"></div>
        <div class="card-info">
          <div class="info-row">
            <i class="fa-solid fa-envelope"></i>
            <span>${escapeHtml(safe(student.email))}</span>
          </div>
          <div class="info-row ${phoneAvailable ? "" : "not-available"}">
            <i class="fa-solid fa-phone"></i>
            <span>${escapeHtml(safe(student.phoneNumber))}</span>
          </div>
          <div class="info-row">
            <i class="fa-solid fa-cake-candles"></i>
            <span>${escapeHtml(safe(student.dob))}</span>
          </div>
        </div>
        <div class="card-actions">
          <a class="btn btn-leetcode ${hasLeetcode ? "" : "disabled"}" href="${hasLeetcode ? student.leetcodeProfile : "javascript:void(0)"}" target="${hasLeetcode ? "_blank" : ""}" rel="noopener noreferrer" aria-label="Open LeetCode profile">
            <i class="fa-solid fa-code"></i> ${hasLeetcode ? "LeetCode" : "LeetCode: Not Available"}
          </a>
          <a class="btn btn-github ${hasGithub ? "" : "disabled"}" href="${hasGithub ? student.githubLink : "javascript:void(0)"}" target="${hasGithub ? "_blank" : ""}" rel="noopener noreferrer" aria-label="Open GitHub profile">
            <i class="fa-brands fa-github"></i> ${hasGithub ? "GitHub" : "GitHub: Not Available"}
          </a>
        </div>
      `;

            // Prevent the profile buttons from also triggering the modal
            card.querySelectorAll(".btn").forEach((btn) => {
                btn.addEventListener("click", (e) => e.stopPropagation());
            });

            card.addEventListener("click", () => {
                try {
                    openModal(student);
                } catch (err) {
                    console.error("Failed to open modal:", err);
                }
            });
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    try {
                        openModal(student);
                    } catch (err) {
                        console.error("Failed to open modal:", err);
                    }
                }
            });

            cardGrid.appendChild(card);
        });

        statShowing.textContent = students.length;
        statusLine.textContent = currentQuery
            ? `grep "${currentQuery}" ./students`
            : "ls ./students --all";
    }

    // ==========================================================================
    // Filtering + sorting
    // ==========================================================================

    function getFilteredSorted() {
        let list = [...allStudents];

        if (currentQuery) {
            const q = currentQuery.toLowerCase();
            list = list.filter(
                (s) =>
                    s.name.toLowerCase().includes(q) ||
                    s.id.toLowerCase().includes(q)
            );
        }

        switch (currentSort) {
            case "az":
                list.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "za":
                list.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case "id":
                list.sort((a, b) => a.id.localeCompare(b.id));
                break;
            default:
                // keep original JSON order
                break;
        }

        return list;
    }

    function update() {
        renderCards(getFilteredSorted());
    }

    // ==========================================================================
    // Modal
    // ==========================================================================

    function openModal(student) {
        // Defensive guard: if something calls openModal without a valid
        // student object, log it clearly instead of silently rendering blank.
        if (!student || typeof student !== "object") {
            console.error("openModal called with invalid student:", student);
            return;
        }

        console.log("Opening modal for:", student); // remove once confirmed working

        const [c1, c2] = accentFor(student);
        modalAvatar.style.setProperty("--card-accent", c1);
        modalAvatar.style.setProperty("--card-accent-2", c2);
        modalAvatar.textContent = initials(student.name);

        modalName.textContent = safe(student.name);
        modalId.textContent = `// ${safe(student.id)}`;
        modalEmail.textContent = safe(student.email);
        modalPhone.textContent = safe(student.phoneNumber);
        modalDob.textContent = safe(student.dob);

        modalLeetcode.href = student.leetcodeProfile || "#";
        modalGithub.href = student.githubLink || "#";

        modalOverlay.hidden = false;
        document.body.style.overflow = "hidden";
        modalClose.focus();
    }

    function closeModal() {
        modalOverlay.hidden = true;
        document.body.style.overflow = "";
    }

    modalClose.addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modalOverlay.hidden) closeModal();
    });

    // ==========================================================================
    // Search + sort listeners
    // ==========================================================================

    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            currentQuery = e.target.value.trim();
            update();
        }, 120);
    });

    sortSelect.addEventListener("change", (e) => {
        currentSort = e.target.value;
        update();
    });

    // ==========================================================================
    // Theme toggle (defaults to system preference; no persistence storage used)
    // ==========================================================================

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        const icon = themeToggle.querySelector("i");
        icon.className = theme === "light" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }

    themeToggle.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
        applyTheme(current === "light" ? "dark" : "light");
    });

    // Initialize theme from system preference
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(prefersLight ? "light" : "dark");

    // ==========================================================================
    // Data fetch
    // ==========================================================================

    fetch("students.json")
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then((data) => {
            allStudents = Array.isArray(data) ? data : [];
            statTotal.textContent = allStudents.length;
            loadingState.hidden = true;
            update();
        })
        .catch((err) => {
            loadingState.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p><span class="prompt-symbol">$</span> error: failed to load students.json</p>
        <span class="empty-sub">${escapeHtml(err.message)}</span>
      `;
        });
})();