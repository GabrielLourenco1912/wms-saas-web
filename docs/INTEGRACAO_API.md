# Integração do painel web com a API WMS

Este documento explica o consumo da API pelo painel Next.js e os limites do seu escopo de gestão. A referência dos endpoints, DTOs, filtros e permissões é [API_CLIENTS.md](../../wms-saas-backend/docs/API_CLIENTS.md), consolidada no backend pelo commit `806b14b`.

## Ambiente e transporte

Configure `WMS_API_BASE_URL` no ambiente do servidor Next.js. O padrão é `http://localhost:8080`, sem `/api`. Em Docker, use o endereço alcançável pelo contêiner web, normalmente `http://backend:8080`, e injete a variável no serviço `web`. A configuração é lida em execução no servidor.

| Camada | Exemplo |
| --- | --- |
| Chamada do navegador | `GET /api/backend/products?page=0&size=20&q=cafe` |
| Proxy Next.js | `src/app/api/backend/[...path]/route.ts` |
| Chamada ao Spring | `GET <WMS_API_BASE_URL>/api/products?page=0&size=20&q=cafe` |

O navegador usa `credentials: include`, Bearer quando há access token e `Accept: application/json`. O proxy define `X-Client-Type: WEB`, encaminha `Authorization`, `Content-Type` e `Idempotency-Key`, aplica `Cache-Control: no-store` e preserva o status HTTP. Requisições de mutação exigem origem correspondente à origem do painel, incluindo protocolo, host e porta. Em uma implantação com proxy reverso, preserve Host e encaminhe X-Forwarded-Proto corretamente.

Respostas da API usam o envelope `{timestamp, status, message, data}`. A aplicação usa o status HTTP numérico para decidir o fluxo e extrai `data` na camada HTTP. Mensagens recebidas podem estar em português ou inglês. O proxy apresenta indisponibilidade ou timeout como 503; esse erro não confirma se um comando chegou a ser aplicado no backend.

## Autenticação e sessão

1. `POST /auth/login`, com `{email, password}`, retorna 202 e um desafio. O cliente mostra o e-mail mascarado, a validade e o limite de tentativas.
2. `POST /auth/challenge/verify`, com `{challengeId, code}`, confirma um código de seis dígitos enviado como string. O primeiro acesso pode usar `EMAIL_VERIFICATION`; os demais usam `MFA_LOGIN`.
3. O access token de `data.token` fica em memória. O navegador administra o refresh cookie `HttpOnly` recebido do backend. O proxy adapta seu `Path` de `/api/auth` para `/api/backend/auth`.
4. `GET /users/me` fornece identidade, perfil ativo e permissões para o painel.
5. Ao recarregar, `POST /auth/refresh` restaura a sessão usando o cookie e sem corpo. O novo refresh substitui o anterior.
6. `POST /auth/logout` revoga o refresh apresentado e expira o cookie. O cliente também limpa sua sessão local. Uma falha de comunicação no logout deve ser informada, pois o encerramento remoto pode não ter sido confirmado.

Os caminhos desta seção são relativos ao proxy `/api/backend`. No Spring, recebem o prefixo `/api`.

Requisições protegidas que recebem 401 tentam um refresh e uma repetição. Falhas de login, verificação e refresh são tratadas no próprio fluxo de autenticação. O 403 mantém a mensagem de falta de permissão, sem ciclo de renovação. Falhas transitórias na restauração da sessão permitem tentar novamente.

O cliente compartilha uma renovação em andamento na aba e usa Web Locks para serializar renovações, confirmação de login e logout entre abas quando disponível. BroadcastChannel sinaliza mudança de sessão ou logout sem transmitir tokens. Em navegadores sem Web Locks, a coordenação é limitada à aba: use uma única aba autenticada para evitar disputa pelo refresh rotativo. Mudanças de conta invalidam os dados e comandos pendentes da sessão anterior.

Não há inscrição pública de conta. Usuários são convidados pelo gestor com `USER_CREATE` e `USER_PROFILE_ASSIGN`. A recuperação usa `POST /auth/forgot-password` e `POST /auth/reset-password`; o desafio `PASSWORD_RESET` não passa pela confirmação de login. Após redefinir a senha, o usuário volta à entrada.

Em desenvolvimento HTTP, o backend deve emitir o cookie com `REFRESH_COOKIE_SECURE=false`. Em HTTPS, configure o cookie seguro. O proxy de mesma origem dispensa o navegador de acessar diretamente a origem interna do Spring.

## Consultas, pesquisa e seletores

| Uso | Contrato consumido | Comportamento do painel |
| --- | --- | --- |
| Lista | `GET /{resource}?page=0&size=20` | Vinte registros por padrão, com escolha de tamanho e navegação de páginas. |
| Pesquisa | `q` e filtros na coleção ou em `/search/{resource}` | Pesquisa no servidor; campos e status dependem do recurso. |
| Seletor | `GET /lookups/{resource}?page=0&size=5&q=...` | Cinco opções por página, com pesquisa e navegação. |
| Detalhe | `GET /{resource}/{id}` | Recarrega o registro escolhido quando o contrato oferece esse endpoint. |

Uma página contém `content`, `page`, `size`, `totalElements`, `totalPages`, `first` e `last`. A primeira página é zero. Pesquisas aceitam até 160 caracteres; a alteração da pesquisa ou dos filtros reinicia a navegação. Indicadores de quantidade usam `totalElements`, sem confundir a página atual com o total do recurso.

Os seletores conservam `{id, label}` e enviam o ID no formulário. Recursos cadastrais consultam registros ativos por padrão. Um vínculo existente pode aparecer no formulário mesmo quando seu cadastro foi inativado. Os campos não substituem IDs por nomes em payloads.

Embalagens são uma exceção de rota: a pesquisa global é `/search/product-packages`; a coleção de um produto é `/products/{productId}/packages`, usada também para criação. A edição usa `/products/{productId}/packages/{packageId}`. Não existem GET `/product-packages` ou GET de detalhe individual da embalagem.

## Fluxos do gestor

### Cadastros e acesso

| Tela | Endpoints principais no Spring | Permissões relevantes |
| --- | --- | --- |
| Armazéns, zonas e posições | `/api/warehouses`, `/api/zones`, `/api/positions` | `WAREHOUSE_VIEW`, `WAREHOUSE_CREATE`, `WAREHOUSE_EDIT` |
| Categorias, produtos e embalagens | `/api/categories`, `/api/products`, `/api/products/{id}/packages` | `PRODUCT_VIEW`, `PRODUCT_CREATE`, `PRODUCT_EDIT` |
| Parceiros | `/api/partners` | `ORDER_VIEW`, `ORDER_CREATE`, `ORDER_EDIT` |
| Usuários | `/api/users`, `/api/users/{id}` | `USER_VIEW`, `USER_CREATE`, `USER_EDIT`, `USER_PROFILE_ASSIGN` |
| Perfis e permissões | `/api/profiles`, `/api/profiles/{code}`, `/api/permissions` | `PROFILE_VIEW`, `PROFILE_EDIT` |

Cadastros são criados por POST e alterados por PUT com payload completo. A inativação usa `active: false` e preserva os vínculos e o histórico. O backend pode impedir mudanças em registros com vínculos operacionais, como conversão de embalagem e dados de rastreabilidade de produtos.

Contas têm estados próprios (`INVITED`, `ACTIVE`, `LOCKED`, `DISABLED`), em vez de um booleano `active`. O convite retorna um desafio para a nova conta e mantém a sessão do gestor. A edição de usuário não altera senha. Alterações de e-mail exigem confirmação conforme as regras da API.

A edição de perfil envia o conjunto completo de permissões. Filtrar a lista de permissões na interface preserva as seleções ocultas. Não há criação de novos perfis nem exclusão de contas na API atual.

### Entrada documental

`GET /api/pre-receipts` e o detalhe apresentam a expectativa documental e seus itens. O gestor cria manualmente por `POST /api/pre-receipts`, altera por PUT ou importa XML por `POST /api/pre-receipts/import`. Os comandos usam `Idempotency-Key` no header.

A importação envia JSON com os campos previstos no contrato, incluindo o conteúdo XML; não usa upload multipart. A validação e a interpretação do documento pertencem ao backend. A tela deve preservar o formulário e mostrar a rejeição recebida quando houver inconsistência de fornecedor, produto ou documento.

Criar ou importar um pré-recebimento não gera saldo físico. O acompanhamento de recebimento e putaway consulta os recursos correspondentes; a conferência e a movimentação física são feitas no mobile. Não existe endpoint adicional para “aprovar” ou “liberar” o pré-recebimento.

### Saída e acompanhamento de tarefas

O gestor cria e altera pedidos em `/api/orders`, acompanha seus itens e gera ondas por `POST /api/waves`. O backend executa a alocação e o FEFO; o painel apresenta o resultado da onda e consulta as tarefas relacionadas.

O painel cancela pedidos e ondas pelos respectivos endpoints `/cancel`, com motivo e chave de idempotência no JSON. A expedição é acompanhada em modo de consulta; o cancelamento específico de carga permanece disponível pela API e pelo fluxo móvel. Cada recurso exige sua permissão e obedece às restrições de estado do backend. O cancelamento de uma tarefa usa `/api/tasks/{id}/cancel`, com motivo e chave no header.

`GET /api/tasks`, o detalhe e `/api/tasks/{id}/history` oferecem acompanhamento e histórico paginado. A autorização de excesso usa `/api/tasks/{id}/authorize-excess`, nova quantidade alvo, motivo e chave no JSON, com `TASK_QUANTITY_OVERRIDE`. Não há endpoint de atribuição manual de tarefa na API atual.

Recebimentos, putaway, picking, divergências e expedições podem ser consultados de acordo com as permissões. A conclusão física dos processos fica no mobile. O painel não presume que gerar uma onda conclui o pedido nem que uma página de tarefas representa toda a operação.

### Estoque, bloqueios, transferências e auditoria

`GET /api/stock` e `/api/lpns` apresentam posição, produto, lote, validade e quantidades retornadas pelo servidor. O bloqueio pode atuar sobre saldo, posição ou lote. As ações usam os endpoints específicos de `/api/stock`, `/api/positions` e `/api/stock-blocks`, com motivo e `Idempotency-Key` no header. Bloquear e liberar exigem permissões distintas (`STOCK_BLOCK` e `STOCK_UNBLOCK`).

O planejamento de transferência usa `POST /api/transfers`, com LPN integral ou saldo específico, destino e quantidade conforme o contrato. A confirmação depende da conferência física de origem, destino, LPN e produto quando aplicável, feita no mobile. O web consulta a tarefa criada e seu estado; a criação da transferência não confirma a movimentação física.

O livro razão consulta `/api/stock-transactions` e seus detalhes com `AUDIT_VIEW`. Movimentos são imutáveis e a tela de auditoria é de leitura. Não há alteração ou exclusão de lançamentos pela interface.

O acompanhamento de inventários consulta `/api/inventories` e seu detalhe, incluindo quantidades teóricas, contagens e situação. A contagem física e a reconciliação pertencem ao fluxo operacional com as permissões e leituras exigidas pela API.

## Idempotência e precisão

Use `api.request` para os cadastros sem idempotência no contrato. Use `api.command` nos comandos previstos como idempotentes, informando `keyInBody: true` nos recursos de saída que recebem a chave no JSON.

```ts
// Chave no header; mesma intenção e mesmo payload devem reutilizar a chave.
await api.command('/stock/01EXEMPLO/block', { reason: 'Avaria identificada' });

// Chave no corpo, como exigido pelo cancelamento de pedidos.
await api.command('/orders/01EXEMPLO/cancel', { reason: 'Solicitação do cliente' }, {
  keyInBody: true,
});
```

A camada HTTP conserva a chave de um comando após uma resposta incerta e compartilha envios simultâneos equivalentes. A chave só é reutilizada com o mesmo método, caminho e payload. Ao receber timeout ou indisponibilidade, consulte o estado atual e repita o mesmo comando quando necessário; evite criar uma nova intenção antes de confirmar o resultado anterior.

As chaves pendentes ficam em memória e não formam uma fila offline persistente. Recarregar a página ou encerrar a sessão perde essa memória. Nessa situação, consulte os registros do servidor antes de repetir uma operação possivelmente concluída.

Quantidades aceitam até 12 dígitos inteiros e seis decimais, com vírgula ou ponto na digitação e sem separador de milhar. `ExactDecimal` mantém os dígitos no corpo JSON como literal numérico. A resposta preserva como texto valores que sofreriam arredondamento em `number`. Componentes devem usar as funções de apresentação e evitar `Number(...)` para somar ou alterar saldos. Validade `YYYY-MM-DD` é exibida sem conversão de fuso; instantes são apresentados na hora local do navegador.

## Estados de interface e validação

As telas distinguem carregamento, resultado vazio, erro recuperável e falta de permissão. Formulários preservam o preenchimento quando a API rejeita uma solicitação, desabilitam o envio em andamento e confirmam comandos sensíveis com contexto e motivo. Seletores oferecem pesquisa paginada, rótulos e escolha explícita do vínculo.

Os componentes compartilhados dão suporte à navegação por teclado, foco em modais, avisos de erro e tabelas com rolagem em telas menores. A revisão visual deve incluir telas estreitas, textos longos, menus, modais, campos de pesquisa e mensagens do backend.

## Verificações e limites de validação

Execute no submódulo web:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

A execução consolidada desta entrega passou em `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. A suíte Node tem **68 testes aprovados**, cobrindo contratos de domínio, sessão, concorrência, idempotência, decimais e isolamento do proxy. Também passaram **13 cenários de navegador**, incluindo login com código, cookies HttpOnly, duas abas com refresh rotativo, permissões, pesquisa, formulários e larguras de 320/390 pixels. Os testes em navegador são executados sobre o servidor Next de produção e uma API HTTP descartável com respostas controladas; as capturas ficam em `/tmp/wms-web-review` por padrão (`WMS_SCREENSHOT_DIR` altera o destino).

Para o navegador de testes, instale o Chromium do Playwright com `npx playwright install chromium` ou informe um Chrome/Chromium existente em `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. O script usa uma porta local livre, encerra os processos criados e pode ser executado após o build. Quando há saída standalone, prepara os assets e executa esse servidor, reproduzindo a forma de distribuição do painel. Os testes do cliente podem usar respostas controladas para reproduzir páginas vazias, recusas de permissão, erros de rede, rotação de sessão e comandos repetidos. Isso valida comportamentos da interface e do transporte; não representa homologação com o Spring, o banco, o serviço de e-mail ou um armazém.

A homologação posterior deve usar a API configurada e contemplar: login com código real; criação e inativação de cadastros; documentos de entrada e saída; geração e cancelamento de ondas; acompanhamento dos comandos realizados no mobile; bloqueios e liberações; leitura do histórico e livro razão; permissões distintas; expiração de sessão; concorrência entre abas e falhas de rede. O ambiente completo e os processos físicos exigem validação própria.
