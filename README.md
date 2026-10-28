# Biblioteka Aleksandryjska ale ta nie może spłonąć (allegedly) — Wersja 1.1

Osobista baza przeczytanych, czytanych i planowanych książek, wirtualne półki oraz panel statystyk i porównań czytelników. Nowoczesna, w pełni responsywna aplikacja webowa typu serverless, hostowana bezpłatnie na GitHub Pages, komunikująca się bezpośrednio z arkuszem Google Sheets jako bazą danych za pośrednictwem Google Apps Script.

---

## Architektura i stos technologiczny

Aplikacja działa w oparciu o architekturę bezserwerową:

```
+--------------------------------+
|  Frontend (HTML5 / CSS / JS)   |  <-- GitHub Pages (Static Hosting)
+---------------+----------------+
                |
                | (Asynchroniczne zapytania HTTP / JSONP / JSON API)
                v
+--------------------------------+
|  Google Apps Script (Web App)  |  <-- Serverless API z autoryzacją per czytelnik
+---------------+----------------+
                |
                | (Google Apps Script Spreadsheet Service)
                v
+--------------------------------+
|  Google Sheets (Baza danych)   |  <-- Arkusze czytelników, słowniki i statystyki
+--------------------------------+
```

* **Frontend**: Czysty HTML5, modułowy Vanilla CSS3 z tokenami projektowymi (`tokens.css`) oraz modułowy JavaScript (ES6+) podzielony na wyspecjalizowane moduły.
* **Hosting**: GitHub Pages.
* **Baza danych i silnik backendowy**: Google Sheets + Google Apps Script (REST Web App API / JSONP).
* **Pamięć lokalna i kolejka**: `localStorage` / `sessionStorage` (sesja administratora per czytelnik, pamięć podręczna książek, kolejka synchronizacji w tle).

---

## Nowości i ulepszenia w Wersji 1.1

1. **Modułowa architektura kodu JavaScript**:
   * Rozbicie monolitycznego pliku `app.js` na niezależne, zwięzłe moduły w katalogu `js/modules/` (`state`, `utils`, `api`, `cache`, `sync`, `profiles`, `auth`, `shelves`, `showcase`, `filters`, `books`, `settings`, `charts`).
   * Czytelniejszy kod, łatwiejsze utrzymanie i brak zależności od zewnętrznych bibliotek i frameworków.

2. **Bezpieczne hasła i autoryzacja dynamiczna**:
   * Hasła administratorów pobierane z właściwości projektu Google Apps Script (`ScriptProperties`) lub arkusza ustawień, zamiast na stałe wpisanych haseł w kodzie.
   * Ścisła kontrola uprawnień per profil bazy: użytkownik zalogowany do swojej bazy widzi pozostałe profile wyłącznie w trybie do odczytu (brak możliwości przypadkowej edycji obcych książek).

3. **Paginacja i responsywna pojemność regałów**:
   * Automatyczne dostosowywanie liczby półek do szerokości okna przeglądarki (1 do 3 regałów na stronę).
   * Płynna nawigacja stronnicowa oraz poprawne resetowanie widoku monitora przy zmianie filtrów i profili.

---

## Główne funkcjonalności

1. **Wirtualne półki z białego drewna i pionowe grzbiety**:
   * Prezentacja biblioteki w formie regałów wykonanych z jasnego/białego drewna.
   * Wszystkie książki ułożone pionowo z czytelnym, pionowym tekstem na grzbietach w stylu orientalnym (O / T / A / K).
   * Pastelowe kolory grzbietów generowane automatycznie z kolorów statusów zdefiniowanych w arkuszu.
   * Interaktywny tooltip w stylu Minecraft podążający za kursorem myszy przy najechaniu na książkę.

2. **Obsługa profili i dynamiczne arkusze**:
   * Przełączanie profili czytelników w czasie rzeczywistym z dedykowanymi motywami kolorystycznymi i awatarami.
   * Dynamiczne dodawanie nowych profili czytelników bez ingerencji w kod źródłowy – automatyczne tworzenie zakładki w arkuszu Google Sheets oraz formuł we wszystkich arkuszach statystyk.
   * Ekran startowy z rozrzuconymi profilami czytelników dopasowany do okna przeglądarki.

3. **Monitor informacyjny i gablota wyróżnionych pozycji**:
   * Podgląd wybranej książki w oprawionej ramie obrazu: okładka, status, gatunki, tabela z autorem, źródłem i datą ukończenia oraz oceny cząstkowe (Styl, Fabuła, Struktura, Ocena końcowa).
   * Edytowalna gablota wyróżnionych tytułów na profilu czytelnika z możliwością zwijania panelu.

4. **Wielokrotny wybór gatunków i tagów**:
   * Gatunki wybierane wielokrotnie w formularzu w formie interaktywnych odznak (tak jak tagi/kolekcje).
   * Formularz wymaga podania jedynie tytułu książki oraz statusu; pozostałe pola (gatunki, autor, pochodzenie, oceny, recenzja, okładka) są opcjonalne.

5. **Interaktywne wykresy i statystyki (SVG)**:
   * Porównanie liczby książek w poszczególnych statusach (wykres słupkowy).
   * Udział gatunków w bibliotece czytelników (wykres pierścieniowy / donut).
   * Oś czasu ukończonych lektur w poszczególnych miesiącach i latach (wykres liniowy).
   * Zestawienie i porównanie średnich ocen lektur.

6. **Wyszukiwanie, sortowanie i filtry**:
   * Szybkie wyszukiwanie po tytule, autorze lub gatunku.
   * Filtry wielokrotnego wyboru dla statusów, gatunków oraz kolekcji/tagów.
   * Sortowanie po tytule, dacie aktualizacji, ocenach i dacie przeczytania.

7. **Kolejka synchronizacji w tle (Optimistic UI)**:
   * Natychmiastowa aktualizacja interfejsu przy dodawaniu, edycji lub usuwaniu książek.
   * Kolejka synchronizacji w chmurze z automatycznym ponawianiem w przypadku chwilowego braku sieci.

8. **Pełna responsywność i optymalizacja mobilna**:
   * Zabezpieczenie przed przewijaniem w poziomie na smartfonach.
   * Przyklejony pasek nawigacyjny (`sticky header`) stale dostępny na górze ekranu wraz z przyciskiem szybkiego dodawania książek.
   * Zoptymalizowany szkielet ładowania (skeleton loader) eliminujący migotanie interfejsu.

---

## Struktura projektu

```
MMNR Baza Książek/
├── index.html                   # Główna struktura HTML aplikacji
├── README.md                    # Dokumentacja projektu
├── assets/                      # Ikony, awatary i tekstury półek/tła
├── css/
│   ├── style.css                # Główny punkt wejścia arkuszy stylów
│   └── modules/
│       ├── tokens.css           # Globalne zmienne CSS, kolory i typografia
│       ├── base.css             # Style bazowe, reset i struktura body
│       ├── header.css           # Pasek nawigacyjny, menu profili i synchronizacja
│       ├── welcome.css          # Ekran powitalny ze swobodnymi awatarami
│       ├── profile.css          # Baner czytelnika, gablota i statystyki
│       ├── dashboard.css        # Układ pulpitu, wyszukiwarka i filtry
│       ├── monitor.css          # Rama obrazu, ekran monitora i szczegóły książki
│       ├── shelves.css          # Półki z białego drewna, grzbiety i odznaki
│       ├── charts.css           # Wykresy słupkowe, kołowe i liniowe SVG
│       ├── modals.css           # Okna dialogowe, formularze i tagi
│       ├── tables.css           # Tabele słowników ustawień
│       └── responsive.css       # RWD dla laptopów, tabletów i telefonów
├── js/
│   ├── app.js                   # Punkt wejścia i inicjalizacja aplikacji
│   └── modules/
│       ├── state.js             # Globalny stan aplikacji
│       ├── utils.js             # Funkcje pomocnicze, daty, formatowanie
│       ├── api.js               # Komunikacja sieciowa z Google Apps Script
│       ├── cache.js             # Pamięć podręczna książek i słowników
│       ├── sync.js              # Kolejka synchronizacji w tle (Optimistic UI)
│       ├── profiles.js          # Zarządzanie profilami i przełączanie użytkowników
│       ├── auth.js              # Weryfikacja haseł i uprawnienia administratora
│       ├── shelves.js           # Półki, paginacja, monitor Minecraft i grzbiety
│       ├── showcase.js          # Gablota wyróżnionych tytułów i baner profilu
│       ├── filters.js           # Wyszukiwanie, sortowanie i filtry kolekcji
│       ├── books.js             # Formularze dodawania, edycji i usuwania książek
│       ├── settings.js          # Słowniki bazy i edycja kategorii
│       └── charts.js            # Generator wykresów statystyk SVG
└── resources/
    └── Book_GithubPages.gs      # Kod backendu Google Apps Script
```