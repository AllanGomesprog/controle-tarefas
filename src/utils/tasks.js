import { getTaskCompetencia, MONTH_NAMES } from './competence.js';

export function taskCycleKey(task) {
  const months = MONTH_NAMES.join('|');
  const title = task.title.replace(new RegExp(`(?:${months})\\s*/\\s*\\d{4}|\\b(?:0[1-9]|1[0-2])/\\d{4}\\b`, 'gi'), '')
    .replace(/[\s\-/]+$/g, '').trim().toLocaleLowerCase('pt-BR');
  return JSON.stringify([task.companyId || task.client || '', title, getTaskCompetencia(task)]);
}

export function uniqueNewTasks(candidates, existing) {
  const seen = new Set(existing.map(taskCycleKey));
  return candidates.filter(task => {
    const key = taskCycleKey(task);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
