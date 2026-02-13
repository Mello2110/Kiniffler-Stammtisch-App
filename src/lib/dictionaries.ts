export type Language = 'en' | 'de' | 'pl';

export const dictionaries = {
    en: {
        sidebar: {
            dashboard: "Dashboard",
            events: "Events",
            stats: "Stats (Points)",
            finances: "Finances",
            gallery: "Gallery",
            members: "Members",
            hof: "Hall of Fame",
            kniffel: "Kniffel",
            feedback: "Feedback",
            options: "Options"
        },
        headers: {
            dashboard: { title: "Stammtisch", highlight: "Dashboard", badge: "Overview", subtext: "Welcome back! Here is your overview of upcoming events, finances, and news." },
            events: { title: "Upcoming", highlight: "Meetups", badge: "Planning", subtext: "Don't miss a round. Vote for dates and plan the next meetup." },
            stats: { title: "Season", highlight: "Stats", badge: "Leaderboard", subtext: "The naked numbers. Who leads, who pays, who drinks? No excuses, just facts." },
            cash: { title: "Cash", highlight: "Flow", badge: "Treasury", subtext: "Transparency is everything. Balance, penalties, and expenses in detail." },
            members: { title: "Stammtisch", highlight: "Crew", badge: "Community", subtext: "Manage the heads behind the table. Only true originals allowed!" },
            hof: { title: "Hall of", highlight: "Fame", badge: "Legends", subtext: "Honoring the top contributors, payers, and hosts of our community." },
            kniffel: { title: "Kniffel", highlight: "Tracker", badge: "Dice Game", subtext: "Track your Kniffel games. Record scores, crown champions, and celebrate those lucky rolls!" },
            feedback: { title: "Feedback", highlight: "Improvement", badge: "Support", subtext: "Report issues or suggest new features. Let's make it better!" },
            options: { title: "App", highlight: "Options", badge: "Settings", subtext: "Customize your experience and manage data." }
        },
        dashboard: {
            season: "Season",
            quickActions: "Quick Actions",
            widgets: {
                members: { title: "Total Members", desc: "Active regular members" },
                penalties: { title: "Member Balance", desc: "Unpaid fines", descPositive: "Credit from expenses", descNegative: "Outstanding amount", descZero: "All settled" },
                cash: { title: "Current Cash Balance", desc: "Available funds" },
                seasonLeader: { title: "Season Leader", desc: "Points", noPoints: "No points yet" },
                hof: { title: "Hall of Fame", value: "Legends", desc: "Top Donors & Hosts" }
            }
        },
        events: {
            modal: {
                titleFormat: "EEEE, MMMM do",
                subtitle: "What would you like to do?",
                vote: { title: "Vote for Stammtisch", desc: "Vote for this date" },
                unvote: { title: "Unvote", desc: "Remove your vote" },
                addEvent: { title: "Add Set Event", desc: "Add a birthday or manual event" },
                form: {
                    title: "Event Title", placeholder: "e.g., Birthday",
                    host: "Host", neutral: "Neutral",
                    time: "Time", location: "Location", venuePlaceholder: "Venue...",
                    desc: "Description", descPlaceholder: "Details...",
                    back: "Back", create: "Create Event", saving: "Saving..."
                },
                summary: {
                    votedBy: "Voted by:",
                    createStammtisch: "Create Stammtisch Event",
                    votingProgress: "Voting Progress",
                    votes: "Votes",
                    membersVoted: "members voted"
                }
            }
        },
        feedback: {
            tabs: {
                problem: "Report a Problem",
                suggestion: "Make a Suggestion",
                other: "Other Topics"
            },
            form: {
                heading: "Title",
                headingPlaceholder: "Short summary...",
                description: "Description",
                descriptionPlaceholder: "Describe in detail...",
                category: "Category",
                categories: { design: "Design", function: "Functionality", other: "Other" },
                platform: "Platform",
                submit: "Submit",
                submitting: "Submitting...",
                success: "Thank you! Your feedback has been sent."
            }
        },
        auth: {
            welcome: "Welcome back",
            registerTitle: "Create Account",
            welcomeDesc: "Sign in to continue",
            registerDesc: "Join the Stammtisch crew",
            email: "Email Address",
            password: "Password",
            loginBtn: "Sign In",
            registerBtn: "Register",
            or: "Or",
            toggleLogin: "Already have an account? Sign In",
            toggleRegister: "No account? Register",
            errors: {
                invalid: "Invalid email or password.",
                emailInUse: "Email already in use.",
                weakPass: "Password must be at least 6 characters.",
                default: "An error occurred."
            }
        },
        stats: {
            season: "Season",
            loading: "Loading Leaderboard...",
            matrixTitle: "Points Matrix",
            matrixLoading: "Loading Matrix..."
        },
        members: {
            countLabel: "Members"
        },
        options: {
            language: "Language",
            languageDesc: "Choose your preferred interface language.",
            data: "Data Management",
            dataDesc: "Manage application data and reset settings.",
            resetTitle: "Danger Zone",
            resetDesc: "This tool helps you wipe all application data. Use this to clear test data and start fresh.",
            resetBtn: "DELETE EVERYTHING",
            resetConfirm: "ARE YOU SURE? This will delete ALL data. This cannot be undone.",
            resetProcessing: "Prcoessing...",
            resetSuccess: "Reset Complete!"
        },
        common: {
            loading: "Loading..."
        },
        kniffel: {
            sheetCount: "Sheets",
            addSheet: "Add New Game Sheet",
            selectMonth: "Select Month",
            createSheet: "Create Sheet",
            cancel: "Cancel",
            noSheets: "No game sheets yet. Create one to start tracking!",
            createdOn: "Created on",
            delete: "Delete",
            confirmDelete: "Are you sure you want to delete this game sheet?",
            sort: "Sort",
            sortScoreHigh: "Score (High→Low)",
            sortScoreLow: "Score (Low→High)",
            sortAlphabet: "Alphabet (A→Z)",
            sortManual: "Original Order",
            stroke: "Stroke",
            strokeConfirm: "Mark as stroke (0 points)?",
            penalty: "Create Penalty",
            penaltyConfirm: "Create 1€ penalty for",
            penaltyReason: "Strich",
            upperSection: "Upper Section",
            lowerSection: "Lower Section",
            ones: "Ones",
            twos: "Twos",
            threes: "Threes",
            fours: "Fours",
            fives: "Fives",
            sixes: "Sixes",
            upperSum: "Sum",
            bonus: "Bonus (if ≥63)",
            threeOfAKind: "Three of a Kind",
            fourOfAKind: "Four of a Kind",
            fullHouse: "Full House",
            smallStraight: "Small Straight",
            largeStraight: "Large Straight",
            kniffelRow: "Kniffel",
            chance: "Chance",
            lowerSum: "Lower Sum",
            total: "Total Score",
            months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            // Player Selection Modal
            selectPlayers: "Select Players",
            selectPlayersDesc: "Choose who will play this game",
            playersSelected: "players selected",
            playerSelected: "player selected",
            selectAll: "Select All",
            deselectAll: "Deselect All",
            createGame: "Create Game",
            minPlayersError: "Select at least 2 players",
            selectionOrder: "Selection order determines column order",
            // Guest Players
            addGuest: "Add Guest",
            guestNamePlaceholder: "Enter guest name...",
            guestBadge: "GUEST",
            guestLabel: "Guest",
            guestAdded: "Guest added successfully",
            guestNameTooShort: "Guest name must be at least 2 characters",
            removeGuest: "Remove guest",
            hostMember: "Brought by",
            selectHostMember: "Select host member",
            hostMemberRequired: "Please select who brought this guest",
            // Drag and Drop Reordering
            reorderColumns: "Reorder Columns",
            reorderMode: "Reorder Mode Active",
            dragToReorder: "Drag to reorder",
            orderSaved: "Column order saved",
            selectedPlayers: "Selected Players",
            dragToReorderPlayers: "Drag to change player order",
            enterFullscreen: "Enter Fullscreen",
            exitFullscreen: "Exit Fullscreen",
            fullscreenMode: "Fullscreen Mode",
            // Dice Count Entry Modal
            howManyDice: "How many {field} rolled?",
            points: "Points",
            selectDiceCount: "Select dice count",
            enter: "Enter"
        }
    },
    de: {
        sidebar: {
            dashboard: "Dashboard",
            events: "Termine",
            stats: "Statistik",
            finances: "Finanzen",
            gallery: "Galerie",
            members: "Mitglieder",
            hof: "Ruhmeshalle",
            kniffel: "Kniffel",
            feedback: "Feedback",
            options: "Optionen"
        },
        headers: {
            dashboard: { title: "Stammtisch", highlight: "Dashboard", badge: "Übersicht", subtext: "Willkommen zurück! Hier ist dein Überblick über anstehende Events, Finanzen und aktuelle News." },
            events: { title: "Anstehende", highlight: "Treffen", badge: "Planung", subtext: "Verpasse keine Runde. Stimme für Termine ab und plane das nächste Treffen." },
            stats: { title: "Saison", highlight: "Statistik", badge: "Bestenliste", subtext: "Die nackten Zahlen. Wer führt, wer zahlt, wer trinkt? Keine Ausreden, nur Fakten." },
            cash: { title: "Cash", highlight: "Flow", badge: "Kasse", subtext: "Transparenz ist alles. Guthaben, Strafen und Ausgaben im Detail." },
            members: { title: "Stammtisch", highlight: "Crew", badge: "Community", subtext: "Verwalte die Köpfe hinter dem Tisch. Nur echte Originale erlaubt!" },
            hof: { title: "Hall of", highlight: "Fame", badge: "Legenden", subtext: "Ehre, wem Ehre gebührt. Hier feiern wir die Top-Performer." },
            kniffel: { title: "Kniffel", highlight: "Tracker", badge: "Würfelspiel", subtext: "Verfolge eure Kniffel-Spiele. Punkte notieren, Champions krönen und glückliche Würfe feiern!" },
            feedback: { title: "Feedback", highlight: "Vorschläge", badge: "Support", subtext: "Melde Probleme oder schlage neue Features vor." },
            options: { title: "App", highlight: "Optionen", badge: "Einstellungen", subtext: "Passe deine Erfahrung an und verwalte Daten." }
        },
        dashboard: {
            season: "Saison",
            quickActions: "Schnellzugriff",
            widgets: {
                members: { title: "Mitglieder Gesamt", desc: "Aktive Stammgäste" },
                penalties: { title: "Guthaben", desc: "Unbezahlte Bußen", descPositive: "Guthaben aus Ausgaben", descNegative: "Offener Betrag", descZero: "Ausgeglichen" },
                cash: { title: "Aktueller Kassenstand", desc: "Verfügbares Guthaben" },
                seasonLeader: { title: "Saison-Spitze", desc: "Punkte", noPoints: "Noch keine Punkte" },
                hof: { title: "Ruhmeshalle", value: "Legenden", desc: "Top Spender & Gastgeber" }
            }
        },
        events: {
            modal: {
                titleFormat: "EEEE, d. MMMM",
                subtitle: "Was möchtest du tun?",
                vote: { title: "Für Termin stimmen", desc: "Stimme für diesen Tag ab" },
                unvote: { title: "Stimme entfernen", desc: "Deine Stimme zurückziehen" },
                addEvent: { title: "Event hinzufügen", desc: "Geburtstag oder manuelles Event" },
                form: {
                    title: "Event Titel", placeholder: "z.B. Geburtstag",
                    host: "Gastgeber", neutral: "Neutral",
                    time: "Uhrzeit", location: "Ort", venuePlaceholder: "Lokal...",
                    desc: "Beschreibung", descPlaceholder: "Details...",
                    back: "Zurück", create: "Event erstellen", saving: "Speichere..."
                },
                summary: {
                    votedBy: "Abgestimmt von:",
                    createStammtisch: "Stammtisch erstellen",
                    votingProgress: "Abstimmungsfortschritt",
                    votes: "Stimmen",
                    membersVoted: "Mitglieder haben abgestimmt"
                }
            }
        },
        feedback: {
            tabs: {
                problem: "Problem melden",
                suggestion: "Vorschlag machen",
                other: "Sonstiges"
            },
            form: {
                heading: "Titel",
                headingPlaceholder: "Kurze Zusammenfassung...",
                description: "Beschreibung",
                descriptionPlaceholder: "Beschreibe dein Anliegen...",
                category: "Kategorie",
                categories: { design: "Design", function: "Funktionalität", other: "Sonstiges" },
                platform: "Plattform",
                submit: "Absenden",
                submitting: "Sende...",
                success: "Danke! Dein Feedback wurde gesendet."
            }
        },
        auth: {
            welcome: "Willkommen zurück",
            registerTitle: "Konto erstellen",
            welcomeDesc: "Melde dich an, um fortzufahren",
            registerDesc: "Werde Teil der Stammtisch-Runde",
            email: "E-Mail Adresse",
            password: "Passwort",
            loginBtn: "Anmelden",
            registerBtn: "Registrieren",
            or: "Oder",
            toggleLogin: "Bereits ein Konto? Anmelden",
            toggleRegister: "Noch kein Konto? Registrieren",
            errors: {
                invalid: "Ungültige E-Mail oder Passwort.",
                emailInUse: "Diese E-Mail wird bereits verwendet.",
                weakPass: "Passwort muss mindestens 6 Zeichen lang sein.",
                default: "Ein Fehler ist aufgetreten."
            }
        },
        stats: {
            season: "Saison",
            loading: "Lade Bestenliste...",
            matrixTitle: "Punktematrix",
            matrixLoading: "Lade Matrix..."
        },
        members: {
            countLabel: "Mitglieder"
        },
        options: {
            language: "Sprache",
            languageDesc: "Wähle deine bevorzugte Sprache.",
            data: "Datenverwaltung",
            dataDesc: "Verwalte App-Daten und setze Einstellungen zurück.",
            resetTitle: "Gefahrenzone",
            resetDesc: "Dieses Tool löscht alle App-Daten. Nutze es, um Testdaten zu bereinigen.",
            resetBtn: "ALLES LÖSCHEN",
            resetConfirm: "BIST DU SICHER? Dies löscht ALLE Daten unwiderruflich.",
            resetProcessing: "Verarbeite...",
            resetSuccess: "Reset erfolgreich!"
        },
        common: {
            loading: "Laden..."
        },
        kniffel: {
            sheetCount: "Blätter",
            addSheet: "Neues Spielblatt erstellen",
            selectMonth: "Monat wählen",
            createSheet: "Blatt erstellen",
            cancel: "Abbrechen",
            noSheets: "Noch keine Spielblätter. Erstelle eines, um zu starten!",
            createdOn: "Erstellt am",
            delete: "Löschen",
            confirmDelete: "Möchtest du dieses Spielblatt wirklich löschen?",
            sort: "Sortieren",
            sortScoreHigh: "Punkte (Hoch→Niedrig)",
            sortScoreLow: "Punkte (Niedrig→Hoch)",
            sortAlphabet: "Alphabet (A→Z)",
            sortManual: "Ursprüngliche Reihenfolge",
            stroke: "Strich",
            strokeConfirm: "Als Strich markieren (0 Punkte)?",
            penalty: "Strafe erstellen",
            penaltyConfirm: "1€ Strafe erstellen für",
            penaltyReason: "Strich",
            upperSection: "Oberer Bereich",
            lowerSection: "Unterer Bereich",
            ones: "Einser",
            twos: "Zweier",
            threes: "Dreier",
            fours: "Vierer",
            fives: "Fünfer",
            sixes: "Sechser",
            upperSum: "Summe",
            bonus: "Bonus (wenn ≥63)",
            threeOfAKind: "Dreierpasch",
            fourOfAKind: "Viererpasch",
            fullHouse: "Full House",
            smallStraight: "Kleine Straße",
            largeStraight: "Große Straße",
            kniffelRow: "Kniffel",
            chance: "Chance",
            lowerSum: "Untere Summe",
            total: "Gesamtpunktzahl",
            months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
            // Player Selection Modal
            selectPlayers: "Spieler auswählen",
            selectPlayersDesc: "Wähle aus, wer mitspielen wird",
            playersSelected: "Spieler ausgewählt",
            playerSelected: "Spieler ausgewählt",
            selectAll: "Alle auswählen",
            deselectAll: "Alle abwählen",
            createGame: "Spiel erstellen",
            minPlayersError: "Mindestens 2 Spieler auswählen",
            selectionOrder: "Auswahlreihenfolge bestimmt Spaltenreihenfolge",
            // Guest Players
            addGuest: "Gast hinzufügen",
            guestNamePlaceholder: "Gastname eingeben...",
            guestBadge: "GAST",
            guestLabel: "Gast",
            guestAdded: "Gast erfolgreich hinzugefügt",
            guestNameTooShort: "Gastname muss mindestens 2 Zeichen haben",
            removeGuest: "Gast entfernen",
            hostMember: "Mitgebracht von",
            selectHostMember: "Gastgeber wählen",
            hostMemberRequired: "Bitte wählen Sie, wer diesen Gast mitgebracht hat",
            // Ziehen und Ablegen zum Neuordnen
            reorderColumns: "Spalten neu ordnen",
            reorderMode: "Sortiermodus aktiv",
            dragToReorder: "Ziehen zum Neuordnen",
            orderSaved: "Spaltenreihenfolge gespeichert",
            selectedPlayers: "Ausgewählte Spieler",
            dragToReorderPlayers: "Ziehen zum Ändern der Spielerreihenfolge",
            enterFullscreen: "Vollbild aktivieren",
            exitFullscreen: "Vollbild verlassen",
            fullscreenMode: "Vollbildmodus",
            // Würfelzahl-Eingabe Modal
            howManyDice: "Wie viele {field} gewürfelt?",
            points: "Punkte",
            selectDiceCount: "Anzahl auswählen",
            enter: "Eintragen"
        }
    },
    pl: {
        sidebar: {
            dashboard: "Pulpit",
            events: "Wydarzenia",
            stats: "Statystyki",
            finances: "Finanse",
            gallery: "Galeria",
            members: "Członkowie",
            hof: "Aleja Sław",
            kniffel: "Kniffel",
            feedback: "Feedback",
            options: "Opcje"
        },
        headers: {
            dashboard: { title: "Pulpit", highlight: "Stammtisch", badge: "Przegląd", subtext: "Witaj ponownie! Oto przegląd nadchodzących wydarzeń, finansów i aktualności." },
            events: { title: "Nadchodzące", highlight: "Spotkania", badge: "Planowanie", subtext: "Nie przegap kolejki. Głosuj na terminy i planuj kolejne spotkanie." },
            stats: { title: "Statystyki", highlight: "Sezonu", badge: "Ranking", subtext: "Nagie liczby. Kto prowadzi, kto płaci, kto pije? Żadnych wymówek, tylko fakty." },
            cash: { title: "Przepływ", highlight: "Gotówki", badge: "Skarbiec", subtext: "Przejrzystość to podstawa. Saldo, kary i wydatki w szczegółach." },
            members: { title: "Ekipa", highlight: "Stammtisch", badge: "Społeczność", subtext: "Zarządzaj głowami przy stole. Tylko prawdziwe oryginały!" },
            hof: { title: "Aleja", highlight: "Sław", badge: "Legendy", subtext: "Honorujemy najlepszych darczyńców, płatników i gospodarzy." },
            kniffel: { title: "Kniffel", highlight: "Tracker", badge: "Gra w Kości", subtext: "Śledź swoje gry w Kniffel. Zapisuj wyniki, koronuj mistrzów i ciesz się szczęśliwymi rzutami!" },
            feedback: { title: "Opinie", highlight: "Ulepszenia", badge: "Feedback", subtext: "Zgłoś błędy lub zasugeruj nowe funkcje. Bądźmy lepsi!" },
            options: { title: "Opcje", highlight: "Aplikacji", badge: "Ustawienia", subtext: "Dostosuj swoje doświadczenie i zarządzaj danymi." }
        },
        dashboard: {
            season: "Sezon",
            quickActions: "Szybkie Akcje",
            widgets: {
                members: { title: "Łącznie Członków", desc: "Aktywni bywalcy" },
                penalties: { title: "Saldo", desc: "Niezapłacone grzywny", descPositive: "Kredyt z wydatków", descNegative: "Zaległa kwota", descZero: "Rozliczone" },
                cash: { title: "Stan Kasy", desc: "Dostępne środki" },
                seasonLeader: { title: "Lider Sezonu", desc: "Punkty", noPoints: "Brak punktów" },
                hof: { title: "Aleja Sław", value: "Legendy", desc: "Top Darczyńcy" }
            }
        },
        events: {
            modal: {
                titleFormat: "EEEE, d MMMM",
                subtitle: "Co chciałbyś zrobić?",
                vote: { title: "Głosuj na termin", desc: "Oddaj głos na tę datę" },
                unvote: { title: "Cofnij głos", desc: "Usuń swój głos" },
                addEvent: { title: "Dodaj Wydarzenie", desc: "Dodaj urodziny lub inne wydarzenie" },
                form: {
                    title: "Tytuł Wydarzenia", placeholder: "np. Urodziny",
                    host: "Gospodarz", neutral: "Neutralny",
                    time: "Godzina", location: "Lokalizacja", venuePlaceholder: "Miejsce...",
                    desc: "Opis", descPlaceholder: "Szczegóły...",
                    back: "Wstecz", create: "Utwórz Wydarzenie", saving: "Zapisywanie..."
                },
                summary: {
                    votedBy: "Głosowali:",
                    createStammtisch: "Utwórz Stammtisch",
                    votingProgress: "Postęp głosowania",
                    votes: "głosy",
                    membersVoted: "członków zagłosowało"
                }
            }
        },
        feedback: {
            tabs: {
                problem: "Zgłoś Problem",
                suggestion: "Zasugeruj Zmianę",
                other: "Inne Tematy"
            },
            form: {
                heading: "Tytuł",
                headingPlaceholder: "Krótkie podsumowanie...",
                description: "Opis",
                descriptionPlaceholder: "Opisz szczegółowo...",
                category: "Kategoria",
                categories: { design: "Wygląd (Design)", function: "Funkcjonalność", other: "Inne" },
                platform: "Platforma",
                submit: "Wyślij",
                submitting: "Wysyłanie...",
                success: "Dziękujemy! Twoja opinia została wysłana."
            }
        },
        auth: {
            welcome: "Witaj ponownie",
            registerTitle: "Utwórz konto",
            welcomeDesc: "Zaloguj się, aby kontynuować",
            registerDesc: "Dołącz do ekipy Stammtisch",
            email: "Adres E-mail",
            password: "Hasło",
            loginBtn: "Zaloguj się",
            registerBtn: "Zarejestruj się",
            or: "Lub",
            toggleLogin: "Masz już konto? Zaloguj się",
            toggleRegister: "Nie masz konta? Zarejestruj się",
            errors: {
                invalid: "Nieprawidłowy e-mail lub hasło.",
                emailInUse: "Ten e-mail jest już zajęty.",
                weakPass: "Hasło musi mieć min. 6 znaków.",
                default: "Wystąpił błąd."
            }
        },
        stats: {
            season: "Sezon",
            loading: "Ładowanie Rankingu...",
            matrixTitle: "Macierz Punktów",
            matrixLoading: "Ładowanie Macierzy..."
        },
        members: {
            countLabel: "Członkowie"
        },
        options: {
            language: "Język",
            languageDesc: "Wybierz preferowany język interfejsu.",
            data: "Zarządzanie Danymi",
            dataDesc: "Zarządzaj danymi aplikacji i resetuj ustawienia.",
            resetTitle: "Strefa Niebezpieczeństwa",
            resetDesc: "To narzędzie usuwa wszystkie dane aplikacji. Użyj go, aby wyczyścić dane testowe.",
            resetBtn: "USUŃ WSZYSTKO",
            resetConfirm: "JESTEŚ PEWIEN? To usunie WSZYSTKIE dane. Tego nie można cofnąć.",
            resetProcessing: "Przetwarzanie...",
            resetSuccess: "Reset zakończony!"
        },
        common: {
            loading: "Ładowanie..."
        },
        kniffel: {
            sheetCount: "Arkusze",
            addSheet: "Dodaj Nowy Arkusz Gry",
            selectMonth: "Wybierz Miesiąc",
            createSheet: "Utwórz Arkusz",
            cancel: "Anuluj",
            noSheets: "Brak arkuszy gry. Utwórz jeden, aby zacząć śledzić!",
            createdOn: "Utworzono",
            delete: "Usuń",
            confirmDelete: "Czy na pewno chcesz usunąć ten arkusz gry?",
            sort: "Sortuj",
            sortScoreHigh: "Wynik (Wysoki→Niski)",
            sortScoreLow: "Wynik (Niski→Wysoki)",
            sortAlphabet: "Alfabet (A→Z)",
            sortManual: "Oryginalna Kolejność",
            stroke: "Skreślenie",
            strokeConfirm: "Oznaczyć jako skreślenie (0 punktów)?",
            penalty: "Utwórz Karę",
            penaltyConfirm: "Utwórz karę 1€ dla",
            penaltyReason: "Strich",
            upperSection: "Górna Sekcja",
            lowerSection: "Dolna Sekcja",
            ones: "Jedynki",
            twos: "Dwójki",
            threes: "Trójki",
            fours: "Czwórki",
            fives: "Piątki",
            sixes: "Szóstki",
            upperSum: "Suma",
            bonus: "Bonus (jeśli ≥63)",
            threeOfAKind: "Trójka",
            fourOfAKind: "Kareta",
            fullHouse: "Full",
            smallStraight: "Mały Strit",
            largeStraight: "Duży Strit",
            kniffelRow: "Kniffel",
            chance: "Szansa",
            lowerSum: "Suma Dolna",
            total: "Wynik Końcowy",
            months: ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"],
            // Player Selection Modal
            selectPlayers: "Wybierz Graczy",
            selectPlayersDesc: "Wybierz, kto zagra",
            playersSelected: "graczy wybrano",
            playerSelected: "gracz wybrany",
            selectAll: "Wybierz Wszystkich",
            deselectAll: "Odznacz Wszystkich",
            createGame: "Utwórz Grę",
            minPlayersError: "Wybierz co najmniej 2 graczy",
            selectionOrder: "Kolejność wyboru określa kolejność kolumn",
            // Guest Players
            addGuest: "Dodaj Gościa",
            guestNamePlaceholder: "Wprowadź imię gościa...",
            guestBadge: "GOŚĆ",
            guestLabel: "Gość",
            guestAdded: "Gość dodany pomyślnie",
            guestNameTooShort: "Imię gościa musi mieć co najmniej 2 znaki",
            removeGuest: "Usuń gościa",
            hostMember: "Przyprowadzony przez",
            selectHostMember: "Wybierz gospodarza",
            hostMemberRequired: "Proszę wybrać, kto przyprowadził tego gościa",
            // Drag and Drop Reordering
            reorderColumns: "Zmień kolejność kolumn",
            reorderMode: "Tryb zmiany kolejności",
            dragToReorder: "Przeciągnij, aby zmienić kolejność",
            orderSaved: "Kolejność kolumn zapisana",
            selectedPlayers: "Wybrani Gracze",
            dragToReorderPlayers: "Przeciągnij, aby zmienić kolejność graczy",
            enterFullscreen: "Włącz pełny ekran",
            exitFullscreen: "Wyłącz pełny ekran",
            fullscreenMode: "Tryb pełnoekranowy",
            // Dice Count Entry Modal
            howManyDice: "Ile {field} wyrzucono?",
            points: "Punkty",
            selectDiceCount: "Wybierz liczbę",
            enter: "Wprowadź"
        }
    }
};


