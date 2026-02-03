export function eventReminderTemplate(
    eventName: string,
    eventDate: string,
    eventTime: string,
    daysUntil: number,
    eventUrl: string
): { subject: string; html: string; text: string } {
    const timeframe = daysUntil === 1 ? 'Morgen' : 'In einer Woche';

    return {
        subject: `${timeframe}: ${eventName}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #e11d48;">🗓️ ${timeframe}: ${eventName}</h2>
                <p><strong>Datum:</strong> ${eventDate}</p>
                <p><strong>Uhrzeit:</strong> ${eventTime}</p>
                <a href="${eventUrl}" style="display: inline-block; background: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
                    Details ansehen
                </a>
                <p style="color: #666; margin-top: 32px; font-size: 12px;">
                    Diese E-Mail wurde automatisch vom Stammtisch Dashboard gesendet.
                </p>
            </div>
        `,
        text: `${timeframe}: ${eventName}\nDatum: ${eventDate}\nUhrzeit: ${eventTime}\nDetails: ${eventUrl}`
    };
}

export function votingReminderTemplate(
    monthName: string,
    votingUrl: string
): { subject: string; html: string; text: string } {
    return {
        subject: `Abstimmung für ${monthName} noch offen`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #e11d48;">🗳️ Deine Stimme fehlt noch!</h2>
                <p>Du hast noch nicht für den Stammtisch-Termin im <strong>${monthName}</strong> abgestimmt.</p>
                <a href="${votingUrl}" style="display: inline-block; background: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
                    Jetzt abstimmen
                </a>
                <p style="color: #666; margin-top: 32px; font-size: 12px;">
                    Diese E-Mail wurde automatisch vom Stammtisch Dashboard gesendet.
                </p>
            </div>
        `,
        text: `Abstimmung für ${monthName} noch offen\n\nDu hast noch nicht für den Stammtisch-Termin im ${monthName} abgestimmt.\n\nJetzt abstimmen: ${votingUrl}`
    };
}

export function monthlyOverviewTemplate(
    monthName: string,
    year: number,
    events: Array<{ name: string; date: string; time: string }>,
    dashboardUrl: string
): { subject: string; html: string; text: string } {
    const eventListHtml = events.length > 0
        ? events.map(e => `<li><strong>${e.date}</strong> - ${e.name} (${e.time})</li>`).join('')
        : '<li>Keine Events eingetragen</li>';

    const eventListText = events.length > 0
        ? events.map(e => `• ${e.date} - ${e.name} (${e.time})`).join('\n')
        : 'Keine Events eingetragen';

    return {
        subject: `Deine Events im ${monthName} ${year}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #e11d48;">📆 Events im ${monthName} ${year}</h2>
                <p>Hier ist deine Übersicht für diesen Monat:</p>
                <ul style="line-height: 1.8;">
                    ${eventListHtml}
                </ul>
                <a href="${dashboardUrl}" style="display: inline-block; background: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
                    Zum Dashboard
                </a>
                <p style="color: #666; margin-top: 32px; font-size: 12px;">
                    Diese E-Mail wurde automatisch vom Stammtisch Dashboard gesendet.
                </p>
            </div>
        `,
        text: `Events im ${monthName} ${year}\n\n${eventListText}\n\nZum Dashboard: ${dashboardUrl}`
    };
}
