import { Meeting } from '../types';

/**
 * Format a Date or date string + time string into an iCalendar UTC timestamp: YYYYMMDDTHHMMSSZ
 */
function formatDateToICS(dateStr: string, timeStr: string): string {
  // dateStr is 'YYYY-MM-DD', timeStr is 'HH:mm'
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  const d = new Date(year, month - 1, day, hours, minutes);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generate standard RFC 5545 .ics Calendar file content
 */
export function generateICSContent(meeting: Meeting): string {
  const dtStart = formatDateToICS(meeting.date, meeting.startTime);
  const dtEnd = formatDateToICS(meeting.date, meeting.endTime);
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `wj-offenbach-${meeting.id}-${Date.now()}@wj-offenbach.de`;

  const agendaText = meeting.agenda
    .map((item) => `${item.topNumber}: ${item.title} (${item.presenter}, ${item.durationMin} Min.)`)
    .join('\\n');

  const fullDescription = [
    `Wirtschaftsjunioren Offenbach am Main - ${meeting.title}`,
    `Ort / Format: ${meeting.location}`,
    `MS Teams Besprechungslink: ${meeting.teamsUrl}`,
    '',
    '=== TAGESORDNUNG (AGENDA) ===',
    agendaText,
    '',
    `Beschreibung: ${meeting.description}`,
    'Portal: Wirtschaftsjunioren Offenbach Vorstandsportal'
  ].join('\\n');

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wirtschaftsjunioren Offenbach am Main e.V.//Vorstandsportal//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:WJ Offenbach - ${meeting.title}`,
    `DESCRIPTION:${fullDescription}`,
    `LOCATION:${meeting.location}`,
    `URL:${meeting.teamsUrl}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Erinnerung: ${meeting.title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return icsLines.join('\r\n');
}

/**
 * Trigger immediate browser download of the .ics file
 */
export function downloadMeetingICS(meeting: Meeting) {
  const content = generateICSContent(meeting);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `WJ_Offenbach_${meeting.date}_${meeting.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Build a direct Google Calendar Web Link
 */
export function getGoogleCalendarUrl(meeting: Meeting): string {
  const dtStart = formatDateToICS(meeting.date, meeting.startTime);
  const dtEnd = formatDateToICS(meeting.date, meeting.endTime);

  const agendaText = meeting.agenda
    .map((item) => `${item.topNumber}: ${item.title} (${item.presenter})`)
    .join('\n');

  const details = `WJ Offenbach Vorstandssitzung\n\nMS Teams Link: ${meeting.teamsUrl}\n\nAgenda:\n${agendaText}\n\n${meeting.description}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `WJ Offenbach - ${meeting.title}`,
    dates: `${dtStart}/${dtEnd}`,
    details: details,
    location: meeting.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build a direct Outlook Web Calendar link
 */
export function getOutlookCalendarUrl(meeting: Meeting): string {
  const agendaText = meeting.agenda
    .map((item) => `${item.topNumber}: ${item.title}`)
    .join('\n');

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: `WJ Offenbach - ${meeting.title}`,
    startdt: `${meeting.date}T${meeting.startTime}:00`,
    enddt: `${meeting.date}T${meeting.endTime}:00`,
    body: `MS Teams Link: ${meeting.teamsUrl}\n\nAgenda:\n${agendaText}\n\n${meeting.description}`,
    location: meeting.location,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
