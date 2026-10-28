/**
 * Funkcje pomocnicze i narzędziowe (Utils)
 */

function getUserAvatarPath(userOrSheet) {
    if (!userOrSheet) return "assets/icon.jpg";
    const sheetName = typeof userOrSheet === "string" ? userOrSheet.trim() : (userOrSheet.sheetName || userOrSheet.name || "").trim();
    if (!sheetName) return "assets/icon.jpg";
    if (sheetName.toLowerCase() === "nr books" || sheetName.toUpperCase() === "NR") {
        return "assets/NR Books.jpg";
    }
    return `assets/${sheetName}.PNG`;
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "flex";
        // Pop-up szczegółów gry (gameDetailsModal) oraz edycji gry (gameEditModal) nie blokują/chowają scrolla strony
        if (modalId !== "gameDetailsModal" && modalId !== "gameEditModal") {
            document.body.classList.add("modal-open");
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "none";
    }
    const hasOpenModals = Array.from(document.querySelectorAll(".modal-backdrop")).some(m => m.id !== "gameDetailsModal" && m.id !== "gameEditModal" && m.style.display !== "none" && m.style.display !== "");
    const isDrawerOpen = document.getElementById("mobileNavDrawer") && document.getElementById("mobileNavDrawer").style.display !== "none" && document.getElementById("mobileNavDrawer").style.display !== "";
    if (!hasOpenModals && !isDrawerOpen) {
        document.body.classList.remove("modal-open");
    }
}

function parseNum(val) {
    if (val === "" || val === null || val === undefined) return "";
    const num = parseFloat(val);
    return isNaN(num) ? "" : num;
}

function formatDate(dateStr) {
    if (!dateStr) return "";
    return String(dateStr).split("T")[0];
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

function debounce(fn, ms) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

function getCurrentDateTimeString() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}
