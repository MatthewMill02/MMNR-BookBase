/**
 * MMNR Baza Książek - Główny skrypt inicjalizacyjny (ES6+)
 * Oficjalna nazwa: Biblioteka Aleksandryjska ale ta nie może spłonąć (allegedly) - Wersja 1.2.1
 * Wytyczne: Czysty JavaScript, brak emotek, optymalizacja mobilna,
 * architektura modułowa, optymistyczna synchronizacja w tle.
 */

document.addEventListener("DOMContentLoaded", () => {
    initEvents();
    initSessionCache();
    loadSyncQueueFromStorage();
    checkAdminStatusForUser(state.currentUser);
    showWelcomeScreen();
});

window.addEventListener("beforeunload", (e) => {
    saveSyncQueueToStorage();
    const pendingCount = state.syncQueue.filter(t => t.status === "pending" || t.status === "in_progress").length;
    if (pendingCount > 0) {
        e.preventDefault();
        e.returnValue = "Trwa synchronizacja danych. Twoje zmiany są bezpiecznie zapisane w kolejce i zostaną przesłane po powrocie.";
    }
});

function initEvents() {
    // Nawigacja
    const btnNavHome = document.getElementById("btnNavHome");
    if (btnNavHome) btnNavHome.addEventListener("click", showWelcomeScreen);

    const footerHomeLink = document.getElementById("footerHomeLink");
    if (footerHomeLink) {
        footerHomeLink.addEventListener("click", (e) => {
            e.preventDefault();
            showWelcomeScreen();
        });
    }

    // Obsługa szuflady mobilnej (Drawer ☰)
    const mobileMenuToggle = document.getElementById("btnMobileMenuToggle");
    const mobileNavDrawer = document.getElementById("mobileNavDrawer");
    const closeDrawerBtn = document.getElementById("btnCloseMobileDrawer");
    const drawerBackdrop = document.getElementById("mobileDrawerBackdrop");

    const openMobileDrawer = () => {
        if (mobileNavDrawer) {
            mobileNavDrawer.style.display = "flex";
            document.body.classList.add("modal-open");
        }
    };
    const closeMobileDrawer = () => {
        if (mobileNavDrawer) {
            mobileNavDrawer.style.display = "none";
        }
        const hasOpenModals = Array.from(document.querySelectorAll(".modal-backdrop")).some(m => m.style.display !== "none" && m.style.display !== "");
        if (!hasOpenModals) {
            document.body.classList.remove("modal-open");
        }
    };

    if (mobileMenuToggle) mobileMenuToggle.addEventListener("click", openMobileDrawer);
    if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeMobileDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeMobileDrawer);

    const btnMobileHome = document.getElementById("btnMobileHome");
    if (btnMobileHome) btnMobileHome.addEventListener("click", () => { closeMobileDrawer(); showWelcomeScreen(); });

    const btnMobileSettings = document.getElementById("btnMobileSettings");
    if (btnMobileSettings) btnMobileSettings.addEventListener("click", () => { closeMobileDrawer(); openStatsModal(); });

    const btnMobileSyncCovers = document.getElementById("btnMobileSyncCovers");
    if (btnMobileSyncCovers) {
        btnMobileSyncCovers.addEventListener("click", () => {
            closeMobileDrawer();
            handleSyncMissingCovers();
        });
    }

    const btnMobileAdmin = document.getElementById("btnMobileAdmin");
    if (btnMobileAdmin) btnMobileAdmin.addEventListener("click", () => {
        closeMobileDrawer();
        if (state.isAdmin) {
            handleAdminLogout();
        } else {
            openAdminLoginModal();
        }
    });

    const btnMobileAddGame = document.getElementById("btnMobileAddGame");
    if (btnMobileAddGame) {
        btnMobileAddGame.addEventListener("click", () => openGameEditModal(null));
    }

    const btnMobileRefresh = document.getElementById("btnMobileRefresh");
    if (btnMobileRefresh) btnMobileRefresh.addEventListener("click", handleForceRefreshAll);

    // Przełącznik widoczności filtrów (Desktop + Mobile)
    const btnToggleFilters = document.getElementById("btnToggleFilters") || document.getElementById("btnToggleMobileFilters");
    const filtersRow = document.getElementById("filtersRow");
    const filterCaret = document.getElementById("filterToggleCaret");
    if (btnToggleFilters && filtersRow) {
        btnToggleFilters.addEventListener("click", () => {
            const isOpen = filtersRow.classList.toggle("open");
            filtersRow.classList.toggle("mobile-open", isOpen);
            btnToggleFilters.classList.toggle("active", isOpen);
            filtersRow.style.display = isOpen ? "flex" : "none";
            if (filterCaret) filterCaret.textContent = isOpen ? "^" : "v";
        });
    }

    // Przycisk wymuszonego odświeżenia danych
    const btnRefreshData = document.getElementById("btnRefreshData");
    if (btnRefreshData) btnRefreshData.addEventListener("click", handleForceRefreshAll);

    // Rozwijane menu profili w nagłówku
    const profileBtn = document.getElementById("activeProfileBtn");
    const profileMenu = document.getElementById("profileDropdownMenu");
    if (profileBtn && profileMenu) {
        profileBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = profileMenu.style.display === "block";
            profileMenu.style.display = isOpen ? "none" : "block";
        });
    }

    // Panel kolejki synchronizacji
    const syncStatusBtn = document.getElementById("btnSyncStatus");
    const syncQueuePanel = document.getElementById("syncQueuePanel");
    if (syncStatusBtn && syncQueuePanel) {
        syncStatusBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = syncQueuePanel.style.display === "block";
            syncQueuePanel.style.display = isOpen ? "none" : "block";
        });
    }

    const btnMobileSyncStatus = document.getElementById("btnMobileSyncStatus");
    if (btnMobileSyncStatus && syncQueuePanel) {
        btnMobileSyncStatus.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = syncQueuePanel.style.display === "block";
            syncQueuePanel.style.display = isOpen ? "none" : "block";
        });
    }

    // Filtry - rozwijane checklisty
    setupFilterDropdown("btnFilterStatus", "menuFilterStatus");
    setupFilterDropdown("btnFilterPlatform", "menuFilterPlatform");
    setupFilterDropdown("btnFilterCollection", "menuFilterCollection");

    // Zamykanie rozwijanych menu po kliknięciu poza nimi
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".profile-dropdown-wrapper") && profileMenu) {
            profileMenu.style.display = "none";
        }
        if (!e.target.closest(".sync-status-wrapper") && syncQueuePanel) {
            syncQueuePanel.style.display = "none";
        }
        if (!e.target.closest(".filter-dropdown-wrapper")) {
            closeAllFilterDropdowns();
        }
    });

    // GŁÓWNE ZAKŁADKI NAWIGACJI (TABY)
    document.querySelectorAll(".main-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const targetTab = btn.getAttribute("data-target");
            switchMainTab(targetTab);
        });
    });

    // Obsługa edycji, usuwania i menu 3 kropek ze słowników (Ustawienia Bazy)
    document.addEventListener("click", (e) => {
        const menuBtn = e.target.closest(".btn-table-menu");
        if (menuBtn) {
            const parentContainer = menuBtn.closest(".table-menu-container");
            const isOpen = parentContainer.classList.contains("active");
            document.querySelectorAll(".table-menu-container.active").forEach(el => el.classList.remove("active"));
            if (!isOpen) {
                parentContainer.classList.add("active");
            }
            return;
        }

        document.querySelectorAll(".table-menu-container.active").forEach(el => el.classList.remove("active"));

        const editBtn = e.target.closest(".btn-setting-edit");
        if (editBtn) {
            const cat = editBtn.getAttribute("data-category");
            const val = editBtn.getAttribute("data-val");
            const desc = editBtn.getAttribute("data-desc");
            const color = editBtn.getAttribute("data-color");
            openEditSettingModal(cat, val, desc, color);
            return;
        }
        const delBtn = e.target.closest(".btn-setting-delete");
        if (delBtn) {
            const cat = delBtn.getAttribute("data-category");
            const val = delBtn.getAttribute("data-val");
            handleDeleteSettingItem(cat, val);
            return;
        }
        const retryBtn = e.target.closest(".btn-reload-games");
        if (retryBtn) {
            const sheet = retryBtn.getAttribute("data-sheet") || (state.currentUser ? state.currentUser.sheetName : "");
            if (sheet) loadGamesForUser(sheet, true);
            return;
        }
    });

    // Gablota - edycja oraz zwijanie
    const btnEditShowcase = document.getElementById("btnEditShowcase");
    if (btnEditShowcase) btnEditShowcase.addEventListener("click", openShowcaseEditModal);

    const btnSaveShowcase = document.getElementById("btnSaveShowcase");
    if (btnSaveShowcase) btnSaveShowcase.addEventListener("click", handleSaveShowcase);

    const btnToggleShowcaseCollapse = document.getElementById("btnToggleShowcaseCollapse");
    if (btnToggleShowcaseCollapse) {
        const savedSetting = localStorage.getItem("mmnr_showcase_collapsed");
        const defaultCollapsedForScreen = window.innerWidth <= 1540;
        const isCollapsed = savedSetting !== null ? savedSetting === "true" : defaultCollapsedForScreen;
        applyShowcaseCollapseState(isCollapsed);

        btnToggleShowcaseCollapse.addEventListener("click", () => {
            const showcaseCol = document.getElementById("showcaseColumn");
            const currentlyCollapsed = showcaseCol ? showcaseCol.classList.contains("collapsed") : false;
            const nextState = !currentlyCollapsed;
            applyShowcaseCollapseState(nextState);
            localStorage.setItem("mmnr_showcase_collapsed", String(nextState));
            requestAnimationFrame(() => updateMonitorScrollPosition());
        });
    }

    const showcaseSearchInput = document.getElementById("showcaseSearchInput");
    if (showcaseSearchInput) {
        showcaseSearchInput.addEventListener("input", (e) => {
            filterShowcaseChecklist(e.target.value.trim().toLowerCase());
        });
    }

    // Wyszukiwarka i sortowanie w bazie
    const searchInput = document.getElementById("searchInput");
    const clearSearchBtn = document.getElementById("btnClearSearch");

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            state.pagination.currentPage = 1;
            state.filters.search = e.target.value.trim().toLowerCase();
            if (clearSearchBtn) clearSearchBtn.style.display = state.filters.search ? "inline-block" : "none";
            renderGamesGrid();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            state.pagination.currentPage = 1;
            state.filters.search = "";
            clearSearchBtn.style.display = "none";
            renderGamesGrid();
        });
    }

    // Mobilny zwijany panel kontrolny (Search + Collapsible Options)
    const btnToggleControlsMobile = document.getElementById("btnToggleControlsMobile");
    const controlsCollapsible = document.getElementById("dashboardControlsCollapsible");
    if (btnToggleControlsMobile && controlsCollapsible) {
        btnToggleControlsMobile.addEventListener("click", () => {
            const isNowCollapsed = controlsCollapsible.classList.toggle("is-collapsed");
            btnToggleControlsMobile.textContent = isNowCollapsed ? ">" : "<";
        });
    }

    // Inicjalizacja gestów swipe na telefonie dla kontenera półek
    initShelvesSwipeGestures();

    // Inicjalizacja przycisków paska paginacji
    initPaginationEvents();

    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            state.pagination.currentPage = 1;
            state.filters.sort = e.target.value;
            renderGamesGrid();
        });
    }

    const groupSelect = document.getElementById("groupSelect");
    if (groupSelect) {
        groupSelect.addEventListener("change", (e) => {
            state.pagination.currentPage = 1;
            state.filters.group = e.target.value;
            renderGamesGrid();
        });
    }

    const btnResetFilters = document.getElementById("btnResetFilters");
    if (btnResetFilters) {
        btnResetFilters.addEventListener("click", () => {
            state.pagination.currentPage = 1;
            resetFilters();
        });
    }

    // Modale - zamykanie (tylko przyciski w stopce lub kliknięcie w tło)
    document.querySelectorAll("[data-close]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const modalId = e.currentTarget.getAttribute("data-close");
            if (modalId === "gameEditModal") {
                attemptCloseGameEditModal();
            } else {
                closeModal(modalId);
            }
        });
    });

    document.querySelectorAll(".modal-backdrop").forEach(modal => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                if (modal.id === "gameEditModal") {
                    attemptCloseGameEditModal();
                } else if (modal.id !== "unsavedChangesModal") {
                    closeModal(modal.id);
                }
            }
        });
    });

    // Obsługa potwierdzenia niezapisanych zmian
    const btnUnsavedSave = document.getElementById("btnUnsavedSave");
    const btnUnsavedDiscard = document.getElementById("btnUnsavedDiscard");
    const btnUnsavedStay = document.getElementById("btnUnsavedStay");

    if (btnUnsavedSave) {
        btnUnsavedSave.addEventListener("click", () => {
            closeModal("unsavedChangesModal");
            const form = document.getElementById("gameEditForm");
            if (form) {
                if (typeof form.requestSubmit === "function") {
                    form.requestSubmit();
                } else {
                    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                }
            }
        });
    }

    if (btnUnsavedDiscard) {
        btnUnsavedDiscard.addEventListener("click", () => {
            state.formInitialSnapshot = null;
            closeModal("unsavedChangesModal");
            closeModal("gameEditModal");
        });
    }

    if (btnUnsavedStay) {
        btnUnsavedStay.addEventListener("click", () => {
            closeModal("unsavedChangesModal");
        });
    }

    // Globalne skróty klawiszowe (Enter na formularzach, Escape do zamykania)
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const unsavedModal = document.getElementById("unsavedChangesModal");
            if (unsavedModal && unsavedModal.style.display !== "none") {
                closeModal("unsavedChangesModal");
                return;
            }

            const gameModal = document.getElementById("gameEditModal");
            if (gameModal && gameModal.style.display !== "none") {
                attemptCloseGameEditModal();
                return;
            }

            const openModals = Array.from(document.querySelectorAll(".modal-backdrop")).filter(m => m.style.display !== "none");
            if (openModals.length > 0) {
                closeModal(openModals[openModals.length - 1].id);
                return;
            }

            const drawer = document.getElementById("mobileNavDrawer");
            if (drawer && drawer.style.display !== "none") {
                drawer.style.display = "none";
                return;
            }
        }

        if (e.key === "Enter") {
            const activeEl = document.activeElement;
            if (activeEl && activeEl.tagName && activeEl.tagName.toLowerCase() === "textarea") {
                return;
            }

            const openModals = Array.from(document.querySelectorAll(".modal-backdrop")).filter(m => m.style.display !== "none");
            if (openModals.length > 0) {
                const topModal = openModals[openModals.length - 1];
                if (topModal.id === "unsavedChangesModal") {
                    e.preventDefault();
                    if (btnUnsavedSave) btnUnsavedSave.click();
                    return;
                }

                const form = topModal.querySelector("form");
                if (form) {
                    e.preventDefault();
                    if (typeof form.requestSubmit === "function") {
                        form.requestSubmit();
                    } else {
                        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                    }
                }
            }
        }
    });

    // Administrator
    const btnAdminLoginModal = document.getElementById("btnAdminLoginModal");
    if (btnAdminLoginModal) btnAdminLoginModal.addEventListener("click", openAdminLoginModal);

    const adminLoginForm = document.getElementById("adminLoginForm");
    if (adminLoginForm) adminLoginForm.addEventListener("submit", handleAdminLogin);

    const btnLogoutAdmin = document.getElementById("btnLogoutAdmin");
    if (btnLogoutAdmin) btnLogoutAdmin.addEventListener("click", handleAdminLogout);

    // Dodawanie / edycja gry
    const btnOpenAddGameModal = document.getElementById("btnOpenAddGameModal");
    if (btnOpenAddGameModal) btnOpenAddGameModal.addEventListener("click", () => openGameEditModal(null));

    const gameEditForm = document.getElementById("gameEditForm");
    if (gameEditForm) gameEditForm.addEventListener("submit", handleGameFormSubmit);

    // Dodawanie użytkownika
    const btnOpenAddUserModal = document.getElementById("btnOpenAddUserModal");
    if (btnOpenAddUserModal) btnOpenAddUserModal.addEventListener("click", () => openModal("addUserModal"));

    const addUserForm = document.getElementById("addUserForm");
    if (addUserForm) addUserForm.addEventListener("submit", handleAddUserSubmit);

    // Statystyki / Ustawienia
    const btnToggleStats = document.getElementById("btnToggleStats");
    if (btnToggleStats) btnToggleStats.addEventListener("click", openStatsModal);

    initStatsTabs();

    const editSettingForm = document.getElementById("editSettingForm");
    if (editSettingForm) editSettingForm.addEventListener("submit", handleSaveEditSetting);

    // Dodawanie do słowników
    const btnAddStan = document.getElementById("btnAddStan");
    if (btnAddStan) btnAddStan.addEventListener("click", () => handleAddSetting("status", "newStanVal", null, "newStanColor"));

    const btnAddPlat = document.getElementById("btnAddPlat");
    if (btnAddPlat) btnAddPlat.addEventListener("click", () => handleAddSetting("genre", "newPlatVal"));

    const btnAddKol = document.getElementById("btnAddKol");
    if (btnAddKol) btnAddKol.addEventListener("click", () => handleAddSetting("tags", "newKolVal"));

    // Synchronizacja wyboru koloru nowego stanu w Ustawieniach
    const newStanColorInput = document.getElementById("newStanColor");
    const newStanColorPicker = document.getElementById("newStanColorPicker");
    if (newStanColorPicker && newStanColorInput) {
        newStanColorPicker.addEventListener("input", (e) => {
            newStanColorInput.value = e.target.value;
        });
        newStanColorInput.addEventListener("input", (e) => {
            const val = e.target.value.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                newStanColorPicker.value = val;
            }
        });
    }

    // Synchronizacja wyboru koloru w modalu edycji stanu
    const editSettingNewColor = document.getElementById("editSettingNewColor");
    const editSettingNewColorPicker = document.getElementById("editSettingNewColorPicker");
    if (editSettingNewColorPicker && editSettingNewColor) {
        editSettingNewColorPicker.addEventListener("input", (e) => {
            editSettingNewColor.value = e.target.value;
        });
        editSettingNewColor.addEventListener("input", (e) => {
            const val = e.target.value.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                editSettingNewColorPicker.value = val;
            }
        });
    }

    // Podgląd pastelowy na żywo w formularzu gry po zmianie stanu lub tytułu
    const formGameStatusSelect = document.getElementById("formGameStatus");
    const formTitleInput = document.getElementById("formGameTitle");

    if (formGameStatusSelect) {
        formGameStatusSelect.addEventListener("change", () => {
            updateFormColorPreview();
        });
    }

    if (formTitleInput) {
        formTitleInput.addEventListener("input", (e) => {
            updateFormColorPreview(e.target.value.trim());
        });
    }

    // Obsługa pobierania okładek RAWG w formularzu
    const btnFetchCoverSingle = document.getElementById("btnFetchCoverSingle");
    if (btnFetchCoverSingle) {
        btnFetchCoverSingle.addEventListener("click", async () => {
            const titleInput = document.getElementById("formGameTitle");
            const imageInput = document.getElementById("formGameImage");
            const previewBox = document.getElementById("formCoverPreviewBox");
            const previewImg = document.getElementById("formCoverPreviewImg");

            const title = (titleInput ? titleInput.value : "").trim();
            if (!title) {
                alert("Wpisz najpierw tytuł książki, aby wyszukać okładkę.");
                return;
            }

            btnFetchCoverSingle.disabled = true;
            btnFetchCoverSingle.textContent = "Szukanie...";

            try {
                const res = await sendApiRequest({ action: "fetchCover", title: title });
                if (res.status === "success" && res.data && res.data.coverUrl) {
                    if (imageInput) imageInput.value = res.data.coverUrl;
                    if (previewImg && previewBox) {
                        previewImg.src = res.data.coverUrl;
                        previewBox.style.display = "block";
                    }
                } else {
                    alert(`Nie znaleziono okładki w RAWG dla tytułu: "${title}"`);
                }
            } catch (err) {
                alert("Błąd podczas pobierania okładki z RAWG.");
            } finally {
                btnFetchCoverSingle.disabled = false;
                btnFetchCoverSingle.textContent = "Pobierz z RAWG";
            }
        });
    }

    const formGameImage = document.getElementById("formGameImage");
    if (formGameImage) {
        formGameImage.addEventListener("input", (e) => {
            const previewBox = document.getElementById("formCoverPreviewBox");
            const previewImg = document.getElementById("formCoverPreviewImg");
            const url = e.target.value.trim();
            if (url && previewBox && previewImg) {
                previewImg.src = url;
                previewBox.style.display = "block";
            } else if (previewBox) {
                previewBox.style.display = "none";
            }
        });
    }

    // Masowa synchronizacja brakujących okładek (RAWG)
    const btnSyncCovers = document.getElementById("btnSyncCovers");
    if (btnSyncCovers) {
        btnSyncCovers.addEventListener("click", handleSyncMissingCovers);
    }

    // Zmiana rozmiaru okna
    window.addEventListener("resize", () => {
        if (state.currentScreen === "welcome") {
            renderWelcomeHeads();
        }
    });

    // Dynamiczne zachowanie obrazu (v2.3)
    initMonitorScrollBehavior();
}

// Dynamiczne pozycjonowanie monitora w lewej kolumnie
let monitorScrollTicking = false;

function updateMonitorScrollPosition() {
    const monitor = document.getElementById("shelfSidebarMonitor") || document.querySelector(".shelf-sidebar-monitor");
    if (!monitor) return;

    if (window.innerWidth <= 768) {
        monitor.style.position = "";
        monitor.style.top = "";
        monitor.style.width = "";
        return;
    }

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const showcaseCol = document.getElementById("showcaseColumn");
    const isShowcaseCollapsed = showcaseCol ? showcaseCol.classList.contains("collapsed") : false;

    const isLaptop = window.innerWidth <= 1540;
    const threshold = isShowcaseCollapsed ? 50 : (isLaptop ? 220 : 264);
    const targetTop = isLaptop ? "70px" : "134px";
    const targetWidth = isLaptop ? "370px" : "396px";

    if (scrollY >= threshold) {
        monitor.style.position = "fixed";
        monitor.style.top = targetTop;
        monitor.style.width = targetWidth;
    } else {
        monitor.style.position = "relative";
        monitor.style.top = "0px";
        monitor.style.width = "100%";
    }
}

function handleMonitorScrollOptimized() {
    if (!monitorScrollTicking) {
        window.requestAnimationFrame(() => {
            updateMonitorScrollPosition();
            monitorScrollTicking = false;
        });
        monitorScrollTicking = true;
    }
}

function initMonitorScrollBehavior() {
    window.addEventListener("scroll", handleMonitorScrollOptimized, { passive: true });
    window.addEventListener("resize", () => {
        handleMonitorScrollOptimized();
    }, { passive: true });
    updateMonitorScrollPosition();
}