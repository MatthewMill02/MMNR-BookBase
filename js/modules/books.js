/**
 * Formularz dodawania i edycji książek oraz usuwania i synchronizacji okładek RAWG
 */

function getGameFormSnapshot() {
    return {
        title: (document.getElementById("formGameTitle").value || "").trim(),
        status: (document.getElementById("formGameStatus").value || "").trim(),
        platform: (document.getElementById("formGamePlatform").value || "").trim(),
        author: (document.getElementById("formAuthor") ? document.getElementById("formAuthor").value : "").trim(),
        origin: (document.getElementById("formOrigin") ? document.getElementById("formOrigin").value : "").trim(),
        ratingFabuła: (document.getElementById("formRatingFabuła").value || "").trim(),
        ratingGrafika: (document.getElementById("formRatingGrafika").value || "").trim(),
        ratingMechanika: (document.getElementById("formRatingMechanika").value || "").trim(),
        ratingOgólna: (document.getElementById("formRatingOgólna").value || "").trim(),
        completionDate: (document.getElementById("formCompletionDate").value || "").trim(),
        image: (document.getElementById("formGameImage") ? document.getElementById("formGameImage").value : "").trim(),
        collections: (document.getElementById("formCollections").value || "").trim(),
        review: (document.getElementById("formReview").value || "").trim()
    };
}

function isGameFormDirty() {
    if (!state.formInitialSnapshot) return false;
    const current = getGameFormSnapshot();
    return JSON.stringify(current) !== JSON.stringify(state.formInitialSnapshot);
}

function attemptCloseGameEditModal() {
    if (isGameFormDirty()) {
        openModal("unsavedChangesModal");
    } else {
        state.formInitialSnapshot = null;
        closeModal("gameEditModal");
    }
}

function openGameEditModal(game = null) {
    if (!state.isAdmin) return;

    const form = document.getElementById("gameEditForm");
    form.reset();
    document.getElementById("gameEditError").style.display = "none";

    const imageInput = document.getElementById("formGameImage");
    const previewBox = document.getElementById("formCoverPreviewBox");
    const previewImg = document.getElementById("formCoverPreviewImg");

    if (game) {
        document.getElementById("gameEditModalTitle").textContent = "Edytuj książkę";
        document.getElementById("formGameId").value = game.id || "";
        document.getElementById("formGameTitle").value = game["book name"] || game["Tytuł"] || "";
        
        if (document.getElementById("formAuthor")) {
            document.getElementById("formAuthor").value = game["author"] || game["Autor"] || "";
        }
        if (document.getElementById("formOrigin")) {
            document.getElementById("formOrigin").value = game["origin"] || game["Pochodzenie"] || "";
        }

        document.getElementById("formRatingFabuła").value = game["style score"] !== undefined && game["style score"] !== "" ? game["style score"] : (game["Ocena fabuły"] !== undefined ? game["Ocena fabuły"] : "");
        document.getElementById("formRatingGrafika").value = game["plot score"] !== undefined && game["plot score"] !== "" ? game["plot score"] : (game["Ocena grafiki"] !== undefined ? game["Ocena grafiki"] : "");
        document.getElementById("formRatingMechanika").value = game["structure score"] !== undefined && game["structure score"] !== "" ? game["structure score"] : (game["Ocena mechanik"] !== undefined ? game["Ocena mechanik"] : "");
        document.getElementById("formRatingOgólna").value = game["final score"] !== undefined && game["final score"] !== "" ? game["final score"] : (game["Ocena gry"] !== undefined ? game["Ocena gry"] : "");
        
        document.getElementById("formCompletionDate").value = game["completion date"] || game["Data ukończenia"] || "";

        const rawImage = (game["cover"] || game["Obraz"] || game["obraz"] || "").trim();
        if (imageInput) imageInput.value = rawImage;
        if (previewBox && previewImg) {
            if (rawImage) {
                previewImg.src = rawImage;
                previewBox.style.display = "block";
            } else {
                previewImg.src = "";
                previewBox.style.display = "none";
            }
        }

        document.getElementById("formCollections").value = game["tags"] || game["Kolekcje"] || "";
        document.getElementById("formReview").value = game["review"] || game["Recenzja"] || "";
        const rawGenre = game["genre"] || game["Platforma"] || "";
        if (document.getElementById("formGamePlatform")) document.getElementById("formGamePlatform").value = rawGenre;
        if (document.getElementById("formGenre")) document.getElementById("formGenre").value = rawGenre;
    } else {
        document.getElementById("gameEditModalTitle").textContent = "Dodaj książkę do bazy";
        document.getElementById("formGameId").value = "";
        if (document.getElementById("formAuthor")) document.getElementById("formAuthor").value = "";
        if (document.getElementById("formOrigin")) document.getElementById("formOrigin").value = "";
        if (imageInput) imageInput.value = "";
        if (previewBox && previewImg) {
            previewImg.src = "";
            previewBox.style.display = "none";
        }
        document.getElementById("formCollections").value = "";
        if (document.getElementById("formGamePlatform")) document.getElementById("formGamePlatform").value = "";
        if (document.getElementById("formGenre")) document.getElementById("formGenre").value = "";
    }

    populateSelectOptionsForForm();

    if (game) {
        document.getElementById("formGameStatus").value = game["status"] || game["Stan"] || "";
    }

    // Zapisanie migawki początkowego stanu formularza do wykrywania niezapisanych zmian
    state.formInitialSnapshot = getGameFormSnapshot();

    openModal("gameEditModal");
}

function updateFormColorPreview(title = null) {
    const statusSelect = document.getElementById("formGameStatus");
    const sampleBox = document.getElementById("formColorPastelSample");
    const sampleText = document.getElementById("formColorPastelText");
    const titleInput = document.getElementById("formGameTitle");

    if (!sampleBox) return;

    const selectedStatus = statusSelect ? statusSelect.value : "";
    let baseColor = state.currentUser ? state.currentUser.color : "#2a4365";
    const userCode = state.currentUser ? (state.currentUser.code || "").toUpperCase() : "";

    const statusRows = (state.settings.status && state.settings.status.rows) || (state.settings.stan && state.settings.stan.rows) || [];
    if (selectedStatus && statusRows.length > 0) {
        const matchingRow = statusRows.find(r => (r["status"] || r["Stan"] || "").trim().toLowerCase() === selectedStatus.toLowerCase());
        if (matchingRow) {
            if (userCode && matchingRow[`color ${userCode}`]) {
                baseColor = matchingRow[`color ${userCode}`];
            } else if (matchingRow["color"]) {
                baseColor = matchingRow["color"];
            } else if (matchingRow["Kolor"]) {
                baseColor = matchingRow["Kolor"];
            }
        }
    }

    const pastelColor = toPastelSpineColor(baseColor);
    sampleBox.style.backgroundColor = pastelColor;

    let displayTitle = title !== null ? title : (titleInput ? titleInput.value.trim() : "");
    if (!displayTitle) displayTitle = "Tytuł książki";
    if (sampleText) sampleText.textContent = displayTitle;
}

function populateSelectOptionsForForm() {
    const statusSelect = document.getElementById("formGameStatus");
    const genreInput = document.getElementById("formGenre") || document.getElementById("formGamePlatform");
    const genresContainer = document.getElementById("formAvailableGenresContainer");
    const tagsContainer = document.getElementById("formAvailableTagsContainer");
    const collectionsInput = document.getElementById("formCollections");

    statusSelect.innerHTML = "";
    const statusRows = (state.settings.status && state.settings.status.rows) || (state.settings.stan && state.settings.stan.rows) || [];
    const settingsStatuses = statusRows.map(r => r["status"] || r["Stan"]).filter(Boolean);
    const defaultStatuses = ["Chcę przeczytać", "Czytam", "Wróć do niej", "Porzucona", "Ukończona"];
    const statusesToUse = settingsStatuses.length > 0 ? settingsStatuses : defaultStatuses;
    statusesToUse.forEach(st => {
        const opt = document.createElement("option");
        opt.value = st;
        opt.textContent = st;
        statusSelect.appendChild(opt);
    });

    const dictionaryGenres = new Set();
    const genreRows = (state.settings.genre && state.settings.genre.rows) || (state.settings.platformy && state.settings.platformy.rows) || [];
    const defaultGenres = ["Fantasy", "Science Fiction", "Horror", "Psychologiczny horror", "Romans", "Kryminał", "Literatura piękna", "Inne"];
    
    if (genreRows.length > 0) {
        genreRows.forEach(r => {
            const val = (r["genre"] || r["status"] || r["Platformy"] || "").trim();
            if (val) dictionaryGenres.add(val);
        });
    } else {
        defaultGenres.forEach(dg => dictionaryGenres.add(dg));
    }

    state.games.forEach(g => {
        const rawG = g["genre"] || g["Platforma"] || "";
        if (rawG) {
            rawG.split(",").forEach(part => {
                const clean = part.trim();
                if (clean) dictionaryGenres.add(clean);
            });
        }
    });

    const getSelectedGenres = () => {
        const val = genreInput ? (genreInput.value || "") : "";
        return val.split(",").map(g => g.trim().toLowerCase()).filter(Boolean);
    };

    const refreshGenrePills = () => {
        const currentSelected = getSelectedGenres();
        document.querySelectorAll(".form-genre-badge").forEach(badge => {
            const gVal = badge.getAttribute("data-genre").toLowerCase();
            const isSelected = currentSelected.includes(gVal);
            if (isSelected) {
                badge.classList.add("selected");
                badge.style.outline = "2px solid var(--color-primary)";
                badge.style.fontWeight = "bold";
            } else {
                badge.classList.remove("selected");
                badge.style.outline = "none";
                badge.style.fontWeight = "normal";
            }
        });
    };

    const createGenreBadge = (genreName) => {
        const col = getTagColor(genreName);
        const badge = document.createElement("button");
        badge.type = "button";
        badge.className = "form-genre-badge tag-pill";
        badge.setAttribute("data-genre", genreName);
        badge.style.backgroundColor = col.bg;
        badge.style.borderColor = col.border;
        badge.style.color = col.text;
        badge.style.cursor = "pointer";
        badge.style.fontSize = "14px";
        badge.style.padding = "4px 10px";
        badge.style.borderRadius = "4px";
        badge.textContent = genreName;

        badge.addEventListener("click", (e) => {
            e.preventDefault();
            const currentArr = (genreInput ? (genreInput.value || "") : "")
                .split(",")
                .map(t => t.trim())
                .filter(Boolean);
            const idx = currentArr.findIndex(t => t.toLowerCase() === genreName.toLowerCase());
            if (idx !== -1) {
                currentArr.splice(idx, 1);
            } else {
                currentArr.push(genreName);
            }
            const joined = currentArr.join(", ");
            if (document.getElementById("formGenre")) document.getElementById("formGenre").value = joined;
            if (document.getElementById("formGamePlatform")) document.getElementById("formGamePlatform").value = joined;
            refreshGenrePills();
        });

        return badge;
    };

    if (genresContainer) {
        genresContainer.innerHTML = "";
        const sortedGenres = Array.from(dictionaryGenres).sort((a, b) => a.localeCompare(b));
        sortedGenres.forEach(genreName => {
            genresContainer.appendChild(createGenreBadge(genreName));
        });
        refreshGenrePills();
    }

    const specialTagsContainer = document.getElementById("formSpecialTagsContainer");
    const specialTags = ["Gablota"];

    const dictionaryTags = new Set();
    const tagRows = (state.settings.tags && state.settings.tags.rows) || (state.settings.kolekcje && state.settings.kolekcje.rows) || [];
    tagRows.forEach(r => {
        const val = (r["tags"] || r["Kolekcje"] || "").trim();
        if (val && !specialTags.some(s => s.toLowerCase() === val.toLowerCase())) {
            dictionaryTags.add(val);
        }
    });

    state.games.forEach(g => {
        const rawT = g["tags"] || g["Kolekcje"] || "";
        if (rawT) {
            rawT.split(",").forEach(t => {
                const clean = t.trim();
                if (clean && !specialTags.some(s => s.toLowerCase() === clean.toLowerCase())) {
                    dictionaryTags.add(clean);
                }
            });
        }
    });

    const getSelectedTags = () => {
        return (collectionsInput.value || "")
            .split(",")
            .map(t => t.trim().toLowerCase())
            .filter(Boolean);
    };

    const refreshTagPills = () => {
        const currentSelected = getSelectedTags();
        document.querySelectorAll(".form-tag-badge").forEach(badge => {
            const tagVal = badge.getAttribute("data-tag").toLowerCase();
            const isSelected = currentSelected.includes(tagVal);
            if (isSelected) {
                badge.classList.add("selected");
                badge.style.outline = "2px solid var(--color-primary)";
                badge.style.fontWeight = "bold";
            } else {
                badge.classList.remove("selected");
                badge.style.outline = "none";
                badge.style.fontWeight = "normal";
            }
        });
    };

    const createTagBadge = (tag) => {
        const col = getTagColor(tag);
        const badge = document.createElement("button");
        badge.type = "button";
        badge.className = "form-tag-badge tag-pill";
        badge.setAttribute("data-tag", tag);
        badge.style.backgroundColor = col.bg;
        badge.style.borderColor = col.border;
        badge.style.color = col.text;
        badge.style.cursor = "pointer";
        badge.style.fontSize = "14px";
        badge.style.padding = "4px 10px";
        badge.style.borderRadius = "4px";
        badge.textContent = tag;

        badge.addEventListener("click", (e) => {
            e.preventDefault();
            const currentArr = (collectionsInput.value || "")
                .split(",")
                .map(t => t.trim())
                .filter(Boolean);
            const tagIdx = currentArr.findIndex(t => t.toLowerCase() === tag.toLowerCase());
            if (tagIdx !== -1) {
                currentArr.splice(tagIdx, 1);
            } else {
                currentArr.push(tag);
            }
            collectionsInput.value = currentArr.join(", ");
            refreshTagPills();
        });

        return badge;
    };

    if (specialTagsContainer) {
        specialTagsContainer.innerHTML = "";
        specialTags.forEach(tag => {
            specialTagsContainer.appendChild(createTagBadge(tag));
        });
    }

    if (tagsContainer) {
        tagsContainer.innerHTML = "";
        const sortedDictTags = Array.from(dictionaryTags).sort((a, b) => a.localeCompare(b));
        sortedDictTags.forEach(tag => {
            tagsContainer.appendChild(createTagBadge(tag));
        });
    }

    refreshTagPills();
    collectionsInput.oninput = refreshTagPills;
}

function handleGameFormSubmit(e) {
    e.preventDefault();
    if (!state.currentUser || !state.isAdmin) return;

    const gameId = document.getElementById("formGameId").value;
    const isEdit = !!gameId;
    const title = document.getElementById("formGameTitle").value.trim();
    const status = document.getElementById("formGameStatus").value.trim();
    const errorDiv = document.getElementById("gameEditError");

    if (!title || !status) {
        if (errorDiv) {
            errorDiv.textContent = "Wartości 'Tytuł książki' oraz 'Status' muszą być podane.";
            errorDiv.style.display = "block";
        } else {
            alert("Tytuł książki oraz status są polami wymaganymi.");
        }
        return;
    }
    if (errorDiv) errorDiv.style.display = "none";

    let assignedId = gameId;
    if (!isEdit) {
        let maxExistingId = 0;
        if (state.games && state.games.length > 0) {
            maxExistingId = state.games.reduce((max, g) => {
                const parsed = parseInt(g.id, 10);
                return !isNaN(parsed) && parsed > max ? parsed : max;
            }, 0);
        }
        assignedId = maxExistingId + 1;
    }

    const imageVal = (document.getElementById("formGameImage") ? document.getElementById("formGameImage").value : "").trim();
    const authorVal = (document.getElementById("formAuthor") ? document.getElementById("formAuthor").value : "").trim();
    const originVal = (document.getElementById("formOrigin") ? document.getElementById("formOrigin").value : "").trim();
    const genreVal = (document.getElementById("formGenre") ? document.getElementById("formGenre").value : (document.getElementById("formGamePlatform") ? document.getElementById("formGamePlatform").value : "")).trim();

    const bookDetails = {
        "id": assignedId,
        "book name": title,
        "status": status,
        "genre": genreVal,
        "author": authorVal,
        "origin": originVal,
        "style score": parseNum(document.getElementById("formRatingFabuła").value),
        "plot score": parseNum(document.getElementById("formRatingGrafika").value),
        "structure score": parseNum(document.getElementById("formRatingMechanika").value),
        "final score": parseNum(document.getElementById("formRatingOgólna").value),
        "completion date": document.getElementById("formCompletionDate").value,
        "review": document.getElementById("formReview").value.trim(),
        "tags": document.getElementById("formCollections").value.trim(),
        "cover": imageVal,
        "update": getCurrentDateTimeString(),
        // Synonimy wstecznej kompatybilności
        "Tytuł": title,
        "Stan": status,
        "Platforma": genreVal,
        "Autor": authorVal,
        "Pochodzenie": originVal,
        "Ocena gry": parseNum(document.getElementById("formRatingOgólna").value),
        "Kolekcje": document.getElementById("formCollections").value.trim(),
        "Recenzja": document.getElementById("formReview").value.trim(),
        "Obraz": imageVal,
        "Aktualizacja": getCurrentDateTimeString()
    };

    const previousGames = [...state.games];
    const currentSheet = state.currentUser.sheetName;

    if (isEdit) {
        const idx = state.games.findIndex(g => String(g.id) === String(gameId));
        if (idx !== -1) {
            state.games[idx] = { ...state.games[idx], ...bookDetails };
            if (state.selectedGame && String(state.selectedGame.id) === String(gameId)) {
                state.selectedGame = state.games[idx];
            }
        }
    } else {
        state.games.unshift(bookDetails);
    }

    setCachedGames(currentSheet, state.games);
    updateProfileBanner();
    populateFilterOptions();
    renderGamesGrid();
    if (state.selectedGame) {
        renderMonitorGameDetails(state.selectedGame);
    }
    state.formInitialSnapshot = null;
    closeModal("gameEditModal");

    const taskTitle = isEdit ? `Edycja książki: ${title}` : `Dodanie książki: ${title}`;
    const apiParams = {
        action: isEdit ? "editBook" : "addBook",
        user: currentSheet,
        bookId: gameId,
        gameId: gameId,
        bookDetails: JSON.stringify(bookDetails),
        gameDetails: JSON.stringify(bookDetails)
    };

    enqueueSyncTask(
        taskTitle,
        async () => {
            const res = await sendApiRequest(apiParams);

            if (res.status === "success") {
                invalidateSettingsCache();
                const targetGame = state.games.find(g => String(g.id) === String(bookDetails.id));
                if (targetGame) {
                    if (!isEdit && res.data && res.data.id) {
                        targetGame.id = res.data.id;
                    }
                    if (res.data && res.data.coverUrl) {
                        targetGame["cover"] = res.data.coverUrl;
                        targetGame["Obraz"] = res.data.coverUrl;
                    }
                    if (state.selectedGame && String(state.selectedGame.id) === String(targetGame.id)) {
                        state.selectedGame = targetGame;
                        renderMonitorGameDetails(state.selectedGame);
                    }
                    setCachedGames(currentSheet, state.games);
                    renderGamesGrid();
                    updateProfileBanner();
                }
            }
            return res;
        },
        () => {
            state.games = previousGames;
            setCachedGames(currentSheet, state.games);
            updateProfileBanner();
            renderGamesGrid();
        },
        apiParams
    );
}

function handleDeleteGame(gameId, title) {
    if (!state.currentUser || !state.isAdmin) return;

    if (!confirm(`Czy na pewno chcesz usunąć pozycję "${title}" z bazy książek?`)) return;

    const previousGames = [...state.games];
    const currentSheet = state.currentUser.sheetName;

    state.games = state.games.filter(g => String(g.id) !== String(gameId));
    setCachedGames(currentSheet, state.games);
    updateProfileBanner();
    populateFilterOptions();
    renderGamesGrid();

    const apiParams = {
        action: "deleteBook",
        user: currentSheet,
        bookId: gameId,
        gameId: gameId
    };

    enqueueSyncTask(
        `Usunięcie książki: ${title}`,
        async () => {
            const res = await sendApiRequest(apiParams);
            if (res.status === "success") {
                invalidateSettingsCache();
            }
            return res;
        },
        () => {
            state.games = previousGames;
            setCachedGames(currentSheet, state.games);
            updateProfileBanner();
            renderGamesGrid();
        },
        apiParams
    );
}

async function handleSyncMissingCovers() {
    if (!state.currentUser || !state.isAdmin) return;
    const currentSheet = state.currentUser.sheetName;

    const gamesWithoutCover = state.games.filter(g => {
        const img = (g["cover"] || g["Obraz"] || g["obraz"] || "").trim();
        return !img || img === "-" || img === "brak" || img === "null" || img === "undefined";
    });

    if (gamesWithoutCover.length === 0) {
        alert(`Wszystkie książki (${state.games.length}) w Twojej bazie posiadają już przypisane okładki.`);
        return;
    }

    if (!confirm(`Znaleziono ${gamesWithoutCover.length} książek bez okładki. Czy chcesz pobrać dla nich grafiki z RAWG?`)) {
        return;
    }

    const btn = document.getElementById("btnSyncCovers");
    if (btn) {
        btn.disabled = true;
        btn.textContent = `Pobieranie okładek: 0/${gamesWithoutCover.length}...`;
    }

    let successCount = 0;
    const nowTime = getCurrentDateTimeString();

    for (let i = 0; i < gamesWithoutCover.length; i++) {
        const game = gamesWithoutCover[i];
        const title = (game["book name"] || game["Tytuł"] || "").trim();

        if (btn) {
            btn.textContent = `Pobieranie: ${i + 1}/${gamesWithoutCover.length} (${escapeHtml(title.substring(0, 15))}...)`;
        }

        try {
            const res = await sendApiRequest({ action: "fetchCover", title: title });
            if (res && res.status === "success" && res.data && res.data.coverUrl) {
                const coverUrl = res.data.coverUrl;
                game["cover"] = coverUrl;
                game["Obraz"] = coverUrl;
                game["update"] = nowTime;
                game["Aktualizacja"] = nowTime;
                successCount++;

                const gameDetails = { ...game, "cover": coverUrl, "Obraz": coverUrl, "update": nowTime, "Aktualizacja": nowTime };
                const apiParams = {
                    action: "editBook",
                    user: currentSheet,
                    bookId: game.id,
                    gameId: game.id,
                    bookDetails: JSON.stringify(gameDetails),
                    gameDetails: JSON.stringify(gameDetails)
                };

                enqueueSyncTask(
                    `Pobrano okładkę: ${title}`,
                    async () => {
                        return await sendApiRequest(apiParams);
                    },
                    null,
                    apiParams
                );
            }
        } catch (err) {
            console.warn("Błąd pobierania okładki dla:", title, err);
        }

        await new Promise(r => setTimeout(r, 120));
    }

    setCachedGames(currentSheet, state.games);
    renderGamesGrid();
    if (state.selectedGame) {
        renderMonitorGameDetails(state.selectedGame);
    }

    if (btn) {
        btn.disabled = false;
        btn.textContent = "[RAWG] Pobierz brakujące okładki";
    }

    alert(`Zakończono pobieranie okładek!\nPomyślnie dopasowano okładki dla ${successCount} z ${gamesWithoutCover.length} książek. Zmiany są przesyłane do arkusza w tle.`);
}
