# WMS SaaS — painel web

Cliente Next.js para gestão de armazéns e distribuidores de pequeno e médio porte. O painel reúne cadastros, documentos de entrada e saída, planejamento de ondas e transferências, acompanhamento operacional, consulta de estoque, auditoria e administração de acesso.

A API é implementada no submódulo [wms-saas-backend](../wms-saas-backend). A execução física com leitura de códigos pertence ao cliente [mobile](../wms_saas_mobile).

## Desenvolvimento local

Use Node.js 22 e as dependências do `package-lock.json`:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). O servidor Next.js acessa o backend pelo endereço configurado em `.env.local`:

```dotenv
WMS_API_BASE_URL=http://localhost:8080
```

O valor é a origem da API, sem `/api` no final. O navegador chama `/api/backend/...` na origem do painel; o proxy Next.js encaminha a solicitação ao Spring. A variável é lida no servidor em execução e não precisa ser exposta como `NEXT_PUBLIC_*`.

Para entrar, use uma conta ativa provisionada no backend e o código enviado por e-mail. A criação de usuários é administrativa. O funcionamento do envio de e-mail, do banco e das permissões depende da configuração do backend.

Em desenvolvimento por HTTP, configure `REFRESH_COOKIE_SECURE=false` no backend. Na publicação por HTTPS, use cookie seguro. O access token permanece em memória; o refresh token usa cookie `HttpOnly`. Sem suporte a Web Locks no navegador, use uma única aba autenticada.

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:docs
```

Os testes automatizados validam contratos e comportamentos do cliente. A homologação com o backend, o serviço de e-mail e a operação real continua sendo uma etapa própria; uma compilação bem-sucedida não comprova esses cenários.

## Documentação

- [Integração da API e consumo por fluxo](docs/INTEGRACAO_API.md).
- [Arquitetura do painel](docs/ARQUITETURA_PAINEL_WEB.md).
- [Identidade visual e manutenção dos recursos](docs/IDENTIDADE_VISUAL.md).
- [Contrato completo da API](../wms-saas-backend/docs/API_CLIENTS.md).

## Documentação pública

As páginas abaixo ficam disponíveis sem login e sem conexão com o backend:

| Rota | Conteúdo |
| --- | --- |
| `/documentacao` | Entrada da documentação: API, modelo relacional e branding. |
| `/documentacao/api` | Referência completa da API: 158 endpoints, payloads/respostas, permissões e exemplos, com índice, pesquisa de endpoints e cópia de código. |
| `/documentacao/api?guia=web` | Guia existente de consumo e comportamento do painel. |
| `/documentacao/api?guia=mobile` | Guia existente de consumo e limites do aplicativo Flutter. |
| `/documentacao/modelo-relacional` | Modelo interativo: áreas, pesquisa por tabela/campo, detalhes, PK/FK/UQ, referências e diagrama aprovado com zoom/rolagem. |
| `/documentacao/modelo-relacional#tabela-estoque` | Exemplo de link direto para uma tabela, preservado ao recarregar. |
| `/documentacao/branding` | Conceito, cores copiáveis, fontes, símbolo, variantes, tamanhos reais, autoria e downloads SVG/PNG/ICO e pacotes web/mobile. |

O visual utiliza a paleta e os componentes do projeto. A entrada está disponível no login e no rodapé do painel. Essas páginas pertencem a um grupo de rotas sem `AuthProvider`; a restauração de sessão continua somente em `(application)`, mantendo os caminhos do painel e da autenticação.

A identidade usa Manrope e DM Mono locais, floresta/verde/lima/papel, o símbolo W de percurso e o crédito de autoria com Monograma GL / 01. Favicon, touch icon, acesso, navegação, estados e componentes compartilhados seguem a mesma direção. Fontes e licenças acompanham o web; o navegador e o build não buscam fontes externas.

Os textos publicados são snapshots do guia completo do backend e dos guias web/mobile. O explorador aproveita as descrições do HTML do modelo e lê os campos, tipos, chaves e referências do MWB aprovado. São 29 tabelas, 276 campos e 91 relacionamentos no desenho; a diferença em relação às 30 tabelas físicas do Flyway é explicada na página. O PNG publicado é uma cópia idêntica à figura aprovada.

Após mudar as fontes, execute na cópia completa de `TCC_WMS` com Python 3 disponível:

```bash
npm run docs:sync
npm run docs:sync -- --check
```

O script lê somente os Markdown de referência e o HTML/MWB/PNG do modelo, gera JSON em `src/features/documentation/content/` e copia os downloads para `public/documentacao/`. Os originais de `docs-gerais/` permanecem locais. Os snapshots e os assets publicados pertencem ao web e são versionados para que um build isolado não dependa do diretório pai, de Python ou do backend em execução. A sincronização é explícita, não uma etapa de `npm run build`.

Para atualizar a identidade a partir de `docs-gerais/identidade-visual/`:

```bash
npm run branding:sync
npm run branding:sync -- --check
```

Essa sincronização copia os recursos selecionados, gera tokens CSS/JSON e verifica a geometria dos SVGs e os hashes da assinatura. O ZIP completo da coleção pessoal permanece local. Veja o [guia de manutenção](docs/IDENTIDADE_VISUAL.md). Alterações no guia de integração ainda usam `docs:sync`; nenhuma sincronização é executada automaticamente no build.

Depois do deploy, os caminhos públicos podem ser referenciados no artigo com o domínio real. Nenhum domínio ou publicação foi presumido nesta entrega.

Para validar as páginas sobre o servidor standalone de produção, inclusive com API indisponível:

```bash
npm run build
npm run test:docs
```

As capturas dessa verificação ficam em `/tmp/wms-public-documentation` (`WMS_DOCS_SCREENSHOT_DIR` altera a pasta). O teste de regressão `npm run test:e2e` também verifica a ida à documentação e a volta ao painel com a sessão preservada.

## Docker / GHCR

A imagem usa build em etapas e o servidor Next.js standalone em Node 22, com UID/GID `1001:1001`, seguindo a organização do backend. O `.dockerignore` envia apenas os arquivos usados na compilação.

Na raiz `TCC_WMS`:

```bash
docker compose -f docker-compose.yml -f wms-saas-web/compose.api.override.example.yaml build web
docker compose -f docker-compose.yml -f wms-saas-web/compose.api.override.example.yaml up -d --no-deps --pull never web
```

Imagem padrão: `ghcr.io/gabriellourenco1912/wms-saas-web:latest`. `GHCR_NAMESPACE` e `IMAGE_TAG`, no `.env` da raiz, alteram o destino e a versão. `WEB_PORT` e `WEB_PUBLISHED_PORT` controlam as portas do contêiner e do host. O Dockerfile fica em `../docker/web/Dockerfile`, com contexto de build neste projeto.

O contêiner web precisa receber `WMS_API_BASE_URL=http://backend:8080` em seu ambiente de execução quando o serviço Spring se chama `backend` na rede do Compose. `localhost:8080` dentro do contêiner identifica o próprio contêiner web. Verifique a configuração existente e forneça a variável no serviço `web`, o exemplo [compose.api.override.example.yaml](compose.api.override.example.yaml) faz essa configuração sem alterar o Compose principal. Definir a variável apenas no `.env` da raiz não a injeta automaticamente no contêiner.

Configuração, build e comandos de pull/push estão em [docker/README.md](../docker/README.md). Os dados das telas são consultados e alterados pela API configurada; o backend precisa estar acessível pelo processo Next.js.

## Resultado da validação

Lint e TypeScript sem ocorrências; **77 testes automatizados**, **14 cenários do painel** e **9 cenários de documentação pública aprovados**; build de produção compilado. O navegador validou o servidor standalone: os 14 cenários do painel utilizaram uma API HTTP de teste; os nove de documentação utilizaram uma API indisponível para confirmar a independência de sessão e backend. A cobertura pública inclui o branding, com cópia de cores, laboratório de tipografia, variantes, autoria, downloads e amostras nativas em 320/390 px. A homologação com Spring, e-mail e dados reais permanece pendente. Veja os fluxos e limites em [docs/INTEGRACAO_API.md](docs/INTEGRACAO_API.md).
