/**
 * Półki z książkami, paginacja, monitor Minecraft i spine rendering
 */

const STATUS_GROUP_ORDER = [
    "Gram teraz",
    "Singleplayer",
    "Multiplayer",
    "Chcę zagrać",
    "Ukończona",
    "Ukończona+",
    "100'%",
    "100%",
    "PLATYNA",
    "Wstrzymana",
    "Pozostawiona",
    "Porzucona",
    "Bezkresna"
];

const DEFAULT_STATUS_COLORS = {
    "gram teraz": "#3A1A1D",
    "chcę zagrać": "#1CD7C4",
    "chce zagrac": "#1CD7C4",
    "singleplayer": "#C48797",
    "multiplayer": "#196225",
    "wstrzymana": "#4E09F7",
    "pozostawiona": "#59FFC6",
    "ukończona": "#C91D2E",
    "ukonczona": "#C91D2E",
    "ukończona+": "#C7EDA8",
    "ukonczona+": "#C7EDA8",
    "100'%": "#398E62",
    "100%": "#398E62",
    "platyna": "#7CA055"
};

function formatSpineTitle(title, maxChars = 20) {
    if (!title) return "";
    const clean = title.trim();
    if (clean.length <= maxChars) return clean;
    
    // Obcinamy do maxChars i ucinamy do ostatniego pełnego słowa
    const slice = clean.substring(0, maxChars);
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > 2) {
        return slice.substring(0, lastSpace);
    }
    return slice;
}

function isMobileView() {
    return window.innerWidth <= 768;
}

function selectGameForMonitor(game, spineEl = null) {
    if (!game) return;

    if (isMobileView()) {
        openGameDetailsModal(game);
        return;
    }

    if (state.selectedGame && String(state.selectedGame.id) === String(game.id)) {
        // Ponowne kliknięcie w tę samą książkę - odznaczenie
        state.selectedGame = null;
        document.querySelectorAll(".game-spine.active").forEach(el => el.classList.remove("active"));
        renderMonitorGameDetails(null);
        return;
    }

    state.selectedGame = game;
    document.querySelectorAll(".game-spine.active").forEach(el => el.classList.remove("active"));
    if (spineEl) {
        spineEl.classList.add("active");
    } else if (game) {
        const matching = document.querySelector(`.game-spine[data-game-id="${game.id}"]`);
        if (matching) matching.classList.add("active");
    }
    renderMonitorGameDetails(game);
}

function openGameDetailsModal(game) {
    if (!game) return;
    const modal = document.getElementById("gameDetailsModal");
    const titleEl = document.getElementById("detailsGameTitle");
    const bodyEl = document.getElementById("gameDetailsModalBody");
    const adminActions = document.getElementById("detailsAdminActions");

    if (!modal || !bodyEl) return;

    const title = escapeHtml(game["book name"] || game["Tytuł"] || "Brak tytułu");
    const status = escapeHtml(game["status"] || game["Stan"] || "-");
    const genre = escapeHtml(game["genre"] || game["Platforma"] || "-");
    const author = escapeHtml(game["author"] || game["Autor"] || "-");
    const origin = escapeHtml(game["origin"] || game["Pochodzenie"] || "-");

    const rawRating = game["final score"] !== undefined && game["final score"] !== "" ? game["final score"] : game["Ocena gry"];
    const hasRating = rawRating !== "" && rawRating !== undefined && rawRating !== null && rawRating !== "-";
    const rating = hasRating ? `${rawRating}/10` : "-";

    const styleScore = game["style score"] !== undefined && game["style score"] !== "" ? `${game["style score"]}/10` : (game["Ocena fabuły"] ? `${game["Ocena fabuły"]}/10` : "-");
    const plotScore = game["plot score"] !== undefined && game["plot score"] !== "" ? `${game["plot score"]}/10` : (game["Ocena grafiki"] ? `${game["Ocena grafiki"]}/10` : "-");
    const structScore = game["structure score"] !== undefined && game["structure score"] !== "" ? `${game["structure score"]}/10` : (game["Ocena mechanik"] ? `${game["Ocena mechanik"]}/10` : "-");

    const date = game["completion date"] || game["Data ukończenia"] ? formatDate(game["completion date"] || game["Data ukończenia"]) : "";
    const review = game["review"] || game["Recenzja"] || "";
    const coverUrl = (game["cover"] || game["Obraz"] || game["obraz"] || "").trim();

    const rawTags = (game["tags"] || game["Kolekcje"] || "").split(",").map(t => t.trim()).filter(Boolean);
    const visibleTags = rawTags.filter(t => {
        const low = t.toLowerCase();
        return low !== "gablota";
    });

    const tagsHtml = visibleTags.map(t => {
        const col = getTagColor(t);
        return `<span class="tag-pill" style="background-color: ${col.bg}; border-color: ${col.border}; color: ${col.text}; font-size: 14px;">${escapeHtml(t)}</span>`;
    }).join("");

    const rawGenres = (game["genre"] || game["Platforma"] || "").split(",").map(g => g.trim()).filter(Boolean);
    const genresHtml = rawGenres.length > 0
        ? rawGenres.map(g => `<span class="badge-platform">${escapeHtml(g)}</span>`).join(" ")
        : `<span class="badge-platform">-</span>`;

    if (titleEl) titleEl.innerHTML = title;

    bodyEl.innerHTML = `
        ${coverUrl ? `
            <div class="modal-game-cover-banner" style="background-image: url('${escapeHtml(coverUrl)}');"></div>
        ` : ""}
        <div class="game-meta-row" style="margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px;">
            <span class="badge-status">${status}</span>
            ${genresHtml}
        </div>

        <div class="book-info-table" style="margin-bottom: 12px;">
            <div class="book-info-row">
                <span class="book-info-label">Autor</span>
                <span class="book-info-val">${author !== "-" ? author : "Nie podano"}</span>
            </div>
            <div class="book-info-row">
                <span class="book-info-label">Pochodzenie / Źródło</span>
                <span class="book-info-val">${origin !== "-" ? origin : "Nie podano"}</span>
            </div>
            <div class="book-info-row">
                <span class="book-info-label">Data ukończenia</span>
                <span class="book-info-val">${date ? date : "Nie ukończono"}</span>
            </div>
        </div>

        <div class="ratings-breakdown-box" style="background: var(--color-bg); padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--color-border-subtle); margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid var(--color-border-subtle); padding-bottom: 6px;">
                <span style="font-weight: bold; font-size: 14px;">Ocena końcowa:</span>
                <span class="game-rating-badge" style="font-size: 15px; padding: 3px 8px;">${rating}</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center; font-size: 14px;">
                <div><span style="color: var(--color-text-muted); display: block;">Styl</span><strong>${styleScore}</strong></div>
                <div><span style="color: var(--color-text-muted); display: block;">Fabuła</span><strong>${plotScore}</strong></div>
                <div><span style="color: var(--color-text-muted); display: block;">Struktura</span><strong>${structScore}</strong></div>
            </div>
        </div>

        ${tagsHtml ? `
            <div style="margin-bottom: 12px;">
                <span style="font-size: 14px; color: var(--color-text-muted); text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 4px;">Tagi:</span>
                <div class="game-tags" style="margin: 0; border: none; padding: 0;">${tagsHtml}</div>
            </div>
        ` : ""}

        ${review ? `
            <div style="margin-bottom: 10px;">
                <span style="font-size: 14px; color: var(--color-text-muted); text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 4px;">Recenzja / Notatka:</span>
                <div class="game-review-snippet" style="margin: 0; border: none; padding: 0; white-space: pre-wrap;">${escapeHtml(review)}</div>
            </div>
        ` : ""}
    `;

    if (adminActions) {
        adminActions.style.display = state.isAdmin ? "flex" : "none";
    }

    const editBtn = document.getElementById("btnDetailsEdit");
    if (editBtn) {
        editBtn.onclick = () => {
            closeModal("gameDetailsModal");
            openGameEditModal(game);
        };
    }

    const deleteBtn = document.getElementById("btnDetailsDelete");
    if (deleteBtn) {
        deleteBtn.onclick = () => {
            closeModal("gameDetailsModal");
            handleDeleteGame(game.id, game["book name"] || game["Tytuł"]);
        };
    }

    openModal("gameDetailsModal");
}

function renderMonitorGameDetails(game) {
    const screen = document.getElementById("mcMonitorScreen");
    if (!screen) return;

    const btnExtEdit = document.getElementById("btnMonitorExtEdit");
    const btnExtDelete = document.getElementById("btnMonitorExtDelete");

    if (!game) {
        screen.innerHTML = "";
        if (btnExtEdit) {
            btnExtEdit.disabled = true;
            btnExtEdit.innerHTML = "";
            btnExtEdit.onclick = null;
        }
        if (btnExtDelete) {
            btnExtDelete.disabled = true;
            btnExtDelete.innerHTML = "";
            btnExtDelete.onclick = null;
        }
        return;
    }

    // Aktualizacja przycisków pod obrazem (wyłącznie w trybie administratora bieżącej bazy)
    if (btnExtEdit) {
        if (state.isAdmin) {
            btnExtEdit.disabled = false;
            btnExtEdit.innerHTML = `<span>Edytuj książkę</span>`;
            btnExtEdit.onclick = () => openGameEditModal(game);
        } else {
            btnExtEdit.disabled = true;
            btnExtEdit.innerHTML = "";
            btnExtEdit.onclick = null;
        }
    }
    if (btnExtDelete) {
        if (state.isAdmin) {
            btnExtDelete.disabled = false;
            btnExtDelete.innerHTML = `<span>Usuń książkę</span>`;
            btnExtDelete.onclick = () => handleDeleteGame(game.id, game["book name"] || game["Tytuł"]);
        } else {
            btnExtDelete.disabled = true;
            btnExtDelete.innerHTML = "";
            btnExtDelete.onclick = null;
        }
    }

    const title = escapeHtml(game["book name"] || game["Tytuł"] || "Brak tytułu");
    const status = escapeHtml(game["status"] || game["Stan"] || "-");
    const genre = escapeHtml(game["genre"] || game["Platforma"] || "-");
    const author = escapeHtml(game["author"] || game["Autor"] || "-");
    const origin = escapeHtml(game["origin"] || game["Pochodzenie"] || "-");

    const rawRating = game["final score"] !== undefined && game["final score"] !== "" ? game["final score"] : game["Ocena gry"];
    const hasRating = rawRating !== "" && rawRating !== undefined && rawRating !== null && rawRating !== "-";
    const rating = hasRating ? `${rawRating}/10` : "-";

    const styleScore = game["style score"] !== undefined && game["style score"] !== "" ? `${game["style score"]}/10` : (game["Ocena fabuły"] ? `${game["Ocena fabuły"]}/10` : "-");
    const plotScore = game["plot score"] !== undefined && game["plot score"] !== "" ? `${game["plot score"]}/10` : (game["Ocena grafiki"] ? `${game["Ocena grafiki"]}/10` : "-");
    const structScore = game["structure score"] !== undefined && game["structure score"] !== "" ? `${game["structure score"]}/10` : (game["Ocena mechanik"] ? `${game["Ocena mechanik"]}/10` : "-");

    const date = game["completion date"] || game["Data ukończenia"] ? formatDate(game["completion date"] || game["Data ukończenia"]) : "";
    const review = game["review"] || game["Recenzja"] || "";
    const coverUrl = (game["cover"] || game["Obraz"] || game["obraz"] || "").trim();

    const rawTags = (game["tags"] || game["Kolekcje"] || "").split(",").map(t => t.trim()).filter(Boolean);
    const visibleTags = rawTags.filter(t => {
        const low = t.toLowerCase();
        return low !== "gablota";
    });

    const tagsHtml = visibleTags.map(t => {
        const col = getTagColor(t);
        return `<span class="tag-pill" style="background-color: ${col.bg}; border-color: ${col.border}; color: ${col.text}; font-size: 14px;">${escapeHtml(t)}</span>`;
    }).join("");

    const rawGenres = (game["genre"] || game["Platforma"] || "").split(",").map(g => g.trim()).filter(Boolean);
    const genresHtml = rawGenres.length > 0
        ? rawGenres.map(g => `<span class="badge-platform">${escapeHtml(g)}</span>`).join(" ")
        : `<span class="badge-platform">-</span>`;

    screen.innerHTML = `
        <div class="monitor-details-content">
            ${coverUrl ? `
                <div class="monitor-cover-wrapper" id="monitorCoverBtn" title="Kliknij, aby otworzyć szczegóły książki">
                    <img src="${escapeHtml(coverUrl)}" alt="${title}" class="monitor-cover-img" onerror="this.parentElement.style.display='none'">
                </div>
            ` : ""}
            <div class="monitor-header-block">
                <h2 class="monitor-game-title">${title}</h2>
                <div class="monitor-meta-badges">
                    <span class="badge-status">${status}</span>
                    ${genresHtml}
                </div>
            </div>

            <div class="book-info-table">
                <div class="book-info-row">
                    <span class="book-info-label">Autor</span>
                    <span class="book-info-val">${author !== "-" ? author : "Nie podano"}</span>
                </div>
                <div class="book-info-row">
                    <span class="book-info-label">Pochodzenie</span>
                    <span class="book-info-val">${origin !== "-" ? origin : "Nie podano"}</span>
                </div>
                <div class="book-info-row">
                    <span class="book-info-label">Ukończono</span>
                    <span class="book-info-val">${date ? date : "Nie ukończono"}</span>
                </div>
            </div>

            <div class="monitor-ratings-section">
                <div class="monitor-main-score">
                    <span class="monitor-score-label">Ocena końcowa</span>
                    <span class="monitor-score-val">${rating}</span>
                </div>
                <div class="monitor-subscores-grid">
                    <div class="monitor-subscore-item">
                        <span class="subscore-name">Styl</span>
                        <span class="subscore-num">${styleScore}</span>
                    </div>
                    <div class="monitor-subscore-item">
                        <span class="subscore-name">Fabuła</span>
                        <span class="subscore-num">${plotScore}</span>
                    </div>
                    <div class="monitor-subscore-item">
                        <span class="subscore-name">Struktura</span>
                        <span class="subscore-num">${structScore}</span>
                    </div>
                </div>
            </div>

            ${tagsHtml ? `
                <div class="monitor-tags-container">
                    <div class="monitor-section-title">Tagi:</div>
                    <div class="game-tags" style="margin-top:0; border-top:none; padding-top:0;">${tagsHtml}</div>
                </div>
            ` : ""}

            ${review ? `
                <div class="monitor-review-section">
                    <div class="monitor-section-title">Recenzja / Notatka:</div>
                    <div class="monitor-review-text">${escapeHtml(review)}</div>
                </div>
            ` : ""}
        </div>
    `;

    const coverBtn = screen.querySelector("#monitorCoverBtn");
    if (coverBtn) {
        coverBtn.addEventListener("click", () => openGameDetailsModal(game));
    }
}

async function loadGamesForUser(sheetName, forceRefresh = false) {
    const skeletonLoader = document.getElementById("skeletonLoader");
    const shelvesContainer = document.getElementById("gamesShelvesContainer");
    const emptyResults = document.getElementById("emptyResultsMessage");
    const resultsCount = document.getElementById("resultsCount");

    if (!forceRefresh) {
        const cached = getCachedGames(sheetName);
        if (cached !== null) {
            state.games = cached;
            updateProfileBanner();
            populateFilterOptions();
            await fetchSettingsAndStats(false);
            renderGamesShelves();
            renderProfileShowcase();
            return;
        }
    }

    state.games = [];
    document.getElementById("statTotalGames").textContent = "-";
    document.getElementById("statCompletedGames").textContent = "-";
    document.getElementById("statTotalHours").textContent = "-";
    document.getElementById("statAvgRating").textContent = "-";
    const showcaseContainer = document.getElementById("showcaseShelfContainer") || document.getElementById("showcaseGrid");
    if (showcaseContainer) showcaseContainer.innerHTML = '<p class="showcase-empty-hint">Wczytywanie gabloty...</p>';

    if (skeletonLoader) skeletonLoader.style.display = "grid";
    if (shelvesContainer) shelvesContainer.style.display = "none";
    if (emptyResults) emptyResults.style.display = "none";
    if (resultsCount) resultsCount.textContent = "Pobieranie bazy książek z chmury...";

    try {
        const response = await sendApiRequestWithRetry({
            action: "getAllBooks",
            user: sheetName
        }, null, 2);

        if (response.status === "success") {
            state.games = Array.isArray(response.data) ? response.data : [];
            setCachedGames(sheetName, state.games);
            updateProfileBanner();
            populateFilterOptions();
            await fetchSettingsAndStats(false);
            renderGamesShelves();
            renderProfileShowcase();
        } else {
            if (emptyResults) {
                emptyResults.innerHTML = `<p style="color: var(--color-danger);">Błąd: ${escapeHtml(response.message || "Nie udało się pobrać gier")} <button type="button" class="btn-link btn-reload-games" data-sheet="${escapeHtml(sheetName)}" style="color: var(--color-primary); font-weight: bold; margin-left: 8px;">[Spróbuj ponownie]</button></p>`;
                emptyResults.style.display = "block";
            }
            if (skeletonLoader) skeletonLoader.style.display = "none";
        }
    } catch (error) {
        if (emptyResults) {
            emptyResults.innerHTML = `<p style="color: var(--color-danger);">Błąd sieciowy podczas pobierania danych. <button type="button" class="btn-link btn-reload-games" data-sheet="${escapeHtml(sheetName)}" style="color: var(--color-primary); font-weight: bold; margin-left: 8px;">[Spróbuj ponownie]</button></p>`;
            emptyResults.style.display = "block";
        }
        if (skeletonLoader) skeletonLoader.style.display = "none";
    }
}

function renderGamesShelves() {
    const skeletonLoader = document.getElementById("skeletonLoader");
    const shelvesContainer = document.getElementById("gamesShelvesContainer");
    const emptyResults = document.getElementById("emptyResultsMessage");

    if (skeletonLoader) skeletonLoader.style.display = "none";

    const selectedStatuses = state.filters.statuses instanceof Set ? state.filters.statuses : new Set();
    const selectedPlatforms = state.filters.platforms instanceof Set ? state.filters.platforms : new Set();
    const selectedCollections = state.filters.collections instanceof Set ? state.filters.collections : new Set();

    let filtered = state.games.filter(game => {
        if (isGameInShowcase(game)) {
            return false;
        }

        if (state.filters.search) {
            const query = state.filters.search.toLowerCase();
            const title = (game["book name"] || game["Tytuł"] || "").toLowerCase();
            const author = (game["author"] || game["Autor"] || "").toLowerCase();
            const genre = (game["genre"] || game["Gatunek"] || game["Platforma"] || "").toLowerCase();
            const tags = (game["tags"] || game["Tagi"] || game["Kolekcje"] || "").toLowerCase();
            const review = (game["review"] || game["Recenzja"] || "").toLowerCase();
            if (!title.includes(query) && !author.includes(query) && !genre.includes(query) && !tags.includes(query) && !review.includes(query)) {
                return false;
            }
        }
        if (selectedStatuses.size > 0) {
            const gameStatus = (game["status"] || game["Stan"] || "").trim();
            if (!selectedStatuses.has(gameStatus)) {
                return false;
            }
        }
        if (selectedPlatforms.size > 0) {
            const gameGenres = (game["genre"] || game["Gatunek"] || game["Platforma"] || "")
                .split(",")
                .map(g => g.trim().toLowerCase())
                .filter(Boolean);
            const matchesAnyGenre = Array.from(selectedPlatforms).some(p => gameGenres.includes(p.toLowerCase()));
            if (!matchesAnyGenre) {
                return false;
            }
        }
        if (selectedCollections.size > 0) {
            const tags = game["tags"] || game["Tagi"] || game["Kolekcje"] || "";
            const matchesAny = Array.from(selectedCollections).some(c => tags.includes(c));
            if (!matchesAny) {
                return false;
            }
        }
        return true;
    });

    filtered.sort((a, b) => {
        switch (state.filters.sort) {
            case "updated_desc": {
                const dateA = a["update"] || a["Aktualizacja"] || a["Akualizacja"] || a["id"] || "";
                const dateB = b["update"] || b["Aktualizacja"] || b["Akualizacja"] || b["id"] || "";
                const comp = String(dateB).localeCompare(String(dateA));
                if (comp !== 0) return comp;
                return (a["book name"] || a["Tytuł"] || "").localeCompare(b["book name"] || b["Tytuł"] || "");
            }
            case "title_asc":
                return (a["book name"] || a["Tytuł"] || "").localeCompare(b["book name"] || b["Tytuł"] || "");
            case "title_desc":
                return (b["book name"] || b["Tytuł"] || "").localeCompare(a["book name"] || a["Tytuł"] || "");
            case "author_asc":
                return (a["author"] || a["Autor"] || "").localeCompare(b["author"] || b["Autor"] || "");
            case "rating_desc": {
                const rA = parseFloat(a["final score"] || a["Ocena gry"]) || 0;
                const rB = parseFloat(b["final score"] || b["Ocena gry"]) || 0;
                return rB - rA;
            }
            case "rating_asc": {
                const rA = parseFloat(a["final score"] || a["Ocena gry"]) || 0;
                const rB = parseFloat(b["final score"] || b["Ocena gry"]) || 0;
                return rA - rB;
            }
            case "date_desc": {
                const dA = a["completion date"] || a["Data ukończenia"] || "";
                const dB = b["completion date"] || b["Data ukończenia"] || "";
                return String(dB).localeCompare(String(dA));
            }
            default: {
                const dateA = a["update"] || a["Aktualizacja"] || a["id"] || "";
                const dateB = b["update"] || b["Aktualizacja"] || b["id"] || "";
                const comp = String(dateB).localeCompare(String(dateA));
                if (comp !== 0) return comp;
                return (a["book name"] || a["Tytuł"] || "").localeCompare(b["book name"] || b["Tytuł"] || "");
            }
        }
    });

    if (filtered.length === 0) {
        if (shelvesContainer) shelvesContainer.style.display = "none";
        if (emptyResults) emptyResults.style.display = "block";
        const paginationBar = document.getElementById("paginationBar");
        if (paginationBar) paginationBar.style.display = "none";
        state.selectedGame = null;
        renderMonitorGameDetails(null);
        return;
    }

    if (emptyResults) emptyResults.style.display = "none";
    if (shelvesContainer) {
        shelvesContainer.style.display = "flex";
        shelvesContainer.innerHTML = "";
    }

    if (state.selectedGame) {
        const freshSelected = state.games.find(g => String(g.id) === String(state.selectedGame.id));
        if (freshSelected) {
            state.selectedGame = freshSelected;
        } else {
            state.selectedGame = null;
        }
    }
    renderMonitorGameDetails(state.selectedGame);

    const groupBy = state.filters.group || "none";
    const capacity = getPageCapacity();
    const BOOKS_PER_SHELF = 12; // 6 góra + 6 dół
    const booksPerPage = capacity * BOOKS_PER_SHELF;

    if (groupBy === "none") {
        const totalPages = Math.max(1, Math.ceil(filtered.length / booksPerPage));
        if (state.pagination.currentPage > totalPages) {
            state.pagination.currentPage = 1;
        }
        state.pagination.totalPages = totalPages;
        state.pagination.itemsPerPage = capacity;

        state.pagination.pagesList = [];
        for (let p = 1; p <= totalPages; p++) {
            state.pagination.pagesList.push({
                index: p,
                label: `Strona ${p} z ${totalPages}`
            });
        }

        const startIndex = (state.pagination.currentPage - 1) * booksPerPage;
        const pageBooks = filtered.slice(startIndex, startIndex + booksPerPage);

        const shelvesRow = document.createElement("div");
        shelvesRow.className = "shelf-group-shelves-row";
        renderShelfUnitsForGames(pageBooks, shelvesRow, capacity);
        shelvesContainer.appendChild(shelvesRow);
    } else {
        const groupsMap = new Map();
        filtered.forEach(game => {
            const key = getGameGroupKey(game, groupBy);
            if (!groupsMap.has(key)) {
                groupsMap.set(key, []);
            }
            groupsMap.get(key).push(game);
        });

        const sortedGroupKeys = Array.from(groupsMap.keys()).sort((a, b) => {
            const orderA = getGroupSortOrder(a, groupBy);
            const orderB = getGroupSortOrder(b, groupBy);
            if (typeof orderA === "number" && typeof orderB === "number") {
                if (orderA !== orderB) return orderA - orderB;
                return a.localeCompare(b);
            }
            return String(a).localeCompare(String(b));
        });

        state.pagination.totalPages = sortedGroupKeys.length;
        if (state.pagination.currentPage > state.pagination.totalPages || state.pagination.currentPage < 1) {
            state.pagination.currentPage = 1;
        }

        state.pagination.pagesList = sortedGroupKeys.map((groupKey, idx) => {
            const count = (groupsMap.get(groupKey) || []).length;
            return {
                index: idx + 1,
                groupKey: groupKey,
                label: `${groupKey} (${count})`
            };
        });

        const activeGroupInfo = state.pagination.pagesList[state.pagination.currentPage - 1];
        if (activeGroupInfo) {
            const groupKey = activeGroupInfo.groupKey;
            const gamesInGroup = groupsMap.get(groupKey) || [];

            const section = document.createElement("div");
            section.className = "shelf-group-section";

            const header = document.createElement("div");
            header.className = "shelf-group-header";
            header.textContent = `${groupKey} (${gamesInGroup.length})`;
            section.appendChild(header);

            const shelvesRow = document.createElement("div");
            shelvesRow.className = "shelf-group-shelves-row";
            renderShelfUnitsForGames(gamesInGroup, shelvesRow, capacity);
            section.appendChild(shelvesRow);

            shelvesContainer.appendChild(section);
        }
    }

    renderPaginationControls();
}

function getGameGroupKey(game, groupBy) {
    if (groupBy === "status") {
        return (game["status"] || game["Stan"] || "Inne").trim() || "Inne";
    }
    if (groupBy === "rating") {
        const raw = game["final score"] || game["Ocena gry"] || game["Ocena"];
        const num = parseFloat(raw);
        if (isNaN(num) || raw === "" || raw === null || raw === undefined || raw === "-") {
            return "Brak oceny";
        }
        const ceil = Math.min(Math.max(Math.ceil(num), 1), 10);
        const lower = ceil === 1 ? 0 : ceil - 1;
        return `Ocena: ${lower} - ${ceil}`;
    }
    if (groupBy === "platform" || groupBy === "genre") {
        return (game["genre"] || game["Gatunek"] || game["Platforma"] || "Brak gatunku").trim() || "Brak gatunku";
    }
    if (groupBy === "author") {
        return (game["author"] || game["Autor"] || "Nieznany autor").trim() || "Nieznany autor";
    }
    if (groupBy === "year") {
        const dateStr = (game["completion date"] || game["Data ukończenia"] || "").trim();
        if (dateStr) {
            const match = dateStr.match(/\b(19\d\d|20\d\d)\b/);
            if (match) return `Rok: ${match[1]}`;
        }
        return "Bez daty ukończenia";
    }
    return "Wszystkie";
}

function getGroupSortOrder(groupName, groupBy) {
    if (groupBy === "status") {
        const idx = STATUS_GROUP_ORDER.indexOf(groupName);
        return idx !== -1 ? idx : 999;
    }
    if (groupBy === "rating") {
        if (groupName === "Brak oceny") return 999;
        const match = groupName.match(/(\d+)\s*-\s*(\d+)/);
        if (match) {
            return 100 - parseInt(match[2], 10);
        }
        return 998;
    }
    if (groupBy === "year") {
        if (groupName === "Bez daty ukończenia") return 9999;
        const match = groupName.match(/\b(\d{4})\b/);
        if (match) {
            return 9999 - parseInt(match[1], 10);
        }
        return 9998;
    }
    return groupName;
}

function getPageCapacity() {
    const w = window.innerWidth;
    if (w <= 768) {
        return 6; // Mobile: 2 kolumny x 3 rzędy = 6 półek
    }
    if (w <= 1540) {
        return 8; // Laptop: 4 kolumny x 2 rzędy = 8 półek
    }
    return 15; // Desktop: 5 kolumn x 3 rzędy = 15 półek
}

function renderShelfUnitsForGames(gamesList, container, maxCapacity = 15) {
    const SHELF_CAPACITY = 12; // 6 książek na górnej półce + 6 książek na dolnej półce
    let shelfIndex = 0;

    const w = window.innerWidth;
    const cols = w <= 768 ? 2 : (w <= 1540 ? 4 : 5);

    for (let i = 0; i < gamesList.length; i += SHELF_CAPACITY) {
        const shelfChunk = gamesList.slice(i, i + SHELF_CAPACITY);

        const shelfUnit = document.createElement("div");
        shelfUnit.className = "game-shelf-unit shelf-animated";

        // Kaskadowa animacja wchodzenia półek po przekątnej
        const row = Math.floor(shelfIndex / cols);
        const col = shelfIndex % cols;
        shelfUnit.style.animationDelay = `${(row + col) * 40}ms`;

        // GÓRNY POZIOM: do 6 książek pionowo
        const topTier = document.createElement("div");
        topTier.className = "shelf-tier tier-top";
        const topBooks = shelfChunk.slice(0, 6);
        topBooks.forEach(book => {
            topTier.appendChild(createSpineElement(book, "vertical", "upright"));
        });
        shelfUnit.appendChild(topTier);

        // DOLNY POZIOM: do 6 książek pionowo
        const bottomTier = document.createElement("div");
        bottomTier.className = "shelf-tier tier-bottom";
        const bottomBooks = shelfChunk.slice(6, 12);
        bottomBooks.forEach(book => {
            bottomTier.appendChild(createSpineElement(book, "vertical", "upright"));
        });
        shelfUnit.appendChild(bottomTier);

        container.appendChild(shelfUnit);
        shelfIndex++;
    }
}

// Obsługa paska paginacji
let lastPaginationClickTime = 0;

function initPaginationEvents() {
    const btnPrev = document.getElementById("btnPaginationPrev");
    const btnNext = document.getElementById("btnPaginationNext");
    const btnPage = document.getElementById("btnPaginationPage");
    const dropdown = document.getElementById("paginationDropdownMenu");

    if (btnPrev) {
        btnPrev.addEventListener("click", (e) => {
            const now = Date.now();
            if (now - lastPaginationClickTime < 220) {
                e.preventDefault();
                return;
            }
            lastPaginationClickTime = now;
            if (state.pagination.currentPage > 1) {
                goToPage(state.pagination.currentPage - 1);
            }
        });
    }

    if (btnNext) {
        btnNext.addEventListener("click", (e) => {
            const now = Date.now();
            if (now - lastPaginationClickTime < 220) {
                e.preventDefault();
                return;
            }
            lastPaginationClickTime = now;
            if (state.pagination.currentPage < state.pagination.totalPages) {
                goToPage(state.pagination.currentPage + 1);
            }
        });
    }

    if (btnPage && dropdown) {
        btnPage.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = dropdown.style.display === "block";
            dropdown.style.display = isOpen ? "none" : "block";
        });
    }

    document.addEventListener("click", (e) => {
        if (!e.target.closest("#paginationPageWrapper")) {
            if (dropdown) dropdown.style.display = "none";
        }
    });

    window.addEventListener("resize", debounce(() => {
        if (state.currentTab === "tabViewGames" && state.currentScreen === "dashboard") {
            renderGamesShelves();
        }
    }, 200));
}

function renderPaginationControls() {
    const paginationBar = document.getElementById("paginationBar");
    const btnPrev = document.getElementById("btnPaginationPrev");
    const btnNext = document.getElementById("btnPaginationNext");
    const pageLabel = document.getElementById("paginationPageLabel");
    const dropdown = document.getElementById("paginationDropdownMenu");

    if (!paginationBar) return;

    if (state.pagination.totalPages <= 1) {
        paginationBar.style.display = "none";
        return;
    }

    paginationBar.style.display = "flex";

    if (btnPrev) {
        btnPrev.disabled = state.pagination.currentPage <= 1;
    }
    if (btnNext) {
        btnNext.disabled = state.pagination.currentPage >= state.pagination.totalPages;
    }

    const currentItem = state.pagination.pagesList.find(p => p.index === state.pagination.currentPage);
    if (pageLabel && currentItem) {
        pageLabel.textContent = currentItem.label;
    }

    if (dropdown) {
        dropdown.innerHTML = "";
        state.pagination.pagesList.forEach(item => {
            const itemBtn = document.createElement("button");
            itemBtn.type = "button";
            itemBtn.className = "pagination-item-btn" + (item.index === state.pagination.currentPage ? " active" : "");
            itemBtn.textContent = item.label;
            itemBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                dropdown.style.display = "none";
                goToPage(item.index);
            });
            dropdown.appendChild(itemBtn);
        });
    }
}

function goToPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > state.pagination.totalPages) return;
    if (pageNumber === state.pagination.currentPage) return;
    state.pagination.currentPage = pageNumber;
    renderGamesShelves();
}

// Gesty swipe na telefonie dla kontenera półek
function initShelvesSwipeGestures() {
    const container = document.getElementById("gamesShelvesContainer");
    if (!container) return;

    let touchStartX = 0;
    let touchStartY = 0;

    container.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    container.addEventListener("touchend", (e) => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Warunek gestu swipe: min. 45px i wyraźnie bardziej poziomy niż pionowy
        if (Math.abs(deltaX) >= 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
            if (deltaX < 0) {
                // Przesunięcie w lewo -> następna strona
                if (state.pagination.currentPage < state.pagination.totalPages) {
                    goToPage(state.pagination.currentPage + 1);
                }
            } else {
                // Przesunięcie w prawo -> poprzednia strona
                if (state.pagination.currentPage > 1) {
                    goToPage(state.pagination.currentPage - 1);
                }
            }
        }
    }, { passive: true });
}

function toPastelSpineColor(hex) {
    if (!hex) return "#2f3e52";
    let clean = hex.trim();
    if (!clean.startsWith("#")) return clean;
    
    // Obsługa #RGB oraz #RRGGBB
    if (clean.length === 4) {
        clean = "#" + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
    }
    if (clean.length !== 7) return clean;

    const r = parseInt(clean.substring(1, 3), 16) / 255;
    const g = parseInt(clean.substring(3, 5), 16) / 255;
    const b = parseInt(clean.substring(5, 7), 16) / 255;

    if (isNaN(r) || isNaN(g) || isNaN(b)) return clean;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s;
    const d = max - min;

    if (d === 0) {
        h = 0;
        s = 0;
    } else {
        s = d / (1 - Math.abs(max + min - 1));
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    const hueDeg = Math.round(h * 360);
    const pastelSat = s === 0 ? 0 : Math.min(Math.max(Math.round(s * 100 * 0.6), 30), 45);
    const pastelLight = 30;

    return `hsl(${hueDeg}, ${pastelSat}%, ${pastelLight}%)`;
}

function showMcTooltip(title, status, x, y) {
    if (window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024)) return;
    const tooltip = document.getElementById("mcItemTooltip");
    if (!tooltip) return;

    tooltip.innerHTML = `
        <div class="mc-tooltip-title">${escapeHtml(title)}</div>
        <div class="mc-tooltip-status">${escapeHtml(status)}</div>
    `;
    tooltip.style.display = "flex";
    updateMcTooltipPosition(x, y);
}

function updateMcTooltipPosition(x, y) {
    const tooltip = document.getElementById("mcItemTooltip");
    if (!tooltip || tooltip.style.display === "none") return;

    const tipRect = tooltip.getBoundingClientRect();
    const tipWidth = tipRect.width || 240;
    const tipHeight = tipRect.height || 56;

    let posX = x + 14;
    let posY = y - 20;

    if (posX + tipWidth > window.innerWidth - 8) {
        posX = x - tipWidth - 14;
    }
    if (posX < 8) posX = 8;

    if (posY + tipHeight > window.innerHeight - 8) {
        posY = window.innerHeight - tipHeight - 8;
    }
    if (posY < 8) posY = 8;

    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;
}

function hideMcTooltip() {
    const tooltip = document.getElementById("mcItemTooltip");
    if (tooltip) tooltip.style.display = "none";
}

function getSpineColorForGame(game) {
    if (!game) return "#2f3e52";
    const status = (game["status"] || game["Stan"] || "").toString().trim().toLowerCase();
    const userCode = state.currentUser ? (state.currentUser.code || "").toString().trim().toUpperCase() : "";

    // 1. Sprawdzenie w aktualnie załadowanych ustawieniach ze słownika statusów
    const statusTable = state.settings ? (state.settings.status || state.settings.stan) : null;
    if (status && statusTable && Array.isArray(statusTable.rows)) {
        const matchingRow = statusTable.rows.find(r => {
            const rowVal = (r["status"] || r["Stan"] || r["stan"] || "").toString().trim().toLowerCase();
            return rowVal === status;
        });
        if (matchingRow) {
            if (userCode) {
                const userKey = Object.keys(matchingRow).find(k => {
                    const kLower = k.toLowerCase();
                    return kLower === `color ${userCode.toLowerCase()}` || kLower === `kolor ${userCode.toLowerCase()}`;
                });
                if (userKey && matchingRow[userKey] && matchingRow[userKey].toString().trim()) {
                    return matchingRow[userKey].toString().trim();
                }
            }
            const rawCol = matchingRow["color MM"] || matchingRow["color"] || matchingRow["kolor"] || matchingRow["Color"];
            if (rawCol && rawCol.toString().trim()) {
                return rawCol.toString().trim();
            }
        }
    }

    // 2. Wbudowana mapa domyślnych kolorów
    if (status && DEFAULT_STATUS_COLORS[status]) {
        return DEFAULT_STATUS_COLORS[status];
    }

    // 3. Kolor motywu użytkownika
    return state.currentUser ? state.currentUser.color : "#2a4365";
}

function createSpineElement(game, orientation = "vertical", variant = "") {
    const spine = document.createElement("div");
    spine.className = `game-spine spine-${orientation}`;
    if (variant) {
        spine.classList.add(`spine-${variant}`);
    }
    spine.setAttribute("data-game-id", game.id);

    const isCurrentActive = state.selectedGame && String(state.selectedGame.id) === String(game.id);
    if (isCurrentActive) {
        spine.classList.add("active");
    }

    const baseColor = getSpineColorForGame(game);
    const spineColor = toPastelSpineColor(baseColor);
    spine.style.backgroundColor = spineColor;

    const fullTitle = game["book name"] || game["Tytuł"] || "Brak tytułu";
    const status = game["status"] || game["Stan"] || "-";
    const maxChars = orientation === "horizontal" ? 18 : (variant === "leaned-right" ? 16 : 20);
    const displayTitle = formatSpineTitle(fullTitle, maxChars);

    const textClass = orientation === "horizontal" ? "game-spine-text-horiz" : "game-spine-text";
    spine.innerHTML = `
        <span class="${textClass}">${escapeHtml(displayTitle)}</span>
    `;

    spine.addEventListener("mouseenter", (e) => {
        showMcTooltip(fullTitle, status, e.clientX, e.clientY);
    });

    spine.addEventListener("mousemove", (e) => {
        updateMcTooltipPosition(e.clientX, e.clientY);
    });

    spine.addEventListener("mouseleave", () => {
        hideMcTooltip();
    });

    spine.addEventListener("click", (e) => {
        e.stopPropagation();
        selectGameForMonitor(game, spine);
    });

    return spine;
}

const renderGamesGrid = renderGamesShelves;
