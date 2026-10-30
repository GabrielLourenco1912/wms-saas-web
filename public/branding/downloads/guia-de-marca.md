# WMS SaaS — guia de identidade visual

Versão 1.3 · 16/10/2026 · Branding, símbolo e assinatura aplicados no web, mobile e e-mails do backend, conforme as seis etapas da tarefa principal.

**Direção recomendada: Precisão em movimento.**

Este guia registra a direção visual aplicada ao projeto, aberta aos refinamentos do autor. As apresentações de conceito estão em [index.html](/documentacao/branding), [icone.html](/documentacao/branding#icone) e [assinatura.html](/documentacao/branding#autoria). Os valores ficam em [tokens.json](/branding/tokens.json), e a versão interativa em [guia público](/documentacao/branding). A aplicação nos e-mails está no [guia de e-mails](/branding/downloads/guia-aplicacao-emails.md).

## 1. Ideia central e relação com o autor

O WMS transforma movimentos físicos em informação organizada: um produto tem endereço, uma tarefa tem responsável e uma movimentação deixa histórico. A identidade deve transmitir clareza, estrutura e continuidade entre planejamento e execução.

No [portfólio de Gabriel Lourenço](https://lourencogabriel.dev/), consultado em 16/10/2026, aparecem a ligação entre desenvolvimento e melhoria de processos, uma base verde muito escura, fundos claros levemente quentes, lima como destaque e as famílias Manrope e DM Mono. Esses elementos são observáveis no HTML e no [CSS público](https://lourencogabriel.dev/assets/css/portfolio.css). A escolha de trazê-los para o WMS é uma interpretação de design, sujeita à preferência do autor.

A proposta preserva essa relação pessoal e dá ao produto sua própria organização visual: o verde de ação já usado no web ganha papel consistente nos dois clientes; o lima aparece em detalhes de marca e orientação; os dados e as ações operacionais recebem mais espaço e hierarquia.

| Pilar | Como aparece na marca |
| --- | --- |
| Clareza | Textos curtos, fundos claros, contraste e informação organizada |
| Precisão | Alinhamento em grade, códigos identificáveis e números alinhados |
| Continuidade | Trajetos ortogonais, etapas conectadas e estados explícitos |
| Proximidade | Português direto e composição acessível para operações de pequeno e médio porte |
| Autoria | Fontes e elementos de cor que conversam com o portfólio de Gabriel |

**Posicionamento:** sistema de gestão e execução de operações de armazéns e distribuidores de pequeno e médio porte, com foco em organização, controle e rastreabilidade.

**Frase de marca proposta:** “Cada movimento, sob controle.” Deve aparecer em apresentações, acesso e materiais do projeto; dentro dos fluxos, os títulos precisam descrever a tarefa.

**Nome de referência:** WMS SaaS. **Descritor:** Gestão de armazéns. Em uma primeira apresentação, explicar a sigla como “Sistema de gerenciamento de armazéns”. O descritor ajuda a leitura; não é necessário repetir “SaaS” em todos os botões ou títulos.

## 2. Aplicação por canal

| Canal | Aplicação |
| --- | --- |
| Web | Manrope/DM Mono locais, verde operacional nas ações, navegação floresta, símbolo próprio e crédito nos pontos institucionais |
| Mobile | Tema Material 3 com os mesmos papéis, tipografia local, códigos em DM Mono, splash e ícones Android/iOS preparados, autoria no acesso e em Sobre |
| Documentação pública | Portal de API, modelo relacional e guia de branding compartilham a identidade, preservando cores semânticas dos contratos e relações |
| E-mails | WMS SaaS — Gestão de armazéns, cabeçalho floresta, W lima, código verde, papel e crédito do autor; fontes de sistema como fallback |

A marca é compartilhada; cada canal mantém seu uso: gestão pede leitura comparativa, execução pede uma próxima ação evidente e áreas de toque maiores, e mensagens precisam continuar legíveis sem imagens.

## 3. Paleta principal

| Nome | Valor | Papel |
| --- | --- | --- |
| Floresta | `#14251E` | Navegação, cabeçalhos de marca e fundos institucionais escuros |
| Verde operacional | `#176B48` | Ação principal, links e seleção em superfícies claras |
| Verde profundo | `#105337` | Hover/pressionado da ação principal |
| Lima | `#D1F878` | Destaque de identidade e seleção na base escura, sempre com texto escuro |
| Papel | `#F5F6F0` | Fundo principal claro, retomando o portfólio |
| Branco | `#FFFFFF` | Formulários, tabelas, cartões e superfícies operacionais |
| Tinta | `#18251F` | Texto principal e conteúdo sobre lima |
| Cinza vegetal | `#5C6B62` | Texto secundário, metadados e ajuda sobre fundos claros |
| Linha | `#DCE3DA` | Separadores e contornos de superfícies; não usar como única indicação de um controle |
| Contorno de controle | `#7A8A80` | Limites de campos e controles sobre branco/papel |
| Texto inverso | `#F5F6F0` | Texto principal sobre floresta |
| Texto inverso secundário | `#B6C4B8` | Informação secundária sobre floresta |

Como distribuição indicativa, dedicar a maior parte da tela operacional às superfícies claras; reservar o floresta para a estrutura e o verde para ações. O lima pode ocupar aproximadamente 5% de uma composição de marca. Essas proporções orientam a hierarquia e não precisam ser medidas em cada tela.

O lima não indica “concluído”, “estoque disponível” ou “sucesso”. Também não deve preencher todos os botões. Em um destaque lima, usar tinta/floresta no texto; branco sobre lima tem contraste insuficiente para leitura.

## 4. Cores de informação e estados

| Papel | Texto/ícone | Fundo suave | Exemplo |
| --- | --- | --- | --- |
| Sucesso | `#206B46` | `#E7F4EC` | Recebimento confirmado |
| Atenção | `#855400` | `#FFF2CF` | Quantidade divergente; revisão necessária |
| Erro/destrutivo | `#B42318` | `#FFF0ED` | Não foi possível concluir; cancelar operação |
| Informação | `#245BCA` | `#EDF3FF` | Em andamento; informação de contexto |
| Neutro | `#5C6B62` | `#EEF1EB` | Rascunho; ainda não iniciado |

Sempre combinar cor com texto e, quando ajudar, ícone ou padrão. Estados de negócio específicos devem manter seus rótulos e significados já definidos pela aplicação. Em gráficos e no modelo relacional, adicionar legenda e rótulos; a paleta de categorias pode continuar mais ampla que a paleta da marca.

## 5. Contraste e interação

As combinações abaixo foram calculadas com luminância relativa sRGB, sem arredondar valores antes de decidir aprovação. Os números apresentados têm duas casas decimais e se referem somente aos pares informados.

| Frente / fundo | Razão | Aplicação |
| --- | ---: | --- |
| Tinta / papel | 14,60:1 | Texto principal |
| Cinza vegetal / papel | 5,17:1 | Texto secundário |
| Branco / verde operacional | 6,49:1 | Botão principal |
| Tinta / lima | 13,16:1 | Destaque da marca |
| Lima / floresta | 13,26:1 | Destaque em navegação escura |
| Texto inverso secundário / floresta | 8,82:1 | Informação de apoio na navegação |
| Verde operacional / papel | 5,98:1 | Links e ações de texto |
| Contorno de controle / branco | 3,64:1 | Limite visual de campo |
| Contorno de controle / papel | 3,35:1 | Limite visual sobre o fundo da página |
| Sucesso / fundo de sucesso | 5,70:1 | Texto de estado |
| Atenção / fundo de atenção | 5,77:1 | Texto de estado |
| Erro / fundo de erro | 5,93:1 | Texto de estado |
| Informação / fundo de informação | 5,51:1 | Texto de estado |

Adotar como referência 4,5:1 para texto comum e 3:1 para texto grande, conforme [WCAG 2.2 — contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Para limites e estados essenciais de controles, usar 3:1 contra a cor adjacente, conforme [contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Esses cálculos de paleta não equivalem a uma auditoria de acessibilidade das aplicações.

- Foco: anel externo de 3 px em verde operacional sobre fundos claros, com afastamento de 3 px; sobre floresta, usar lima. Em ações já preenchidas de verde, manter o afastamento claro.
- O mínimo da WCAG 2.2 para alvos de ponteiro é 24 × 24 CSS px, com condições e exceções próprias. A marca propõe **44 px no web e 48 dp no mobile** como metas de projeto, maiores que esse mínimo; [referência do critério](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- Alvos compactos em tabelas precisam de área clicável e espaçamento suficientes; não reduzir o toque ao tamanho visual do ícone.
- Respeitar aumento de texto, navegação por teclado, foco visível e preferência por movimento reduzido.

## 6. Tipografia

### Manrope — voz principal

Usar em títulos, navegação, formulários, tabelas e textos. É a família do portfólio e dá continuidade à autoria. A distribuição [Google Fonts / Manrope](https://github.com/google/fonts/tree/main/ofl/manrope) e sua licença estão incluídas em `assets/`.

Pesos de uso: 400 para textos longos, 500 para apoio e dados, 600 para rótulos, 700 para títulos e ações, 800 apenas em destaques grandes de marca. Evitar transformar toda a interface em texto pesado.

### DM Mono — camada técnica

Usar em SKU, endereços de estoque, identificadores, snippets da API e pequenas legendas técnicas. Reproduz a segunda família do portfólio. Usar 400/500; não substituir a Manrope nos parágrafos de ajuda. Os arquivos e a [licença do projeto](https://github.com/google/fonts/tree/main/ofl/dmmono) acompanham a apresentação.

| Uso | Web: tamanho / entrelinha | Mobile: tamanho / entrelinha | Peso |
| --- | --- | --- | --- |
| Destaque de marca | 56–72 / 1,05 | 32–40 / 1,10 | 700–800 |
| Título de tela | 30–32 / 1,20 | 26–28 / 1,20 | 700 |
| Título de seção | 20–24 / 1,30 | 20–22 / 1,30 | 700 |
| Corpo e campos | 16 / 1,55 | 16 / 1,50 | 400–500 |
| Dados densos no web | 14 / 1,50 | 16 / 1,50 | 400–500 |
| Rótulos e botões | 14 / 1,40 | 16 / 1,40 | 600–700 |
| Apoio e metadados | 12–13 / 1,50 | 14 / 1,45 | 400–500 |
| Código e identificador | 13–14 / 1,50 | 14–16 / 1,50 | 400–500 |

No web, as medidas são CSS px; em Flutter, tamanhos lógicos sujeitos à escala de texto do usuário. O intervalo de destaque depende da largura disponível. Preferir caixa normal em títulos; reservar caixa alta e espaçamento entre letras a pequenos rótulos de contexto.

Quantidades em listas e tabelas devem usar algarismos tabulares e alinhamento à direita. IDs e códigos podem usar DM Mono, com quebra/cópia adequada. Manter os valores completos e as regras de precisão existentes no backend. Para valores exibidos ao usuário, usar convenções de português brasileiro, sem alterar o formato de transporte da API.

### Fontes locais e licenças

Arquivos nesta entrega:

- `assets/Manrope-Variable.ttf` — família variável original, sem alteração.
- `assets/DMMono-Regular.ttf` e `assets/DMMono-Medium.ttf` — pesos originais, sem alteração.
- `assets/Manrope-OFL.txt` e `assets/DMMono-OFL.txt` — licenças SIL Open Font License 1.1 preservadas.

Web e mobile empacotam os arquivos TTF originais com suas licenças, sem downloads no build ou em runtime. O web usa `next/font/local`; o mobile registra as fontes no `pubspec.yaml`. Nos e-mails, os nomes das famílias são sugestões CSS e os fallbacks de sistema asseguram a leitura, sem fonte remota.

## 7. Forma, composição e movimento

**Grade modular:** base de 4 unidades; preferir espaços de 8, 12, 16, 24 e 32 px/dp. A repetição remete aos endereços e posições de armazenagem e ajuda a leitura de dados.

**Cantos:** campos e botões em 8; cartões em 12; áreas institucionais maiores em 20–24. Pills ficam para pequenos estados. Interfaces operacionais precisam de contornos firmes e pouco ruído.

**Profundidade:** fundos e contornos organizam a maior parte do conteúdo. Sombras suaves ficam para menus, modais e superfícies elevadas; evitar sombras intensas em cada linha/cartão.

**Grafismo:** trajetos ortogonais, pontos de passagem, módulos alinhados e pequenos recortes que sugiram continuidade. Usar em acesso, apresentação e vazios institucionais. As tabelas e os formulários devem manter fundo limpo.

**Ícones de interface:** uma família consistente de traço, grade de 24 e espessura próxima de 2; acompanhados por texto nas ações importantes. A aplicação pode respeitar a família Material do Flutter e equivalentes no web; o símbolo da marca é um recurso próprio da etapa 2.

**Movimento:** transições de estado de 120–180 ms, discretas, sem animação contínua no contexto operacional. Respeitar `prefers-reduced-motion` no web e a configuração equivalente do sistema no mobile. Uma tarefa concluída precisa de confirmação visível e persistente, não apenas animação.

## 8. Linguagem e personalidade

Tom: direto, calmo, preciso e útil. Usar verbos concretos: “Conferir recebimento”, “Salvar produto”, “Consultar estoque”, “Confirmar separação”. Apresentar a ação e o seu resultado; ao ocorrer um problema, explicar o próximo passo possível.

| Contexto | Exemplo de texto |
| --- | --- |
| Acesso | “Planeje, acompanhe e mantenha o controle do seu armazém.” |
| Tarefa | “Confira o produto e informe a quantidade recebida.” |
| Confirmação | “Recebimento confirmado. O saldo foi atualizado.” |
| Lista vazia | “Nenhum produto encontrado. Revise os filtros ou pesquise outro código.” |
| Permissão | “Seu perfil não permite confirmar este recebimento.” |
| Falha de conexão | “Não foi possível confirmar a operação. Consulte o status antes de tentar novamente.” |

Os exemplos precisam refletir o comportamento de cada fluxo. Não prometer conclusão, atualização de saldo ou repetição segura quando a resposta da API ainda for incerta. Não anunciar câmera, operação offline, resultado de homologação ou disponibilidade garantida que não existam.

## 9. Símbolo do projeto — etapa 2

O símbolo desenvolvido é o **W de percurso**: hastes verticais e diagonais conectadas formam a inicial do projeto e sugerem módulos de armazenagem ligados por uma trajetória. Foi desenhado como uma forma preenchida em SVG, com variantes lima, verde, floresta e branca, preservando a mesma geometria.

A [apresentação do ícone](/documentacao/branding#icone) permite comparar variantes, escala e máscaras. Os [recursos e regras de uso](/branding/downloads/guia-do-icone.md) documentam os arquivos SVG/PNG/ICO, margens, exportações por plataforma e reprodução. O [pacote completo](/branding/downloads/wms-icon-assets.zip) reúne os recursos utilizados na aplicação da identidade.

O canvas mestre é 128 × 128, com silhueta central de 96 × 72 e proteção mínima de 16 unidades. O mínimo técnico é 16 px no favicon; no layout, preferir 32 px ou mais. Frase e assinatura ficam fora do ícone. Recursos maskable e adaptativos possuem margens específicas; preservar os arquivos próprios de cada finalidade. As simulações ilustram os recortes; os recursos correspondentes estão integrados nos clientes. A conferência nativa em iOS exige macOS/Xcode.

## 10. Assinatura pessoal selecionada — etapa 3

O produto leva seu símbolo e nome. Gabriel assina a autoria em locais apropriados: rodapé do web, acesso, documentação e tela “Sobre”/perfil do aplicativo, conforme a composição final. A assinatura não acompanha todos os botões ou cabeçalhos operacionais.

A coleção do [ZIP indicado](https://lourencogabriel.dev/downloads/assinaturas-gabriel.zip) foi analisada. A seleção é o **Monograma GL / 01**, em português e nas variantes monocromáticas, em continuidade com a assinatura já adotada no portfólio pessoal e com o contexto profissional do WMS. Os arquivos selecionados foram preservados byte a byte, com registro de procedência e hashes.

A [apresentação da assinatura](/documentacao/branding#autoria) mostra as versões originais em tamanho 260 × 56 e um crédito responsivo com o monograma original de 32 px e nome em texto Manrope. Usar a composição responsiva onde a assinatura completa ficaria pequena; preservar a composição original do SVG completo, inclusive sua fonte. As [regras e a análise da seleção](/branding/downloads/guia-da-assinatura.md) detalham usos, alternativas e arquivos.

## 11. Aplicação e manutenção

### Web — etapa 4

Os tokens CSS gerados centralizam as cores e atendem as variáveis existentes. Manrope/DM Mono locais, símbolo, favicon e touch icon aparecem em autenticação, navegação, tabelas, formulários, estados e documentação. Os contratos e as permissões permanecem os mesmos.

A rota pública **`/documentacao/branding`** integra o portal `/documentacao` e apresenta conceito, paleta copiável, laboratório de fontes, variantes, recortes, amostras nativas e downloads SVG/PNG/ICO/ZIP. Funciona sem sessão e sem chamadas à API.

### Mobile — etapa 5

`BrandColors`, `AppBrand` e `AppTheme.light` centralizam a identidade. A geometria canônica gera o desenho Flutter por `CustomPainter`. Acesso, navegação, painel, componentes operacionais e perfil usam os papéis compartilhados. Os códigos recebem DM Mono; a seção Sobre separa autoria e pessoa conectada e oferece cópia do portfólio e licenças.

Ícones legados/adaptativos/monocromáticos e splash Android foram compilados em APK debug. O catálogo e storyboard iOS foram preparados e verificados como arquivos; a compilação iOS permanece uma validação em macOS. O alvo Flutter web recebe seus ícones e manifesto.

### E-mails — etapa 6

Confirmação de e-mail, código de acesso e recuperação de senha compartilham o layout da marca. **Gestão de armazéns** substitui **Portal acadêmico** no cabeçalho, conforme orientação do autor. O W identifica o produto; o Monograma GL e nome identificam a autoria no rodapé.

As imagens são PNGs de classpath incorporados por CID, sem carregamento remoto. Há alternativa textual completa, estilos essenciais inline, estrutura em tabelas e fontes de sistema como fallback. Código, prazo configurado, destinatário e regras dos desafios permanecem preservados. O conteúdo variável é escapado no HTML.

### Fonte de verdade e recursos versionados

`tokens.json`, a geometria do ícone e os originais da assinatura são a fonte para os scripts manuais `wms-saas-web/scripts/sync-branding.py` e `wms_saas_mobile/scripts/sync_branding.py`, que oferecem `--check`. Nos e-mails, tokens, constantes e imagens já estão versionados no backend e são mantidos diretamente, conforme o guia técnico de e-mails.

As cópias necessárias ficam versionadas em cada aplicação. Build e execução não leem `docs-gerais`. Ao alterar tokens, regenerar os recursos necessários, sincronizar os três canais e repetir suas verificações. Guias técnicos: [web](/branding/downloads/guia-aplicacao-web.md), [mobile](/branding/downloads/guia-aplicacao-mobile.md) e [e-mails](/branding/downloads/guia-aplicacao-emails.md).

## 12. Limites e revisão

- O nome comercial não foi alterado. A frase e a direção visual são propostas para revisão do autor.
- O HTML apresenta exemplos fictícios de interface para avaliar a marca; não cria endpoints, rotas ou funcionalidades nos clientes.
- O artigo e as regras de negócio não foram alterados. As etapas 4, 5 e 6 aplicam a identidade aos canais existentes; não criam funcionalidades operacionais.
- Modo escuro completo não faz parte desta definição de implementação: há papéis para estruturas escuras e versões inversas da marca. Um tema completo exigiria revisar cada componente.
- As cores não representam validação com operadores ou homologação em armazém.

## Referências consultadas

Consulta em 16/10/2026. As decisões de estilo são propostas próprias; as referências sustentam os dados observados e os critérios técnicos.

- [Portfólio do autor](https://lourencogabriel.dev/) e [CSS público](https://lourencogabriel.dev/assets/css/portfolio.css): cores, famílias e linguagem pessoal.
- [Google Fonts — Manrope](https://github.com/google/fonts/tree/main/ofl/manrope) e [OFL da Manrope](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt): distribuição e licença.
- [Google Fonts — DM Mono](https://github.com/google/fonts/tree/main/ofl/dmmono) e [OFL da DM Mono](https://github.com/google/fonts/blob/main/ofl/dmmono/OFL.txt): distribuição e licença.
- [WCAG 2.2 — contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) e [tamanho mínimo de alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): referências para a aplicação.

## Verificação desta entrega

A apresentação foi revisada em Chromium, aberta diretamente por arquivo, com fontes locais e sem requisições HTTP. Foram conferidos a consistência das cores com `tokens.json`, os links internos, a cópia de cores, o laboratório tipográfico, os filtros por texto/situação e as abas com navegação por teclado. A prévia mobile apresenta validação e confirmação local sem envio de dados.

As composições web e mobile foram verificadas nas larguras de 1440, 1024, 768, 760, 390 e 320 px, sem overflow horizontal da página, sem erros JavaScript e com respeito à preferência de movimento reduzido. Esses resultados se referem à apresentação de conceito. As aplicações têm verificações próprias: web com lint, TypeScript, 77 testes unitários, build e cenários de navegador; mobile com análise estática, 66 testes e APK Android; backend com 452 testes, incluindo MySQL. As mensagens foram conferidas em quatro larguras de 320 a 1440 px e sem imagens. Ver os guias técnicos para escopo e limites. Não houve envio de e-mails a terceiros.
