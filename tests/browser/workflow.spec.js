import { test, expect } from '@playwright/test';

const members = [
  { id: 'm1', name: 'Gestor Teste', email: 'gestor@example.test', role: 'Gestor' },
  { id: 'm2', name: 'Analista Teste', email: 'analista@example.test', role: 'Analista' },
];
const userId = '11111111-1111-4111-8111-111111111111';
const jwt = email => [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'), Buffer.from(JSON.stringify({ sub:userId, role:'authenticated',email,exp:Math.floor(Date.now()/1000)+3600 })).toString('base64url'),'test'].join('.');

async function mockApi(context, state) {
  await context.routeWebSocket(/controle-test\.supabase\.co/, () => {});
  await context.route('https://controle-test.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const send = (data,status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
    if (url.pathname.endsWith('/token')) {
      const {email,password} = request.postDataJSON();
      if (password !== 'senha-teste-correta') return send({message:'Invalid login credentials',error_code:'invalid_credentials'},400);
      return send({ access_token:jwt(email),refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user:{id:userId,email,role:'authenticated',aud:'authenticated'} });
    }
    if (url.pathname.endsWith('/logout')) return send({});
    if (url.pathname.endsWith('/user')) return send({id:userId,email:'gestor@example.test'});
    if (url.pathname.endsWith('/rpc/save_task')) {
      const { p_task: task, p_next: next } = request.postDataJSON();
      state.writes++;
      if (state.failSave) return send({message:'Falha simulada no banco',code:'TEST'},400);
      state.tasks = [ {...task,version:(task.version || 0)+1}, ...state.tasks.filter(t=>t.id!==task.id) ];
      if (next) state.tasks.push({...next,version:1});
      return send(task.id);
    }
    const table = url.pathname.split('/').at(-1);
    if (request.method() === 'GET') {
      let email='';
      try { email=JSON.parse(Buffer.from(request.headers().authorization.split('.')[1],'base64url').toString()).email; } catch { /* No authenticated identity. */ }
      if (!members.some(m=>m.email===email)) return send([]);
      return send({ team_members:members,tasks:state.tasks,companies:state.companies || [],task_catalog:[],audit_logs:state.logs || [] }[table] || []);
    }
    return send({});
  });
}

async function login(page,email='gestor@example.test') {
  await page.goto('/');
  await page.getByLabel('E-mail',{exact:true}).fill(email);
  await page.getByLabel('Senha',{exact:true}).fill('senha-teste-correta');
  await page.getByRole('button',{name:'Acessar o sistema'}).click();
}

test('login real, gravação confirmada, falha visível e data mantida', async ({page,context}) => {
  const state={tasks:[],writes:0,failSave:false};
  await mockApi(context,state);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('controle_session',JSON.stringify({name:'Gestor falso',role:'Gestor'})));
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Acessar o sistema'})).toBeVisible();
  await page.getByLabel('E-mail',{exact:true}).fill('gestor@example.test');
  await page.getByLabel('Senha',{exact:true}).fill('errada');
  await page.getByRole('button',{name:'Acessar o sistema'}).click();
  await expect(page.getByRole('alert')).toContainText('E-mail ou senha inválidos');
  await page.getByLabel('Senha',{exact:true}).fill('senha-teste-correta');
  await page.getByRole('button',{name:'Acessar o sistema'}).click();
  await expect(page.getByRole('heading',{name:'Visão geral',exact:true})).toBeVisible();
  await page.locator('nav').getByRole('button',{name:'Tarefas & Recibos'}).click();
  await page.getByRole('button',{name:"Nova Tarefa",exact:true}).click();
  const form=page.locator('.modal-content form');
  await form.locator('input[type=text]').first().fill('Rotina do escritório');
  await form.locator('input[type=date]').fill('2026-09-17');
  state.failSave=true;
  await form.locator('button[type=submit]').click();
  await expect(page.getByRole('alert')).toContainText('Falha simulada no banco');
  await expect(form).toBeVisible();
  expect(state.tasks).toHaveLength(0);
  state.failSave=false;
  await form.locator('button[type=submit]').click();
  await expect(page.locator('.modal-content form')).toHaveCount(0);
  await expect(page.getByText('Rotina do escritório',{exact:true})).toBeVisible();
  expect(state.tasks[0].due_date).toBe('2026-09-17');
  expect(state.tasks[0].competencia).toBe('09/2026');
  await expect(page.getByText(/Vence em/).first()).toContainText('17');
  await page.reload();
  await expect(page.getByRole('heading',{name:'Visão geral',exact:true})).toBeVisible();
  expect(state.writes).toBe(2);
  expect(errors).toEqual([]);
});

test('colaborador não recebe controles de gestão nem exclusão', async ({page,context}) => {
  await mockApi(context,{tasks:[],writes:0});
  await login(page,'analista@example.test');
  await expect(page.getByRole('heading',{name:'Visão geral',exact:true})).toBeVisible();
  await expect(page.locator('nav').getByRole('button',{name:'Equipe',exact:true})).toHaveCount(0);
});

test('conta autenticada sem cadastro não entra na base do escritório', async ({page,context}) => {
  await mockApi(context,{tasks:[],writes:0});
  await login(page,'fora@example.test');
  await expect(page.getByRole('status')).toContainText('não está autorizado');
  await expect(page.locator('nav')).toHaveCount(0);
});

test('design aprovado: filtros, detalhes, gravação e navegação responsiva', async ({page,context}) => {
  await page.clock.setFixedTime(new Date('2026-09-17T12:00:00-03:00'));
  const state={writes:0,failSave:false,tasks:[
    {id:'t1',title:'Apuração do Simples Nacional',client:'Empresa de teste',assignee:'Gestor Teste',due_date:'2026-09-16',competencia:'09/2026',priority:'Alta',status:'Pendente',version:1,checklist:[{text:'Conferir documentos',done:false}]},
    {id:'t2',title:'Conferência da folha',client:'Cliente de teste',assignee:'Analista Teste',due_date:'2026-09-17',competencia:'09/2026',priority:'Média',status:'Em Andamento',version:1,checklist:[]},
    {id:'t3',title:'Entrega finalizada',client:'Empresa de teste',assignee:'Gestor Teste',due_date:'2026-09-15',competencia:'09/2026',priority:'Média',status:'Concluído',version:1,checklist:[]},
    {id:'t4',title:'Conciliação bancária',client:'Empresa de teste',assignee:'Analista Teste',due_date:'2026-09-22',competencia:'09/2026',priority:'Média',status:'Pendente',version:1,checklist:[]},
  ],companies:[{id:'c1',name:'Empresa de teste',razao_social:'Empresa de teste',nome_fantasia:'Empresa de teste',cnpj:'12.345.678/0001-90',regime:'Simples Nacional',status:'Ativa'}],logs:[{id:'l1',user_name:'Gestor Teste',action:'Concluiu uma tarefa',details:'Entrega finalizada',timestamp:'2026-09-17T12:00:00Z'}]};
  await mockApi(context,state);
  await page.setViewportSize({width:1440,height:1100});
  await page.emulateMedia({reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await login(page);
  await expect(page.getByRole('heading',{name:'Visão geral',exact:true})).toBeVisible();
  await page.getByRole('radio',{name:'Claro',exact:true}).click();
  const panel=page.getByRole('region',{name:'Prioridades da equipe'});
  await expect(panel.locator('tbody tr')).toHaveCount(3);
  await expect(page.locator('.stat-alert > strong')).toHaveText('1');
  await expect(page.getByRole('progressbar')).toHaveAttribute('value','25');
  await page.screenshot({path:'test-results/design-desktop.png',fullPage:true,animations:'disabled'});
  await panel.getByRole('button',{name:'Para hoje',exact:true}).click();
  await expect(panel.locator('tbody tr')).toHaveCount(1);
  await expect(panel.getByText('Conferência da folha')).toBeVisible();
  await panel.getByRole('button',{name:'Em atraso',exact:true}).click();
  await expect(panel.locator('tbody tr')).toHaveCount(1);
  await panel.getByRole('button',{name:/Apuração do Simples Nacional/}).click();
  const drawer=page.getByRole('dialog',{name:'Apuração do Simples Nacional'});
  await expect(drawer).toBeVisible();
  state.failSave=true;
  await drawer.getByLabel('Conferir documentos').click();
  await expect(drawer.getByRole('alert')).toContainText('Falha simulada');
  await expect(drawer.getByLabel('Conferir documentos')).not.toBeChecked();
  state.failSave=false;
  await drawer.getByLabel('Conferir documentos').click();
  await expect(drawer.getByLabel('Status da tarefa')).toHaveValue('Em Andamento');
  await page.screenshot({path:'test-results/design-drawer.png',fullPage:true,animations:'disabled'});
  await drawer.getByRole('button',{name:'Concluir tarefa',exact:true}).click();
  await expect(drawer.getByLabel('Status da tarefa')).toHaveValue('Concluído');
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(page.locator('.stat-alert > strong')).toHaveText('0');
  await panel.getByRole('button',{name:'Todas',exact:true}).click();
  await panel.getByRole('textbox',{name:'Buscar prioridades'}).fill('folha');
  await expect(panel.locator('tbody tr')).toHaveCount(1);
  await panel.getByRole('textbox',{name:'Buscar prioridades'}).fill('');
  await page.getByLabel('Competência',{exact:true}).selectOption('10/2026');
  await expect(panel.getByText('Nenhuma tarefa neste filtro')).toBeVisible();
  await page.getByLabel('Competência',{exact:true}).selectOption('Todos');
  await page.getByRole('radio',{name:'Escuro',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.screenshot({path:'test-results/design-dark.png',fullPage:true,animations:'disabled'});
  await page.getByRole('radio',{name:'Claro',exact:true}).click();
  for (const width of [390,320]) {
    await page.setViewportSize({width,height:844});
    await expect(page.getByRole('heading',{name:'Visão geral',exact:true})).toBeVisible();
    expect(await page.locator('.content-body').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await page.screenshot({path:`test-results/design-mobile-${width}.png`,fullPage:true,animations:'disabled'});
  }
  await page.getByRole('button',{name:'Nova tarefa',exact:true}).click();
  await expect(page.locator('.modal-content form')).toBeVisible();
  expect(await page.locator('.modal-content').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.locator('.modal-content').getByRole('button',{name:'Cancelar',exact:true}).click();
  for (const name of ['Empresas & Clientes','Catálogo de rotinas','Atrelar às Empresas','Equipe','Histórico & Auditoria','Calendário','Tarefas & Recibos']) {
    await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();
    expect(await page.locator('.content-body').evaluate(el=>el.scrollWidth<=el.clientWidth),name).toBe(true);
    await page.screenshot({path:`test-results/mobile-${name.replace(/[^a-z]/gi,'')}.png`});
  }
});

test('demonstração isolada permite explorar sem autenticação e descarta alterações', async ({page}) => {
  const requests=[];
  page.on('request',request=>{if(request.url().includes('supabase.co')) requests.push(request.url());});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/demo.html');
  await expect(page.getByText('Demonstração visual',{exact:true})).toBeVisible();
  const panel=page.getByRole('region',{name:'Prioridades da equipe'});
  await panel.getByRole('button',{name:/Apuração do Simples Nacional/}).click();
  const drawer=page.getByRole('dialog',{name:'Apuração do Simples Nacional'});
  await drawer.getByRole('button',{name:'Concluir tarefa',exact:true}).click();
  await expect(drawer.getByLabel('Status da tarefa')).toHaveValue('Concluído');
  await page.keyboard.press('Escape');
  await page.reload();
  await panel.getByRole('button',{name:/Apuração do Simples Nacional/}).click();
  await expect(drawer.getByLabel('Status da tarefa')).toHaveValue('Pendente');
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});
  for(const name of ['Empresas & Clientes','Catálogo de rotinas','Atrelar às Empresas','Equipe','Histórico & Auditoria','Calendário','Tarefas & Recibos']) {
    await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();
    expect(await page.locator('.content-body').evaluate(el=>el.scrollWidth<=el.clientWidth),name).toBe(true);
  }
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
  await page.getByRole('button',{name:'Sair do sistema'}).click();
  await expect(page.getByRole('button',{name:'Acessar o sistema'})).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
});
