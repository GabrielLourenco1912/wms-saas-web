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
```

Os testes automatizados validam contratos e comportamentos do cliente. A homologação com o backend, o serviço de e-mail e a operação real continua sendo uma etapa própria; uma compilação bem-sucedida não comprova esses cenários.

## Documentação

- [Integração da API e consumo por fluxo](docs/INTEGRACAO_API.md).
- [Arquitetura do painel](docs/ARQUITETURA_PAINEL_WEB.md).
- [Contrato completo da API](../wms-saas-backend/docs/API_CLIENTS.md).

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

Lint e TypeScript sem ocorrências; **68 testes automatizados** e **13 cenários de navegador aprovados**; build de produção compilado. O navegador validou o servidor standalone com uma API HTTP de teste. A homologação com Spring, e-mail e dados reais permanece pendente. Veja os fluxos e limites em [docs/INTEGRACAO_API.md](docs/INTEGRACAO_API.md).
