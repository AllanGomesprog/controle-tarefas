import { supabase } from './supabaseClient.js';
import { newId, parseLocalDate } from '../utils/dates.js';
import { taskCycleKey } from '../utils/tasks.js';

export async function checked(request) {
  const { data, error } = await request;
  if (error) throw new Error(error.message || 'Não foi possível salvar no servidor.');
  return data;
}

export function taskFromDb(row) {
  return {
    id: row.id, title: row.title, client: row.client, companyId: row.company_id || '',
    assignee: row.assignee, dueDate: row.due_date, competencia: row.competencia || '',
    competenciaLabel: row.competencia_label || '', priority: row.priority,
    description: row.description || '', status: row.status, checklist: row.checklist || [],
    type: row.type || 'custom', receiptProtocol: row.receipt_protocol || '',
    receiptDate: row.receipt_date || '', receiptFileName: row.receipt_file_name || '',
    receiptFileData: row.receipt_file_data || '', receiptPath: row.receipt_path || '',
    hasReceipt: Boolean(row.receipt_protocol || row.receipt_file_name),
    isRecurring: Boolean(row.is_recurring), recurrenceFrequency: row.recurrence_frequency || 'Mensal',
    recurrenceDay: row.recurrence_day, version: row.version,
  };
}

export function taskToDb(task) {
  if (!task.title?.trim() || !task.assignee?.trim() || Number.isNaN(parseLocalDate(task.dueDate).getTime())) {
    throw new Error('Preencha título, responsável e uma data de vencimento válida.');
  }
  return {
    id: task.id, title: task.title.trim(), client: task.client || '', company_id: task.companyId || null,
    assignee: task.assignee, due_date: task.dueDate, competencia: task.competencia,
    competencia_label: task.competenciaLabel, priority: task.priority || 'Média',
    description: task.description || '', status: task.status || 'Pendente', checklist: task.checklist || [],
    type: task.type || 'custom', receipt_protocol: task.receiptProtocol || null,
    receipt_date: task.receiptDate || null, receipt_file_name: task.receiptFileName || null,
    receipt_file_data: task.receiptFileData || null, receipt_path: task.receiptPath || null,
    is_recurring: Boolean(task.isRecurring), recurrence_frequency: task.recurrenceFrequency || 'Mensal',
    recurrence_day: task.recurrenceDay || null, cycle_key: taskCycleKey(task), version: task.version || 0,
  };
}

export const companyToDb = c => ({
  id: c.id, name: c.name || c.razaoSocial, razao_social: c.razaoSocial,
  nome_fantasia: c.nomeFantasia, cnpj: c.cnpj, regime: c.regime,
  default_assignee: c.defaultAssignee || null, status: c.status, notes: c.notes || '',
});

export async function loadWorkspace() {
  // Paginate instead of silently dropping records beyond the API row limit.
  async function all(table, order = 'id') {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const page = await checked(supabase.from(table).select('*').order(order).range(offset, offset + 499));
      rows.push(...page);
      if (page.length < 500) return rows;
    }
  }
  const [tasks, companies, team, catalog, logs] = await Promise.all([
    all('tasks'), all('companies'), all('team_members'), all('task_catalog'),
    checked(supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200)),
  ]);
  return {
    tasks: tasks.map(taskFromDb), team, taskCatalog: catalog.map(r => ({ ...r.data, id: r.id })),
    companies: companies.map(c => ({ ...c, razaoSocial: c.razao_social, nomeFantasia: c.nome_fantasia, defaultAssignee: c.default_assignee || '' })),
    logs: logs.map(l => ({ ...l, user: l.user_name, userAgent: l.user_agent, details: l.details || '' })),
  };
}

export const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;
export function validateReceipt(file) {
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) throw new Error('Selecione um PDF, JPG ou PNG.');
  if (file.size > MAX_RECEIPT_SIZE) throw new Error('O recibo deve ter no máximo 10 MB.');
}

export async function saveTask(task, nextTask = null) {
  if (task.receiptFile) {
    validateReceipt(task.receiptFile);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Sua sessão expirou. Entre novamente.');
    const uploadedPath = `${user.id}/${task.id}/${newId()}`;
    await checked(supabase.storage.from('receipts').upload(uploadedPath, task.receiptFile, { contentType: task.receiptFile.type }));
    task = { ...task, receiptPath: uploadedPath, receiptFileData: '', receiptFileName: task.receiptFile.name };
  }
  return await checked(supabase.rpc('save_task', { p_task: taskToDb(task), p_next: nextTask ? taskToDb(nextTask) : null }));
}

export async function downloadReceipt(task) {
  try {
    let url = task.receiptFileData;
    if (task.receiptPath) {
      const blob = await checked(supabase.storage.from('receipts').download(task.receiptPath));
      url = URL.createObjectURL(blob);
    }
    if (!url) throw new Error('Esta tarefa tem apenas o protocolo, sem arquivo anexado.');
    const link = document.createElement('a');
    link.href = url;
    link.download = task.receiptFileName || 'recibo.pdf';
    link.click();
    if (url.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { window.alert(error.message); }
}
