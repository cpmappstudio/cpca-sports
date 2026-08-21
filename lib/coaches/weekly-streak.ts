function mondayUtc(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}

export function calculateWeeklyStreak(activityDates: string[], today: string) {
  const weeks = new Set(activityDates.map(mondayUtc));
  const cursor = new Date(`${mondayUtc(today)}T00:00:00.000Z`);
  let streak = 0;
  while (weeks.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }
  return streak;
}
