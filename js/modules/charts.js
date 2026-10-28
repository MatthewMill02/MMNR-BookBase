/**
 * Moduł interaktywnych wykresów i analiz statystycznych czytelników (Tab 2)
 */

function switchMainTab(targetTabId) {
    state.currentTab = targetTabId;

    document.querySelectorAll(".main-tab-btn").forEach(btn => {
        if (btn.getAttribute("data-target") === targetTabId) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    document.querySelectorAll(".main-tab-view").forEach(view => {
        if (view.id === targetTabId) {
            view.style.display = "block";
        } else {
            view.style.display = "none";
        }
    });

    if (targetTabId === "tabViewCharts") {
        renderChartsComparisonSection();
    }
}

function getOrCreateChartTooltip() {
    let el = document.getElementById("chartInteractiveTooltip");
    if (!el) {
        el = document.createElement("div");
        el.id = "chartInteractiveTooltip";
        el.className = "chart-interactive-tooltip";
        document.body.appendChild(el);

        document.addEventListener("click", (e) => {
            if (e.target.closest(".chart-tooltip-close")) {
                hideChartTooltip();
                return;
            }
            if (!e.target.closest(".chart-interactive-tooltip") && !e.target.closest(".chart-interactive-item") && !e.target.closest(".chart-dual-row") && !e.target.closest(".chart-data-point")) {
                hideChartTooltip();
            }
        });

        document.addEventListener("click", (e) => {
            const item = e.target.closest("[data-tooltip-header]");
            if (item) {
                e.stopPropagation();
                const header = item.getAttribute("data-tooltip-header") || "";
                const rowsJson = decodeURIComponent(item.getAttribute("data-tooltip-rows") || "%5B%5D");
                try {
                    const rows = JSON.parse(rowsJson);
                    showChartTooltip(e, header, rows);
                } catch (err) {
                    console.warn("Błąd parsowania danych tooltipa:", err);
                }
            }
        });
    }
    return el;
}

window.showChartTooltip = function(event, headerText, rows) {
    if (event && event.stopPropagation) event.stopPropagation();
    const tooltip = getOrCreateChartTooltip();
    
    let html = `
        <div class="chart-tooltip-header">
            <span>${escapeHtml(headerText)}</span>
            <span class="chart-tooltip-close">✕</span>
        </div>
    `;

    rows.forEach(r => {
        const colorDot = r.color ? `<span class="legend-dot" style="background-color: ${r.color}; display:inline-block; margin-right:4px;"></span>` : "";
        html += `
            <div class="chart-tooltip-row">
                <span>${colorDot}${escapeHtml(r.label)}</span>
                <strong>${escapeHtml(String(r.value))}</strong>
            </div>
        `;
    });

    tooltip.innerHTML = html;
    tooltip.classList.add("active");

    let clientX = 0;
    let clientY = 0;

    if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else if (event.clientX !== undefined) {
        clientX = event.clientX;
        clientY = event.clientY;
    } else if (event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        clientX = rect.left + rect.width / 2;
        clientY = rect.top;
    }

    const tipWidth = 260;
    const tipHeight = 120;
    let left = clientX + 12;
    let top = clientY - 40;

    if (left + tipWidth > window.innerWidth - 10) {
        left = clientX - tipWidth - 12;
    }
    if (left < 10) left = 10;
    if (top + tipHeight > window.innerHeight - 10) {
        top = window.innerHeight - tipHeight - 10;
    }
    if (top < 10) top = 10;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
};

window.hideChartTooltip = function() {
    const tooltip = document.getElementById("chartInteractiveTooltip");
    if (tooltip) tooltip.classList.remove("active");
};

async function fetchAllUsersGamesForCharts() {
    const users = state.users;
    for (const u of users) {
        if (!chartsState.allUsersGames[u.code]) {
            const cached = getCachedGames(u.sheetName);
            if (cached) {
                chartsState.allUsersGames[u.code] = cached;
            } else {
                try {
                    const res = await sendApiRequest({ action: "getAllBooks", user: u.sheetName });
                    if (res.status === "success" && Array.isArray(res.data)) {
                        chartsState.allUsersGames[u.code] = res.data;
                        setCachedGames(u.sheetName, res.data);
                    }
                } catch (e) {
                    chartsState.allUsersGames[u.code] = [];
                }
            }
        }
    }
}

async function renderChartsComparisonSection() {
    const container = document.getElementById("chartsComparisonContent");
    if (!container) return;

    container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--color-text-muted);">Ładowanie danych analitycznych czytelników...</div>';

    await fetchAllUsersGamesForCharts();

    const users = state.users;
    if (users.length === 0) {
        container.innerHTML = '<p class="modal-hint">Brak zdefiniowanych profili czytelników.</p>';
        return;
    }

    let legendHtml = '<div class="chart-legend" style="margin-bottom: 16px; padding: 10px 14px; background: var(--color-bg); border-radius: 4px; border: 1px solid var(--color-border); display: flex; flex-wrap: wrap; gap: 16px;">';
    users.forEach(u => {
        const uBooks = chartsState.allUsersGames[u.code] || [];
        legendHtml += `<div class="legend-item" style="display: flex; align-items: center; gap: 8px;"><span class="legend-dot" style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color: ${u.color};"></span><strong>${escapeHtml(u.name)} (${uBooks.length} książek)</strong></div>`;
    });
    legendHtml += '</div>';

    let userOptionsHtml = '<option value="ALL" ' + (chartsState.donutUser === "ALL" ? "selected" : "") + '>Wszyscy czytelnicy</option>';
    users.forEach(u => {
        userOptionsHtml += `<option value="${u.code}" ${chartsState.donutUser === u.code ? "selected" : ""}>${escapeHtml(u.name)}</option>`;
    });

    let html = `
        ${legendHtml}

        <div class="charts-grid">
            <!-- WYKRES 1: SŁUPKOWY - PODZIAŁ WEDŁUG STATUSÓW KSIĄŻEK -->
            <div class="chart-card">
                <div class="chart-card-header">
                    <h3>1. Statusy książek</h3>
                </div>
                <div id="chartStatusContent" class="chart-bars-list">
                    ${renderStatusComparisonBars(users)}
                </div>
            </div>

            <!-- WYKRES 2: KOŁOWY / PIERŚCIENIOWY (DONUT) - UDZIAŁ GATUNKÓW -->
            <div class="chart-card">
                <div class="chart-card-header">
                    <h3>2. Udział gatunków</h3>
                    <div class="chart-controls-bar">
                        <select id="chartDonutUserSelect" class="chart-select">
                            ${userOptionsHtml}
                        </select>
                    </div>
                </div>
                <div id="chartDonutContainer">
                    ${renderPlatformDonutChart(users)}
                </div>
            </div>

            <!-- WYKRES 3: LINIOWY - UKOŃCZENIA KSIĄŻEK W CZASIE -->
            <div class="chart-card">
                <div class="chart-card-header">
                    <h3>3. Oś czasu ukończeń</h3>
                </div>
                <div id="chartLineContainer">
                    ${renderCompletionsTimelineChart(users)}
                </div>
            </div>

            <!-- WYKRES 4: ROZKŁAD OCEN KOŃCOWYCH -->
            <div class="chart-card">
                <div class="chart-card-header">
                    <h3>4. Rozkład ocen</h3>
                </div>
                <div id="chartRatingsContent" class="chart-bars-list">
                    ${renderRatingsComparisonBars(users)}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    const userSelect = document.getElementById("chartDonutUserSelect");
    if (userSelect) {
        userSelect.addEventListener("change", (e) => {
            chartsState.donutUser = e.target.value;
            const content = document.getElementById("chartDonutContainer");
            if (content) content.innerHTML = renderPlatformDonutChart(users);
        });
    }
}

function renderStatusComparisonBars(users) {
    const statuses = new Set();
    users.forEach(u => {
        const books = chartsState.allUsersGames[u.code] || [];
        books.forEach(b => {
            const st = (b["status"] || b["Stan"] || "").trim();
            if (st) statuses.add(st);
        });
    });

    const statusList = Array.from(statuses).sort();
    if (statusList.length === 0) return '<p class="modal-hint">Brak danych o statusach książek.</p>';

    let maxVal = 1;
    const statsData = statusList.map(st => {
        const counts = {};
        users.forEach(u => {
            const books = chartsState.allUsersGames[u.code] || [];
            const count = books.filter(b => (b["status"] || b["Stan"] || "").trim() === st).length;
            counts[u.code] = count;
            if (count > maxVal) maxVal = count;
        });
        return { status: st, counts: counts };
    });

    return statsData.map(item => {
        const tooltipRows = [];
        let totalCount = 0;
        users.forEach(u => {
            const count = item.counts[u.code] || 0;
            totalCount += count;
            const userTotal = (chartsState.allUsersGames[u.code] || []).length;
            const pct = userTotal > 0 ? ((count / userTotal) * 100).toFixed(1) : "0";
            tooltipRows.push({ label: u.name, value: `${count} (${pct}%)`, color: u.color });
        });
        tooltipRows.push({ label: "Łącznie", value: `${totalCount} książek`, color: "#ffffff" });
        const rowsEncoded = encodeURIComponent(JSON.stringify(tooltipRows));

        let barsHtml = "";
        users.forEach(u => {
            const count = item.counts[u.code] || 0;
            const pct = Math.round((count / maxVal) * 100);
            barsHtml += `
                <div class="chart-single-bar-container">
                    <div class="chart-single-bar-track">
                        <div class="chart-single-bar-fill" style="width: ${Math.max(pct, 3)}%; background-color: ${u.color};"></div>
                    </div>
                    <span class="chart-single-bar-val">${count}</span>
                </div>
            `;
        });

        return `
            <div class="chart-dual-row chart-interactive-item" data-tooltip-header="${escapeHtml(item.status)}" data-tooltip-rows="${rowsEncoded}">
                <span class="chart-bar-label" title="${escapeHtml(item.status)}">${escapeHtml(item.status)}</span>
                <div class="chart-dual-bars" style="display:flex; flex-direction:column; gap:4px;">
                    ${barsHtml}
                </div>
            </div>
        `;
    }).join("");
}

function renderPlatformDonutChart(users) {
    let targetBooks = [];
    let titlePrefix = "Wszyscy czytelnicy";

    if (chartsState.donutUser && chartsState.donutUser !== "ALL") {
        const u = users.find(x => x.code === chartsState.donutUser);
        if (u) {
            targetBooks = chartsState.allUsersGames[u.code] || [];
            titlePrefix = u.name;
        }
    } else {
        users.forEach(u => {
            const b = chartsState.allUsersGames[u.code] || [];
            targetBooks = targetBooks.concat(b);
        });
    }

    if (targetBooks.length === 0) return '<p class="modal-hint">Brak danych książek dla wybranego profilu.</p>';

    const genreMap = new Map();
    targetBooks.forEach(b => {
        const rawGenre = (b["genre"] || b["Gatunek"] || b["Platforma"] || "Inny").trim() || "Inny";
        rawGenre.split(",").forEach(g => {
            const cleanG = g.trim();
            if (cleanG) {
                genreMap.set(cleanG, (genreMap.get(cleanG) || 0) + 1);
            }
        });
    });

    const entries = Array.from(genreMap.entries())
        .map(([k, v]) => ({ platform: k, val: v }))
        .filter(item => item.val > 0);

    entries.sort((a, b) => b.val - a.val);

    const totalVal = entries.reduce((acc, curr) => acc + curr.val, 0);
    if (totalVal === 0) return '<p class="modal-hint">Brak danych dla wykresu kołowego.</p>';

    const genrePalette = [
        "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
        "#ec4899", "#06b6d4", "#14b8a6", "#84cc16", "#eab308"
    ];

    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    let svgCirclesHtml = "";
    const legendItemsHtml = entries.map((item, idx) => {
        const color = genrePalette[idx % genrePalette.length];
        const pct = ((item.val / totalVal) * 100).toFixed(1);
        const strokeLength = (item.val / totalVal) * circumference;
        const strokeDash = `${strokeLength} ${circumference - strokeLength}`;
        const offset = -accumulatedOffset;
        accumulatedOffset += strokeLength;

        const tooltipRows = [
            { label: "Liczba", value: `${item.val} książek`, color: color },
            { label: "Udział procentowy", value: `${pct}%`, color: "#ffffff" },
            { label: "Profil", value: titlePrefix, color: "var(--color-primary)" }
        ];
        const rowsEncoded = encodeURIComponent(JSON.stringify(tooltipRows));

        svgCirclesHtml += `
            <circle cx="95" cy="95" r="${radius}" fill="transparent"
                    stroke="${color}" stroke-width="26"
                    stroke-dasharray="${strokeDash}"
                    stroke-dashoffset="${offset}"
                    class="chart-interactive-item"
                    data-tooltip-header="${escapeHtml(item.platform)}"
                    data-tooltip-rows="${rowsEncoded}">
            </circle>
        `;

        return `
            <div class="donut-legend-item chart-interactive-item" data-tooltip-header="${escapeHtml(item.platform)}" data-tooltip-rows="${rowsEncoded}">
                <span style="display:flex; align-items:center; gap:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    <span class="legend-dot" style="background-color: ${color}; flex-shrink:0;"></span>
                    <span>${escapeHtml(item.platform)}</span>
                </span>
                <span style="font-weight:bold; color:var(--color-text-main); flex-shrink:0;">${item.val} (${pct}%)</span>
            </div>
        `;
    }).join("");

    const topItem = entries[0];
    const topPct = ((topItem.val / totalVal) * 100).toFixed(0);

    return `
        <div class="donut-wrapper">
            <div class="donut-svg-box">
                <svg width="190" height="190" viewBox="0 0 190 190">
                    <circle cx="95" cy="95" r="${radius}" fill="transparent" stroke="var(--color-bg)" stroke-width="26"></circle>
                    <g transform="rotate(-90 95 95)">
                        ${svgCirclesHtml}
                    </g>
                </svg>
                <div class="donut-center-info">
                    <span class="donut-center-title">${escapeHtml(topItem.platform)}</span>
                    <span class="donut-center-val">${topItem.val}</span>
                    <span class="donut-center-sub">${topPct}%</span>
                </div>
            </div>
            <div class="donut-legend-list">
                ${legendItemsHtml}
            </div>
        </div>
    `;
}

function renderCompletionsTimelineChart(users) {
    const parseYearMonth = (book) => {
        const d = (book["completion date"] || book["Data ukończenia"] || "").trim();
        if (!d) return null;
        const match = d.match(/^(\d{4})[-/](\d{1,2})/);
        if (match) {
            return `${match[1]}-${match[2].padStart(2, '0')}`;
        }
        const yearMatch = d.match(/^(\d{4})/);
        if (yearMatch) {
            return `${yearMatch[1]}-01`;
        }
        return null;
    };

    const timeBuckets = new Map();

    users.forEach(u => {
        const books = chartsState.allUsersGames[u.code] || [];
        books.forEach(b => {
            const ym = parseYearMonth(b);
            if (!ym) return;
            if (!timeBuckets.has(ym)) {
                const initObj = { ym: ym, counts: {}, titles: {} };
                users.forEach(x => { initObj.counts[x.code] = 0; initObj.titles[x.code] = []; });
                timeBuckets.set(ym, initObj);
            }
            const bucket = timeBuckets.get(ym);
            bucket.counts[u.code] = (bucket.counts[u.code] || 0) + 1;
            const title = b["book name"] || b["Tytuł"] || "";
            if (title && (!bucket.titles[u.code] || bucket.titles[u.code].length < 3)) {
                if (!bucket.titles[u.code]) bucket.titles[u.code] = [];
                bucket.titles[u.code].push(title);
            }
        });
    });

    const sortedBuckets = Array.from(timeBuckets.values()).sort((a, b) => a.ym.localeCompare(b.ym));

    if (sortedBuckets.length === 0) {
        return '<p class="modal-hint">Brak dat ukończenia książek w bazie do wygenerowania osi czasu.</p>';
    }

    const displayBuckets = sortedBuckets.slice(-12);

    let maxCount = 1;
    displayBuckets.forEach(b => {
        users.forEach(u => {
            const c = b.counts[u.code] || 0;
            if (c > maxCount) maxCount = c;
        });
    });

    const svgWidth = 500;
    const svgHeight = 200;
    const paddingLeft = 35;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 35;

    const plotWidth = svgWidth - paddingLeft - paddingRight;
    const plotHeight = svgHeight - paddingTop - paddingBottom;
    const stepX = displayBuckets.length > 1 ? plotWidth / (displayBuckets.length - 1) : plotWidth / 2;
    const getY = (val) => paddingTop + plotHeight - ((val / maxCount) * plotHeight);

    let pathsByUser = {};
    users.forEach(u => { pathsByUser[u.code] = ""; });

    let pointsHtml = "";
    let gridLinesHtml = "";

    for (let i = 0; i <= 3; i++) {
        const gridY = paddingTop + (plotHeight / 3) * i;
        const gridVal = Math.round(maxCount - (maxCount / 3) * i);
        gridLinesHtml += `
            <line x1="${paddingLeft}" y1="${gridY}" x2="${svgWidth - paddingRight}" y2="${gridY}" class="chart-gridline"></line>
            <text x="${paddingLeft - 8}" y="${gridY + 4}" text-anchor="end" class="chart-axis-label">${gridVal}</text>
        `;
    }

    displayBuckets.forEach((b, idx) => {
        const x = paddingLeft + idx * stepX;

        users.forEach(u => {
            const count = b.counts[u.code] || 0;
            const y = getY(count);
            if (idx === 0) {
                pathsByUser[u.code] += `M ${x} ${y}`;
            } else {
                pathsByUser[u.code] += ` L ${x} ${y}`;
            }

            const tooltipRows = [
                { label: u.name, value: `${count} ukończonych`, color: u.color },
                { label: "Tytuły", value: (b.titles[u.code] || []).join(", ") || "-", color: "#ffffff" }
            ];
            const rowsEncoded = encodeURIComponent(JSON.stringify(tooltipRows));

            pointsHtml += `
                <circle cx="${x}" cy="${y}" r="4" fill="${u.color}" stroke="#ffffff" stroke-width="1.5" class="chart-data-point" data-tooltip-header="${escapeHtml(b.ym)} (${escapeHtml(u.name)})" data-tooltip-rows="${rowsEncoded}"></circle>
            `;
        });

        gridLinesHtml += `
            <text x="${x}" y="${svgHeight - 10}" text-anchor="middle" class="chart-axis-label">${b.ym.substring(2)}</text>
        `;
    });

    let linesHtml = "";
    users.forEach(u => {
        linesHtml += `<path d="${pathsByUser[u.code]}" stroke="${u.color}" class="chart-line-path"></path>`;
    });

    return `
        <div style="width: 100%; overflow: hidden;">
            <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="line-chart-svg" style="width: 100%; height: auto; max-width: 100%; display: block;">
                ${gridLinesHtml}
                ${linesHtml}
                ${pointsHtml}
            </svg>
        </div>
    `;
}

function renderRatingsComparisonBars(users) {
    const buckets = [
        { label: "9.0 - 10.0 (Wybitne)", min: 9.0, max: 10.0 },
        { label: "7.0 - 8.9 (Dobre)", min: 7.0, max: 8.99 },
        { label: "5.0 - 6.9 (Przeciętne)", min: 5.0, max: 6.99 },
        { label: "1.0 - 4.9 (Słabe)", min: 1.0, max: 4.99 },
        { label: "Brak oceny", min: -1, max: -1 }
    ];

    let maxVal = 1;
    const data = buckets.map(b => {
        const counts = {};
        users.forEach(u => {
            const books = chartsState.allUsersGames[u.code] || [];
            const count = books.filter(item => {
                const r = parseFloat(item["final score"] || item["Ocena gry"] || item["Ocena"]);
                if (isNaN(r) || r <= 0) return b.min === -1;
                return b.min !== -1 && r >= b.min && r <= b.max;
            }).length;
            counts[u.code] = count;
            if (count > maxVal) maxVal = count;
        });
        return { label: b.label, counts: counts };
    });

    return data.map(item => {
        const tooltipRows = [];
        let totalCount = 0;
        users.forEach(u => {
            const count = item.counts[u.code] || 0;
            totalCount += count;
            tooltipRows.push({ label: u.name, value: `${count} książek`, color: u.color });
        });
        tooltipRows.push({ label: "Łącznie", value: `${totalCount} książek`, color: "#ffffff" });
        const rowsEncoded = encodeURIComponent(JSON.stringify(tooltipRows));

        let barsHtml = "";
        users.forEach(u => {
            const count = item.counts[u.code] || 0;
            const pct = Math.round((count / maxVal) * 100);
            barsHtml += `
                <div class="chart-single-bar-container">
                    <div class="chart-single-bar-track">
                        <div class="chart-single-bar-fill" style="width: ${Math.max(pct, 3)}%; background-color: ${u.color};"></div>
                    </div>
                    <span class="chart-single-bar-val">${count}</span>
                </div>
            `;
        });

        return `
            <div class="chart-dual-row chart-interactive-item" data-tooltip-header="${escapeHtml(item.label)}" data-tooltip-rows="${rowsEncoded}">
                <span class="chart-bar-label" style="font-size: 14px;">${escapeHtml(item.label)}</span>
                <div class="chart-dual-bars" style="display:flex; flex-direction:column; gap:4px;">
                    ${barsHtml}
                </div>
            </div>
        `;
    }).join("");
}
