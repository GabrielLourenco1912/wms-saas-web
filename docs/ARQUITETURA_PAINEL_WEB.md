# Arquitetura do painel web WMS

## Responsabilidade do cliente

O painel Next.js atende o gestor de armazéns e distribuidores de pequeno e médio porte. Seu escopo reúne administração, planejamento, consulta e acompanhamento. O cliente mobile atende as conferências e execuções físicas com leitura de produto, LPN e posição.

As regras de estoque, FEFO, capacidade, rastreabilidade, bloqueio, concorrência e autorização são aplicadas pelo backend Java. A interface apresenta o resultado da API e valida o preenchimento dos formulários para orientar o usuário.

O contrato de referência é [API_CLIENTS.md](../../wms-saas-backend/docs/API_CLIENTS.md), complementado pelo [guia deste cliente](INTEGRACAO_API.md). As permissões retornadas por `/api/users/me` determinam os recursos e as ações disponíveis.

## Organização por domínio

```text
src/
  app/
    api/backend/[...path]/route.ts  # Proxy de mesma origem para a API Spring
    auth/                          # Entrada e recuperação de senha
    gestao/[section]/page.tsx       # URLs dos módulos gerenciais
    globals.css                    # Tema, componentes e adaptação de layout
    layout.tsx                     # Composição global do aplicativo
    page.tsx                       # Entrada do painel
  components/wms/
    ApiLookup.tsx                  # Pesquisa de vínculos, cinco opções por página
    EntityForm.tsx                 # Campos e submissão de cadastros
    ResourceTable.tsx              # Listas pesquisáveis e paginadas
    primitives.tsx                 # Modais, detalhes, avisos e estados
  features/
    auth/                          # Sessão, MFA, identidade e permissões
    catalog/                       # Estrutura física, produtos e parceiros
    dashboard/                     # Totais e filas retornados pela API
    inventory/                     # Acompanhamento das contagens
    planning/                      # Documentos, ondas e acompanhamento operacional
    stock/                         # Saldos, bloqueios e transferências
    users/                         # Contas, perfis e permissões
    wms/                           # Composição e navegação do painel
  lib/api/
    client.ts                      # Transporte, renovação e comandos idempotentes
    decimal.ts                     # Parsing e serialização numérica sem arredondar
    hooks.ts                       # Consultas com cancelamento e isolamento de sessão
    types.ts                       # Páginas, lookup e apresentação de valores
tests/                             # Testes automatizados do cliente
docs/
  ARQUITETURA_PAINEL_WEB.md
  INTEGRACAO_API.md
```

Os componentes compartilhados tratam apresentação e transporte. Os módulos mantêm os formulários, os fluxos e os nomes do domínio. Novos recursos devem seguir essa separação: contrato da API, módulo responsável e componentes reutilizáveis quando houver comportamento comum.

## Caminho de uma chamada

```text
Tela React
  → cliente HTTP /api/backend/<recurso>
  → Route Handler Next.js
  → WMS_API_BASE_URL/api/<recurso>
  → backend Spring / banco de dados
```

O navegador se comunica com a origem do Next.js. O proxy usa `WMS_API_BASE_URL` no servidor, encaminha Bearer e a chave de idempotência e define `X-Client-Type: WEB`. Essa variável não usa o prefixo `NEXT_PUBLIC_`; o endereço interno do backend permanece uma configuração de execução do servidor.

O proxy restringe os recursos encaminhados, rejeita caminhos inválidos, valida a origem das mutações, limita o tamanho do corpo e os tempos de espera e desabilita cache. O backend continua validando todas as permissões e regras de negócio.

## Sessão e autorização

O login solicita um desafio por e-mail; a confirmação do código estabelece a sessão. O access token fica em memória. O refresh token permanece em cookie `HttpOnly`, administrado pelo navegador. O proxy adapta o caminho do cookie de `/api/auth` para `/api/backend/auth`.

O cliente restaura a sessão por refresh, carrega `/users/me` e usa suas permissões para montar o painel. Requisições protegidas que recebem 401 tentam uma renovação e uma repetição. O 403 é apresentado como falta de acesso. A API decide a autorização efetiva mesmo quando a interface oculta uma ação.

As renovações concorrentes compartilham a mesma chamada na aba e usam Web Locks para coordenar abas compatíveis. O BroadcastChannel comunica mudança ou encerramento de sessão sem transmitir tokens. Em ambientes sem Web Locks, mantenha uma única aba autenticada; os detalhes e os limites estão no [guia de integração](INTEGRACAO_API.md).

## Consultas e comandos

As listas começam com 20 registros por página, permitem alterar o tamanho e enviam pesquisa e filtros ao servidor. Os seletores consultam `/lookups`, com cinco opções por página. Mudanças nos filtros reiniciam a paginação. Consultas canceladas ou pertencentes à sessão anterior não devem atualizar a nova tela.

Cadastros usam os POST e PUT previstos no contrato. Comandos operacionais usam a chave de idempotência no header ou corpo conforme a API. Uma falha de rede pode ocorrer após a aplicação da transação; o cliente conserva a chave em memória para repetir o mesmo comando e orienta a atualização do estado antes de uma nova tentativa. Não há fila offline persistente.

Quantidades são digitadas e mantidas como texto. A camada `ExactDecimal` serializa o valor como número JSON, preservando os dígitos informados; o parser conserva como texto literais que perderiam precisão com `number`. Saldos e totais operacionais vêm do servidor.

## Limites do painel

O web permite criar a expectativa documental de recebimento, planejar pedidos, gerar ondas, planejar transferências e acompanhar tarefas. Não há um endpoint de aprovação de pré-recebimento nem de atribuição manual de tarefas no contrato atual.

Conferência física de entrada, putaway, picking, conferência e despacho de LPN e contagem de inventário pertencem ao mobile. No painel, o livro razão oferece consulta de movimentos imutáveis; o inventário oferece acompanhamento. Homologação em armazém e testes em dispositivos reais são etapas posteriores de validação do sistema completo.
