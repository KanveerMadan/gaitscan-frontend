// Re-test reminders without email: the next due date from the last test, and a repeating calendar
// event (RFC 5545) the user adds to their own calendar.
const DAY = 86_400_000;

/** The date the next walking test is due: `weeks` after the last one; null without both. */
export function nextTestDue(lastIso, weeks) {
  if (!lastIso || !weeks) return null;
  const last = new Date(lastIso);
  const d = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate()));
  return new Date(d.getTime() + weeks * 7 * DAY);
}

const ymd = (d) => d.toISOString().slice(0, 10).replaceAll("-", "");

/** An all-day event on `due`, repeating every `weeks` weeks. */
export function calendarFile(due, weeks) {
  const stamp = `${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GaitScan//Re-test reminder//EN",
    "BEGIN:VEVENT",
    `UID:gaitscan-retest-${ymd(due)}-${weeks}w@gaitscan`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(due)}`,
    `DTEND;VALUE=DATE:${ymd(new Date(due.getTime() + DAY))}`,
    `RRULE:FREQ=WEEKLY;INTERVAL=${weeks}`,
    "SUMMARY:GaitScan walking test",
    "DESCRIPTION:Film 10-20 seconds of walking side-on and upload it to GaitScan.",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadCalendar(due, weeks) {
  const url = URL.createObjectURL(new Blob([calendarFile(due, weeks)], { type: "text/calendar" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "gaitscan-walking-test.ics" });
  a.click();
  URL.revokeObjectURL(url);
}

export const INTERVALS = [1, 2, 4, 8, 12];
