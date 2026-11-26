/**
 * Moduł ustawień słowników bazy (Statusy, Gatunki, Tagi) oraz dodawania użytkowników
 */

function openUserModal(user = null) {
    if (!state.isAdmin) return;
    const modalTitle = document.getElementById("addUserModalTitle");
    const modalHint = document.getElementById("addUserModalHint");
    const submitBtn = document.getElementById("btnSubmitAddUser");
    const oldCodeInput = document.getElementById("editUserOldCode");
    const codeInput = document.getElementById("newUserCode");
    const iconInput = document.getElementById("newUserIconLink");
    const iconPreview = document.getElementById("newUserIconPreview");
    const colorInput = document.getElementById("newUserColor");
    const colorHexInput = document.getElementById("newUserColorHex");
    const colorPreview = document.getElementById("newUserColorPreview");
    const errorEl = document.getElementById("addUserError");

    if (errorEl) errorEl.style.display = "none";

    if (user) {
        if (modalTitle) modalTitle.textContent = "Edytuj Profil Czytelnika";
        if (modalHint) modalHint.textContent = "Zmiana inicjałów zaktualizuje nazwę zakładki oraz wszystkie odwołania w statystykach i słownikach.";
        if (submitBtn) submitBtn.textContent = "Zapisz zmiany";
        if (oldCodeInput) oldCodeInput.value = user.code;
        if (codeInput) codeInput.value = user.code;
        if (iconInput) iconInput.value = user.avatar && user.avatar !== "assets/icon.jpg" ? user.avatar : "";
        if (iconPreview) iconPreview.src = user.avatar || "assets/icon.jpg";
        const col = /^#[0-9A-Fa-f]{6}$/.test(user.color) ? user.color : "#2a4365";
        if (colorInput) colorInput.value = col;
        if (colorHexInput) colorHexInput.value = col;
        if (colorPreview) colorPreview.style.backgroundColor = col;
    } else {
        if (modalTitle) modalTitle.textContent = "Dodaj Nowego Czytelnika";
        if (modalHint) modalHint.textContent = 'Tworzy nową zakładkę bazy książek "{Inicjały} Books" oraz automatycznie dopisuje profil, kolumny i polskie formuły statystyczne we wszystkich arkuszach.';
        if (submitBtn) submitBtn.textContent = "Utwórz profil i arkusz";
        if (oldCodeInput) oldCodeInput.value = "";
        if (codeInput) codeInput.value = "";
        if (iconInput) iconInput.value = "";
        if (iconPreview) iconPreview.src = "assets/icon.jpg";
        if (colorInput) colorInput.value = "#2a4365";
        if (colorHexInput) colorHexInput.value = "#2a4365";
        if (colorPreview) colorPreview.style.backgroundColor = "#2a4365";
    }

    openModal("addUserModal");
}

function handleAddUserSubmit(e) {
    e.preventDefault();
    if (!state.isAdmin) return;

    const oldCode = (document.getElementById("editUserOldCode")?.value || "").trim().toUpperCase();
    const userCode = document.getElementById("newUserCode").value.trim().toUpperCase();
    const iconLink = (document.getElementById("newUserIconLink")?.value || "").trim();
    const hexRaw = (document.getElementById("newUserColorHex")?.value || "").trim();
    const pickerVal = document.getElementById("newUserColor").value;
    const userColor = /^#[0-9A-Fa-f]{6}$/.test(hexRaw) ? hexRaw : pickerVal;

    if (!userCode) {
        alert("Podaj inicjały czytelnika (np. MM, NR, NK).");
        return;
    }

    const sheetName = `${userCode} Books`;
    const previousUsers = [...state.users];
    const isEdit = Boolean(oldCode);

    if (isEdit) {
        const targetUser = state.users.find(u => u.code === oldCode);
        if (!targetUser) return;

        const updatedUser = {
            ...targetUser,
            code: userCode,
            name: `Biblioteczka ${userCode}`,
            sheetName: sheetName,
            avatar: iconLink || "assets/icon.jpg",
            color: userColor,
            hoverColor: userColor
        };

        state.users = state.users.map(u => (u.code === oldCode ? updatedUser : u));
        try {
            localStorage.setItem(CACHE_KEYS.USERS, JSON.stringify(state.users));
            if (oldCode !== userCode) {
                const authMap = JSON.parse(localStorage.getItem("mmnr_auth_map") || "{}");
                const oldSheet = `${oldCode} Books`;
                if (authMap[oldSheet]) {
                    authMap[sheetName] = authMap[oldSheet];
                    delete authMap[oldSheet];
                    localStorage.setItem("mmnr_auth_map", JSON.stringify(authMap));
                }
            }
        } catch (err) {}

        closeModal("addUserModal");
        renderProfileDropdownMenu();
        renderUsersSettingsTable();
        if (state.currentUser && state.currentUser.code === oldCode) {
            switchUserProfile(updatedUser);
        }

        const apiParams = {
            action: "editUser",
            user: `${oldCode} Books`,
            oldCode: oldCode,
            newCode: userCode,
            tabColor: userColor,
            iconLink: iconLink
        };

        enqueueSyncTask(
            `Edycja profilu: ${oldCode} -> ${userCode}`,
            async () => {
                let targetPass = state.adminPassword;
                try {
                    const authMap = JSON.parse(localStorage.getItem("mmnr_auth_map") || "{}");
                    targetPass = authMap[sheetName] || authMap[`${oldCode} Books`] || state.adminPassword;
                } catch (err) {}
                const res = await sendApiRequest(apiParams, targetPass);
                if (res.status === "success") {
                    invalidateUsersCache();
                    invalidateSettingsCache();
                    try {
                        localStorage.setItem(CACHE_KEYS.USERS, JSON.stringify(state.users));
                    } catch (err) {}
                }
                return res;
            },
            () => {
                state.users = previousUsers;
                renderProfileDropdownMenu();
                renderUsersSettingsTable();
            },
            apiParams
        );
        return;
    }

    if (state.users.some(u => u.code === userCode)) {
        alert(`Profil o inicjałach ${userCode} już istnieje.`);
        return;
    }

    const creatorSheet = state.currentUser ? state.currentUser.sheetName : "MM Books";
    const creatorPass = state.adminPassword;

    const newUser = {
        code: userCode,
        name: `Biblioteczka ${userCode}`,
        sheetName: sheetName,
        avatar: iconLink || "assets/icon.jpg",
        color: userColor,
        hoverColor: userColor
    };

    state.users.push(newUser);
    try {
        localStorage.setItem(CACHE_KEYS.USERS, JSON.stringify(state.users));
    } catch (err) {}

    closeModal("addUserModal");
    document.getElementById("addUserForm").reset();
    renderProfileDropdownMenu();
    renderUsersSettingsTable();
    switchUserProfile(newUser);

    const apiParams = {
        action: "addUser",
        user: creatorSheet,
        userName: sheetName,
        userCode: userCode,
        tabColor: userColor,
        iconLink: iconLink
    };

    enqueueSyncTask(
        `Tworzenie profilu: ${userCode}`,
        async () => {
            const res = await sendApiRequest(apiParams, creatorPass);

            if (res.status === "success") {
                invalidateUsersCache();
                invalidateSettingsCache();
                try {
                    localStorage.setItem(CACHE_KEYS.USERS, JSON.stringify(state.users));
                } catch (e) {}
            }
            return res;
        },
        () => {
            state.users = previousUsers;
            renderProfileDropdownMenu();
            renderUsersSettingsTable();
            if (state.currentUser && state.currentUser.code === userCode && state.users[0]) {
                switchUserProfile(state.users[0]);
            }
        },
        apiParams
    );
}

let settingsActiveUserCode = null;

function getLoggedInRealUsers() {
    let authMap = {};
    try {
        authMap = JSON.parse(localStorage.getItem("mmnr_auth_map") || "{}");
    } catch (e) {}
    return (state.users || []).filter(u => !u.isForum && Boolean(authMap[u.sheetName]));
}

function populateSettingsAccountSelector() {
    const wrapper = document.getElementById("settingsAccountSelectorWrapper");
    const select = document.getElementById("settingsAccountSelect");
    if (!wrapper || !select) return;

    const loggedUsers = getLoggedInRealUsers();
    const currentCode = state.currentUser && !state.currentUser.isForum ? state.currentUser.code : (loggedUsers[0] ? loggedUsers[0].code : "");
    if (!settingsActiveUserCode || !loggedUsers.some(u => u.code === settingsActiveUserCode)) {
        settingsActiveUserCode = currentCode;
    }

    if (loggedUsers.length > 1) {
        wrapper.style.display = "flex";
        select.innerHTML = "";
        loggedUsers.forEach(u => {
            const opt = document.createElement("option");
            opt.value = u.code;
            opt.textContent = u.name || `Biblioteczka ${u.code}`;
            if (u.code === settingsActiveUserCode) opt.selected = true;
            select.appendChild(opt);
        });
        select.onchange = () => {
            settingsActiveUserCode = select.value;
            renderStatsTables();
        };
    } else {
        wrapper.style.display = "none";
    }
}

async function openStatsModal() {
    if (!state.isAdmin) return;
    settingsActiveUserCode = state.currentUser && !state.currentUser.isForum ? state.currentUser.code : null;
    populateSettingsAccountSelector();
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

    const loggedUsers = getLoggedInRealUsers();
    const activeCode = settingsActiveUserCode || (state.currentUser ? state.currentUser.code : "");

    const firstRealUser = state.users.find(u => !u.isForum);
    const isFirstProfileAdmin = Boolean(
        state.isAdmin &&
        firstRealUser &&
        activeCode === firstRealUser.code
    );
    const btnAddUser = document.getElementById("btnOpenAddUserModal");
    if (btnAddUser) {
        btnAddUser.style.display = isFirstProfileAdmin ? "inline-block" : "none";
    }

    const visibleUsers = loggedUsers.filter(u => !activeCode || u.code === activeCode || loggedUsers.length > 1);
    if (visibleUsers.length === 0) {
        container.innerHTML = "<p style='padding:10px; color:#888;'>Brak zalogowanych profili.</p>";
        return;
    }

    let html = "<table class='data-table'><thead><tr><th>Awatar</th><th>Kod</th><th>Kolor</th><th>Arkusz kalkulacyjny</th>";
    if (state.isAdmin) html += "<th style='width: 80px;'>Akcje</th>";
    html += "</tr></thead><tbody>";

    visibleUsers.forEach(u => {
        const safeColor = escapeHtml(u.color || "#2a4365");
        const canEditThisUser = !u.isForum && loggedUsers.some(lu => lu.code === u.code);
        html += `
            <tr>
                <td><img src="${escapeHtml(u.avatar || "assets/icon.jpg")}" alt="${escapeHtml(u.code)}" class="mini-avatar" onerror="this.src='assets/icon.jpg'"></td>
                <td><strong>${escapeHtml(u.code)}</strong></td>
                <td><span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:14px;height:14px;border-radius:3px;border:1px solid var(--color-border);background:${safeColor};display:inline-block;"></span><code>${safeColor}</code></span></td>
                <td>${escapeHtml(u.sheetName)}</td>
                ${state.isAdmin ? `<td>${canEditThisUser ? `<button type="button" class="btn-secondary btn-edit-user" data-user-code="${escapeHtml(u.code)}" style="padding:3px 8px;font-size:12px;">[Edytuj]</button>` : ""}</td>` : ""}
            </tr>
        `;
    });
    html += "</tbody></table>";
    container.innerHTML = html;

    if (state.isAdmin) {
        container.querySelectorAll(".btn-edit-user").forEach(btn => {
            btn.addEventListener("click", () => {
                const code = btn.getAttribute("data-user-code");
                const userObj = state.users.find(u => u.code === code);
                if (userObj) openUserModal(userObj);
            });
        });
    }
}

function renderTable(containerId, tableData, category = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!tableData || !tableData.headers || tableData.headers.length === 0) {
        container.innerHTML = "<p style='padding:10px; color:#888;'>Brak danych tabeli.</p>";
        return;
    }

    const catLower = (category || "").toLowerCase();
    const currentUserCode = (settingsActiveUserCode || (state.currentUser ? state.currentUser.code : "")).toString().trim().toUpperCase();
    const allUserCodes = (state.users || []).filter(u => !u.isForum).map(u => u.code.toUpperCase());

    let displayedHeaders = tableData.headers.filter(h => {
        const low = h.toLowerCase().trim();
        if (low === "wszyscy" || low.includes("liczba") || low.includes("godziny") || low === "id") {
            return false;
        }
        // Ukrywamy kolumny innych użytkowników (zarówno kody jak i "color <KOD>")
        for (const code of allUserCodes) {
            if (code !== currentUserCode) {
                if (low === code.toLowerCase() || low === `color ${code.toLowerCase()}` || low === `kolor ${code.toLowerCase()}`) {
                    return false;
                }
            }
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
