# Ativação do acesso da equipe

O código está preparado para acesso por IP, com contas individuais e dados compartilhados no Supabase. A publicação externa depende de um computador/servidor escolhido, IP acessível e configuração do Supabase. Nenhum serviço público, porta de roteador ou banco remoto foi alterado automaticamente.

## 1. Banco e primeiro gestor

Use um projeto Supabase exclusivo para este escritório. Todos os colaboradores autorizados compartilham as tarefas, empresas e catálogo do escritório; não há isolamento entre múltiplos escritórios no mesmo projeto.

1. Faça backup se o projeto já contém dados. Execute `supabase_schema.sql` inteiro no SQL Editor. A migração substitui as políticas públicas anteriores e preserva os registros existentes. Se houver e-mails/nomes de membros duplicados, corrija-os antes de reaplicar: os índices novos exigem unicidade. Duplicatas legadas de tarefas não são apagadas automaticamente.
2. Em Authentication, desative cadastro público e login anônimo. Crie uma conta com e-mail confirmado para o gestor. Use uma senha individual forte.
3. Autorize o mesmo e-mail na equipe pelo SQL Editor, substituindo os valores de exemplo:

```sql
insert into public.team_members (id, name, role, email)
values (gen_random_uuid()::text, 'Nome do gestor', 'Gestor', 'gestor@seu-escritorio.com.br');
```

Se o membro já existe, atualize seu cadastro em vez de inserir outro. Revise os membros de demonstração que possam ter vindo da versão antiga.

4. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com a URL e chave pública do projeto. Nunca use uma chave `service_role` no frontend.
5. Instale as dependências e gere a aplicação com Node 22.12+ ou 24+:

```sh
npm ci
npm test
npm run lint
npm run build
```

O `.env` é lido durante o build. Mudanças nessas configurações exigem um novo build. Sem configuração, a tela de login fica bloqueada e informa que o acesso ainda precisa ser ativado.

## 2. Colaboradores e permissões

- O gestor cadastra nome, cargo e e-mail real em **Equipe**.
- O administrador cria no Supabase Authentication a conta com esse mesmo e-mail e entrega a senha individual ao colaborador por um canal apropriado. O cadastro em Equipe sozinho não cria uma conta/senha de autenticação.
- O colaborador entra com e-mail e senha. Não há login rápido nem senha genérica.
- Membros podem consultar a base compartilhada, criar/editar tarefas, empresas e modelos, gerar lotes e anexar recibos.
- Somente o gestor pode administrar a equipe/carteiras e excluir tarefas, empresas ou modelos.
- A exclusão do membro na equipe revoga o acesso ao banco e aos recibos mesmo que o token de autenticação ainda não tenha expirado. A interface também revalida o acesso periodicamente.
- A aplicação não permite limpar/alterar a auditoria. Novas alterações são registradas por triggers com identidade e horário do servidor. IP não é inventado; registros antigos não ganham retroativamente essa garantia.
- A sessão fica na aba do navegador. Recuperação de senha é administrada pelo responsável no Supabase; não há fluxo de e-mail de recuperação implementado na aplicação.

## 3. Teste pelo IP da rede local

Após configurar o Supabase e executar o build:

```sh
npm run start:lan
```

O terminal mostra os endereços disponíveis, por exemplo `http://192.168.1.50:8080`. Outro computador na mesma rede usa esse endereço. O firewall do computador precisa permitir a porta TCP 8080 para a rede privada. Essa permissão não foi criada automaticamente.

Esse IP privado não é acessível diretamente pela internet. O modo HTTP é destinado ao teste na rede confiável; para acesso externo use a configuração HTTPS abaixo. Não publique o servidor de desenvolvimento Vite.

## 4. Acesso externo por IP com HTTPS

Escolha um servidor ligado continuamente, com IP público estável e entrada nas portas TCP 80 e 443. Em um computador do escritório, isso também exige encaminhamento no roteador e disponibilidade do provedor; conexões sob CGNAT não recebem conexões externas diretamente. Uma VPN é outra possibilidade para conectar os colaboradores à rede privada, mas não foi instalada.

Os arquivos `deploy/Caddyfile.bootstrap` e `deploy/Caddyfile` publicam somente o conteúdo de `dist`. Eles aceitam certificado emitido para o IP público, sem exigir domínio.

Procedimento para o administrador do servidor:

1. Instale Caddy e Certbot 5.4 ou superior. Copie a pasta `dist` para o servidor.
2. Defina `PUBLIC_IP` com o IP público real, `WEB_ROOT` com o caminho absoluto de `dist` e `ACME_ROOT` com uma pasta para os desafios de certificado. Configure essas variáveis também no serviço que iniciará o Caddy.
3. Inicie temporariamente o Caddy usando `deploy/Caddyfile.bootstrap`. Esse arquivo disponibiliza apenas o desafio ACME na porta 80; a aplicação ainda não é publicada.
4. No servidor Linux, emita o certificado com o IP real:

```sh
sudo certbot certonly --preferred-profile shortlived --webroot --webroot-path /var/www/acme --ip-address SEU_IP_PUBLICO
```

5. Defina `CERT_FILE` e `KEY_FILE` com os caminhos reais retornados pelo Certbot e dê ao serviço Caddy acesso de leitura aos arquivos necessários. Mantenha a chave privada protegida.
6. Valide e carregue `deploy/Caddyfile` no serviço Caddy. Configure inicialização automática do serviço, renovação automática do Certbot e um deploy hook que recarregue o Caddy após a renovação. Os certificados de IP têm duração curta; confirme a renovação com `certbot renew --dry-run`.
7. Abra `https://SEU_IP_PUBLICO` pelo celular com Wi-Fi desligado, valide o certificado e teste duas contas, incluindo gravação e visualização da mesma tarefa em dispositivos diferentes.

A emissão de certificados para IP e os parâmetros acima seguem a [documentação oficial do Let's Encrypt/Certbot](https://letsencrypt.org/2026/03/11/shorter-certs-certbot/). A configuração de certificados fornecidos ao Caddy segue sua [documentação de TLS](https://caddyserver.com/docs/caddyfile/directives/tls).

O servidor Node incluído também suporta HTTPS diretamente, por exemplo no PowerShell:

```powershell
$env:HOST = '0.0.0.0'
$env:PORT = '8443'
$env:TLS_CERT = 'C:\certificados\fullchain.pem'
$env:TLS_KEY = 'C:\certificados\privkey.pem'
node scripts/serve.mjs
```

Nesse caso o acesso é `https://SEU_IP_PUBLICO:8443`, com encaminhamento/firewall correspondentes. O certificado deve conter esse IP. O processo recarrega os arquivos de certificado a cada minuto e deve ser configurado como serviço para permanecer ligado. O Caddy fornece a opção convencional pela porta 443.

## 5. Persistência e migração de dados locais

- As alterações só são confirmadas após gravação no servidor. Sem conexão não há gravação local silenciosa: tente novamente quando a conexão voltar.
- A conclusão e a criação da próxima recorrência usam uma transação. A edição de uma versão antiga da tarefa é recusada para evitar sobrescrever o trabalho de outra pessoa.
- Recibos novos ficam no bucket privado `receipts`, com limite de 10 MB e formatos PDF/JPG/PNG. Arquivos antigos em base64 ainda podem ser baixados. Objetos substituídos/desvinculados não são apagados automaticamente; o administrador pode revisar e limpar arquivos sem referência após backup.
- Os antigos dados em `localStorage` não são apagados nem enviados automaticamente. Se houver dados reais locais, exporte-os e faça uma migração revisada antes de trocar de origem/endereço. Não limpe o navegador até concluir essa conferência.
- Faça backup do PostgreSQL e do storage e teste a restauração.

## Verificações incluídas

`npm test` executa testes de datas/recorrência, servidor HTTP e SQL em PostgreSQL em memória (PGlite), cobrindo acesso anônimo, usuário não autorizado, papéis, revogação, auditoria, duplicidade e transações. Os esquemas de autenticação e storage são simulados para testar o SQL da aplicação sem um projeto remoto.

O teste final no Supabase real e o acesso de fora da rede continuam necessários após escolher/configurar a hospedagem.
