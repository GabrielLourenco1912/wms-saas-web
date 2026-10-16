# Identidade visual do WMS SaaS

O painel aplica a direção **Precisão em movimento**, com frase **Cada movimento, sob controle.** A estrutura floresta, as ações verdes e os detalhes lima acompanham Manrope na interface e DM Mono na camada técnica. O símbolo é o **W de percurso**; a autoria utiliza o **Monograma GL / 01**, selecionado da coleção original de Gabriel Lourenço.

## Página pública e recursos

`/documentacao/branding` apresenta conceito, paleta copiável, laboratório de fontes, variantes e recortes do símbolo, amostras em tamanho real, autoria e downloads. A rota pertence ao grupo público e funciona sem login ou backend. O portal `/documentacao`, a navegação e os rodapés dão acesso ao conteúdo.

Os downloads ficam em `/branding/`: fontes e licenças, SVGs, PNGs, ICO, tokens JSON e pacotes do ícone e da assinatura. O ZIP original com as nove assinaturas não é publicado; somente os seis recursos escolhidos são distribuídos. As cópias preservam os bytes originais.

O guia também descreve a aplicação nos três canais, com cópias dos guias técnicos de web, mobile e e-mails. Na cópia pública do guia de marca, os links locais são adaptados às rotas e downloads disponíveis; fontes, símbolos e assinaturas mantêm seus arquivos originais.

Os ícones de metadados estão em `src/app/favicon.ico`, `src/app/icon.svg` e `src/app/apple-icon.png`, usando as convenções do App Router. O ICO contém as três dimensões nativas: 16, 32 e 48 px.

## Organização

`src/features/branding/` reúne:

- `BrandMark.tsx`: símbolo vetorial reutilizável, com geometria única, variante inversa e semântica decorativa ou nome acessível.
- `AuthorCredit.tsx`: monograma original e nome em texto real, com link para o portfólio.
- `fonts.ts`: fontes locais com `next/font/local`; nenhuma fonte é baixada durante o build ou a navegação.
- `brand-tokens.css`: papéis de cor gerados dos tokens de referência.
- `brand-system.css`: aplicação dos papéis e componentes compartilhados de marca.
- `BrandingGuide.tsx`, `BrandingExplorer.tsx` e `branding-guide.css`: guia público e interações locais.
- `content/`: snapshots de cores, fontes, geometria, seleção da assinatura e procedência dos assets.

O tema base conserva os nomes de variáveis já usados pelos módulos, mapeados para os papéis da marca. Cadastros, permissões, rotas e contratos HTTP permanecem nos módulos existentes. O estilo compartilhado cobre navegação, acesso, campos, ações, estados e documentação, sem introduzir outra camada de transporte.

## Atualização das fontes

Os materiais de criação permanecem em `../docs-gerais/identidade-visual/`, fora do Git. Para atualizar a cópia publicada, na cópia completa de `TCC_WMS`:

```bash
npm run branding:sync
npm run branding:sync -- --check
```

O script Python lê somente os arquivos conhecidos da identidade, verifica a geometria dos SVGs e os hashes da assinatura, copia recursos e gera tokens CSS/JSON. Mudanças no desenho exigem antes regenerar o pacote do ícone conforme seu guia; não editar separadamente cada PNG.

Após atualizar o guia de integração da API, `npm run docs:sync` continua sendo o comando específico da documentação de consumo e do modelo relacional. Os dois processos de sincronização são explícitos. O build de produção utiliza somente os arquivos versionados dentro do web e não depende de Python, do diretório pai ou de consultas remotas.

## Aplicação e legibilidade

- O W identifica o produto; GL identifica o autor. Não substituir o favicon pelo monograma pessoal.
- O lima aparece como destaque de marca e seleção em fundo escuro. Estados mantêm cores próprias e texto.
- Os arquivos de assinatura completa preservam sua tipografia original. Em rodapés, o crédito usa monograma preservado e texto nativo Manrope para manter leitura e responsividade.
- O símbolo tem proteção mínima de 16 unidades no mestre 128 × 128. Usar o recurso maskable em recortes e os recursos próprios de plataforma nos launchers.
- Preservar foco visível, escala de texto e movimento reduzido. Os exemplos de tipografia e recorte não enviam dados à API.

## Verificação

As verificações do projeto incluem lint, TypeScript, suíte de contratos, build e cenários de navegador. Os cenários públicos conferem fontes locais, paleta copiável, tipografia, ícones, downloads, autoria e larguras de 320/390 px com API indisponível. Os cenários do painel conferem os fluxos autenticados após a mudança de identidade.

Os cálculos de contraste do guia se referem aos pares de cor apresentados. Não constituem homologação de operação em armazém ou certificação de acessibilidade do sistema completo.
