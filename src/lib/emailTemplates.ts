import { Event } from "@/types";

interface EmailContent {
    subject: string;
    text: string;
    html: string;
}

export function getEventReminderEmail(event: Event, daysUntil: number): EmailContent {
    const subject = `Erinnerung: ${event.title} in ${daysUntil} Tagen`;
    const dateStr = new Date(event.date).toLocaleDateString("de-DE", {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const text = `Hallo,\n\nnicht vergessen: ${event.title} findet am ${dateStr} statt.\n\nOrt: ${event.location}\n\nBis dann!`;

    const html = `
    <div style="font-family: sans-serif; color: #333;">
        <h1>Bald ist Stammtisch! 🍻</h1>
        <p>Hallo,</p>
        <p>nicht vergessen: <strong>${event.title}</strong> findet bald statt.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;">📅 <strong>Datum:</strong> ${dateStr}</p>
            <p style="margin: 5px 0;">📍 <strong>Ort:</strong> ${event.location}</p>
        </div>
        <p>Bis dann!</p>
    </div>
    `;

    return { subject, text, html };
}

export function getVotingReminderEmail(monthName: string): EmailContent {
    const subject = `Abstimmung für ${monthName}`;
    const text = `Hallo,\n\ndu hast noch nicht für den Stammtisch im ${monthName} abgestimmt. Bitte hole das bald nach!`;

    const html = `
    <div style="font-family: sans-serif; color: #333;">
        <h1>Deine Stimme zählt! 🗳️</h1>
        <p>Hallo,</p>
        <p>du hast noch nicht für den Stammtisch im <strong>${monthName}</strong> abgestimmt.</p>
        <p>Bitte logge dich ein und gib deine Stimme ab, damit wir einen Termin finden können.</p>
        <p><a href="https://stammtisch-app-url.com" style="background: #e11d48; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Zur App</a></p>
    </div>
    `;

    return { subject, text, html };
}

export function getMonthlyOverviewEmail(events: Event[], monthName: string): EmailContent {
    const subject = `Stammtisch Übersicht für ${monthName}`;
    const text = `Hallo,\n\nhier ist die Übersicht für ${monthName}:\n\n` +
        events.map(e => `- ${e.title}: ${new Date(e.date).toLocaleDateString("de-DE")}`).join("\n");

    const html = `
    <div style="font-family: sans-serif; color: #333;">
        <h1>Monatsübersicht ${monthName} 📅</h1>
        <p>Hallo,</p>
        <p>hier ist was im ${monthName} ansteht:</p>
        <ul>
            ${events.map(e => `
                <li>
                    <strong>${e.title}</strong><br>
                    ${new Date(e.date).toLocaleDateString("de-DE", { weekday: 'long', day: 'numeric', month: 'long' })}
                </li>
            `).join('')}
        </ul>
    </div>
    `;

    return { subject, text, html };
}
