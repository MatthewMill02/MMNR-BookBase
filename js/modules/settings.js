/**
 * Moduł ustawień słowników bazy (Statusy, Gatunki, Tagi) oraz dodawania użytkowników
 */

function handleAddUserSubmit(e) {
    e.preventDefault();
    if (!state.isAdmin) return;

    const userCode = document.getElementById("newUserCode").value.trim().toUpperCase();
    const userColor = document.getElementById("newUserColor").value;

    if (!userCode) {
        alert("Podaj inicjały czytelnika (np. MM, NR, NK).");
        return;
    }

    const sheetName = `${userCode} Books`;
    const previousUsers = [...state.users];

    const newUser = {
        code: userCode,
        name: sheetName,
        sheetName: sheetName,
        avatar: getUserAvatarPath(sheetName),
        color: userColor,
        hoverColor: userColor
    };

    state.users.push(newUser);
    closeModal("addUserModal");
    document.getElementById("addUserForm").reset();
    renderProfileDropdownMenu();
    switchUserProfile(newUser);

    const apiParams = {
        action: "addUser",
        userName: sheetName,
        userCode: userCode,
        tabColor: userColor
    };

    enqueueSyncTask(
        `Tworzenie profilu: ${userCode}`,
        async () => {
            const res = await sendApiRequest(apiParams);

            if (res.status === "success") {
                invalidateUsersCache();
                invalidateSettingsCache();
                try {
                    sessionStorage.setItem(CACHE_KEYS.USERS, JSON.stringify(state.users));
                } catch (e) {}
            }
            return res;
        },
        () => {
            state.users = previousUsers;
            renderProfileDropdownMenu();
            if (state.currentUser && state.currentUser.code === userCode) {
                switchUserProfile(state.users[0]);
            }
        },
        apiParams
    );
}

async function openStatsModal() {
    openModal("statsModal");
    await fetchSettingsAndStats(false);
    renderStatsTables();
}

async function fetchSettingsAndStats(forceRefresh = false) {
    if (!forceRefresh && state.cache.settings) {
        state.settings = state.cache.settings;
        renderStatsTables();
        return;
    }

    try {
        const response = await sendApiRequest({ action: "getSettingsAndStats" });
        if (response.status === "success" && response.data) {
            state.settings = response.data;
            state.cache.settings = response.data;
            try {
                sessionStorage.setItem(CACHE_KEYS.SETTINGS, JSON.stringify(response.data));
            } catch (e) {}
            renderStatsTables();
            if (state.games && state.games.length > 0) {
                renderGamesShelves();
                renderProfileShowcase();
            }
        }
    } catch (e) {
        console.warn("Nie udało się odświeżyć statystyk.");
    }
}

function initStatsTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");

            btn.classList.add("active");
            const targetId = btn.getAttribute("data-tab");
            const content = document.getElementById(targetId);
            if (content) content.style.display = "block";
        });
    });
}

function renderStatsTables() {
    renderTable("tableStanContainer", state.settings.status || state.settings.stan, "status");
    renderTable("tablePlatformyContainer", state.settings.genre || state.settings.platformy, "genre");
    renderTable("tableKolekcjeContainer", state.settings.tags || state.settings.kolekcje, "tags");
    renderUsersSettingsTable();
}

function renderUsersSettingsTable() {
    const container = document.getElementById("tableUzytkownicyContainer");
    if (!container) return;

    if (!state.users || state.users.length === 0) {
        container.innerHTML = "<p style='padding:10px; color:#888;'>Brak danych czytelników.</p>";
        return;
    }

    let html = "<table class='data-table'><thead><tr><th>Awatar</th><th>Kod</th><th>Profil czytelnika</th><th>Arkusz kalkulacyjny</th></tr></thead><tbody>";
    state.users.forEach(u => {
        html += `
            <tr>
                <td><img src="${u.avatar}" alt="${u.code}" class="mini-avatar" onerror="this.src='assets/icon.jpg'"></td>
                <td><strong>${escapeHtml(u.code)}</strong></td>
                <td>${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.sheetName)}</td>
            </tr>
        `;
    });
    html += "</tbody></table>";
    container.innerHTML = html;
}

function renderTable(containerId, tableData, category = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!tableData || !tableData.headers || tableData.headers.length === 0) {
        container.innerHTML = "<p style='padding:10px; color:#888;'>Brak danych tabeli.</p>";
        return;
    }

    const catLower = (category || "").toLowerCase();
    const currentUserCode = state.currentUser ? (state.currentUser.code || "").toString().trim().toUpperCase() : "";

    let displayedHeaders = tableData.headers.filter(h => {
        const low = h.toLowerCase();
        if (low === "mm" || low === "nr" || low === "nk" || low === "wszyscy" || low.includes("liczba") || low.includes("godziny")) {
            return false;
        }
        return true;
    });

    let html = "<table class='data-table'><thead><tr>";
    displayedHeaders.forEach(h => {
        let label = h;
        if (h === "status" && catLower === "genre") label = "Gatunek";
        else if (h === "status") label = "Status";
        else if (h === "tags") label = "Tag";
        html += `<th>${escapeHtml(label)}</th>`;
    });
    if (state.isAdmin && category) {
        html += "<th style='width: 36px;'></th>";
    }
    html += "</tr></thead><tbody>";

    const valKey = (catLower === "tags") ? "tags" : "status";

    tableData.rows.forEach(row => {
        html += "<tr>";
        displayedHeaders.forEach(h => {
            const val = row[h] !== undefined && row[h] !== null ? row[h] : "";
            const isColorCol = h.toLowerCase().startsWith("color") || h.toLowerCase().startsWith("kolor");
            if (isColorCol && val) {
                const hexVal = String(val).trim();
                const pastel = toPastelSpineColor(hexVal);
                html += `
                    <td>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span style="display:inline-block; width:16px; height:16px; border-radius:3px; background-color:${pastel}; border:1px solid rgba(255,255,255,0.25); box-shadow:0 1px 3px rgba(0,0,0,0.5);"></span>
                            <span style="font-family:monospace; font-size:14px;">${escapeHtml(hexVal)}</span>
                        </div>
                    </td>
                `;
            } else {
                html += `<td>${escapeHtml(String(val))}</td>`;
            }
        });

        if (state.isAdmin && category) {
            const primaryVal = row[valKey] || row[category] || "";
            let colorVal = "";
            if (currentUserCode && row[`color ${currentUserCode}`]) {
                colorVal = row[`color ${currentUserCode}`];
            } else if (currentUserCode && row[`kolor ${currentUserCode.toLowerCase()}`]) {
                colorVal = row[`kolor ${currentUserCode.toLowerCase()}`];
            } else if (currentUserCode && row[`Color ${currentUserCode}`]) {
                colorVal = row[`Color ${currentUserCode}`];
            } else {
                colorVal = row["color MM"] || row["color"] || row["Kolor"] || "";
            }

            html += `
                <td style="text-align: center; width: 36px; position: relative;">
                    <div class="table-menu-container">
                        <button type="button" class="btn-table-menu" title="Więcej opcji" aria-label="Więcej opcji">
                            <span>&#8942;</span>
                        </button>
                        <div class="table-menu-dropdown">
                            <button type="button" class="table-menu-item btn-setting-edit" data-category="${escapeHtml(category)}" data-val="${escapeHtml(primaryVal)}" data-desc="" data-color="${escapeHtml(colorVal)}">Edytuj</button>
                            <button type="button" class="table-menu-item table-menu-item-danger btn-setting-delete" data-category="${escapeHtml(category)}" data-val="${escapeHtml(primaryVal)}">Usuń</button>
                        </div>
                    </div>
                </td>
            `;
        }
        html += "</tr>";
    });

    html += "</tbody></table>";
    container.innerHTML = html;
}

window.openEditSettingModal = function(category, value, description, color = "") {
    if (!state.isAdmin) return;
    const catLower = (category || "").toLowerCase();
    document.getElementById("editSettingCategory").value = category;
    document.getElementById("editSettingOldValue").value = value;
    document.getElementById("editSettingNewValue").value = value;

    let displayCatName = category;
    if (catLower === "status") displayCatName = "Status";
    else if (catLower === "genre") displayCatName = "Gatunek";
    else if (catLower === "tags") displayCatName = "Tag";

    document.getElementById("editSettingModalTitle").textContent = `Edytuj: ${displayCatName}`;
    document.getElementById("editSettingValueLabel").textContent = `${displayCatName}:`;

    const descGroup = document.getElementById("editSettingDescGroup");
    if (descGroup) descGroup.style.display = "none";

    const colorGroup = document.getElementById("editSettingColorGroup");
    const colorInput = document.getElementById("editSettingNewColor");
    const colorPicker = document.getElementById("editSettingNewColorPicker");

    if (catLower === "status" || catLower === "stan") {
        if (colorGroup) colorGroup.style.display = "block";
        const cleanColor = (color || "").trim();
        if (colorInput) colorInput.value = cleanColor;
        if (colorPicker) colorPicker.value = /^#[0-9A-Fa-f]{6}$/.test(cleanColor) ? cleanColor : "#2a4365";
    } else {
        if (colorGroup) colorGroup.style.display = "none";
        if (colorInput) colorInput.value = "";
    }

    openModal("editSettingModal");
};

function handleSaveEditSetting(e) {
    e.preventDefault();
    if (!state.isAdmin) return;

    const category = document.getElementById("editSettingCategory").value;
    const oldValue = document.getElementById("editSettingOldValue").value;
    const newValue = document.getElementById("editSettingNewValue").value.trim();
    const newColorInput = document.getElementById("editSettingNewColor");
    const newColor = newColorInput ? newColorInput.value.trim() : "";
    const currentUserCode = state.currentUser ? (state.currentUser.code || "").toString().trim().toUpperCase() : "";

    if (!newValue) {
        alert("Wartość nie może być pusta.");
        return;
    }

    closeModal("editSettingModal");

    const catData = getSettingsCategoryData(category);
    let previousRows = null;
    const catLower = (category || "").toLowerCase();
    const valKey = (catLower === "tags") ? "tags" : "status";

    if (catData && catData.rows) {
        previousRows = JSON.parse(JSON.stringify(catData.rows));
        catData.rows.forEach(r => {
            const currentVal = r[valKey] || r[category] || "";
            if (String(currentVal) === String(oldValue)) {
                r[valKey] = newValue;
                if (r[category] !== undefined) r[category] = newValue;

                if (catLower === "status" || catLower === "stan") {
                    if (currentUserCode) {
                        r[`color ${currentUserCode}`] = newColor;
                    }
                    if (r["color MM"] !== undefined && currentUserCode === "MM") {
                        r["color MM"] = newColor;
                    }
                }
            }
        });
        renderStatsTables();
        populateFilterOptions();
    }

    if (catLower === "status" || catLower === "stan") {
        state.games.forEach(b => {
            if ((b["status"] || b["Stan"]) === oldValue) {
                b["status"] = newValue;
                b["Stan"] = newValue;
            }
        });
        renderGamesGrid();
        renderProfileShowcase();
    } else if (catLower === "genre" || catLower === "gatunek") {
        state.games.forEach(b => {
            if ((b["genre"] || b["Gatunek"] || b["Platforma"]) === oldValue) {
                b["genre"] = newValue;
                b["Gatunek"] = newValue;
                b["Platforma"] = newValue;
            }
        });
        renderGamesGrid();
        renderProfileShowcase();
    }

    const apiParams = {
        action: "updateSettingsItem",
        category: category,
        oldValue: oldValue,
        newValue: newValue,
        newDescription: "",
        newColor: newColor,
        user: state.currentUser ? state.currentUser.sheetName : "",
        userCode: currentUserCode
    };

    enqueueSyncTask(
        `Edycja słownika [${category}]: ${oldValue} -> ${newValue}`,
        async () => {
            const res = await sendApiRequest(apiParams);
            if (res.status === "success") {
                invalidateSettingsCache();
                await fetchSettingsAndStats(true);
                renderGamesGrid();
                renderProfileShowcase();
            }
            return res;
        },
        () => {
            if (catData && previousRows) {
                catData.rows = previousRows;
                renderStatsTables();
                populateFilterOptions();
                renderGamesGrid();
                renderProfileShowcase();
            }
        },
        apiParams
    );
}

function getSettingsCategoryData(category) {
    const catLower = (category || "").toLowerCase();
    if (catLower === "status" || catLower === "stan") return state.settings.status || state.settings.stan;
    if (catLower === "genre" || catLower === "gatunek" || catLower === "platformy") return state.settings.genre || state.settings.platformy;
    if (catLower === "tags" || catLower === "tagi" || catLower === "kolekcje") return state.settings.tags || state.settings.kolekcje;
    return null;
}

function handleAddSetting(category, inputValId, inputDescId = null, inputColorId = null) {
    if (!state.isAdmin) return;

    const valInput = document.getElementById(inputValId);
    const colorInput = inputColorId ? document.getElementById(inputColorId) : null;

    const val = valInput ? valInput.value.trim() : "";
    const colorVal = colorInput ? colorInput.value.trim() : "";
    const currentUserCode = state.currentUser ? (state.currentUser.code || "").toString().trim().toUpperCase() : "";

    if (!val) {
        alert("Podaj wartość do dodania.");
        return;
    }

    if (valInput) valInput.value = "";
    if (colorInput) colorInput.value = "";

    const catData = getSettingsCategoryData(category);
    let previousRows = null;
    const catLower = (category || "").toLowerCase();
    const valKey = (catLower === "tags") ? "tags" : "status";

    if (catData && catData.headers) {
        previousRows = [...catData.rows];
        const newRow = {};
        catData.headers.forEach(h => {
            const hLower = h.toLowerCase();
            if (hLower === "id" || hLower === "lp") {
                newRow[h] = catData.rows.length + 1;
            } else if (h === valKey || hLower === catLower) {
                newRow[h] = val;
            } else if (currentUserCode && hLower === `color ${currentUserCode.toLowerCase()}`) {
                newRow[h] = colorVal;
            } else {
                newRow[h] = "";
            }
        });
        catData.rows.push(newRow);
        renderStatsTables();
        populateFilterOptions();
        renderGamesGrid();
        renderProfileShowcase();
    }

    const apiParams = {
        action: "addSettingsItem",
        category: category,
        value: val,
        description: "",
        color: colorVal,
        user: state.currentUser ? state.currentUser.sheetName : "",
        userCode: currentUserCode
    };

    enqueueSyncTask(
        `Dodawanie do słownika [${category}]: ${val}`,
        async () => {
            const res = await sendApiRequest(apiParams);
            if (res.status === "success") {
                invalidateSettingsCache();
                await fetchSettingsAndStats(true);
                renderGamesGrid();
                renderProfileShowcase();
            }
            return res;
        },
        () => {
            if (catData && previousRows) {
                catData.rows = previousRows;
                renderStatsTables();
                populateFilterOptions();
                renderGamesGrid();
                renderProfileShowcase();
            }
        },
        apiParams
    );
}

window.handleDeleteSettingItem = function(category, value) {
    if (!state.isAdmin) return;

    if (!confirm(`Czy na pewno chcesz usunąć "${value}" ze słownika ${category}?`)) return;

    const catData = getSettingsCategoryData(category);
    let previousRows = null;
    const catLower = (category || "").toLowerCase();
    const valKey = (catLower === "tags") ? "tags" : "status";

    if (catData && catData.rows) {
        previousRows = [...catData.rows];
        catData.rows = catData.rows.filter(r => String(r[valKey] || r[category]) !== String(value));
        renderStatsTables();
        populateFilterOptions();
    }

    const apiParams = {
        action: "deleteSettingsItem",
        category: category,
        value: value,
        user: state.currentUser ? state.currentUser.sheetName : ""
    };

    enqueueSyncTask(
        `Usuwanie ze słownika [${category}]: ${value}`,
        async () => {
            const res = await sendApiRequest(apiParams);
            if (res.status === "success") {
                invalidateSettingsCache();
                await fetchSettingsAndStats(true);
            }
            return res;
        },
        () => {
            if (catData && previousRows) {
                catData.rows = previousRows;
                renderStatsTables();
                populateFilterOptions();
            }
        },
        apiParams
    );
};
