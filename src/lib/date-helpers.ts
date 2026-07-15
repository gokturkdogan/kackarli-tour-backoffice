export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatScheduleLabel(start: Date, end?: Date | null): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  };
  const startLabel = new Date(start).toLocaleDateString("tr-TR", opts);

  if (!end) return startLabel;

  const endDate = new Date(end);
  const sameDay =
    start.getFullYear() === endDate.getFullYear() &&
    start.getMonth() === endDate.getMonth() &&
    start.getDate() === endDate.getDate();

  if (sameDay) return startLabel;

  const endLabel = endDate.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatScheduleShort(start: Date): { day: string; month: string; weekday: string } {
  const d = new Date(start);
  return {
    day: d.toLocaleDateString("tr-TR", { day: "numeric" }),
    month: d.toLocaleDateString("tr-TR", { month: "short" }),
    weekday: d.toLocaleDateString("tr-TR", { weekday: "short" }),
  };
}

export function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function eachDayInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = parseDateOnly(start);
  const last = parseDateOnly(end);

  if (current > last) return dates;

  while (current <= last) {
    dates.push(toDateInputValue(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function formatDateLabel(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
