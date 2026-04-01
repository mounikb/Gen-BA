const MONTH_MAP: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

export function toIsoDate(dateLabel: string): string {
  const match = dateLabel.match(/^([A-Z]{3})\s+(\d{1,2}),\s+(\d{4})$/);
  if (!match) {
    return "";
  }

  const [, month, day, year] = match;
  const monthNumber = MONTH_MAP[month] ?? "01";
  return `${year}-${monthNumber}-${day.padStart(2, "0")}`;
}
