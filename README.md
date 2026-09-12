# 📊 Controle de Tarefas - Sistema de Gestão Fiscal e Contábil

Sistema web moderno e completo para gestão operacional, controle de obrigações tributárias e rotinas contábeis de escritórios de contabilidade e BPO financeiro.

---

## 🚀 Sobre o Projeto

O **Controle de Tarefas** foi desenvolvido para atender às demandas reais de escritórios contábeis brasileiros, proporcionando controle absoluto sobre prazos fiscais, apurações tributárias, fechamentos de folha e transmissão de obrigações acessórias, eliminando riscos de multas por atraso e garantindo conformidade fiscal aos clientes.

---

## ✨ Principais Funcionalidades

### 📅 1. Visualização e Gestão por Competência Contábil
* **Modos de Exibição:**
  * **📋 Lista Geral:** Visualização tradicional corrida com filtros avançados e indicação clara da competência em cada cartão.
  * **🗓️ Por Competência:** Agrupamento modular por mês/ano contábil (ex: `09/2026`, `08/2026`, `10/2026`).
* **Painel de Fechamento Mensal:** Cada competência exibe contadores de tarefas (Concluídas, Em Andamento, Pendentes e Críticas) e uma **Barra de Progresso do Fechamento** (% de entregas realizadas).
* **Filtro Rápido:** Seleção instantânea de qualquer período contábil no topo da tela.

### 🔁 2. Tarefas Recorrentes e Automação Mensal
* **Rotinas com Vencimento Fixo:** Definição de tarefas que se repetem automaticamente (ex: Simples Nacional todo dia 10, SPED Fiscal todo dia 15, FGTS Digital dia 07).
* **Renovação Automática:** Ao concluir uma obrigação ou anexar seu recibo, o sistema calcula e gera automaticamente o ciclo do próximo mês.
* **Avanço Manual:** Botão de ação rápida `🔁 Próximo Mês` para renovar obrigações adiantadas com 1 clique.

### 📎 3. Registro e Anexo de Recibos de Entrega
* **Comprovação de Envio:** Modal específico para registrar o **Número de Protocolo Oficial**, a **Data de Transmissão** e realizar o **Upload do Recibo** (PDF ou imagem gerados pelo e-CAC, PVA do SPED ou conectividade social).
* **Download Direto:** Download e visualização do comprovante anexado direto no cartão da tarefa.
* **Status Visual:** Selo verde destacando tarefas com recibo transmitido e comprovado.

### 🏢 4. Cadastro de Empresas Desacoplado & Consulta CNPJ na Receita Federal
* **Consulta Automática via CNPJ:** Digite o CNPJ da empresa e clique em "Consultar CNPJ" para puxar em tempo real:
  * Razão Social e Nome Fantasia oficiais
  * Regime Tributário (*Simples Nacional*, *Lucro Presumido*, *Lucro Real*, *MEI*)
  * Situação Cadastral na Receita (*Ativa / Inativa*)
* **Cadastro 100% Livre:** Cadastro de empresas desacoplado das tarefas, garantindo organização limpa da carteira de clientes.

### ⚙️ 5. Central de Vínculo de Tarefas às Empresas em Massa
* **Atrelamento Inteligente:** Tela dedicada para selecionar uma tarefa (do catálogo ou criada na hora) e vinculá-la em lote a dezenas de empresas clientes com 1 clique.
* **Filtros por Regime:** Filtre empresas por regime tributário e selecione todas as optantes com facilidade.
* **Detecção de Competência:** O sistema avisa visualmente quais empresas já possuem a guia gerada para aquele mês e quais ainda estão pendentes.

### 👥 6. Gestão de Equipe & Carteira de Clientes
* **Controle de Colaboradores:** Cadastro, edição e exclusão segura de membros da equipe com cargos (*Gestor, Coordenador, Analista, Assistente*).
* **Gestão de Carteira:** Atribuição em massa de empresas para cada responsável, com visualização de clientes sob responsabilidade de cada analista.

### 📊 7. Painel de Controle (Dashboard Operacional)
* **Abertura Direta de Tarefas:** Clique em qualquer obrigação da tabela de **Prazos Críticos** para abrir seu modal detalhado, atualizar status, interagir com o checklist e baixar recibos.
* **Filtro de Competência no Dashboard:** Selecione uma competência específica para auditar os números e prazos daquele mês de apuração.
* **Alertas de Atraso:** Alertas coloridos com contagem regressiva de dias restantes ou dias de atraso.

### 🌓 8. Tema Claro e Escuro (Dark / Light Mode)
* Alternância instantânea com paleta equilibrada para alto contraste diurno ou conforto visual noturno, com persistência automática no navegador.

### 🔐 9. Autenticação & Trilha de Auditoria
* Tela de login com controle de sessão e logout.
* Histórico de auditoria detalhado registrando autor, ação, data/hora e IP de cada alteração no sistema.

---

## 🛠️ Tecnologias Utilizadas

* **[React 19](https://react.dev/):** Biblioteca para interfaces de usuário modernas e reativas.
* **[Vite](https://vite.dev/):** Build tool de alta velocidade e servidor de desenvolvimento.
* **[Lucide React](https://lucide.dev/):** Ícones modernos e consistentes.
* **[Supabase](https://supabase.com/):** Integração para persistência em nuvem (com suporte híbrido para armazenamento local offline).
* **CSS Moderno / Design System:** Variáveis HSL, efeitos de vidro fosco (*glassmorphism*), responsividade e temas claro/escuro.

---

## 📦 Como Instalar e Rodar o Projeto Localmente

### Pré-requisitos
* **Node.js** (versão 18 ou superior)
* **npm** ou **yarn**

### 1. Clonar o Repositório
```bash
git clone https://github.com/AllanGomesprog/controle-tarefas.git
cd controle-tarefas
```

### 2. Instalar as Dependências
```bash
npm install
```

### 3. Executar o Servidor de Desenvolvimento
```bash
npm run dev
```
O sistema estará acessível em:  
👉 **http://localhost:5173/**

### 4. Gerar Build de Produção
```bash
npm run build
```

---

## 📁 Estrutura de Pastas

```
controle-tarefas/
├── public/                 # Imagens públicas, ícones e logo
├── src/
│   ├── assets/             # Recursos visuais e componentes de estilo
│   ├── components/
│   │   ├── AuditLog.jsx            # Histórico e trilha de auditoria
│   │   ├── AutomationTemplates.jsx # Vínculo de tarefas às empresas em massa
│   │   ├── CalendarView.jsx        # Calendário mensal de tributos
│   │   ├── CompanyManagement.jsx   # Gestão de empresas e consulta CNPJ
│   │   ├── Dashboard.jsx           # Dashboard com prazos críticos e KPIs
│   │   ├── LoginScreen.jsx         # Tela de autenticação e sessão
│   │   ├── Logo.jsx                # Componente de logo do sistema
│   │   ├── TaskCatalog.jsx         # Cadastro e catálogo de rotinas
│   │   ├── TaskList.jsx            # Minhas Tarefas (Lista Geral e por Competência)
│   │   └── TeamManagement.jsx      # Gestão da equipe e carteira de empresas
│   ├── lib/
│   │   └── supabaseClient.js       # Conexão e configuração do Supabase
│   ├── utils/
│   │   ├── competence.js           # Utilitários contábeis de competência (MM/AAAA)
│   │   └── recurrence.js           # Cálculo de recorrência e datas fixas
│   ├── App.jsx                     # Componente raiz e orquestrador de estado
│   ├── index.css                   # Design System e variáveis de tema
│   └── main.jsx                    # Ponto de entrada da aplicação
├── .gitignore              # Arquivos ignorados pelo Git
├── index.html              # HTML base da aplicação
├── package.json            # Scripts e dependências do projeto
└── vite.config.js          # Configuração do Vite
```

---

## 📄 Licença

Este projeto é de uso restrito e confidencial. Todos os direitos reservados.
