/**
 * Moduł stanu i konfiguracji globalnej (State & Config)
 */

// Adres wdrożonej aplikacji Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx9cnht-x7-bTMVWc-JGWDUgF2ShlqR8Nzg4bJdrw3IA2x608lznFjE0ml9j89H2xYI/exec";

// Klucze pamięci sesyjnej i lokalnej
const CACHE_KEYS = {
    USERS: "mmnr_cache_users",
    GAMES_PREFIX: "mmnr_cache_books_",
    SETTINGS: "mmnr_cache_settings",
    SHOWCASE_PREFIX: "mmnr_showcase_",
    SYNC_QUEUE: "mmnr_sync_queue",
    ADMIN_AUTH: "mmnr_admin_auth"
};

// Stan aplikacji
const state = {
    currentScreen: "welcome", // "welcome" | "dashboard"
    currentTab: "tabViewGames", // "tabViewGames" | "tabViewCharts"
    currentUser: null,
    users: [],
    games: [],
    // Pamięć podręczna w ramach sesji
    cache: {
        games: {},
        settings: null,
        users: null
    },
    // Kolejka synchronizacji zadań w tle
    syncQueue: [],
    isSyncing: false,
    settings: {
        status: { headers: [], rows: [] },
        genre: { headers: [], rows: [] },
        tags: { headers: [], rows: [] },
        statistics: { headers: [], rows: [] }
    },
    isAdmin: false,
    adminPassword: "",
    filters: {
        search: "",
        statuses: new Set(),
        platforms: new Set(), // używane jako gatunki
        collections: new Set(), // używane jako tagi
        sort: "updated_desc",
        group: "none"
    },
    pagination: {
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 15,
        pagesList: []
    }
};

// Stan widoku wykresów
const chartsState = {
    donutUser: "ALL", // "ALL" | "MM" | "NK"
    donutMetric: "count", // "count" | "hours"
    allUsersGames: {} // { "MM": [...], "NK": [...] }
};
