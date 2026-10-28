/**
 * Filtry wielokrotnego wyboru (checklisty) oraz wyszukiwarka i sortowanie
 */

function setupFilterDropdown(btnId, menuId) {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    if (!btn || !menu) return;

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isShown = menu.style.display === "block";
        closeAllFilterDropdowns();
        if (!isShown) menu.style.display = "block";
    });

    menu.addEventListener("click", (e) => {
        e.stopPropagation();
    });
}

function closeAllFilterDropdowns() {
    const menus = ["menuFilterStatus", "menuFilterPlatform", "menuFilterCollection"];
    menus.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
}

function populateFilterOptions() {
    const statuses = new Set();
    const genres = new Set();
    const tags = new Set();

    state.games.forEach(b => {
        const st = (b["status"] || b["Stan"] || "").trim();
        if (st) statuses.add(st);

        const rawGn = (b["genre"] || b["Gatunek"] || b["Platforma"] || "").trim();
        if (rawGn) {
            rawGn.split(",").forEach(g => {
                const cleanG = g.trim();
                if (cleanG) genres.add(cleanG);
            });
        }

        const tg = b["tags"] || b["Tagi"] || b["Kolekcje"] || "";
        if (tg) {
            tg.split(",").forEach(t => {
                const clean = t.trim();
                if (clean) tags.add(clean);
            });
        }
    });

    renderChecklist("checklistStatus", Array.from(statuses).sort(), state.filters.statuses, "labelFilterStatus", "Status");
    renderChecklist("checklistPlatform", Array.from(genres).sort(), state.filters.platforms, "labelFilterPlatform", "Gatunek");
    renderChecklist("checklistCollection", Array.from(tags).sort(), state.filters.collections, "labelFilterCollection", "Tagi");
}

function renderChecklist(containerId, items, selectedSet, labelId, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";

    if (items.length === 0) {
        container.innerHTML = '<span style="font-size:14px; color:var(--color-text-muted); padding:4px;">Brak opcji</span>';
        return;
    }

    items.forEach(val => {
        const label = document.createElement("label");
        label.className = "filter-check-item";

        const isChecked = selectedSet.has(val);

        label.innerHTML = `
            <input type="checkbox" value="${escapeHtml(val)}" ${isChecked ? "checked" : ""}>
            <span>${escapeHtml(val)}</span>
        `;

        const checkbox = label.querySelector("input");
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                selectedSet.add(val);
            } else {
                selectedSet.delete(val);
            }
            updateFilterLabel(labelId, prefix, selectedSet);
            updateMobileFiltersBadge();
            renderGamesGrid();
        });

        container.appendChild(label);
    });

    updateFilterLabel(labelId, prefix, selectedSet);
}

function updateFilterLabel(labelId, prefix, selectedSet) {
    const labelEl = document.getElementById(labelId);
    if (!labelEl) return;

    if (selectedSet.size === 0) {
        labelEl.textContent = `${prefix}: Wszystkie`;
    } else if (selectedSet.size === 1) {
        const firstVal = Array.from(selectedSet)[0];
        labelEl.textContent = `${prefix}: ${firstVal}`;
    } else {
        labelEl.textContent = `${prefix} (${selectedSet.size})`;
    }
}

function updateMobileFiltersBadge() {
    const badge = document.getElementById("filtersBadge") || document.getElementById("mobileFiltersBadge");
    if (!badge) return;
    const total = state.filters.statuses.size + state.filters.platforms.size + state.filters.collections.size;
    if (total > 0) {
        badge.textContent = total;
        badge.style.display = "inline-block";
    } else {
        badge.style.display = "none";
    }
}

function resetFilters() {
    state.filters.search = "";
    state.filters.statuses.clear();
    state.filters.platforms.clear();
    state.filters.collections.clear();
    state.filters.sort = "updated_desc";
    state.filters.group = "none";

    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";
    const btnClearSearch = document.getElementById("btnClearSearch");
    if (btnClearSearch) btnClearSearch.style.display = "none";
    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) sortSelect.value = "updated_desc";
    const groupSelectEl = document.getElementById("groupSelect");
    if (groupSelectEl) groupSelectEl.value = "none";

    closeAllFilterDropdowns();
    populateFilterOptions();
    updateMobileFiltersBadge();
    renderGamesGrid();
}
