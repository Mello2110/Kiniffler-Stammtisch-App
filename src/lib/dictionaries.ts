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
            options: "Options"
        },
        headers: {
            dashboard: { title: "Stammtisch", highlight: "Dashboard", badge: "Overview", subtext: "Welcome back! Here is your overview of upcoming events, finances, and news." },
            events: { title: "Upcoming", highlight: "Meetups", badge: "Planning", subtext: "Don't miss a round. Vote for dates and plan the next meetup." },
            stats: { title: "Season", highlight: "Stats", badge: "Leaderboard", subtext: "The naked numbers. Who leads, who pays, who drinks? No excuses, just facts." },
            cash: { title: "Cash", highlight: "Flow", badge: "Treasury", subtext: "Transparency is everything. Balance, penalties, and expenses in detail." },
            members: { title: "Stammtisch", highlight: "Crew", badge: "Community", subtext: "Manage the heads behind the table. Only true originals allowed!" },
            hof: { title: "Hall of", highlight: "Fame", badge: "Legends", subtext: "Honoring the top contributors, payers, and hosts of our community." },
            options: { title: "App", highlight: "Options", badge: "Settings", subtext: "Customize your experience and manage data." }
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
            options: "Optionen"
        },
        headers: {
            dashboard: { title: "Stammtisch", highlight: "Dashboard", badge: "Übersicht", subtext: "Willkommen zurück! Hier ist dein Überblick über anstehende Events, Finanzen und aktuelle News." },
            events: { title: "Anstehende", highlight: "Treffen", badge: "Planung", subtext: "Verpasse keine Runde. Stimme für Termine ab und plane das nächste Treffen." },
            stats: { title: "Saison", highlight: "Statistik", badge: "Bestenliste", subtext: "Die nackten Zahlen. Wer führt, wer zahlt, wer trinkt? Keine Ausreden, nur Fakten." },
            cash: { title: "Cash", highlight: "Flow", badge: "Kasse", subtext: "Transparenz ist alles. Guthaben, Strafen und Ausgaben im Detail." },
            members: { title: "Stammtisch", highlight: "Crew", badge: "Community", subtext: "Verwalte die Köpfe hinter dem Tisch. Nur echte Originale erlaubt!" },
            hof: { title: "Hall of", highlight: "Fame", badge: "Legenden", subtext: "Ehre, wem Ehre gebührt. Hier feiern wir die Top-Performer." },
            options: { title: "App", highlight: "Optionen", badge: "Einstellungen", subtext: "Passe deine Erfahrung an und verwalte Daten." }
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
            options: "Opcje"
        },
        headers: {
            dashboard: { title: "Pulpit", highlight: "Stammtisch", badge: "Przegląd", subtext: "Witaj ponownie! Oto przegląd nadchodzących wydarzeń, finansów i aktualności." },
            events: { title: "Nadchodzące", highlight: "Spotkania", badge: "Planowanie", subtext: "Nie przegap kolejki. Głosuj na terminy i planuj kolejne spotkanie." },
            stats: { title: "Statystyki", highlight: "Sezonu", badge: "Ranking", subtext: "Nagie liczby. Kto prowadzi, kto płaci, kto pije? Żadnych wymówek, tylko fakty." },
            cash: { title: "Przepływ", highlight: "Gotówki", badge: "Skarbiec", subtext: "Przejrzystość to podstawa. Saldo, kary i wydatki w szczegółach." },
            members: { title: "Ekipa", highlight: "Stammtisch", badge: "Społeczność", subtext: "Zarządzaj głowami przy stole. Tylko prawdziwe oryginały!" },
            hof: { title: "Aleja", highlight: "Sław", badge: "Legendy", subtext: "Honorujemy najlepszych darczyńców, płatników i gospodarzy." },
            options: { title: "Opcje", highlight: "Aplikacji", badge: "Ustawienia", subtext: "Dostosuj swoje doświadczenie i zarządzaj danymi." }
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
        }
    }
};
