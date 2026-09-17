import { localDateString, frequencyMonths, newId } from './dates.js';
// Helper functions for recurring accounting tasks

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Calculates the next due date based on current due date, recurrence day, and frequency.
 * @param {string} currentDueDateStr - "YYYY-MM-DD"
 * @param {number} recurrenceDay - e.g. 10
 * @param {string} frequency - 'Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'
 * @returns {string} - "YYYY-MM-DD"
 */
export function calculateNextRecurrenceDate(currentDueDateStr, recurrenceDay = null, frequency = 'Mensal') {
  if (!currentDueDateStr) currentDueDateStr = localDateString();

  const [yearStr, monthStr, dayStr] = currentDueDateStr.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1; // 0-indexed month

  let monthsToAdd = 1;
  switch (frequency) {
    case 'Bimestral': monthsToAdd = 2; break;
    case 'Trimestral': monthsToAdd = 3; break;
    case 'Semestral': monthsToAdd = 6; break;
    case 'Anual': monthsToAdd = 12; break;
    case 'Mensal':
    default:
      monthsToAdd = 1;
      break;
  }

  let nextMonthIndex = month + monthsToAdd;
  year += Math.floor(nextMonthIndex / 12);
  nextMonthIndex = nextMonthIndex % 12;

  const targetDay = recurrenceDay ? parseInt(recurrenceDay, 10) : parseInt(dayStr, 10);
  
  // Clamp day to valid days in that target month (e.g. Feb 30 -> Feb 28/29)
  const maxDaysInTargetMonth = new Date(year, nextMonthIndex + 1, 0).getDate();
  const validDay = Math.min(Math.max(1, targetDay), maxDaysInTargetMonth);

  const formattedYear = year;
  const formattedMonth = String(nextMonthIndex + 1).padStart(2, '0');
  const formattedDay = String(validDay).padStart(2, '0');

  return `${formattedYear}-${formattedMonth}-${formattedDay}`;
}

/**
 * Updates a task title with the next competence month/year if present.
 * @param {string} title 
 * @param {string} nextDueDateStr 
 * @returns {string}
 */
export function formatNextRecurrenceTitle(title, nextDueDateStr) {
  if (!title || !nextDueDateStr) return title || 'Tarefa Recorrente';
  
  const [year, month] = nextDueDateStr.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  const nextMonthName = MONTH_NAMES[monthIdx];
  const nextCompetence = `${nextMonthName} / ${year}`;

  // Check if title has month name like "Setembro / 2026"
  for (const mName of MONTH_NAMES) {
    const regexFull = new RegExp(`${mName}\\s*\\/\\s*\\d{4}`, 'i');
    if (regexFull.test(title)) {
      return title.replace(regexFull, nextCompetence);
    }
  }

  // Check if title has "MM/YYYY" format like "09/2026"
  const regexNum = /\b(0[1-9]|1[0-2])\/\d{4}\b/;
  if (regexNum.test(title)) {
    return title.replace(regexNum, `${month}/${year}`);
  }

  return title;
}

import { getNextCompetencia, getTaskCompetencia, formatCompetenciaLabel } from './competence.js';

/**
 * Creates the next iteration of a recurring task with clean checklist and pending status.
 * @param {object} task - Existing task object
 * @returns {object} - New task for the next cycle
 */
export function createNextCycleTask(task) {
  const nextDueDate = calculateNextRecurrenceDate(
    task.dueDate, 
    task.recurrenceDay || null,
    task.recurrenceFrequency || 'Mensal'
  );



  const currentComp = getTaskCompetencia(task);
  const nextComp = getNextCompetencia(currentComp, frequencyMonths(task.recurrenceFrequency));
  const nextCompLabel = formatCompetenciaLabel(nextComp);
  const [month, year] = nextComp.split('/');
  const nextTitle = formatNextRecurrenceTitle(task.title, year + '-' + month + '-01');

  const cleanChecklist = Array.isArray(task.checklist)
    ? task.checklist.map(item => ({ text: item.text, done: false }))
    : [];

  return {
    ...task,
    id: newId(),
    version: 0,
    title: nextTitle,
    dueDate: nextDueDate,
    competencia: nextComp,
    competenciaLabel: nextCompLabel,
    status: 'Pendente',
    checklist: cleanChecklist,
    receiptProtocol: '',
    receiptDate: '',
    receiptFileName: '',
    receiptFileData: '',
    receiptPath: '',
    receiptFile: null,
    hasReceipt: false,
    createdAt: new Date().toISOString()
  };
}

