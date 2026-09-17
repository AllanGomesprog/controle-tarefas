import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLocalDate, dateInMonth, localDateString } from '../src/utils/dates.js';
import { calculateNextRecurrenceDate, createNextCycleTask } from '../src/utils/recurrence.js';
import { getNextCompetencia } from '../src/utils/competence.js';
import { taskCycleKey, uniqueNewTasks } from '../src/utils/tasks.js';

test('datas civis permanecem no mesmo dia em São Paulo', () => {
  process.env.TZ = 'America/Sao_Paulo';
  assert.equal(localDateString(parseLocalDate('2026-09-17')), '2026-09-17');
  assert.equal(parseLocalDate('2026-09-17').getDate(), 17);
  assert.ok(Number.isNaN(parseLocalDate('2026-02-31').getTime()));
  assert.equal(dateInMonth(2026, 9, 31), '2026-09-30');
  assert.equal(dateInMonth(2028, 2, 31), '2028-02-29');
});

test('recorrência preserva intervalo de competência e vencimento e limpa recibos', () => {
  const base = { title: 'Rotina - Agosto / 2026', companyId:'c1', dueDate:'2026-09-10', competencia:'08/2026', recurrenceDay:10, version:7, receiptPath:'old/file', checklist:[{text:'Enviar',done:true}] };
  for (const [frequency, comp, due, title] of [
    ['Mensal','09/2026','2026-10-10','Setembro'], ['Trimestral','11/2026','2026-12-10','Novembro'], ['Anual','08/2027','2027-09-10','Agosto'],
  ]) {
    const next = createNextCycleTask({ ...base, recurrenceFrequency: frequency });
    assert.equal(next.competencia,comp); assert.equal(next.dueDate,due);
    assert.ok(next.title.includes(title)); assert.equal(next.version,0);
    assert.equal(next.receiptPath,''); assert.equal(next.checklist[0].done,false);
  }
  assert.equal(getNextCompetencia('12/2026',3),'03/2027');
  assert.equal(calculateNextRecurrenceDate('2026-01-31',31),'2026-02-28');
});

test('duplicidade é determinada por empresa, rotina e competência', () => {
  const task = { title:'Rotina - Setembro / 2026', companyId:'c1', competencia:'09/2026' };
  assert.equal(taskCycleKey(task),taskCycleKey({...task,title:'Rotina - 09/2026'}));
  assert.equal(uniqueNewTasks([task,task],[]).length,1);
  assert.equal(uniqueNewTasks([task],[task]).length,0);
  assert.equal(uniqueNewTasks([{...task,companyId:'c2'}],[task]).length,1);
});
