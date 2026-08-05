/**
 * LEETCODE PROGRESS TRACKER — APP SCRIPT
 * Fetches student data from students.json, pulls live stats from LeetCode API,
 * and dynamically populates a premium dark-theme developer dashboard.
 */

(() => {
    "use strict";

    // ---- Configuration ----
    const LEETCODE_API_BASE = "https://leetcode-api-pied.vercel.app/user/";
    const MAX_PROBLEMS_ESTIMATE = { easy: 800, medium: 1600, hard: 700 };

    // ---- State ----
    let studentsRaw = [];
    let combinedData = [];
    let currentFilter = "all";
    let searchQuery = "";
    let currentSort = "total-desc";
    let isFetching = false;

    // ---- DOM Elements ----
    const cardGrid = document.getElementById("cardGrid");
    const searchInput = document.getElementById("searchInput");
    const clearSearchBtn = document.getElementById("clearSearchBtn");
    const sortSelect = document.getElementById("sortSelect");
    const refreshBtn = document.getElementById("refreshBtn");
    const refreshIcon = document.getElementById("refreshIcon");
    const emptyState = document.getElementById("emptyState");
    const emptyQueryText = document.getElementById("emptyQueryText");
    const resetSearchBtn = document.getElementById("resetSearchBtn");
    const lastUpdatedText = document.getElementById("lastUpdatedText");

    // Metrics DOM
    const metricTotalStudents = document.getElementById("metricTotalStudents");
    const metricTotalSolved = document.getElementById("metricTotalSolved");
    const metricAvgSolved = document.getElementById("metricAvgSolved");
    const metricTopPerformer = document.getElementById("metricTopPerformer");
    const countAll = document.getElementById("countAll");

    // Modal DOM
    const profileModal = document.getElementById("profileModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const modalStudentName = document.getElementById("modalStudentName");
    const modalUsername = document.getElementById("modalUsername");
    const modalAvatar = document.getElementById("modalAvatar");
    const modalRankPill = document.getElementById("modalRankPill");
    const modalTotalSolved = document.getElementById("modalTotalSolved");
    const modalAcceptanceRate = document.getElementById("modalAcceptanceRate");
    const modalReputation = document.getElementById("modalReputation");
    const modalEasyCount = document.getElementById("modalEasyCount");
    const modalMediumCount = document.getElementById("modalMediumCount");
    const modalHardCount = document.getElementById("modalHardCount");
    const modalEasyBar = document.getElementById("modalEasyBar");
    const modalMediumBar = document.getElementById("modalMediumBar");
    const modalHardBar = document.getElementById("modalHardBar");
    const modalId = document.getElementById("modalId");
    const modalDob = document.getElementById("modalDob");
    const modalEmail = document.getElementById("modalEmail");
    const modalPhone = document.getElementById("modalPhone");
    const modalLeetCodeLink = document.getElementById("modalLeetCodeLink");
    const modalGitHubLink = document.getElementById("modalGitHubLink");

    // Filter Buttons
    const tabBtns = document.querySelectorAll(".tab-btn");

    // ==========================================================================
    // INITIALIZATION & DATA FETCHING
    // ==========================================================================

    async function init() {
        setupEventListeners();
        renderSkeletons(12);
        await loadDashboardData();
    }

    /**
     * Main Data Loading Pipeline:
     * 1. Fetch local students.json
     * 2. Parallel fetch live LeetCode stats per student using Promise.allSettled
     */
    async function loadDashboardData() {
        if (isFetching) return;
        isFetching = true;
        setLoadingState(true);

        try {
            // Step 1: Fetch local students.json
            const res = await fetch("students.json");
            if (!res.ok) throw new Error(`HTTP error fetching students.json: ${res.status}`);
            studentsRaw = await res.json();

            countAll.textContent = studentsRaw.length;

            // Render matching number of skeletons if initial load
            if (combinedData.length === 0) {
                renderSkeletons(studentsRaw.length);
            }

            // Step 2: Fetch LeetCode API for each student in parallel
            const fetchPromises = studentsRaw.map(student => fetchStudentLeetCodeStats(student));
            const results = await Promise.allSettled(fetchPromises);

            combinedData = results.map((res, index) => {
                if (res.status === "fulfilled") {
                    return res.value;
                } else {
                    const student = studentsRaw[index];
                    return createErrorProfile(student, res.reason?.message || "Failed to fetch profile");
                }
            });

            // Update Metrics Summary
            updateMetricsSummary();

            // Render Filtered Cards
            renderDashboard();

            // Update Last Updated Timestamp
            const now = new Date();
            lastUpdatedText.textContent = `Updated ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

        } catch (err) {
            console.error("Dashboard initialization error:", err);
            cardGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-icon"><i class="fa-solid fa-triangle-exclamation" style="color: var(--hard-color)"></i></div>
                    <h3>Failed to Load Student Data</h3>
                    <p>${escapeHtml(err.message)}</p>
                    <button onclick="location.reload()" class="btn-secondary">Retry Loading</button>
                </div>
            `;
        } finally {
            isFetching = false;
            setLoadingState(false);
        }
    }

    /**
     * Fetch single student's live LeetCode data from API
     */
    async function fetchStudentLeetCodeStats(student) {
        const username = student.username || extractUsernameFromUrl(student.leetcodeProfile);
        if (!username) {
            return createErrorProfile(student, "No username provided");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

        try {
            const response = await fetch(`${LEETCODE_API_BASE}${encodeURIComponent(username)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                return createErrorProfile(student, `API Status: ${response.status}`);
            }

            const data = await response.json();
            if (data.errors || data.message === "user does not exist") {
                return createErrorProfile(student, "LeetCode user not found");
            }

            // Extract API Fields safely
            const profile = data.profile || {};
            const submitStats = data.submitStats || {};
            const acNums = submitStats.acSubmissionNum || [];
            const totalNums = submitStats.totalSubmissionNum || [];

            const findAc = (diff) => acNums.find(item => item.difficulty === diff)?.count || 0;
            const findSubmissionsAc = () => acNums.find(item => item.difficulty === "All")?.submissions || 0;
            const findTotalSubmissions = () => totalNums.find(item => item.difficulty === "All")?.submissions || 0;

            const totalSolved = findAc("All");
            const easySolved = findAc("Easy");
            const mediumSolved = findAc("Medium");
            const hardSolved = findAc("Hard");

            const acSubmissions = findSubmissionsAc();
            const totalSubmissions = findTotalSubmissions();

            let acceptanceRate = "N/A";
            if (totalSubmissions > 0) {
                acceptanceRate = ((acSubmissions / totalSubmissions) * 100).toFixed(1) + "%";
            }

            return {
                student,
                username,
                name: student.name || username,
                dob: student.dob || "N/A",
                avatar: profile.userAvatar || student.avatar || "",
                ranking: profile.ranking || Infinity,
                reputation: profile.reputation || 0,
                totalSolved,
                easySolved,
                mediumSolved,
                hardSolved,
                acceptanceRate,
                githubUrl: student.githubUrl || student.githubLink || "#",
                leetcodeProfile: student.leetcodeProfile || `https://leetcode.com/u/${username}/`,
                isError: false,
                errorMessage: ""
            };

        } catch (err) {
            clearTimeout(timeoutId);
            return createErrorProfile(student, err.name === 'AbortError' ? 'Request timed out' : 'Network error');
        }
    }

    function createErrorProfile(student, errorMsg) {
        const username = student.username || extractUsernameFromUrl(student.leetcodeProfile) || "unknown";
        return {
            student,
            username,
            name: student.name || username,
            dob: student.dob || "N/A",
            avatar: student.avatar || "",
            ranking: Infinity,
            reputation: 0,
            totalSolved: 0,
            easySolved: 0,
            mediumSolved: 0,
            hardSolved: 0,
            acceptanceRate: "N/A",
            githubUrl: student.githubUrl || student.githubLink || "#",
            leetcodeProfile: student.leetcodeProfile || `https://leetcode.com/u/${username}/`,
            isError: true,
            errorMessage: errorMsg
        };
    }

    // ==========================================================================
    // RENDERING LOGIC
    // ==========================================================================

    function renderSkeletons(count = 8) {
        cardGrid.innerHTML = "";
        for (let i = 0; i < count; i++) {
            const skel = document.createElement("div");
            skel.className = "skeleton-card";
            skel.innerHTML = `
                <div class="card-header">
                    <div class="skeleton-box skeleton-avatar"></div>
                    <div style="flex:1;">
                        <div class="skeleton-box skeleton-title"></div>
                        <div class="skeleton-box skeleton-subtitle"></div>
                        <div class="skeleton-box skeleton-subtitle" style="width:70px; margin-top:4px;"></div>
                    </div>
                    <div class="skeleton-box skeleton-badge"></div>
                </div>
                <div class="skeleton-box skeleton-box-lg"></div>
                <div style="display:flex; flex-direction:column; gap:0.5rem;">
                    <div class="skeleton-box skeleton-bar"></div>
                    <div class="skeleton-box skeleton-bar"></div>
                    <div class="skeleton-box skeleton-bar"></div>
                </div>
            `;
            cardGrid.appendChild(skel);
        }
    }

    function renderDashboard() {
        let filtered = [...combinedData];

        // 1. Search Filter
        if (searchQuery.trim() !== "") {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(item => {
                const nameMatch = item.name.toLowerCase().includes(q);
                const userMatch = item.username.toLowerCase().includes(q);
                const idMatch = (item.student.id || "").toLowerCase().includes(q);
                const dobMatch = (item.dob || "").toLowerCase().includes(q);
                return nameMatch || userMatch || idMatch || dobMatch;
            });
        }

        // 2. Tab Filter
        if (currentFilter === "top10") {
            const validRanked = [...filtered].filter(d => !d.isError && d.ranking !== Infinity);
            validRanked.sort((a, b) => a.ranking - b.ranking);
            filtered = validRanked.slice(0, 10);
        } else if (currentFilter === "active") {
            filtered = filtered.filter(d => d.totalSolved >= 50);
        } else if (currentFilter === "hard") {
            filtered = filtered.filter(d => d.hardSolved > 0);
        }

        // 3. Sorting
        filtered.sort((a, b) => {
            if (a.isError && !b.isError) return 1;
            if (!a.isError && b.isError) return -1;

            switch (currentSort) {
                case "rank-asc":
                    return a.ranking - b.ranking;
                case "total-desc":
                    return b.totalSolved - a.totalSolved;
                case "easy-desc":
                    return b.easySolved - a.easySolved;
                case "medium-desc":
                    return b.mediumSolved - a.mediumSolved;
                case "hard-desc":
                    return b.hardSolved - a.hardSolved;
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                default:
                    return b.totalSolved - a.totalSolved;
            }
        });

        // 4. Update UI Grid
        cardGrid.innerHTML = "";

        if (filtered.length === 0) {
            emptyState.hidden = false;
            emptyQueryText.textContent = searchQuery;
        } else {
            emptyState.hidden = true;
            filtered.forEach(data => {
                const cardNode = createProfileCard(data);
                cardGrid.appendChild(cardNode);
            });
        }
    }

    function createProfileCard(data) {
        const card = document.createElement("div");
        card.className = "dev-card";

        const initials = getInitials(data.name);
        const rankFormatted = data.ranking && data.ranking !== Infinity ? `#${data.ranking.toLocaleString()}` : "Unranked";
        const avatarHtml = data.avatar
            ? `<img src="${escapeHtml(data.avatar)}" alt="${escapeHtml(data.name)}" class="dev-avatar-img" onerror="this.outerHTML='<span>${initials}</span>'" />`
            : `<span>${initials}</span>`;

        if (data.isError) {
            card.innerHTML = `
                <div class="card-header">
                    <div class="dev-avatar-wrapper">
                        <div class="dev-avatar">${avatarHtml}</div>
                    </div>
                    <div class="dev-identity">
                        <div class="dev-name">${escapeHtml(data.name)}</div>
                        <div class="dev-username">@${escapeHtml(data.username)}</div>
                        <div class="dev-dob" title="Date of Birth"><i class="fa-solid fa-cake-candles"></i> ${escapeHtml(data.dob)}</div>
                    </div>
                    <span class="rank-badge" style="background:rgba(239,68,68,0.12); color:var(--hard-color); border-color:rgba(239,68,68,0.3)">Error</span>
                </div>

                <div class="error-card-body">
                    <div class="error-badge">
                        <i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(data.errorMessage)}
                    </div>
                </div>

                <div class="card-actions">
                    <a href="${escapeHtml(data.leetcodeProfile)}" target="_blank" rel="noopener noreferrer" class="card-btn leetcode">
                        <i class="fa-solid fa-code"></i> LeetCode Profile
                    </a>
                    <a href="${escapeHtml(data.githubUrl)}" target="_blank" rel="noopener noreferrer" class="card-btn github">
                        <i class="fa-brands fa-github"></i> GitHub
                    </a>
                </div>
            `;
            return card;
        }

        // Percentage for visual bars (relative scale for UI animation)
        const total = Math.max(data.totalSolved, 1);
        const easyPct = Math.min((data.easySolved / total) * 100, 100).toFixed(1);
        const medPct = Math.min((data.mediumSolved / total) * 100, 100).toFixed(1);
        const hardPct = Math.min((data.hardSolved / total) * 100, 100).toFixed(1);

        card.innerHTML = `
            <div class="card-header">
                <div class="dev-avatar-wrapper">
                    <div class="dev-avatar">${avatarHtml}</div>
                    <div class="online-dot" title="Active Account"></div>
                </div>
                <div class="dev-identity">
                    <div class="dev-name" title="${escapeHtml(data.name)}">${escapeHtml(data.name)}</div>
                    <div class="dev-username">@${escapeHtml(data.username)}</div>
                    <div class="dev-dob" title="Date of Birth"><i class="fa-solid fa-cake-candles"></i> ${escapeHtml(data.dob)}</div>
                </div>
                <span class="rank-badge" title="LeetCode Global Ranking">${rankFormatted}</span>
            </div>

            <div class="card-main-metrics">
                <div class="metric-group">
                    <span class="lbl">Total Solved</span>
                    <span class="val">${data.totalSolved}</span>
                </div>
                <div class="ac-rate-badge">
                    <span class="lbl" style="font-size:0.72rem; color:var(--text-muted);">ACC. RATE</span>
                    <span class="val">${data.acceptanceRate}</span>
                </div>
            </div>

            <div class="difficulty-breakdown">
                <!-- Easy -->
                <div class="diff-row">
                    <div class="diff-header">
                        <span class="diff-name easy"><i class="fa-solid fa-circle" style="font-size:0.5rem"></i> Easy</span>
                        <span class="diff-count">${data.easySolved}</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill easy" style="width: ${easyPct}%"></div>
                    </div>
                </div>

                <!-- Medium -->
                <div class="diff-row">
                    <div class="diff-header">
                        <span class="diff-name medium"><i class="fa-solid fa-circle" style="font-size:0.5rem"></i> Medium</span>
                        <span class="diff-count">${data.mediumSolved}</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill medium" style="width: ${medPct}%"></div>
                    </div>
                </div>

                <!-- Hard -->
                <div class="diff-row">
                    <div class="diff-header">
                        <span class="diff-name hard"><i class="fa-solid fa-circle" style="font-size:0.5rem"></i> Hard</span>
                        <span class="diff-count">${data.hardSolved}</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill hard" style="width: ${hardPct}%"></div>
                    </div>
                </div>
            </div>

            <div class="card-actions">
                <a href="${escapeHtml(data.leetcodeProfile)}" target="_blank" rel="noopener noreferrer" class="card-btn leetcode" title="View LeetCode Profile">
                    <i class="fa-solid fa-code"></i> LeetCode
                </a>
                <a href="${escapeHtml(data.githubUrl)}" target="_blank" rel="noopener noreferrer" class="card-btn github" title="View GitHub Profile">
                    <i class="fa-brands fa-github"></i> GitHub
                </a>
                <button class="card-btn detail modal-trigger-btn" title="View Full Profile Details">
                    <i class="fa-solid fa-expand"></i>
                </button>
            </div>
        `;

        // Attach modal trigger listener
        card.querySelector(".modal-trigger-btn").addEventListener("click", () => {
            openProfileModal(data);
        });

        return card;
    }

    // ==========================================================================
    // METRICS SUMMARY COMPUTATION
    // ==========================================================================

    function updateMetricsSummary() {
        const validProfiles = combinedData.filter(d => !d.isError);
        const totalStudents = studentsRaw.length;

        // 1. Total Solved across cohort
        const totalSolvedSum = validProfiles.reduce((acc, curr) => acc + curr.totalSolved, 0);

        // 2. Average Solved
        const avgSolved = validProfiles.length > 0 ? (totalSolvedSum / validProfiles.length).toFixed(1) : 0;

        // Animate counter values
        if (metricTotalStudents) animateCounter(metricTotalStudents, totalStudents);
        if (metricTotalSolved) animateCounter(metricTotalSolved, totalSolvedSum);
        if (metricAvgSolved) animateCounter(metricAvgSolved, avgSolved);

        if (metricTopPerformer) {
            let topStudent = validProfiles.length > 0 ? validProfiles.reduce((max, curr) => curr.totalSolved > max.totalSolved ? curr : max, validProfiles[0]) : null;
            if (topStudent) {
                metricTopPerformer.textContent = `${topStudent.name} (${topStudent.totalSolved})`;
                metricTopPerformer.title = `${topStudent.name} — ${topStudent.totalSolved} Problems Solved`;
            } else {
                metricTopPerformer.textContent = "N/A";
            }
        }
    }

    function animateCounter(element, targetNum) {
        const num = parseFloat(targetNum);
        if (isNaN(num)) {
            element.textContent = targetNum;
            return;
        }

        let start = 0;
        const duration = 800; // ms
        const stepTime = 20;
        const steps = duration / stepTime;
        const increment = num / steps;

        const timer = setInterval(() => {
            start += increment;
            if (start >= num) {
                element.textContent = Number.isInteger(num) ? num.toLocaleString() : num;
                clearInterval(timer);
            } else {
                element.textContent = Number.isInteger(num) ? Math.floor(start).toLocaleString() : start.toFixed(1);
            }
        }, stepTime);
    }

    // ==========================================================================
    // MODAL PROFILE LOGIC
    // ==========================================================================

    function openProfileModal(data) {
        const initials = getInitials(data.name);

        modalStudentName.textContent = data.name;
        modalUsername.textContent = `@${data.username}`;
        modalRankPill.textContent = data.ranking !== Infinity ? `#${data.ranking.toLocaleString()}` : "Unranked";
        
        if (data.avatar) {
            modalAvatar.innerHTML = `<img src="${escapeHtml(data.avatar)}" alt="${escapeHtml(data.name)}" onerror="this.outerHTML='${initials}'" />`;
        } else {
            modalAvatar.textContent = initials;
        }

        modalTotalSolved.textContent = data.totalSolved;
        modalAcceptanceRate.textContent = data.acceptanceRate;
        modalReputation.textContent = data.reputation;

        modalEasyCount.textContent = data.easySolved;
        modalMediumCount.textContent = data.mediumSolved;
        modalHardCount.textContent = data.hardSolved;

        // Progress bar widths (max estimate for visual fullness)
        modalEasyBar.style.width = `${Math.min((data.easySolved / 400) * 100, 100)}%`;
        modalMediumBar.style.width = `${Math.min((data.mediumSolved / 400) * 100, 100)}%`;
        modalHardBar.style.width = `${Math.min((data.hardSolved / 150) * 100, 100)}%`;

        modalId.textContent = data.student.id || "N/A";
        if (modalDob) modalDob.textContent = data.dob || "N/A";
        modalEmail.textContent = data.student.email || "N/A";
        modalPhone.textContent = data.student.phoneNumber || "N/A";

        modalLeetCodeLink.href = data.leetcodeProfile;
        modalGitHubLink.href = data.githubUrl;

        profileModal.hidden = false;
        document.body.style.overflow = "hidden"; // Lock background scroll
    }

    function closeProfileModal() {
        profileModal.hidden = true;
        document.body.style.overflow = "";
    }

    // ==========================================================================
    // EVENT LISTENERS & HELPERS
    // ==========================================================================

    function setupEventListeners() {
        // Search Input
        searchInput.addEventListener("input", (e) => {
            searchQuery = e.target.value;
            clearSearchBtn.hidden = searchQuery.length === 0;
            renderDashboard();
        });

        // Clear Search Button
        clearSearchBtn.addEventListener("click", () => {
            searchInput.value = "";
            searchQuery = "";
            clearSearchBtn.hidden = true;
            renderDashboard();
            searchInput.focus();
        });

        // Reset Search Btn in Empty State
        resetSearchBtn.addEventListener("click", () => {
            searchInput.value = "";
            searchQuery = "";
            clearSearchBtn.hidden = true;
            renderDashboard();
        });

        // Sort Selection
        sortSelect.addEventListener("change", (e) => {
            currentSort = e.target.value;
            renderDashboard();
        });

        // Filter Tabs
        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                tabBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                currentFilter = btn.dataset.filter;
                renderDashboard();
            });
        });

        // Refresh Button
        refreshBtn.addEventListener("click", async () => {
            refreshIcon.classList.add("spinning");
            await loadDashboardData();
            setTimeout(() => refreshIcon.classList.remove("spinning"), 600);
        });

        // Modal Close
        closeModalBtn.addEventListener("click", closeProfileModal);
        profileModal.addEventListener("click", (e) => {
            if (e.target === profileModal) closeProfileModal();
        });

        // Keyboard Shortcuts
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !profileModal.hidden) {
                closeProfileModal();
            }
            if (e.key === "/" && document.activeElement !== searchInput) {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }

    function setLoadingState(loading) {
        if (loading) {
            refreshBtn.disabled = true;
        } else {
            refreshBtn.disabled = false;
        }
    }

    function getInitials(name) {
        if (!name) return "??";
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function extractUsernameFromUrl(url) {
        if (!url) return "";
        const match = url.match(/leetcode\.com\/(?:u\/)?([^\/]+)/i);
        return match ? match[1] : "";
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initialize Application
    document.addEventListener("DOMContentLoaded", init);

})();