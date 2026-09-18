import { useState } from 'react';
import { localDateString, newId } from '../utils/dates.js';
import { getCurrentCompetencia } from '../utils/competence.js';
import { createNextCycleTask } from '../utils/recurrence.js';
import { uniqueNewTasks } from '../utils/tasks.js';

// Isolated from Supabase: all demo records and edits live only in React state.
function initialData() {
  const team = [
    { id:'demo-manager', name:'Marina Costa', email:'marina@example.test', role:'Gestor' },
    { id:'demo-analyst', name:'Rafael Lima', email:'rafael@example.test', role:'Analista' },
    { id:'demo-assistant', name:'Ana Martins', email:'ana@example.test', role:'Assistente' },
  ];
  const companies = ['Aurora Comércio', 'Horizonte Serviços', 'Café da Praça', 'Ateliê das Flores'].map((name,index) => ({
    id:`demo-company-${index}`,name,razaoSocial:`${name} — Exemplo`,nomeFantasia:name,
    cnpj:'00.000.000/0000-00',regime:index===1?'Lucro Presumido':'Simples Nacional',status:'Ativa',defaultAssignee:team[index%3].name,notes:'Empresa fictícia para demonstração.',
  }));
  const titles=['Apuração do Simples Nacional','Conferência da folha','Conciliação bancária','Revisão de documentos fiscais','Fechamento contábil','Conferência das retenções','Organização de recibos','Revisão das notas de entrada'];
  const offsets=[-2,0,2,4,5,-1,1,3];
  const tasks=titles.map((title,index)=>{
    const date=new Date(); date.setDate(date.getDate()+offsets[index]);
    const company=companies[index%4];
    return {id:`demo-task-${index}`,title,client:company.nomeFantasia,companyId:company.id,assignee:team[index%3].name,
      dueDate:localDateString(date),competencia:getCurrentCompetencia(),priority:index===0?'Alta':'Média',status:index>=5?'Concluído':index===1||index===3?'Em Andamento':'Pendente',
      description:'Exemplo de rotina para explorar a interface. Os prazos e documentos desta demonstração são fictícios.',
      checklist:[{text:'Conferir os documentos recebidos',done:index===1||index>=5},{text:'Revisar as informações',done:index>=5},{text:'Finalizar a entrega',done:index>=5}],
      type:'custom',isRecurring:false,hasReceipt:false,version:1};
  });
  const taskCatalog=tasks.slice(0,3).map((task,index)=>({id:`demo-catalog-${index}`,title:task.title,defaultAssignee:task.assignee,priority:task.priority,description:task.description,isRecurring:true,recurrenceFrequency:'Mensal',recurrenceDay:20,checklist:task.checklist.map(item=>({...item,done:false}))}));
  const logs=[{id:'demo-log',user:'Marina Costa',action:'Concluiu uma tarefa',details:'Revisão das notas de entrada — demonstração',timestamp:new Date().toISOString()}];
  return {tasks,companies,team,taskCatalog,logs};
}

export function useDemoWorkspace() {
  const [data,setData]=useState(initialData);
  const [error,setError]=useState('');
  function mutate(update) {
    setError('');
    setData(previous=>({...update(previous),logs:[{id:newId(),user:'Marina Costa',action:'Alteração na demonstração',details:'Simulação em memória; nenhum dado enviado ao banco.',timestamp:new Date().toISOString()},...previous.logs]}));
    return true;
  }
  const add=(key,fields)=>mutate(previous=>({...previous,[key]:[{...fields,id:newId()},...previous[key]]}));
  const edit=(key,id,fields)=>mutate(previous=>({...previous,[key]:previous[key].map(item=>item.id===id?{...item,...fields,id}:item)}));
  const remove=(key,id)=>mutate(previous=>({...previous,[key]:previous[key].filter(item=>item.id!==id)}));
  const session={id:'demo-manager',name:'Marina Costa',role:'Gestor',email:'marina@example.test'};
  return {...data,userSession:session,authUser:null,authReady:true,dbStatus:'connected',busy:false,canManage:true,error,
    dismissError:()=>setError(''),fetchSupabaseData:()=>true,handleLogin:()=>false,handleLogout:()=>{window.location.href='./';},
    handleAddTask:task=>add('tasks',task),
    handleUpdateTask:(id,fields)=>{
      if(fields.receiptFile) {setError('O envio de arquivos fica disponível após configurar o Supabase. Nesta demonstração, explore apenas o formulário.');return false;}
      return edit('tasks',id,fields);
    },
    handleDeleteTask:id=>remove('tasks',id),
    handleClearAllTasks:()=>window.confirm('Limpar as tarefas fictícias desta demonstração?')&&mutate(previous=>({...previous,tasks:[]})),
    handleRenewTask:task=>mutate(previous=>({...previous,tasks:[...previous.tasks,...uniqueNewTasks([createNextCycleTask(task)],previous.tasks)]})),
    handleTriggerAutomation:tasks=>mutate(previous=>({...previous,tasks:[...previous.tasks,...uniqueNewTasks(tasks,previous.tasks)]})),
    handleAddCompany:company=>add('companies',company),handleUpdateCompany:(id,fields)=>edit('companies',id,fields),handleDeleteCompany:id=>remove('companies',id),
    handleAddTaskToCatalog:task=>add('taskCatalog',task),handleUpdateCatalogTask:(id,fields)=>edit('taskCatalog',id,fields),handleDeleteCatalogTask:id=>remove('taskCatalog',id),
    handleAddTeamMember:member=>add('team',member),handleUpdateTeamMember:(id,fields)=>edit('team',id,fields),
    handleDeleteTeamMember:id=>{if(id===session.id){setError('O gestor da demonstração não pode ser removido.');return false;}return remove('team',id);},
    handleAssignCompaniesToUser:(name,ids)=>mutate(previous=>({...previous,companies:previous.companies.map(company=>({...company,defaultAssignee:ids.includes(company.id)?name:company.defaultAssignee===name?'':company.defaultAssignee}))})),
  };
}
