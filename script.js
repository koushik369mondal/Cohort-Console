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
    let currentSort = "name-asc";
    let isFetching = false;

    // ---- Cohorts State & Config ----
    let currentCohort = null;
    let currentCohortId = null;

    const defaultCohorts = [
        {
            id: "2023-27",
            title: "2023–27 B-Tech",
            subtitle: "Student Cohort",
            studentCount: 28,
            studentsFile: "students.json",
            department: "Computer Science & Engineering",
            academicYears: "2023 – 2027",
            status: "active",
            description: "Active B-Tech cohort tracking live LeetCode competitive programming progress, contest ratings, and submission history."
        }
    ];

    const getCohorts = () => window.COHORTS_CONFIG || window.cohorts || defaultCohorts;

    // ---- DOM Elements ----
    const cohortsView = document.getElementById("cohortsView");
    const dashboardView = document.getElementById("dashboardView");
    const cohortsGrid = document.getElementById("cohortsGrid");
    const backToCohortsBtn = document.getElementById("backToCohortsBtn");
    const activeCohortPill = document.getElementById("activeCohortPill");
    const brandSubtitle = document.getElementById("brandSubtitle");
    const headerControls = document.getElementById("headerControls");

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
    const metricMeanSolved = document.getElementById("metricMeanSolved") || document.getElementById("metricAvgSolved");
    const metricAvgSolved = metricMeanSolved;
    const metricMedianSolved = document.getElementById("metricMedianSolved");
    const metricModeSolved = document.getElementById("metricModeSolved");
    const metricTopPerformer = document.getElementById("metricTopPerformer");
    const countAll = document.getElementById("countAll");

    // Modal DOM
    const profileModal = document.getElementById("profileModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const modalStudentName = document.getElementById("modalStudentName");
    const modalUsername = document.getElementById("modalUsername");
    const modalAvatar = document.getElementById("modalAvatar");
    const modalRankPill = document.getElementById("modalRankPill");
    const modalCountryPill = document.getElementById("modalCountryPill");
    const modalCountry = document.getElementById("modalCountry");
    const modalSchoolPill = document.getElementById("modalSchoolPill");
    const modalSchool = document.getElementById("modalSchool");
    const modalBio = document.getElementById("modalBio");
    const modalTotalSolved = document.getElementById("modalTotalSolved");
    const modalAcceptanceRate = document.getElementById("modalAcceptanceRate");
    const modalTotalSubmissionsCount = document.getElementById("modalTotalSubmissionsCount");
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

    // Modal Tabs & Panes
    const modalTabBtns = document.querySelectorAll(".modal-tab-btn");
    const modalPanes = document.querySelectorAll(".modal-pane");
    const modalSyncIndicator = document.getElementById("modalSyncIndicator");

    // Activity & Heatmap DOM
    const modalStreak = document.getElementById("modalStreak");
    const modalActiveDays = document.getElementById("modalActiveDays");
    const modalActiveYears = document.getElementById("modalActiveYears");
    const modalCalendarHeatmap = document.getElementById("modalCalendarHeatmap");
    const heatmapTooltip = document.getElementById("heatmapTooltip");
    const heatmapDayPopup = document.getElementById("heatmapDayPopup");
    const popupDate = document.getElementById("popupDate");
    const popupCount = document.getElementById("popupCount");
    const popupCloseBtn = document.getElementById("popupCloseBtn");
    const popupBody = document.getElementById("popupBody");
    let activeHeatmapCell = null;
    const problemDifficultyCache = new Map();

    // Contests DOM
    const contestsContent = document.getElementById("contestsContent");
    const contestsEmptyState = document.getElementById("contestsEmptyState");
    const modalContestRating = document.getElementById("modalContestRating");
    const modalContestRanking = document.getElementById("modalContestRanking");
    const modalContestAttended = document.getElementById("modalContestAttended");
    const modalContestTopPct = document.getElementById("modalContestTopPct");
    const modalContestChart = document.getElementById("modalContestChart");
    const contestHistoryTbody = document.getElementById("contestHistoryTbody");

    // Submissions DOM
    const modalSubmissionsCount = document.getElementById("modalSubmissionsCount");
    const submissionsTbody = document.getElementById("submissionsTbody");

    // Skills & Badges DOM
    const modalBadgesCount = document.getElementById("modalBadgesCount");
    const modalBadgesGrid = document.getElementById("modalBadgesGrid");
    const modalAdvancedSkills = document.getElementById("modalAdvancedSkills");
    const modalIntermediateSkills = document.getElementById("modalIntermediateSkills");
    const modalFundamentalSkills = document.getElementById("modalFundamentalSkills");

    // Cache & Detail State
    const detailCache = new Map();
    let currentModalStudent = null;

    // Filter Buttons
    const tabBtns = document.querySelectorAll(".tab-btn");

    // ==========================================================================
    // INITIALIZATION, ROUTING & DATA FETCHING
    // ==========================================================================

    async function init() {
        setupEventListeners();
        setupModalTabs();
        renderCohortsPage();

        // Listen to URL hash and history state changes
        window.addEventListener("hashchange", handleRouting);
        window.addEventListener("popstate", handleRouting);

        // Handle initial navigation based on URL
        await handleRouting();
    }

    /**
     * Render the Cohort Cards on the Homepage
     */
    function renderCohortsPage() {
        if (!cohortsGrid) return;
        const list = getCohorts();
        cohortsGrid.innerHTML = list.map(cohort => {
            const isActive = cohort.status !== "upcoming";
            const studentCount = cohort.studentCount || (cohort.id === "2023-27" ? 28 : 0);
            return `
                <div class="cohort-card" data-cohort-id="${escapeHtml(cohort.id)}" role="button" tabindex="0" aria-label="Select ${escapeHtml(cohort.title)}">
                    <div class="cohort-card-header">
                        <div class="cohort-icon-box" aria-hidden="true">
                            <i class="fa-solid fa-graduation-cap"></i>
                        </div>
                        <span class="cohort-status-badge ${isActive ? 'active' : 'upcoming'}">
                            ${isActive ? '<span class="pulse-dot"></span> Active' : '<i class="fa-regular fa-clock"></i> Upcoming'}
                        </span>
                    </div>
                    <div class="cohort-card-body">
                        <h2 class="cohort-card-title">${escapeHtml(cohort.title)}</h2>
                        <p class="cohort-card-subtitle">${escapeHtml(cohort.subtitle || "Student Cohort")}</p>
                        <p class="cohort-card-desc">${escapeHtml(cohort.description || cohort.department || "Academic Student Cohort")}</p>
                    </div>
                    <div class="cohort-card-footer">
                        <div class="cohort-student-stat">
                            <i class="fa-solid fa-users"></i>
                            <span class="cohort-count-number">${studentCount}</span> Students
                        </div>
                        <button class="btn-view-cohort" data-cohort-id="${escapeHtml(cohort.id)}" aria-label="View cohort ${escapeHtml(cohort.title)}">
                            <span>View Cohort</span>
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join("");
    }

    /**
     * Parse Cohort ID from URL (hash or query param)
     */
    function getCohortIdFromUrl() {
        const hash = window.location.hash || "";
        const hashMatch = hash.match(/cohort[=/]([a-zA-Z0-9_\-]+)/i) || hash.match(/^#([a-zA-Z0-9_\-]+)$/);
        if (hashMatch && hashMatch[1] && hashMatch[1] !== "/" && hashMatch[1] !== "cohorts") {
            return decodeURIComponent(hashMatch[1]);
        }

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const paramId = urlParams.get("cohort");
            if (paramId) return paramId;
        } catch (e) {
            // ignore
        }

        return null;
    }

    /**
     * Handle routing between Cohort Selection Homepage and Student Dashboard
     */
    async function handleRouting() {
        const cohortId = getCohortIdFromUrl();
        const list = getCohorts();

        if (cohortId) {
            const found = list.find(c => c.id === cohortId);
            if (found) {
                await openCohortDashboard(found);
                return;
            }
        }

        // Default or invalid: show cohorts landing homepage
        showCohortsPage();
    }

    /**
     * Display the Homepage / Cohort Selector
     */
    function showCohortsPage() {
        currentCohortId = null;
        if (cohortsView) {
            cohortsView.style.display = "block";
            cohortsView.hidden = false;
        }
        if (dashboardView) {
            dashboardView.style.display = "none";
            dashboardView.hidden = true;
        }
        if (backToCohortsBtn) {
            backToCohortsBtn.style.display = "none";
            backToCohortsBtn.hidden = true;
        }
        if (activeCohortPill) {
            activeCohortPill.style.display = "none";
            activeCohortPill.hidden = true;
        }
        if (headerControls) {
            headerControls.style.display = "none";
            headerControls.hidden = true;
        }
        if (brandSubtitle) {
            brandSubtitle.textContent = "Student Cohort Performance Dashboard";
        }
        document.title = "Cohort Console — Developer Dashboard";
        closeProfileModal();
    }

    /**
     * Display the Student Dashboard for a specific cohort
     */
    async function openCohortDashboard(cohort) {
        if (cohortsView) {
            cohortsView.style.display = "none";
            cohortsView.hidden = true;
        }
        if (dashboardView) {
            dashboardView.style.display = "block";
            dashboardView.hidden = false;
        }
        if (backToCohortsBtn) {
            backToCohortsBtn.style.display = "inline-flex";
            backToCohortsBtn.hidden = false;
        }
        if (activeCohortPill) {
            activeCohortPill.style.display = "inline-flex";
            activeCohortPill.hidden = false;
            activeCohortPill.textContent = cohort.title;
        }
        if (headerControls) {
            headerControls.style.display = "flex";
            headerControls.hidden = false;
        }
        if (brandSubtitle) {
            brandSubtitle.textContent = `${cohort.title} • Performance Dashboard`;
        }
        document.title = `${cohort.title} — Cohort Console`;

        // If switching cohort or first time loading this cohort
        if (currentCohortId !== cohort.id) {
            currentCohort = cohort;
            currentCohortId = cohort.id;

            // Reset filters & state
            currentFilter = "all";
            searchQuery = "";
            if (searchInput) searchInput.value = "";
            if (clearSearchBtn) clearSearchBtn.hidden = true;
            tabBtns.forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));

            combinedData = [];
            studentsRaw = [];
            detailCache.clear();

            renderSkeletons(cohort.studentCount || 12);
            await loadDashboardData(cohort);
        }
    }

    /**
     * Main Data Loading Pipeline:
     * 1. Fetch cohort's students JSON file
     * 2. Parallel fetch live LeetCode stats per student using Promise.allSettled
     */
    async function loadDashboardData(cohort = currentCohort) {
        if (isFetching) return;
        isFetching = true;
        setLoadingState(true);

        const targetFile = (cohort && cohort.studentsFile) ? cohort.studentsFile : "students.json";

        try {
            // Step 1: Fetch cohort student data
            let res;
            try {
                const studentsUrl = new URL(targetFile, window.location.href).href;
                res = await fetch(studentsUrl);
            } catch (err) {
                res = await fetch(targetFile);
            }
            if (!res.ok) throw new Error(`HTTP error fetching ${targetFile}: ${res.status}`);
            studentsRaw = await res.json();

            countAll.textContent = studentsRaw.length;
            if (cohort) {
                cohort.studentCount = studentsRaw.length;
            }

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
                country: profile.countryName || "",
                school: profile.school || "",
                bio: profile.aboutMe || "",
                solutionCount: profile.solutionCount || 0,
                postViewCount: profile.postViewCount || 0,
                totalSolved,
                easySolved,
                mediumSolved,
                hardSolved,
                totalSubmissions,
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
            country: "",
            school: "",
            bio: "",
            solutionCount: 0,
            postViewCount: 0,
            totalSolved: 0,
            easySolved: 0,
            mediumSolved: 0,
            hardSolved: 0,
            totalSubmissions: 0,
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
                    <a href="${escapeHtml(data.leetcodeProfile)}" target="_blank" rel="noopener noreferrer" class="card-btn leetcode" title="View LeetCode Profile">
                        <i class="fa-solid fa-code"></i> LeetCode Profile
                    </a>
                    <a href="${escapeHtml(data.githubUrl)}" target="_blank" rel="noopener noreferrer" class="card-btn github" title="View GitHub Profile">
                        <i class="fa-brands fa-github"></i> GitHub
                    </a>
                    <button type="button" class="card-btn detail modal-trigger-btn" data-username="${escapeHtml(data.username)}" title="View Full Profile Details" aria-label="View Full Profile Details">
                        <i class="fa-solid fa-expand fa-up-right-and-down-left-from-center" aria-hidden="true"></i>
                    </button>
                </div>
            `;

            const errTrigger = card.querySelector(".modal-trigger-btn");
            if (errTrigger) {
                errTrigger.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openProfileModal(data);
                });
            }

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
                <button type="button" class="card-btn detail modal-trigger-btn" data-username="${escapeHtml(data.username)}" title="View Full Profile Details" aria-label="View Full Profile Details">
                    <i class="fa-solid fa-expand fa-up-right-and-down-left-from-center" aria-hidden="true"></i>
                </button>
            </div>
        `;

        // Attach modal trigger listener
        const triggerBtn = card.querySelector(".modal-trigger-btn");
        if (triggerBtn) {
            triggerBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                openProfileModal(data);
            });
        }

        return card;
    }

    // ==========================================================================
    // METRICS SUMMARY COMPUTATION
    // ==========================================================================

    function updateMetricsSummary() {
        const validProfiles = combinedData.filter(d => !d.isError);
        const totalStudents = studentsRaw.length;

        // 1. Total Solved across cohort
        const totalSolvedSum = validProfiles.reduce((acc, curr) => acc + (Number(curr.totalSolved) || 0), 0);

        // Extract and sort solved counts for statistical computations
        const solvedList = validProfiles.map(d => Number(d.totalSolved) || 0).sort((a, b) => a - b);
        const count = solvedList.length;

        // 2. Mean Solved (Arithmetic Average)
        const meanRaw = count > 0 ? (totalSolvedSum / count) : 0;
        const meanSolved = count > 0
            ? (Number.isInteger(meanRaw) ? meanRaw : parseFloat(meanRaw.toFixed(1)))
            : 0;

        // 3. Median Solved (Middle value of sorted distribution)
        let medianSolved = 0;
        if (count > 0) {
            if (count % 2 === 1) {
                medianSolved = solvedList[Math.floor(count / 2)];
            } else {
                const mid = count / 2;
                const midVal = (solvedList[mid - 1] + solvedList[mid]) / 2;
                medianSolved = Number.isInteger(midVal) ? midVal : parseFloat(midVal.toFixed(1));
            }
        }

        // 4. Mode Solved (Most frequent value in distribution)
        let modeSolvedDisplay = 0;
        let modeTitle = "No data";
        if (count > 0) {
            const freqMap = new Map();
            let maxFreq = 0;
            for (const val of solvedList) {
                const f = (freqMap.get(val) || 0) + 1;
                freqMap.set(val, f);
                if (f > maxFreq) maxFreq = f;
            }

            const modes = [];
            for (const [val, f] of freqMap.entries()) {
                if (f === maxFreq) modes.push(val);
            }
            modes.sort((a, b) => a - b);

            if (maxFreq === 1 && count > 1) {
                modeSolvedDisplay = "N/A";
                modeTitle = "All solved counts are unique (no repeated mode)";
            } else if (modes.length === 1) {
                modeSolvedDisplay = modes[0];
                modeTitle = `Most frequent: ${modes[0]} problems solved (${maxFreq} ${maxFreq === 1 ? 'student' : 'students'})`;
            } else if (modes.length <= 2) {
                modeSolvedDisplay = modes.join(", ");
                modeTitle = `Bimodal: ${modes.join(" & ")} solved (${maxFreq} students each)`;
            } else {
                modeSolvedDisplay = `${modes[0]}+`;
                modeTitle = `Multimodal (${modes.length} values): ${modes.slice(0, 3).join(", ")}... (${maxFreq} students each)`;
            }
        }

        // Animate counter values
        if (metricTotalStudents) animateCounter(metricTotalStudents, totalStudents);
        if (metricTotalSolved) animateCounter(metricTotalSolved, totalSolvedSum);
        if (metricMeanSolved) animateCounter(metricMeanSolved, meanSolved);
        if (metricMedianSolved) animateCounter(metricMedianSolved, medianSolved);
        if (metricModeSolved) {
            if (typeof modeSolvedDisplay === "number") {
                animateCounter(metricModeSolved, modeSolvedDisplay);
            } else {
                metricModeSolved.textContent = modeSolvedDisplay;
            }
            metricModeSolved.title = modeTitle;
        }

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
        if (typeof targetNum === "string" && !/^-?\d+(\.\d+)?$/.test(targetNum.trim())) {
            element.textContent = targetNum;
            return;
        }

        const num = parseFloat(targetNum);
        if (isNaN(num)) {
            element.textContent = targetNum;
            return;
        }

        if (num === 0) {
            element.textContent = "0";
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
    // MODAL PROFILE LOGIC & ENRICHED DATA (LEETCODE 6 DETAILED ENDPOINTS)
    // ==========================================================================

    const LEETCODE_DETAIL_BASE = "https://leetcode-api-pied.vercel.app/user/";

    async function openProfileModal(data) {
        if (!data) return;
        currentModalStudent = data;
        const initials = getInitials(data.name);

        // Header Identity
        if (modalStudentName) modalStudentName.textContent = data.name || "Student Profile";
        if (modalUsername) modalUsername.textContent = `@${data.username || ""}`;
        if (modalRankPill) modalRankPill.textContent = (data.ranking && data.ranking !== Infinity) ? `#${data.ranking.toLocaleString()}` : "Unranked";

        if (modalCountryPill && modalCountry) {
            if (data.country) {
                modalCountry.textContent = data.country;
                modalCountryPill.hidden = false;
            } else {
                modalCountryPill.hidden = true;
            }
        }

        if (modalSchoolPill && modalSchool) {
            if (data.school) {
                modalSchool.textContent = data.school;
                modalSchoolPill.hidden = false;
            } else {
                modalSchoolPill.hidden = true;
            }
        }

        if (modalBio) {
            if (data.bio && data.bio.trim()) {
                modalBio.textContent = `“${data.bio.trim()}”`;
                modalBio.hidden = false;
            } else {
                modalBio.hidden = true;
            }
        }

        if (modalAvatar) {
            if (data.avatar) {
                modalAvatar.innerHTML = `<img src="${escapeHtml(data.avatar)}" alt="${escapeHtml(data.name)}" onerror="this.outerHTML='${initials}'" />`;
            } else {
                modalAvatar.textContent = initials;
            }
        }

        // Problem Breakdown
        if (modalTotalSolved) modalTotalSolved.textContent = data.totalSolved != null ? data.totalSolved : 0;
        if (modalAcceptanceRate) modalAcceptanceRate.textContent = data.acceptanceRate || "N/A";
        if (modalTotalSubmissionsCount) modalTotalSubmissionsCount.textContent = Number(data.totalSubmissions || 0).toLocaleString();

        if (modalEasyCount) modalEasyCount.textContent = data.easySolved != null ? data.easySolved : 0;
        if (modalMediumCount) modalMediumCount.textContent = data.mediumSolved != null ? data.mediumSolved : 0;
        if (modalHardCount) modalHardCount.textContent = data.hardSolved != null ? data.hardSolved : 0;

        // Progress bar widths (percentage of total solved, matching home page)
        const total = Math.max(data.totalSolved || 0, 1);
        const easyPct = data.totalSolved > 0 ? Math.min(((data.easySolved || 0) / total) * 100, 100).toFixed(1) : "0";
        const medPct = data.totalSolved > 0 ? Math.min(((data.mediumSolved || 0) / total) * 100, 100).toFixed(1) : "0";
        const hardPct = data.totalSolved > 0 ? Math.min(((data.hardSolved || 0) / total) * 100, 100).toFixed(1) : "0";

        if (modalEasyBar) modalEasyBar.style.width = `${easyPct}%`;
        if (modalMediumBar) modalMediumBar.style.width = `${medPct}%`;
        if (modalHardBar) modalHardBar.style.width = `${hardPct}%`;

        // Metadata from students.json
        if (modalId) modalId.textContent = (data.student && data.student.id) ? data.student.id : "N/A";
        if (modalDob) modalDob.textContent = data.dob || "N/A";
        if (modalEmail) modalEmail.textContent = (data.student && data.student.email) ? data.student.email : "N/A";
        if (modalPhone) modalPhone.textContent = (data.student && data.student.phoneNumber) ? data.student.phoneNumber : "N/A";

        if (modalLeetCodeLink) modalLeetCodeLink.href = data.leetcodeProfile || "#";
        if (modalGitHubLink) modalGitHubLink.href = data.githubUrl || "#";

        // Reset to Overview tab
        if (modalTabBtns) modalTabBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === "overview"));
        if (modalPanes) modalPanes.forEach(pane => pane.classList.toggle("active", pane.id === "pane-overview"));

        // Open modal backdrop with explicit display support
        if (profileModal) {
            profileModal.hidden = false;
            profileModal.removeAttribute("hidden");
            profileModal.style.display = "flex";
        }
        document.body.style.overflow = "hidden"; // Lock background scroll

        // Fetch or load from cache the detailed endpoints
        if (data.username && data.username !== "unknown") {
            await loadStudentDetailedData(data.username);
        }
    }

    function closeProfileModal() {
        if (profileModal) {
            profileModal.hidden = true;
            profileModal.setAttribute("hidden", "");
            profileModal.style.display = "none";
        }
        document.body.style.overflow = "";
        currentModalStudent = null;
        if (heatmapTooltip) heatmapTooltip.hidden = true;
        closeDayPopup();
    }

    /**
     * Fetches detailed data across the detailed endpoints using Promise.allSettled
     * and caches the result by username.
     */
    async function loadStudentDetailedData(username) {
        if (!username || username === "unknown") return;

        // 1. Check in-memory cache
        if (detailCache.has(username)) {
            const cached = detailCache.get(username);
            populateDetailSections(cached, username);
            return;
        }

        // Show live sync indicator
        if (modalSyncIndicator) modalSyncIndicator.hidden = false;

        const endpoints = ["contests", "submissions", "calendar", "badges", "skills"];
        const hasTimeout = typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function";
        const promises = endpoints.map(ep =>
            fetch(`${LEETCODE_DETAIL_BASE}${encodeURIComponent(username)}/${ep}`, {
                signal: hasTimeout ? AbortSignal.timeout(12000) : undefined
            })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
        );

        const results = await Promise.allSettled(promises);

        const detailData = {
            contests: results[0].status === "fulfilled" ? results[0].value : null,
            submissions: results[1].status === "fulfilled" ? results[1].value : null,
            calendar: results[2].status === "fulfilled" ? results[2].value : null,
            badges: results[3].status === "fulfilled" ? results[3].value : null,
            skills: results[4].status === "fulfilled" ? results[4].value : null
        };

        // Cache result
        detailCache.set(username, detailData);

        if (modalSyncIndicator) modalSyncIndicator.hidden = true;

        // Populate detail panes if the user hasn't switched to another student
        if (currentModalStudent && currentModalStudent.username === username) {
            populateDetailSections(detailData, username);
        }
    }

    function populateDetailSections(details, username) {
        renderCalendarHeatmap(details.calendar, details.submissions);
        renderContestSection(details.contests);
        renderSubmissionsSection(details.submissions);
        renderSkillsAndBadges(details.skills, details.badges);
    }

    async function fetchProblemDifficulty(titleSlug) {
        if (!titleSlug) return null;
        if (problemDifficultyCache.has(titleSlug)) return problemDifficultyCache.get(titleSlug);
        try {
            const res = await fetch(`https://leetcode-api-pied.vercel.app/problem/${encodeURIComponent(titleSlug)}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.difficulty) {
                    problemDifficultyCache.set(titleSlug, data.difficulty);
                    return data.difficulty;
                }
            }
        } catch (e) {
            // ignore network issues
        }
        return null;
    }

    function closeDayPopup() {
        if (heatmapDayPopup) {
            heatmapDayPopup.hidden = true;
            heatmapDayPopup.setAttribute("hidden", "");
        }
        if (activeHeatmapCell) {
            activeHeatmapCell.classList.remove("active-cell");
            activeHeatmapCell = null;
        }
    }

    function openDayPopup(cell, dateKey, dateObj, count, daySubmissions) {
        if (!heatmapDayPopup) return;

        if (heatmapTooltip) heatmapTooltip.hidden = true;

        if (activeHeatmapCell === cell && !heatmapDayPopup.hidden) {
            closeDayPopup();
            return;
        }

        if (activeHeatmapCell) {
            activeHeatmapCell.classList.remove("active-cell");
        }
        activeHeatmapCell = cell;
        cell.classList.add("active-cell");

        const formattedDate = dateObj.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC"
        });

        if (popupDate) popupDate.textContent = formattedDate;
        if (popupCount) popupCount.textContent = `${count} ${count === 1 ? "Submission" : "Submissions"}`;

        if (!popupBody) return;
        popupBody.innerHTML = "";

        if (count === 0) {
            popupBody.innerHTML = `
                <div class="popup-empty-day">
                    <i class="fa-regular fa-calendar-xmark"></i>
                    <span>No submissions recorded on this date.</span>
                </div>
            `;
        } else if (daySubmissions.length > 0) {
            daySubmissions.forEach(sub => {
                const item = document.createElement("div");
                item.className = "popup-problem-item";

                const probUrl = sub.titleSlug ? `https://leetcode.com/problems/${encodeURIComponent(sub.titleSlug)}/` : "#";
                const probTitle = escapeHtml(sub.title || sub.titleSlug || "Problem");

                const status = sub.statusDisplay || "Submitted";
                let statusClass = "other";
                let statusIcon = '<i class="fa-solid fa-circle-question"></i>';

                if (status === "Accepted") {
                    statusClass = "accepted";
                    statusIcon = '<i class="fa-solid fa-check"></i>';
                } else if (status === "Wrong Answer") {
                    statusClass = "wrong-answer";
                    statusIcon = '<i class="fa-solid fa-xmark"></i>';
                } else if (status.includes("Time Limit")) {
                    statusClass = "tle";
                    statusIcon = '<i class="fa-solid fa-clock"></i>';
                } else if (status.includes("Compile")) {
                    statusClass = "wrong-answer";
                    statusIcon = '<i class="fa-solid fa-triangle-exclamation"></i>';
                }

                const cachedDiff = sub.titleSlug ? problemDifficultyCache.get(sub.titleSlug) : null;
                const diffText = cachedDiff || sub.difficulty || "--";
                const diffClass = (diffText || "").toLowerCase();

                const lang = sub.langName || sub.lang || "";

                item.innerHTML = `
                    <div class="popup-problem-top">
                        <a href="${probUrl}" target="_blank" rel="noopener noreferrer" class="popup-problem-name" title="Open on LeetCode">
                            ${probTitle} <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                    </div>
                    <div class="popup-problem-meta">
                        <span class="popup-diff-badge ${diffClass}" data-slug="${escapeHtml(sub.titleSlug || "")}">${diffText}</span>
                        <span class="popup-status-badge ${statusClass}">${statusIcon} ${escapeHtml(status)}</span>
                        ${lang ? `<span class="popup-lang-badge"><i class="fa-solid fa-code"></i> ${escapeHtml(lang)}</span>` : ""}
                    </div>
                `;

                if (!cachedDiff && sub.titleSlug) {
                    fetchProblemDifficulty(sub.titleSlug).then(diff => {
                        if (diff) {
                            const badge = item.querySelector(`.popup-diff-badge[data-slug="${sub.titleSlug}"]`);
                            if (badge) {
                                badge.textContent = diff;
                                badge.className = `popup-diff-badge ${diff.toLowerCase()}`;
                            }
                        }
                    });
                }

                popupBody.appendChild(item);
            });

            if (count > daySubmissions.length) {
                const note = document.createElement("div");
                note.className = "popup-archive-note";
                note.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${count} total submissions recorded on this date in LeetCode calendar. (${daySubmissions.length} detailed record${daySubmissions.length > 1 ? "s" : ""} from recent activity).`;
                popupBody.appendChild(note);
            }
        } else {
            popupBody.innerHTML = `
                <div class="popup-problem-item">
                    <div class="popup-problem-top">
                        <span class="popup-problem-name"><i class="fa-solid fa-code-commit" style="color:var(--cyan)"></i> Activity Recorded</span>
                    </div>
                    <div class="popup-archive-note">
                        <strong>${count} submission${count > 1 ? "s" : ""} logged</strong> on this date in LeetCode calendar. Detailed problem titles for submissions beyond the 20 most recent are archived on LeetCode.
                    </div>
                </div>
            `;
        }

        heatmapDayPopup.hidden = false;
        heatmapDayPopup.removeAttribute("hidden");

        const card = modalCalendarHeatmap.closest(".calendar-section-card");
        if (!card) return;

        const cellRect = cell.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const popupRect = heatmapDayPopup.getBoundingClientRect();

        const popupWidth = popupRect.width || 330;
        const popupHeight = popupRect.height || 180;

        // Horizontally center over the cell, clamped within the card
        let left = (cellRect.left - cardRect.left) + (cellRect.width / 2) - (popupWidth / 2);
        left = Math.max(10, Math.min(left, cardRect.width - popupWidth - 10));

        // Vertically position: default to right below the cell
        let top = (cellRect.bottom - cardRect.top) + 8;
        // If placing below exceeds available room or if placing above has ample room (at least 15px margin from card top)
        if ((cellRect.top - cardRect.top) - popupHeight - 10 > 15) {
            top = (cellRect.top - cardRect.top) - popupHeight - 8;
        }

        heatmapDayPopup.style.left = `${left}px`;
        heatmapDayPopup.style.top = `${top}px`;
    }

    /**
     * 1. Calendar Heatmap and Streak Activity (Full 1-Year GitHub Style)
     */
    function renderCalendarHeatmap(calendarData, submissionsData) {
        if (!modalCalendarHeatmap) return;
        closeDayPopup();

        const streakVal = calendarData?.streak != null ? calendarData.streak : 0;
        const activeDaysVal = calendarData?.totalActiveDays != null ? calendarData.totalActiveDays : 0;
        const activeYearsVal = calendarData?.activeYears?.length ? calendarData.activeYears.join(", ") : "N/A";

        if (modalStreak) modalStreak.textContent = streakVal;
        if (modalActiveDays) modalActiveDays.textContent = activeDaysVal;
        if (modalActiveYears) modalActiveYears.textContent = activeYearsVal;

        // Group submissions by UTC YYYY-MM-DD
        const submissionsByDate = new Map();
        if (Array.isArray(submissionsData)) {
            submissionsData.forEach(sub => {
                if (sub.titleSlug && !problemDifficultyCache.has(sub.titleSlug)) {
                    fetchProblemDifficulty(sub.titleSlug);
                }
                if (sub.timestamp) {
                    const sec = parseInt(sub.timestamp, 10);
                    if (!isNaN(sec)) {
                        const d = new Date(sec * 1000);
                        const year = d.getUTCFullYear();
                        const month = String(d.getUTCMonth() + 1).padStart(2, "0");
                        const day = String(d.getUTCDate()).padStart(2, "0");
                        const key = `${year}-${month}-${day}`;
                        if (!submissionsByDate.has(key)) {
                            submissionsByDate.set(key, []);
                        }
                        submissionsByDate.get(key).push(sub);
                    }
                }
            });
        }

        // Parse calendar timestamps into UTC YYYY-MM-DD map
        const submissionMap = new Map();
        if (calendarData?.submissionCalendar) {
            let rawCal = calendarData.submissionCalendar;
            if (typeof rawCal === "string") {
                try {
                    rawCal = JSON.parse(rawCal);
                } catch (e) {
                    rawCal = {};
                }
            }

            if (rawCal && typeof rawCal === "object") {
                Object.entries(rawCal).forEach(([ts, count]) => {
                    const sec = parseInt(ts, 10);
                    if (!isNaN(sec)) {
                        const d = new Date(sec * 1000);
                        const year = d.getUTCFullYear();
                        const month = String(d.getUTCMonth() + 1).padStart(2, "0");
                        const day = String(d.getUTCDate()).padStart(2, "0");
                        const key = `${year}-${month}-${day}`;
                        submissionMap.set(key, (submissionMap.get(key) || 0) + Number(count));
                    }
                });
            }
        }

        // Full 1 year (53 continuous weeks, 371 days) ending in current week
        modalCalendarHeatmap.innerHTML = "";
        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
        const dayOfWeek = todayUTC.getUTCDay(); // 0 = Sun, ..., 6 = Sat
        const numWeeks = 53;

        // Start on Sunday 52 weeks ago
        const startDate = new Date(todayUTC);
        startDate.setUTCDate(todayUTC.getUTCDate() - dayOfWeek - ((numWeeks - 1) * 7));

        // Build continuous month headers for all 12 months
        const monthHeaders = [];
        let lastMonth = -1;
        const monthIter = new Date(startDate);

        for (let w = 0; w < numWeeks; w++) {
            for (let d = 0; d < 7; d++) {
                const m = monthIter.getUTCMonth();
                if (m !== lastMonth) {
                    monthHeaders.push({
                        weekIndex: w,
                        name: monthIter.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
                        month: m
                    });
                    lastMonth = m;
                    break;
                }
                monthIter.setUTCDate(monthIter.getUTCDate() + 1);
            }
            monthIter.setTime(startDate.getTime() + ((w + 1) * 7 * 24 * 60 * 60 * 1000));
        }

        // Filter out initial month label if too close to the next to prevent overlap
        const filteredMonths = monthHeaders.filter((item, idx) => {
            if (idx < monthHeaders.length - 1) {
                const next = monthHeaders[idx + 1];
                if (next.weekIndex - item.weekIndex < 2) return false;
            }
            return true;
        });

        // Construct GitHub-style layout
        const header = document.createElement("div");
        header.className = "heatmap-header";

        const spacer = document.createElement("div");
        spacer.className = "heatmap-days-spacer";
        header.appendChild(spacer);

        const monthsTrack = document.createElement("div");
        monthsTrack.className = "heatmap-months-track";
        filteredMonths.forEach(m => {
            const label = document.createElement("span");
            label.className = "heatmap-month-label";
            label.textContent = m.name;
            label.style.left = `${m.weekIndex * 15}px`;
            monthsTrack.appendChild(label);
        });
        header.appendChild(monthsTrack);
        modalCalendarHeatmap.appendChild(header);

        // Body: Day labels + 53 week columns
        const body = document.createElement("div");
        body.className = "heatmap-body";

        const daysCol = document.createElement("div");
        daysCol.className = "heatmap-days-col";
        const dayNames = ["", "Mon", "", "Wed", "", "Fri", ""];
        dayNames.forEach(name => {
            const dayLabel = document.createElement("div");
            dayLabel.className = "heatmap-day-label";
            dayLabel.textContent = name;
            daysCol.appendChild(dayLabel);
        });
        body.appendChild(daysCol);

        const weeksGrid = document.createElement("div");
        weeksGrid.className = "heatmap-grid";

        const currentIter = new Date(startDate);
        for (let w = 0; w < numWeeks; w++) {
            const weekCol = document.createElement("div");
            weekCol.className = "heatmap-week";

            for (let d = 0; d < 7; d++) {
                const year = currentIter.getUTCFullYear();
                const month = String(currentIter.getUTCMonth() + 1).padStart(2, "0");
                const day = String(currentIter.getUTCDate()).padStart(2, "0");
                const dateKey = `${year}-${month}-${day}`;
                const count = submissionMap.get(dateKey) || 0;
                const isFuture = currentIter > todayUTC;

                const cell = document.createElement("div");
                if (isFuture) {
                    cell.className = "heatmap-cell future-cell";
                } else {
                    let level = "lvl-0";
                    if (count >= 10) level = "lvl-4";
                    else if (count >= 6) level = "lvl-3";
                    else if (count >= 3) level = "lvl-2";
                    else if (count >= 1) level = "lvl-1";

                    cell.className = `heatmap-cell ${level}`;
                    cell.dataset.date = currentIter.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
                    cell.dataset.count = count;
                    cell.dataset.dateKey = dateKey;

                    cell.addEventListener("mouseenter", (e) => {
                        if (heatmapTooltip && (!activeHeatmapCell || activeHeatmapCell !== cell)) {
                            const target = e.target;
                            const rect = target.getBoundingClientRect();
                            const card = modalCalendarHeatmap.closest(".calendar-section-card") || modalCalendarHeatmap.parentElement;
                            const parentRect = card.getBoundingClientRect();
                            heatmapTooltip.textContent = `${target.dataset.count} submissions on ${target.dataset.date}`;
                            heatmapTooltip.style.left = `${rect.left - parentRect.left + (rect.width / 2)}px`;
                            heatmapTooltip.style.top = `${rect.top - parentRect.top - 8}px`;
                            heatmapTooltip.hidden = false;
                        }
                    });

                    cell.addEventListener("mouseleave", () => {
                        if (heatmapTooltip) heatmapTooltip.hidden = true;
                    });

                    const iterDateSnapshot = new Date(currentIter.getTime());
                    cell.addEventListener("click", (e) => {
                        e.stopPropagation();
                        openDayPopup(cell, dateKey, iterDateSnapshot, count, submissionsByDate.get(dateKey) || []);
                    });
                }

                weekCol.appendChild(cell);
                currentIter.setUTCDate(currentIter.getUTCDate() + 1);
            }
            weeksGrid.appendChild(weekCol);
        }

        body.appendChild(weeksGrid);
        modalCalendarHeatmap.appendChild(body);

        // Scroll to recent activity on smaller screens
        const scrollContainer = modalCalendarHeatmap.closest(".heatmap-scroll-container");
        if (scrollContainer && scrollContainer.scrollWidth > scrollContainer.clientWidth) {
            scrollContainer.scrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        }
    }

    /**
     * 2. Contest Performance and Rating History Chart
     */
    function renderContestSection(contestData) {
        if (!contestsContent || !contestsEmptyState) return;

        const ranking = contestData?.userContestRanking;
        const history = contestData?.userContestRankingHistory || [];
        const attendedContests = history.filter(h => h.attended && h.rating > 0);

        if (ranking && ranking.attendedContestsCount > 0) {
            contestsContent.hidden = false;
            contestsEmptyState.hidden = true;

            modalContestRating.textContent = Math.round(ranking.rating || 0);
            modalContestRanking.textContent = ranking.globalRanking ? `#${ranking.globalRanking.toLocaleString()}` : "Unranked";
            modalContestAttended.textContent = ranking.attendedContestsCount;
            modalContestTopPct.textContent = ranking.topPercentage != null ? `${ranking.topPercentage}%` : "--";

            // Render SVG Trend Chart
            renderContestSvgChart(attendedContests);

            // Render History Table (newest first)
            renderContestHistoryTable(attendedContests);
        } else {
            contestsContent.hidden = true;
            contestsEmptyState.hidden = false;
        }
    }

    function renderContestSvgChart(attended) {
        if (!modalContestChart) return;
        modalContestChart.innerHTML = "";

        if (!attended || attended.length < 2) {
            modalContestChart.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-muted); font-size:0.85rem;">
                    <i class="fa-solid fa-chart-line" style="margin-right:0.5rem"></i> Need at least 2 attended contests to draw rating history chart.
                </div>
            `;
            return;
        }

        const ratings = attended.map(a => a.rating);
        const minRating = Math.floor(Math.min(...ratings) - 40);
        const maxRating = Math.ceil(Math.max(...ratings) + 40);
        const ratingRange = Math.max(maxRating - minRating, 1);

        const width = 600;
        const height = 150;
        const padding = 20;

        const points = attended.map((item, idx) => {
            const x = padding + (idx / (attended.length - 1)) * (width - padding * 2);
            const y = height - padding - ((item.rating - minRating) / ratingRange) * (height - padding * 2);
            return { x, y, rating: Math.round(item.rating), title: item.contest?.title || `Contest #${idx + 1}` };
        });

        const pointsString = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];
        const areaPath = `M ${firstPoint.x.toFixed(1)},${(height - padding)} L ${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")} L ${lastPoint.x.toFixed(1)},${(height - padding)} Z`;

        const svgHtml = `
            <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%; height:100%;">
                <defs>
                    <linearGradient id="contestGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35" />
                        <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0" />
                    </linearGradient>
                </defs>
                <!-- Baseline Guideline -->
                <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4" />
                <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4" />
                <!-- Area Fill -->
                <path d="${areaPath}" fill="url(#contestGradient)" />
                <!-- Polyline -->
                <polyline points="${pointsString}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                <!-- Points -->
                ${points.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#0e1424" stroke="#38bdf8" stroke-width="2"><title>${p.title}: ${p.rating}</title></circle>`).join("")}
            </svg>
        `;
        modalContestChart.innerHTML = svgHtml;
    }

    function renderContestHistoryTable(attended) {
        if (!contestHistoryTbody) return;
        contestHistoryTbody.innerHTML = "";

        const sorted = [...attended].reverse().slice(0, 15);
        if (sorted.length === 0) {
            contestHistoryTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No contests attended.</td></tr>`;
            return;
        }

        sorted.forEach(item => {
            const tr = document.createElement("tr");
            const dateStr = item.contest?.startTime ? new Date(item.contest.startTime * 1000).toLocaleDateString() : "--";
            const trendIcon = item.trendDirection === "UP" 
                ? '<i class="fa-solid fa-arrow-trend-up" style="color:var(--easy-color); margin-left:0.3rem"></i>'
                : item.trendDirection === "DOWN"
                ? '<i class="fa-solid fa-arrow-trend-down" style="color:var(--hard-color); margin-left:0.3rem"></i>'
                : "";

            tr.innerHTML = `
                <td style="font-weight:500; color:var(--text-primary)">${escapeHtml(item.contest?.title || "Contest")}</td>
                <td>${dateStr}</td>
                <td>#${item.ranking ? item.ranking.toLocaleString() : "--"}</td>
                <td style="font-family:var(--font-mono); font-weight:600; color:var(--cyan)">${Math.round(item.rating || 0)}${trendIcon}</td>
                <td><span style="color:var(--easy-color); font-weight:600">${item.problemsSolved ?? 0}</span> / ${item.totalProblems ?? 4}</td>
            `;
            contestHistoryTbody.appendChild(tr);
        });
    }

    /**
     * 3. Recent Submissions
     */
    function renderSubmissionsSection(submissionsData) {
        if (!submissionsTbody) return;
        submissionsTbody.innerHTML = "";

        if (Array.isArray(submissionsData) && submissionsData.length > 0) {
            modalSubmissionsCount.textContent = `${submissionsData.length} Submissions`;

            submissionsData.forEach(sub => {
                const tr = document.createElement("tr");
                const status = sub.statusDisplay || "Submitted";
                let statusBadgeClass = "other";
                let statusIcon = '<i class="fa-solid fa-circle-question"></i>';

                if (status === "Accepted") {
                    statusBadgeClass = "accepted";
                    statusIcon = '<i class="fa-solid fa-check"></i>';
                } else if (status === "Wrong Answer") {
                    statusBadgeClass = "wrong-answer";
                    statusIcon = '<i class="fa-solid fa-xmark"></i>';
                } else if (status.includes("Time Limit")) {
                    statusBadgeClass = "tle";
                    statusIcon = '<i class="fa-solid fa-clock"></i>';
                } else if (status.includes("Compile")) {
                    statusBadgeClass = "wrong-answer";
                    statusIcon = '<i class="fa-solid fa-triangle-exclamation"></i>';
                }

                const probUrl = sub.titleSlug ? `https://leetcode.com/problems/${encodeURIComponent(sub.titleSlug)}/` : "#";
                const dateStr = sub.timestamp ? formatRelativeTime(sub.timestamp) : "--";

                tr.innerHTML = `
                    <td>
                        <a href="${probUrl}" target="_blank" rel="noopener noreferrer" class="prob-link">
                            ${escapeHtml(sub.title || sub.titleSlug || "Problem")}
                        </a>
                    </td>
                    <td>
                        <span class="status-badge ${statusBadgeClass}">
                            ${statusIcon} ${escapeHtml(status)}
                        </span>
                    </td>
                    <td><span class="lang-badge">${escapeHtml(sub.langName || sub.lang || "Code")}</span></td>
                    <td style="font-family:var(--font-mono); font-size:0.8rem">${escapeHtml(sub.runtime || "--")}</td>
                    <td style="font-family:var(--font-mono); font-size:0.8rem">${escapeHtml(sub.memory || "--")}</td>
                    <td style="font-size:0.76rem; color:var(--text-muted)">${dateStr}</td>
                `;
                submissionsTbody.appendChild(tr);
            });
        } else {
            modalSubmissionsCount.textContent = "0 Submissions";
            submissionsTbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">
                        No recent submissions available for this user.
                    </td>
                </tr>
            `;
        }
    }

    /**
     * 4. Skills Breakdown & Badges
     */
    function renderSkillsAndBadges(skillsData, badgesData) {
        // Badges
        if (modalBadgesGrid) {
            modalBadgesGrid.innerHTML = "";
            const badgesList = badgesData?.badges || [];
            if (modalBadgesCount) modalBadgesCount.textContent = badgesList.length;

            if (badgesList.length === 0) {
                modalBadgesGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; color: var(--text-muted); font-size: 0.85rem; padding: 1rem 0;">
                        No earned LeetCode badges recorded for this developer yet.
                    </div>
                `;
            } else {
                badgesList.forEach(b => {
                    const card = document.createElement("div");
                    card.className = "badge-item-card";
                    let iconUrl = b.icon || "";
                    if (iconUrl.startsWith("/")) {
                        iconUrl = `https://leetcode.com${iconUrl}`;
                    }

                    const dateStr = b.creationDate ? new Date(b.creationDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : "";

                    card.innerHTML = `
                        <img src="${escapeHtml(iconUrl)}" alt="${escapeHtml(b.displayName || b.name)}" class="badge-img" onerror="this.outerHTML='<i class=\\'fa-solid fa-award\\' style=\\'font-size:2rem; color:var(--amber); margin:0.5rem 0;\\'></i>'" />
                        <span class="badge-name">${escapeHtml(b.displayName || b.name)}</span>
                        ${dateStr ? `<span class="badge-date">${dateStr}</span>` : ""}
                    `;
                    modalBadgesGrid.appendChild(card);
                });
            }
        }

        // Skills (Advanced, Intermediate, Fundamental)
        renderSkillTags(modalAdvancedSkills, skillsData?.advanced);
        renderSkillTags(modalIntermediateSkills, skillsData?.intermediate);
        renderSkillTags(modalFundamentalSkills, skillsData?.fundamental);
    }

    function renderSkillTags(container, list) {
        if (!container) return;
        container.innerHTML = "";

        if (!list || list.length === 0) {
            container.innerHTML = `<span style="color:var(--text-muted); font-size:0.8rem; font-style:italic">No tagged problems in this category</span>`;
            return;
        }

        list.forEach(skill => {
            const span = document.createElement("span");
            span.className = "skill-tag";
            span.innerHTML = `
                ${escapeHtml(skill.tagName)}
                <span class="solved-badge">${skill.problemsSolved}</span>
            `;
            container.appendChild(span);
        });
    }

    function setupModalTabs() {
        modalTabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const targetTab = btn.dataset.tab;
                modalTabBtns.forEach(b => b.classList.remove("active"));
                modalPanes.forEach(p => p.classList.remove("active"));

                btn.classList.add("active");
                const pane = document.getElementById(`pane-${targetTab}`);
                if (pane) pane.classList.add("active");
                closeDayPopup();

                if (targetTab === "activity") {
                    const scrollContainer = modalCalendarHeatmap?.closest(".heatmap-scroll-container");
                    if (scrollContainer && scrollContainer.scrollWidth > scrollContainer.clientWidth) {
                        requestAnimationFrame(() => {
                            scrollContainer.scrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;
                        });
                    }
                }
            });
        });
    }

    function formatRelativeTime(timestamp) {
        const sec = parseInt(timestamp, 10);
        if (isNaN(sec)) return "";
        const diffMs = Date.now() - (sec * 1000);
        const diffSec = Math.floor(diffMs / 1000);

        if (diffSec < 60) return "Just now";
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 30) return `${diffDays}d ago`;
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12) return `${diffMonths}mo ago`;
        return `${Math.floor(diffMonths / 12)}y ago`;
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
            detailCache.clear(); // Invalidate detail cache on explicit sync
            await loadDashboardData(currentCohort);
            setTimeout(() => refreshIcon.classList.remove("spinning"), 600);
        });

        // Cohort Selection Clicks
        if (cohortsGrid) {
            cohortsGrid.addEventListener("click", (e) => {
                const cardOrBtn = e.target.closest(".cohort-card, .btn-view-cohort");
                if (!cardOrBtn) return;
                const cohortId = cardOrBtn.dataset.cohortId || cardOrBtn.closest(".cohort-card")?.dataset.cohortId;
                if (cohortId) {
                    window.location.hash = `cohort=${encodeURIComponent(cohortId)}`;
                }
            });

            cohortsGrid.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    const card = e.target.closest(".cohort-card");
                    if (card && card.dataset.cohortId) {
                        e.preventDefault();
                        window.location.hash = `cohort=${encodeURIComponent(card.dataset.cohortId)}`;
                    }
                }
            });
        }

        // Back to Cohorts Button
        if (backToCohortsBtn) {
            backToCohortsBtn.addEventListener("click", () => {
                window.location.hash = "";
            });
        }

        // Modal Close
        if (closeModalBtn) closeModalBtn.addEventListener("click", closeProfileModal);
        if (profileModal) {
            profileModal.addEventListener("click", (e) => {
                if (e.target === profileModal) closeProfileModal();
            });
        }

        // Delegated click listener for all modal trigger / expand buttons
        cardGrid.addEventListener("click", (e) => {
            const triggerBtn = e.target.closest(".modal-trigger-btn");
            if (!triggerBtn) return;
            e.preventDefault();
            e.stopPropagation();
            const username = triggerBtn.dataset.username;
            if (!username) return;
            const studentData = combinedData.find(d => d.username === username);
            if (studentData) {
                openProfileModal(studentData);
            }
        });

        // Heatmap Day Popup Close Listeners
        if (popupCloseBtn) {
            popupCloseBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                closeDayPopup();
            });
        }

        document.addEventListener("click", (e) => {
            if (heatmapDayPopup && !heatmapDayPopup.hidden) {
                if (!heatmapDayPopup.contains(e.target) && !e.target.closest(".heatmap-cell")) {
                    closeDayPopup();
                }
            }
        });

        // Keyboard Shortcuts
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                if (heatmapDayPopup && !heatmapDayPopup.hidden) {
                    closeDayPopup();
                    return;
                }
                if (!profileModal.hidden) {
                    closeProfileModal();
                }
            }
            if (e.key === "/" && document.activeElement !== searchInput && profileModal.hidden) {
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