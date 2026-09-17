# Análise técnica — Controle de Tarefas

> Diagnóstico histórico do código original. As correções posteriores e a ativação do acesso estão descritas em [ACESSO_E_IMPLANTACAO.md](ACESSO_E_IMPLANTACAO.md).

Data: 17/09/2026. Repositório: https://github.com/AllanGomesprog/controle-tarefas. Commit analisado: `c43f20b`.

## Parecer

O projeto tem uma base funcional de interface para gestão de rotinas contábeis, mas precisa corrigir autenticação, políticas de acesso, persistência e datas antes de receber dados reais em um ambiente compartilhado. O build passar não comprova o funcionamento da integração com o banco.

## Estrutura e funcionalidades

- Aplicação React 19 com Vite 8, JavaScript, CSS e ícones Lucide.
- Dashboard, lista de tarefas, agrupamento por competência, calendário, checklists, recibos, cadastro de empresas, equipe, catálogo e geração de tarefas em lote.
- Estado e operações centralizados em `src/App.jsx`; interfaces divididas em componentes; utilitários de competência e recorrência separados.
- Persistência local em `localStorage` e integração opcional direta com Supabase. Não há servidor próprio no repositório.
- Quatro tabelas no SQL: empresas, tarefas, equipe e auditoria. O catálogo permanece exclusivamente no navegador.
- Consulta cadastral de CNPJ via BrasilAPI. A interface usa a expressão Receita Federal, mas a requisição é feita à BrasilAPI.
- Tema claro/escuro persistente. Arquivos de configuração de exemplo e lockfile disponíveis.

## Achados prioritários

### 1. Crítico — O login não autentica o usuário

**Local:** `src/components/LoginScreen.jsx:12` e `src/App.jsx:210`.

A senha é verificada apenas quanto a estar preenchida. O nome é comparado por correspondência parcial; nomes desconhecidos também entram. Os botões de demonstração permitem assumir qualquer membro, inclusive o gestor. A sessão é um objeto em `localStorage` e não existe integração com Supabase Auth nem verificação de permissões nas operações.

**Reprodução:** executar o handler com nome `Alan` e senha `senha-incorreta` produz sessão com papel `Gestor`.

**Correção:** autenticação real, sessão validada e autorização no banco; restringir os acessos de demonstração a um ambiente próprio.

### 2. Crítico — Políticas de banco permitem acesso público irrestrito

**Local:** `supabase_schema.sql:92`.

As quatro políticas são `FOR ALL USING (true) WITH CHECK (true)`, sem restrição de usuário ou organização. Com os grants usuais da API Supabase, aplicar esse esquema permite consultar, inserir, alterar e excluir dados usando a chave pública, sem passar pela tela de login. Isso inclui recibos e registros de auditoria.

**Correção:** políticas para usuários autenticados e escopo por organização/carteira, conforme a regra do produto. A chave pública no frontend é esperada; a proteção deve estar nas políticas e permissões.

Referência: [documentação de RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

### 3. Alto — O SQL fornecido não corresponde aos campos enviados

**Local:** `src/App.jsx:156` e `supabase_schema.sql:23`.

O mapeamento envia `competencia` e `competencia_label`, mas essas colunas não existem no CREATE TABLE nem nas migrações fornecidas. Uma instalação nova seguindo esse SQL não suporta as gravações de tarefas feitas pelo frontend.

**Validação:** comparação programática entre as chaves do mapper e o SQL confirmou os dois campos ausentes.

**Correção:** adicionar migração, atualizar o esquema inicial e verificar criação, edição e leitura de tarefas em banco de teste.

### 4. Alto — Falhas de gravação não são tratadas e não existe sincronização offline pendente

**Local:** `src/App.jsx:452`, `src/App.jsx:526`, `src/App.jsx:587` e demais operações de escrita.

As chamadas de gravação usam `try/catch`, mas ignoram o campo `error` devolvido pelo cliente Supabase. A interface altera o estado local antes da confirmação. Assim, uma operação pode parecer concluída sem ter sido salva no servidor.

Quando `dbStatus` não é `connected`, as mudanças são somente locais. Não há fila de reenvio. Ao recarregar, uma lista remota não vazia substitui a lista local, podendo descartar mudanças pendentes. Uma lista remota vazia é ignorada, mantendo dados antigos no navegador (`src/App.jsx:332`).

**Reprodução:** com o cliente Supabase instalado e uma resposta HTTP 400 simulada, a promessa retorna `error`, sem executar o `catch`. Nenhuma requisição real foi feita nesse teste.

**Correção:** verificar `{ error }` ou usar `throwOnError()`, indicar falhas ao usuário, definir rollback/retry e uma estratégia explícita para alterações offline e conflitos.

Referência: [inserção com retorno de erro no Supabase](https://supabase.com/docs/reference/javascript/insert).

### 5. Alto — Datas aparecem no dia anterior no fuso brasileiro

**Local:** `src/components/CalendarView.jsx:88`, `src/components/TaskList.jsx:383`, `src/components/Dashboard.jsx:74` e `src/utils/competence.js`.

O código converte datas sem horário usando `new Date('YYYY-MM-DD')` e depois usa operações locais. Essa combinação desloca o dia no fuso de São Paulo. Afeta exibição, localização no calendário e alguns cálculos de prazo.

**Reprodução:** `2026-09-17` é exibido como `16/09/2026` com `TZ=America/Sao_Paulo`.

**Correção:** tratar datas civis separadamente de timestamps, construindo a data pelos componentes locais ou usando strings normalizadas; cobrir o fuso brasileiro nos testes.

### 6. Alto — Competência, título e frequência da recorrência divergem

**Local:** `src/utils/recurrence.js:95` e `src/components/AutomationTemplates.jsx:257`.

O vencimento respeita a frequência, mas a competência sempre avança um mês. O título é atualizado pelo mês do vencimento, que pode ser diferente do mês de competência. A geração em lote também força recorrência mensal e ativa, mesmo quando o catálogo define outra frequência ou uma rotina sem recorrência.

**Reprodução:** tarefa trimestral de competência `08/2026`, vencimento `2026-09-10` e título `Rotina - Agosto / 2026` gera vencimento `2026-12-10`, competência `09/2026` e título `Rotina - Dezembro / 2026`. No caso mensal, o mesmo exemplo gera competência `09/2026`, mas título de outubro.

**Correção:** avançar a competência pela frequência, preservar a relação entre competência e vencimento e gerar o título pela competência. Honrar as propriedades do catálogo.

### 7. Médio — Geração em lote pode duplicar tarefas e criar datas inexistentes

**Local:** `src/components/AutomationTemplates.jsx:168` e `src/components/AutomationTemplates.jsx:216`.

A tela identifica tarefas já geradas, mas a geração não exclui essas empresas nem bloqueia a repetição. Clicar novamente cria outro conjunto. O vencimento é montado concatenando ano, mês e dia, permitindo datas como `2026-09-31`. Os seletores de período também estão fixos em meses de 2026.

**Correção:** tornar a geração idempotente com uma chave de negócio no banco, validar o dia pelo mês e gerar opções de competência dinamicamente.

### 8. Médio — A auditoria não garante autoria nem integridade

**Local:** `src/App.jsx:421` e `src/App.jsx:677`.

O IP é fixo (`192.168.1.88`), o autor vem da sessão local e a aplicação oferece limpeza de logs. As políticas públicas também permitem alterar/excluir registros. O login chama o registro antes de o novo estado de sessão ser refletido, podendo atribuir a entrada ao usuário anterior/padrão.

**Correção:** registrar eventos no servidor/banco, associar à identidade autenticada, coletar metadados reais quando disponíveis e restringir alterações no histórico. As alegações de rastreabilidade da interface excedem as garantias implementadas.

### 9. Médio — Recibos podem esgotar o armazenamento local

**Local:** `src/components/TaskList.jsx:276` e `src/App.jsx:271`.

Arquivos são convertidos para base64, armazenados dentro das tarefas e copiados integralmente para `localStorage`, sem limite de tamanho ou tratamento de falha na persistência. O volume cresce rapidamente; ao atingir a quota do navegador, novas alterações podem não persistir e a aplicação pode apresentar erro.

**Correção:** armazenar arquivos em storage privado com regras de acesso, persistir metadados e referências e validar tamanho/tipo. Tratar leitura e gravação no armazenamento local.

### 10. Médio — Operações dependem de efeitos dentro do atualizador de estado

**Local:** `src/App.jsx:471`, `src/App.jsx:615` e `src/App.jsx:761`.

Variáveis como `updatedTask`, `autoNextRecurringTask` e `updated` são preenchidas dentro de callbacks de `setState` e consultadas logo após a chamada. Isso pressupõe que React já executou o callback, o que não é garantido. Há também gravação de auditoria dentro de um atualizador de estado, que deve ser puro e pode ser repetido em desenvolvimento com StrictMode.

**Impacto potencial:** atualização local sem a escrita correspondente ou registros duplicados. Achado por inspeção; não foi reproduzido em navegador nesta análise.

**Correção:** separar cálculo de estado e efeitos externos, com operações de persistência explícitas e idempotentes.

## Outros pontos de manutenção

- A criação pela lista/calendário salva um modelo no catálogo, descartando o vencimento escolhido nesse fluxo (`TaskList.jsx:203`). Rever se esse comportamento corresponde à experiência pretendida.
- O catálogo não é sincronizado com o Supabase, portanto não acompanha a equipe entre dispositivos.
- Ao renomear um membro, responsáveis de tarefas e empresas mudam somente no estado local; essas alterações não são gravadas nas respectivas tabelas (`App.jsx:773`). Preferir relações por ID em vez de nome.
- A consulta de CNPJ classifica toda empresa não MEI/não Simples como Lucro Presumido (`CompanyManagement.jsx:131`). O código não preserva a possibilidade de outro regime; usar confirmação manual quando a resposta não o determina.
- O calendário contém obrigações e dias fixos. Não foi feita revisão normativa/fiscal; essas regras precisam de validação específica antes de serem apresentadas como agenda oficial.
- O README informa Node 18+, mas o Vite instalado exige `^20.19.0 || >=22.12.0`.
- Não há script de testes nem suíte automatizada no repositório analisado. O lint reporta 48 avisos de código não utilizado.
- `App.jsx` concentra sessão, persistência, auditoria, regras de negócio e navegação. Extrair serviços/hooks por domínio facilitaria testes e a correção dos problemas acima.

## Verificações realizadas e limites

- Clone completo para `C:\Users\mazco\Documents\controle`.
- Dependências instaladas pelo `package-lock.json`, com scripts de instalação desativados. Como npm não estava no PATH, foi usado `pnpm --package=npm dlx npm ci --ignore-scripts --no-audit --no-fund`.
- Node `24.19.0`; build via `node node_modules/vite/bin/vite.js build`: aprovado (Vite instalado `8.1.3`).
- Lint via `node node_modules/oxlint/bin/oxlint`: zero erros, 48 avisos.
- Provas pontuais em Node: login sem validação de senha, erro Supabase simulado, campos ausentes no SQL, conversão de datas e recorrências mensal/trimestral/anual.
- O ajuste de fim de mês do utilitário de recorrência funcionou para janeiro de 2026 dia 31 → fevereiro dia 28.
- Não foram fornecidas credenciais de banco. Não foi criado/alterado banco remoto nem validada uma instalação Supabase real.
- Não houve teste visual/interativo em navegador nem auditoria normativa ou de vulnerabilidades das dependências.
- Código da aplicação e lockfile preservados. Foram adicionados este relatório e artefatos locais ignorados pelo Git (`node_modules` e `dist`).

## Sequência sugerida de trabalho

1. Implementar autenticação e políticas de acesso.
2. Alinhar SQL e frontend, tratar erros e definir a sincronização.
3. Corrigir datas, competências, recorrências e duplicidade em lote.
4. Separar recibos em storage e reforçar a auditoria.
5. Criar testes dos fluxos críticos e dividir as responsabilidades de `App.jsx`.
