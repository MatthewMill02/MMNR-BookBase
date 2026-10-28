/**
 * Moduł gabloty wyróżnionych książek, statystyk profilu oraz kolorów tagów
 */

function updateProfileBanner() {
    if (!state.currentUser) return;

    const user = state.currentUser;
    document.getElementById("bannerProfileAvatar").src = user.avatar;
    document.getElementById("bannerProfileName").textContent = user.name;
    document.getElementById("bannerProfileSheet").textContent = user.sheetName;

    // Obliczanie statystyk
    const totalBooks = state.games.length;
    
    let readingCount = 0;
    let sumRatings = 0;
    let ratedCount = 0;
    let completedCount = 0;

    const completedStates = ["ukończona", "ukonczona", "przeczytana", "100'%", "100%", "platyna"];
    const readingStates = ["czytam", "w trakcie", "w trakcie czytania", "teraz czytam"];

    state.games.forEach(g => {
        const ratingRaw = g["final score"] !== undefined && g["final score"] !== "" ? g["final score"] : g["Ocena gry"];
        const rating = parseFloat(ratingRaw);
        if (!isNaN(rating) && rating > 0) {
            sumRatings += rating;
            ratedCount++;
        }

        const st = ((g["status"] || g["Stan"] || "")).toString().trim().toLowerCase();
        if (completedStates.includes(st)) {
            completedCount++;
        }
        if (readingStates.includes(st)) {
            readingCount++;
        }
    });

    const avgRating = ratedCount > 0 ? (sumRatings / ratedCount).toFixed(2) : "-";

    document.getElementById("statTotalGames").textContent = totalBooks;
    document.getElementById("statCompletedGames").textContent = completedCount;
    document.getElementById("statTotalHours").textContent = readingCount;
    document.getElementById("statAvgRating").textContent = avgRating;

    renderProfileShowcase();
}

function getTagColors() {
    try {
        const stored = localStorage.getItem("mmnr_tag_colors");
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {};
}

function saveTagColors(colors) {
    try {
        localStorage.setItem("mmnr_tag_colors", JSON.stringify(colors));
    } catch (e) {}
}

function getTagColor(tagName) {
    if (!tagName) return { bg: "#1f242d", border: "#333c48", text: "#cbd5e1" };
    const clean = tagName.trim();
    const colors = getTagColors();
    if (colors[clean]) {
        return colors[clean];
    }
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
        hash = clean.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    const colorObj = {
        bg: `hsl(${h}, 36%, 17%)`,
        border: `hsl(${h}, 48%, 34%)`,
        text: `hsl(${h}, 70%, 86%)`
    };
    colors[clean] = colorObj;
    saveTagColors(colors);
    return colorObj;
}

function applyShowcaseCollapseState(collapsed) {
    const showcaseCol = document.getElementById("showcaseColumn");
    const showcaseBlock = document.querySelector(".showcase-and-stats-block");
    const toggleBtn = document.getElementById("btnToggleShowcaseCollapse");

    if (showcaseCol) {
        showcaseCol.classList.toggle("collapsed", collapsed);
    }
    if (showcaseBlock) {
        showcaseBlock.classList.toggle("showcase-collapsed", collapsed);
    }
    if (toggleBtn) {
        toggleBtn.textContent = collapsed ? "[Rozwiń]" : "[Zwiń]";
        toggleBtn.title = collapsed ? "Rozwiń gablotę wyróżnionych gier" : "Zwiń gablotę wyróżnionych gier";
    }
}

function isGameInShowcase(game) {
    if (!game) return false;
    const cols = (game["Kolekcje"] || game["tags"] || "").split(",").map(c => c.trim().toLowerCase());
    return cols.includes("gablota");
}

function renderProfileShowcase() {
    const container = document.getElementById("showcaseShelfContainer") || document.getElementById("showcaseGrid");
    if (!container || !state.currentUser) return;

    const showcaseGames = state.games.filter(g => isGameInShowcase(g)).slice(0, 12);

    if (showcaseGames.length === 0) {
        container.innerHTML = '<p class="showcase-empty-hint">Brak wyróżnionych książek w gablocie. Dodaj tag "Gablota" w edycji książki lub użyj przycisku powyżej.</p>';
        return;
    }

    container.innerHTML = "";
    const showcaseShelf = document.createElement("div");
    showcaseShelf.className = "game-shelf-unit shelf-unit-showcase";

    // GÓRNY POZIOM: do 6 książek pionowo
    const topTier = document.createElement("div");
    topTier.className = "shelf-tier tier-top";
    const topBooks = showcaseGames.slice(0, 6);
    topBooks.forEach(book => {
        topTier.appendChild(createSpineElement(book, "vertical", "upright"));
    });
    showcaseShelf.appendChild(topTier);

    // DOLNY POZIOM: do 6 książek pionowo
    const bottomTier = document.createElement("div");
    bottomTier.className = "shelf-tier tier-bottom";
    const bottomBooks = showcaseGames.slice(6, 12);
    bottomBooks.forEach(book => {
        bottomTier.appendChild(createSpineElement(book, "vertical", "upright"));
    });
    showcaseShelf.appendChild(bottomTier);

    container.appendChild(showcaseShelf);
}

function openShowcaseEditModal() {
    if (!state.currentUser || !state.isAdmin) return;

    const checklist = document.getElementById("showcaseGamesChecklist");
    const searchInput = document.getElementById("showcaseSearchInput");
    if (searchInput) searchInput.value = "";

    checklist.innerHTML = "";
    state.games.forEach(game => {
        const label = document.createElement("label");
        label.className = "showcase-check-item";
        const isChecked = isGameInShowcase(game);

        label.innerHTML = `
            <input type="checkbox" value="${escapeHtml(String(game.id))}" ${isChecked ? "checked" : ""}>
            <span><strong>${escapeHtml(game["book name"] || game["Tytuł"] || "Brak")}</strong> (${escapeHtml(game["genre"] || game["Platforma"] || "-")} - ${game["final score"] || game["Ocena gry"] || "-"})</span>
        `;

        const checkbox = label.querySelector("input");
        checkbox.addEventListener("change", () => {
            updateShowcaseCheckboxesLimit();
        });

        checklist.appendChild(label);
    });

    const updateShowcaseCheckboxesLimit = () => {
        const allCheckboxes = Array.from(checklist.querySelectorAll("input[type='checkbox']"));
        const checkedBoxes = allCheckboxes.filter(cb => cb.checked);
        const count = checkedBoxes.length;
        const countEl = document.getElementById("showcaseSelectedCount");
        if (countEl) countEl.textContent = `(${count}/8)`;

        allCheckboxes.forEach(cb => {
            if (!cb.checked) {
                cb.disabled = count >= 8;
                cb.parentElement.style.opacity = count >= 8 ? "0.45" : "1";
                cb.parentElement.style.cursor = count >= 8 ? "not-allowed" : "pointer";
            } else {
                cb.disabled = false;
                cb.parentElement.style.opacity = "1";
                cb.parentElement.style.cursor = "pointer";
            }
        });
    };

    updateShowcaseCheckboxesLimit();
    openModal("showcaseEditModal");
}

function filterShowcaseChecklist(query) {
    const items = document.querySelectorAll(".showcase-check-item");
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? "flex" : "none";
    });
}

function handleSaveShowcase() {
    if (!state.currentUser) return;

    const checkboxes = document.querySelectorAll("#showcaseGamesChecklist input[type='checkbox']");
    const selectedIds = new Set();
    checkboxes.forEach(cb => {
        if (cb.checked && selectedIds.size < 8) selectedIds.add(cb.value);
    });

    state.games.forEach(game => {
        const gameIdStr = String(game.id);
        const shouldBeInShowcase = selectedIds.has(gameIdStr);
        let tags = (game["tags"] || game["Kolekcje"] || "").split(",").map(t => t.trim()).filter(Boolean);
        const hasTag = tags.some(t => t.toLowerCase() === "gablota");

        let changed = false;
        if (shouldBeInShowcase && !hasTag) {
            tags.push("Gablota");
            changed = true;
        } else if (!shouldBeInShowcase && hasTag) {
            tags = tags.filter(t => t.toLowerCase() !== "gablota");
            changed = true;
        }

        if (changed) {
            game["tags"] = tags.join(", ");
            game["Kolekcje"] = tags.join(", ");
            const nowTime = getCurrentDateTimeString();
            game["update"] = nowTime;
            game["Aktualizacja"] = nowTime;
            const gameDetails = { ...game, "update": nowTime, "Aktualizacja": nowTime };
            const apiParams = {
                action: "editBook",
                user: state.currentUser.sheetName,
                bookId: game.id,
                gameId: game.id,
                bookDetails: JSON.stringify(gameDetails),
                gameDetails: JSON.stringify(gameDetails)
            };
            enqueueSyncTask(
                `Aktualizacja gabloty: ${game["book name"] || game["Tytuł"]}`,
                async () => {
                    return await sendApiRequest(apiParams);
                },
                null,
                apiParams
            );
        }
    });

    setCachedGames(state.currentUser.sheetName, state.games);
    renderProfileShowcase();
    renderGamesGrid();
    closeModal("showcaseEditModal");
}
