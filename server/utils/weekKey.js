// Returns "YYYY-Www" for the ISO week of a date (default: now)
export function currentWeekKey(d = new Date()) {
  // Use UTC so server timezone doesn’t shift weeks
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // ISO: move to Thursday of this week
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3);

  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDay + 3);

  const week =
    1 +
    Math.round((date - firstThursday) / (7 * 24 * 3600 * 1000));

  const ww = String(week).padStart(2, '0');
  return `${date.getUTCFullYear()}-W${ww}`;
}
