export const formatDayMonthYear = (value?: string | number | Date | null): string => {
  if (!value) return "";

  if (value instanceof Date) {
    return formatDateParts(value.getDate(), value.getMonth() + 1, value.getFullYear());
  }

  const text = String(value).trim();
  if (!text) return "";

  const isoMatch = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    return formatDateParts(Number(isoMatch[3]), Number(isoMatch[2]), Number(isoMatch[1]));
  }

  const slashMatch = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);

    if (first > 12) return formatDateParts(first, second, year);
    return formatDateParts(second, first, year);
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateParts(parsed.getDate(), parsed.getMonth() + 1, parsed.getFullYear());
  }

  return text;
};

export const getTodayDayMonthYear = (): string => formatDayMonthYear(new Date());

const formatDateParts = (day: number, month: number, year: number): string => {
  if (!day || !month || !year) return "";
  return `${day}/${month}/${year}`;
};
