# Arquitetura do Painel Web WMS

## Objetivo

Este projeto implementa apenas o painel web do gestor para apresentacao do TCC. A parte mobile do operador foi deixada fora de proposito, pois seus fluxos de execucao fisica ja pertencem a outro cliente.

O painel web cobre as responsabilidades descritas no artigo para o gestor:

- autenticacao simulada do gestor;
- dashboard operacional;
- gerenciamento da estrutura do armazem, zonas e posicoes;
- catalogo de produtos e regras de rastreabilidade;
- pre-recebimentos documentais, sem gerar saldo fisico;
- pedidos de venda e geracao de ondas de separacao;
- consulta de estoque, bloqueio e transferencia interna;
- auditoria por livro razao;
- usuarios, perfis e permissoes.

## Escolha de Arquitetura

A arquitetura escolhida foi uma estrutura por feature, centralizada em `src/features/wms`.

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
  features/
    wms/
      WmsDashboard.tsx
      mock-data.ts
      types.ts
docs/
  ARQUITETURA_PAINEL_WEB.md
```

## Razao da Escolha

Para este momento do projeto, o objetivo principal e apresentar telas modernas e coerentes com o dominio WMS, sem API e sem persistencia real. Por isso, uma arquitetura por feature e mais adequada do que separar prematuramente em camadas complexas.

As responsabilidades ficaram assim:

- `src/app/page.tsx`: ponto de entrada da rota principal do Next.js. Ele apenas renderiza o painel.
- `src/features/wms/WmsDashboard.tsx`: componente client-side com navegacao, telas e interacoes em RAM.
- `src/features/wms/mock-data.ts`: dados simulados usados para apresentacao e testes visuais.
- `src/features/wms/types.ts`: contratos TypeScript das entidades principais do WMS.
- `src/app/globals.css`: tema visual, layout responsivo e componentes CSS reutilizados pelo painel.

Essa divisao facilita estudar o projeto porque cada arquivo tem um papel claro. Tambem facilita a evolucao futura: quando a API Java/Spring Boot existir, os arrays de `mock-data.ts` podem ser substituidos por chamadas HTTP sem reescrever a interface inteira.

## O Que Foi Intencionalmente Excluido

As telas de execucao operacional do operador nao foram implementadas no painel web. Isso inclui:

- conferencia fisica de recebimento;
- execucao de putaway;
- execucao de picking;
- bipagem de LPN, SKU ou posicao;
- inventario operacional via dispositivo.

O painel apenas planeja, monitora, consulta e administra esses processos.

## Dados em Memoria

As acoes de tela alteram apenas estado local do React:

- liberar pre-recebimento para conferencia;
- gerar onda FEFO a partir de pedidos pendentes;
- cancelar pedido;
- bloquear item de estoque.

Ao recarregar a pagina, os dados voltam ao estado inicial. Isso e esperado nesta etapa, pois ainda nao ha backend nem banco de dados conectados.

## Evolucao Recomendada

Quando o backend estiver pronto, a evolucao natural seria:

1. criar uma camada `services` para chamadas HTTP;
2. substituir `mock-data.ts` por fetch dos endpoints reais;
3. adicionar autenticacao real do gestor;
4. mover regras sensiveis para a API;
5. manter o painel como interface de gestao e visualizacao.
