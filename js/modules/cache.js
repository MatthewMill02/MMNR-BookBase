/**
 * Obsługa pamięci podręcznej przeglądarki (SessionStorage Cache)
 */

function initSessionCache() {
    try {
        const cachedUsers = sessionStorage.getItem(CACHE_KEYS.USERS);
        if (cachedUsers) {
            const parsed = JSON.parse(cachedUsers);
            if (Array.isArray(parsed) && parsed.length > 0) {
                state.users = parsed;
                state.cache.users = parsed;
            }
        }

        const cachedSettings = sessionStorage.getItem(CACHE_KEYS.SETTINGS);
        if (cachedSettings) {
            const parsed = JSON.parse(cachedSettings);
            const statusTable = parsed ? (parsed.status || parsed.stan) : null;
            if (statusTable && Array.isArray(statusTable.rows)) {
                state.settings = {
                    status: parsed.status || parsed.stan || { headers: [], rows: [] },
                    genre: parsed.genre || parsed.platformy || { headers: [], rows: [] },
                    tags: parsed.tags || parsed.kolekcje || { headers: [], rows: [] },
                    statistics: parsed.statistics || { headers: [], rows: [] }
                };
                state.cache.settings = state.settings;
            } else {
                sessionStorage.removeItem(CACHE_KEYS.SETTINGS);
            }
        }
    } catch (e) {
        console.warn("Błąd odczytu pamięci sesyjnej:", e);
    }
}

function getCachedGames(sheetName) {
    if (state.cache.games[sheetName]) {
        return state.cache.games[sheetName];
    }
    try {
        const stored = sessionStorage.getItem(CACHE_KEYS.GAMES_PREFIX + sheetName);
        if (stored) {
            const parsed = JSON.parse(stored);
            state.cache.games[sheetName] = parsed;
            return parsed;
        }
    } catch (e) {}
    return null;
}

function setCachedGames(sheetName, games) {
    state.cache.games[sheetName] = games;
    try {
        sessionStorage.setItem(CACHE_KEYS.GAMES_PREFIX + sheetName, JSON.stringify(games));
    } catch (e) {}
}

function invalidateGamesCache(sheetName = null) {
    if (sheetName) {
        delete state.cache.games[sheetName];
        try {
            sessionStorage.removeItem(CACHE_KEYS.GAMES_PREFIX + sheetName);
        } catch (e) {}
    } else {
        state.cache.games = {};
        try {
            Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith(CACHE_KEYS.GAMES_PREFIX)) {
                    sessionStorage.removeItem(key);
                }
            });
        } catch (e) {}
    }
}

function invalidateSettingsCache() {
    state.cache.settings = null;
    try {
        sessionStorage.removeItem(CACHE_KEYS.SETTINGS);
    } catch (e) {}
}

function invalidateUsersCache() {
    state.cache.users = null;
    try {
        sessionStorage.removeItem(CACHE_KEYS.USERS);
    } catch (e) {}
}

async function handleForceRefreshAll() {
    const btnDesktop = document.getElementById("btnRefreshData");
    const btnMobile = document.getElementById("btnMobileRefresh");
    const refreshButtons = [btnDesktop, btnMobile].filter(Boolean);

    refreshButtons.forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = `Odśwież<span class="loading-dots"></span>`;
    });

    invalidateGamesCache();
    invalidateSettingsCache();
    invalidateUsersCache();

    try {
        await fetchUsersList(true);
        await fetchSettingsAndStats(true);

        if (state.currentUser) {
            await loadGamesForUser(state.currentUser.sheetName, true);
        }
    } finally {
        refreshButtons.forEach(btn => {
            btn.disabled = false;
            btn.textContent = "[Odśwież]";
        });
    }
}
