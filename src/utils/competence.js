import { parseLocalDate } from './dates.js';
// Utilitários de Competência Contábil

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Normaliza uma string de competência para o padrão contábil 'MM/AAAA'
 * @param {string} comp - Ex: '09/2026', 'Setembro / 2026', '2026-09'
 * @returns {string} - 'MM/AAAA' ou ''
 */
export function normalizeCompetencia(comp) {
  if (!comp || typeof comp !== 'string') return '';
  const trimmed = comp.trim();

  // Padrão MM/AAAA
  const regexNum = /\b(0[1-9]|1[0-2])\/(\d{4})\b/;
  const matchNum = trimmed.match(regexNum);
  if (matchNum) {
    return `${matchNum[1]}/${matchNum[2]}`;
  }

  // Padrão YYYY-MM
  const regexIso = /\b(\d{4})-(0[1-9]|1[0-2])\b/;
  const matchIso = trimmed.match(regexIso);
  if (matchIso) {
    return `${matchIso[2]}/${matchIso[1]}`;
  }

  // Padrão Nome do Mês / AAAA (ex: "Setembro / 2026" ou "Setembro/2026")
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const monthName = MONTH_NAMES[i];
    const regexText = new RegExp(`${monthName}\\s*(?:\\/|de)?\\s*(\\d{4})`, 'i');
    const matchText = trimmed.match(regexText);
    if (matchText) {
      const monthNum = String(i + 1).padStart(2, '0');
      const year = matchText[1];
      return `${monthNum}/${year}`;
    }
  }

  return '';
}

/**
 * Retorna o rótulo amigável da competência.
 * Ex: '09/2026' -> 'Setembro / 2026'
 * @param {string} comp - 'MM/AAAA'
 * @returns {string}
 */
export function formatCompetenciaLabel(comp) {
  const norm = normalizeCompetencia(comp);
  if (!norm) return comp || 'Competência Indefinida';

  const [monthStr, yearStr] = norm.split('/');
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthStr;
  return `${monthName} / ${yearStr}`;
}

/**
 * Extrai a competência de uma tarefa de forma resiliente:
 * 1. task.competencia
 * 2. task.title (busca por mês/ano)
 * 3. task.dueDate (mês/ano da data de vencimento)
 * @param {object} task 
 * @returns {string} - 'MM/AAAA'
 */
export function getTaskCompetencia(task) {
  if (!task) return getCurrentCompetencia();

  if (task.competencia) {
    const norm = normalizeCompetencia(task.competencia);
    if (norm) return norm;
  }

  if (task.title) {
    const normFromTitle = normalizeCompetencia(task.title);
    if (normFromTitle) return normFromTitle;
  }

  if (task.dueDate && typeof task.dueDate === 'string') {
    const parts = task.dueDate.split('-');
    if (parts.length >= 2) {
      const year = parts[0];
      const month = parts[1];
      return `${month}/${year}`;
    }
  }

  return getCurrentCompetencia();
}

/**
 * Retorna a competência do mês atual no formato 'MM/AAAA'
 * @returns {string}
 */
export function getCurrentCompetencia() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${m}/${y}`;
}

/**
 * Calcula a próxima competência a partir de uma competência atual.
 * Ex: '09/2026' -> '10/2026', '12/2026' -> '01/2027'
 * @param {string} comp - 'MM/AAAA'
 * @returns {string}
 */
export function getNextCompetencia(comp, months = 1) {
  const norm = normalizeCompetencia(comp) || getCurrentCompetencia();
  const [mStr, yStr] = norm.split('/');
  let m = parseInt(mStr, 10);
  let y = parseInt(yStr, 10);

  const index = m - 1 + months;
  y += Math.floor(index / 12);
  m = index % 12 + 1;

  return `${String(m).padStart(2, '0')}/${y}`;
}

/**
 * Extrai a lista de opções de competências únicas presentes nas tarefas,
 * acrescidas de competências recentes e futuras para filtros e formulários.
 * @param {Array} tasks 
 * @returns {Array<{ value: string, label: string }>}
 */
export function getCompetenciaOptions(tasks = []) {
  const set = new Set();

  // Competências das tarefas cadastradas
  tasks.forEach(t => {
    const comp = getTaskCompetencia(t);
    if (comp) set.add(comp);
  });

  // Garantir pelo menos os últimos 3 meses e próximos 3 meses
  const now = new Date();
  for (let offset = -4; offset <= 3; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    set.add(`${m}/${y}`);
  }

  // Ordenar decrescente (mais recente primeiro: ex 2026-10, 2026-09, 2026-08...)
  const sorted = Array.from(set).sort((a, b) => {
    const [ma, ya] = a.split('/').map(Number);
    const [mb, yb] = b.split('/').map(Number);
    if (yb !== ya) return yb - ya;
    return mb - ma;
  });

  return sorted.map(comp => ({
    value: comp,
    label: `${comp} (${formatCompetenciaLabel(comp)})`
  }));
}

/**
 * Agrupa uma lista de tarefas por competência contábil, ordenadas cronologicamente.
 * @param {Array} tasks 
 * @returns {Array<{ competencia: string, label: string, tasks: Array, stats: object }>}
 */
export function groupTasksByCompetencia(tasks = []) {
  const groupsMap = {};

  tasks.forEach(task => {
    const comp = getTaskCompetencia(task);
    if (!groupsMap[comp]) {
      groupsMap[comp] = [];
    }
    groupsMap[comp].push(task);
  });

  // Chaves ordenadas decrescente (competência mais recente no topo)
  const sortedKeys = Object.keys(groupsMap).sort((a, b) => {
    const [ma, ya] = a.split('/').map(Number);
    const [mb, yb] = b.split('/').map(Number);
    if (yb !== ya) return yb - ya;
    return mb - ma;
  });

  return sortedKeys.map(comp => {
    const compTasks = groupsMap[comp];
    const total = compTasks.length;
    const completed = compTasks.filter(t => t.status === 'Concluído').length;
    const inProgress = compTasks.filter(t => t.status === 'Em Andamento').length;
    const pending = compTasks.filter(t => t.status === 'Pendente').length;
    const withReceipt = compTasks.filter(t => Boolean(t.receiptProtocol || t.receiptFileName || t.hasReceipt)).length;

    // Prazos críticos (faltando <= 5 dias ou atrasadas e não concluídas)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const critical = compTasks.filter(t => {
      if (t.status === 'Concluído') return false;
      const due = parseLocalDate(t.dueDate);
      due.setHours(0, 0, 0, 0);
      const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      return diff <= 5;
    }).length;

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      competencia: comp,
      label: formatCompetenciaLabel(comp),
      tasks: compTasks,
      stats: {
        total,
        completed,
        inProgress,
        pending,
        critical,
        withReceipt,
        percentage
      }
    };
  });
}
