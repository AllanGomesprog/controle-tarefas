import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, validateReceipt, taskToDb, MAX_RECEIPT_SIZE } from '../src/lib/workspaceApi.js';

test('erros devolvidos pelo Supabase não são tratados como sucesso', async () => {
  await assert.rejects(checked(Promise.resolve({data:null,error:{message:'Sem permissão'}})),/Sem permissão/);
  assert.deepEqual(await checked(Promise.resolve({data:[],error:null})),[]);
});

test('upload rejeita tipo não permitido e arquivo acima do limite', () => {
  assert.throws(()=>validateReceipt({type:'text/html',size:20}),/PDF/);
  assert.throws(()=>validateReceipt({type:'application/pdf',size:MAX_RECEIPT_SIZE+1}),/10 MB/);
  assert.doesNotThrow(()=>validateReceipt({type:'application/pdf',size:100}));
});

test('tarefas não podem enviar vencimento inexistente ou responsável vazio', () => {
  const task={id:'t',title:'Rotina',assignee:'Pessoa',dueDate:'2026-09-17',competencia:'09/2026'};
  assert.throws(()=>taskToDb({...task,dueDate:'2026-09-31'}),/data de vencimento válida/);
  assert.throws(()=>taskToDb({...task,assignee:''}),/responsável/);
  assert.equal(taskToDb(task).competencia,'09/2026');
});
