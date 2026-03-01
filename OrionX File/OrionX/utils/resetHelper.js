const DEFAULT_RESET_HOUR = 17;
const DEFAULT_RESET_MINUTE = 0;

export function getResetConfig() {
  const hourRaw = parseInt(process.env.RESET_HOUR ?? "", 10);
  const minuteRaw = parseInt(process.env.RESET_MINUTE ?? "", 10);

  const hour =
    Number.isFinite(hourRaw) && hourRaw >= 0 && hourRaw <= 23
      ? hourRaw
      : DEFAULT_RESET_HOUR;
  const minute =
    Number.isFinite(minuteRaw) && minuteRaw >= 0 && minuteRaw <= 59
      ? minuteRaw
      : DEFAULT_RESET_MINUTE;

  return { hour, minute };
}

export function getResetTimes(now = new Date()) {
  const { hour, minute } = getResetConfig();
  const resetToday = new Date(now);
  resetToday.setHours(hour, minute, 0, 0);

  let lastReset = resetToday;
  if (now < resetToday) {
    lastReset = new Date(resetToday);
    lastReset.setDate(resetToday.getDate() - 1);
  }

  const nextReset = new Date(lastReset);
  nextReset.setDate(lastReset.getDate() + 1);

  return { lastReset, nextReset };
}

export function isInCurrentResetWindow(date, now = new Date()) {
  if (!date) return false;
  const { lastReset } = getResetTimes(now);
  return new Date(date) >= lastReset;
}

export function getNextResetTimestamp(now = new Date()) {
  const { nextReset } = getResetTimes(now);
  return Math.floor(nextReset.getTime() / 1000);
}
