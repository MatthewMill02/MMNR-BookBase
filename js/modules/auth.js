/**
 * Autoryzacja i tryb administratora
 */

function checkAdminStatusForUser(user) {
    try {
        const userSheet = user ? user.sheetName : (state.currentUser ? state.currentUser.sheetName : "MM Books");
        const authMap = JSON.parse(localStorage.getItem("mmnr_auth_map") || "{}");

        if (authMap[userSheet]) {
            state.isAdmin = true;
            state.adminPassword = authMap[userSheet];
        } else {
            state.isAdmin = false;
            state.adminPassword = "";
        }
    } catch (e) {
        state.isAdmin = false;
        state.adminPassword = "";
    }
    applyAdminUiState();
}

function openAdminLoginModal() {
    const select = document.getElementById("adminUserSelect");
    const passInput = document.getElementById("adminPasswordInput");
    const errorDiv = document.getElementById("adminLoginError");

    if (errorDiv) errorDiv.style.display = "none";
    if (passInput) passInput.value = "";

    if (select) {
        select.innerHTML = "";
        state.users.forEach(u => {
            const opt = document.createElement("option");
            opt.value = u.sheetName;
            opt.textContent = u.name || u.sheetName;
            if (state.currentUser && state.currentUser.sheetName === u.sheetName) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
    }

    openModal("adminLoginModal");
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const select = document.getElementById("adminUserSelect");
    const passInput = document.getElementById("adminPasswordInput");
    const errorDiv = document.getElementById("adminLoginError");
    const submitBtn = document.getElementById("btnSubmitAdminLogin");

    if (errorDiv) errorDiv.style.display = "none";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Weryfikacja...";
    }

    const enteredPass = passInput ? passInput.value.trim() : "";
    const selectedSheet = (select && select.value) ? select.value.trim() : (state.currentUser ? state.currentUser.sheetName : "MM Books");

    try {
        const response = await sendApiRequest({ action: "verifyAuth", user: selectedSheet }, enteredPass);

        const isAuthorized = response.status === "success" && response.data && response.data.authorized;

        if (isAuthorized) {
            // Zapisujemy hasło tylko dla konkretnego użytkownika / bazy
            const authMap = JSON.parse(localStorage.getItem("mmnr_auth_map") || "{}");
            authMap[selectedSheet] = enteredPass;
            localStorage.setItem("mmnr_auth_map", JSON.stringify(authMap));

            // Jeśli logujemy się do innej bazy niż bieżąca, przełączamy na tę bazę
            const targetUser = state.users.find(u => u.sheetName === selectedSheet);
            if (targetUser && (!state.currentUser || state.currentUser.sheetName !== selectedSheet)) {
                switchUserProfile(targetUser);
            } else {
                state.isAdmin = true;
                state.adminPassword = enteredPass;
                applyAdminUiState();
                renderGamesGrid();
                updateProfileBanner();
            }

            closeModal("adminLoginModal");
            if (passInput) passInput.value = "";
        } else {
            if (errorDiv) {
                errorDiv.textContent = (response && response.message) ? response.message : "Błędne hasło dostępu dla wybranej bazy!";
                errorDiv.style.display = "block";
            }
        }
    } catch (err) {
        if (errorDiv) {
            errorDiv.textContent = "Błędne hasło dostępu dla wybranej bazy!";
            errorDiv.style.display = "block";
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Zaloguj";
        }
    }
}

function handleAdminLogout() {
    state.isAdmin = false;
    state.adminPassword = "";
    try {
        const currentSheet = state.currentUser ? state.currentUser.sheetName : "MM Books";
        const authMap = JSON.parse(localStorage.getItem("mmnr_auth_map") || "{}");
        delete authMap[currentSheet];
        localStorage.setItem("mmnr_auth_map", JSON.stringify(authMap));
    } catch (e) {}
    applyAdminUiState();
    renderGamesGrid();
    updateProfileBanner();
}

function applyAdminUiState() {
    const syncStatusWrapper = document.getElementById("syncStatusWrapper");
    const mobileSyncWrapper = document.getElementById("mobileSyncWrapper");
    const btnAdminLogin = document.getElementById("btnAdminLoginModal");
    const btnEditShowcase = document.getElementById("btnEditShowcase");
    const adminOnlyBlocks = document.querySelectorAll(".admin-only-block");
    const mobileAdminLabel = document.getElementById("mobileAdminLabel");

    if (state.isAdmin) {
        if (syncStatusWrapper) syncStatusWrapper.style.setProperty("display", "flex", "important");
        if (mobileSyncWrapper) mobileSyncWrapper.style.setProperty("display", "flex", "important");
        if (btnAdminLogin) btnAdminLogin.style.setProperty("display", "none", "important");
        if (btnEditShowcase) btnEditShowcase.style.setProperty("display", "inline-block", "important");
        if (mobileAdminLabel) mobileAdminLabel.textContent = "Wyloguj administratora";
        adminOnlyBlocks.forEach(el => {
            el.classList.remove("is-admin-hidden");
            if (el.id === "mobileSyncWrapper") {
                el.style.setProperty("display", "flex", "important");
            } else if (el.id === "btnMobileAddGame") {
                el.style.setProperty("display", "inline-flex", "important");
            } else if (el.classList.contains("drawer-menu-item")) {
                el.style.setProperty("display", "flex", "important");
            } else if (el.classList.contains("action-btn") || el.tagName === "BUTTON") {
                el.style.setProperty("display", "inline-block", "important");
            } else {
                el.style.setProperty("display", "flex", "important");
            }
        });
    } else {
        if (syncStatusWrapper) syncStatusWrapper.style.setProperty("display", "none", "important");
        if (mobileSyncWrapper) mobileSyncWrapper.style.setProperty("display", "none", "important");
        if (btnAdminLogin) btnAdminLogin.style.setProperty("display", "inline-block", "important");
        if (btnEditShowcase) btnEditShowcase.style.setProperty("display", "none", "important");
        if (mobileAdminLabel) mobileAdminLabel.textContent = "Zaloguj administratora";
        adminOnlyBlocks.forEach(el => {
            el.classList.add("is-admin-hidden");
            el.style.setProperty("display", "none", "important");
        });
    }

    if (typeof renderMonitorGameDetails === "function") {
        renderMonitorGameDetails(state.selectedGame);
    }
}
