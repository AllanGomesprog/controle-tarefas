export function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return new Date(NaN);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date : new Date(NaN);
}

export function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateInMonth(year, month, day) {
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(lastDay, Math.max(1, Number(day) || 1))).padStart(2, '0')}`;
}

export const frequencyMonths = (frequency) => ({ Mensal: 1, Bimestral: 2, Trimestral: 3, Semestral: 6, Anual: 12 }[frequency] || 1);

export function newId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join('');
}
