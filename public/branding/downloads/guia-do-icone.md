# WMS SaaS — símbolo e recursos do ícone

Etapa 2/5 · versão 1.0 · 16/10/2026.

**Símbolo proposto: W de percurso.** A apresentação visual está em `../icone.html`, na pasta da tarefa. Este pacote contém o desenho e as exportações; a aplicação no web e no Flutter pertence às etapas 4 e 5.

## Conceito e construção

O símbolo reúne a inicial de WMS, duas áreas modulares e uma trajetória contínua. As hastes verticais sugerem posições de armazenagem; as diagonais ligam essas posições e formam o W. A leitura pretendida é organização e movimento, em continuidade com o conceito “Precisão em movimento”.

O desenho é uma única forma preenchida em SVG, construída para o projeto. Não depende de fonte, traço, efeitos, filtros ou imagens vinculadas. As variantes usam a mesma geometria; mudam apenas o preenchimento e, nos ícones de plataforma, a margem necessária ao recorte.

`geometria.json` é a fonte das coordenadas. O canvas mestre tem 128 × 128 unidades; o símbolo ocupa 96 × 72, centralizado, entre x=16/112 e y=28/100.

## Variantes

| Recurso | Aplicação |
| --- | --- |
| `svg/symbol-green.svg` | Símbolo verde operacional sobre branco ou papel |
| `svg/symbol-lime.svg` | Símbolo lima sobre floresta |
| `svg/symbol-dark.svg` | Uma cor escura para impressão, materiais claros e restrições de cor |
| `svg/symbol-white.svg` | Uma cor branca para fundos escuros |
| `svg/app-icon.svg` | Tile quadrado opaco: floresta com símbolo lima |
| `svg/favicon.svg` | Tile com cantos arredondados para aba/favoritos, independente da cor da barra do navegador |
| `svg/maskable.svg` | Tile opaco com símbolo reduzido para a zona segura de ícones web maskable |
| `svg/android-foreground.svg` | Camada frontal transparente, respeitando a zona segura do Android |
| `svg/android-background.svg` | Fundo floresta de cobertura completa |
| `svg/android-monochrome.svg` | Máscara branca transparente para ícone temático do Android |
| `svg/android-composite.svg` | Composição de referência das camadas; não substitui os recursos adaptativos |
| `svg/android-themed-preview.svg` | Variante de apresentação que simula a aplicação de uma cor temática |

Os símbolos isolados têm PNGs transparentes de 32, 128 e 512 px em `png/`. Preferir SVG nos layouts que o suportam. No Flutter, a etapa 5 decidirá entre desenho vetorial local e recurso de imagem adequado ao widget, preservando a fonte em vetor.

## Tamanho e área de proteção

- Mínimo técnico: canvas de **16 × 16 px**, destinado à aba do navegador.
- Recomendado no layout: **32 px ou mais**, com nome ou rótulo ao lado quando for importante identificar o produto.
- Referências verificadas: 16, 32, 48 e 192 px, em fundos claros e escuros; as amostras pequenas na apresentação usam tamanho real de CSS, sem ampliá-las artificialmente.
- Área de proteção mínima: **16 unidades do mestre**, equivalentes a 1/8 do lado do canvas. Medir a partir da silhueta. O arquivo mestre já inclui esse espaço nas laterais e mais espaço acima/abaixo; não acrescentar margens excessivas automaticamente.
- Preservar proporção, orientação e forma. Usar a variante clara/escura correta, sem contornos adicionais, gradientes, sombras no símbolo ou palavras dentro do ícone.
- Frase de marca, descritor e assinatura pessoal ficam fora do símbolo. A composição tipográfica usa Manrope na interface; não está embutida nos arquivos do ícone.

## Web

| Arquivo | Uso preparado |
| --- | --- |
| `web/favicon.ico` | Contêiner com imagens nativas de 16, 32 e 48 px |
| `web/favicon-16.png`, `favicon-32.png`, `favicon-48.png` | Exportações próprias de cada tamanho |
| `web/apple-touch-icon.png` | 180 × 180 px, RGB e fundo opaco |
| `web/icon-192.png`, `icon-512.png` | Ícones quadrados convencionais, RGB |
| `web/icon-maskable-192.png`, `icon-maskable-512.png` | Variantes maskable com margem própria |
| `web/icons-manifest.json` | Trecho de referência para declarar os recursos no manifest |

Os tamanhos dos PNGs correspondem às imagens reais, e o ICO contém três entradas completas. Não se trata de renomear um PNG para `.ico`.

A variante maskable reduz a geometria em 0,84 e centraliza o resultado. O retângulo que contém o símbolo cabe em um círculo de raio 50,4 no canvas 128, dentro da zona central de raio 51,2 (40% do lado) descrita na [especificação Web App Manifest](https://www.w3.org/TR/appmanifest/#icon-masks). A margem é uma regra do recurso, e não deve ser removida no layout.

O trecho `icons-manifest.json` declara apenas imagens. Não adiciona suporte a operação offline, service worker, instalação nem novas garantias de funcionalidade. O manifest real da aplicação será adaptado na etapa de implementação pertinente.

## Android

`android/res/` mantém o nome `ic_launcher`, usado no manifest Flutter atual:

- PNGs legados por densidade: mdpi 48, hdpi 72, xhdpi 96, xxhdpi 144 e xxxhdpi 192 px.
- `drawable/ic_launcher_foreground.xml`: vetor lima com margem adaptativa.
- `drawable/ic_launcher_monochrome.xml`: a mesma máscara em branco.
- `values/wms_launcher_colors.xml`: fundo floresta.
- `mipmap-anydpi-v26/ic_launcher.xml`: composição adaptativa de fundo e frente.
- `mipmap-anydpi-v33/ic_launcher.xml`: composição que também declara a camada monocromática.
- `android/layers/`: exportações PNG das três camadas em 432 px para inspeção/ferramentas que precisem de bitmap.

O canvas adaptativo é 108 × 108. A geometria tem escala 0,525 e translação 20,4; seu retângulo delimitador cabe em um círculo de raio 31,5, dentro do raio 33 da zona segura central. Frente e fundo permanecem separados, sem sombra ou máscara gravada nos recursos. As dimensões e a composição seguem a [documentação oficial de ícones adaptativos](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive).

As máscaras circular e arredondada da apresentação são simulações para inspeção do recorte. A forma e os efeitos reais dependem do launcher; serão conferidos no aplicativo na etapa 5.

## iOS

`ios/AppIcon.appiconset/` contém os PNGs e `Contents.json` compatíveis com as entradas iPhone/iPad já presentes no repositório Flutter. Inclui a imagem de 1024 px para o catálogo. Os PNGs são RGB, sem canal alpha, com fundo quadrado opaco e sem cantos arredondados gravados.

Este é um conjunto preparado para o catálogo atual, ainda sem integração ou build Apple nesta etapa. A configuração efetiva, as aparências exigidas pelo destino de publicação e os testes de distribuição deverão ser conferidos na etapa 5 no ambiente de plataforma disponível. Referência geral: [Apple — App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons).

## Reproduzir os recursos

Na raiz do repositório, com Python 3.10+, Node e Playwright/Chromium já instalados no web:

```bash
python3 docs-gerais/identidade-visual/icone/gerar-artefatos.py
```

O script lê a geometria e as cores em `../tokens.json`, gera SVGs e recursos declarativos, renderiza diretamente cada PNG no tamanho pedido, valida dimensões e ausência de alpha dos recursos opacos, monta o ICO, registra SHA-256 e cria `wms-icon-assets.zip`.

`exportacoes.json` descreve as imagens geradas; `manifesto.json` descreve os arquivos e seus hashes. O ZIP não inclui o próprio ZIP nem os materiais pessoais da futura seleção de assinatura. Os scripts dependem do contexto do repositório para regeneração; os ícones exportados são independentes dele.

## Publicação e continuidade

O autor solicitou que a etapa 4 publique uma documentação de branding na rota **`/documentacao/branding`**, junto dos artefatos desta etapa. A página deverá apresentar conceito, cores, fontes, regras de uso, prévias e downloads dos recursos e do pacote completo, com acesso público e sem dependência de sessão/API.

Os arquivos permanecem nesta pasta local durante as etapas de criação. As cópias utilizadas nos clientes e na página pública serão versionadas nos respectivos submódulos na implementação. A assinatura pessoal continua para a etapa 3.

## Verificação desta entrega

- **12 SVGs**, sem scripts ou recursos vinculados; uma única geometria de símbolo.
- **44 PNGs**, com dimensões nativas conferidas; imagens opacas em RGB sem canal alpha.
- **ICO** com três entradas PNG verificadas, de 16, 32 e 48 px.
- **Android:** XMLs analisados, recursos por densidade e limite geométrico conservador de raio 31,5 dentro da zona segura de raio 33.
- **Web maskable:** limite geométrico conservador de raio 50,4 dentro da zona segura de raio 51,2.
- **iOS:** catálogo equivalente às 19 entradas existentes no projeto e cada imagem conferida em seu tamanho e escala.
- **Integridade:** SHA-256 dos arquivos do inventário e conteúdo do ZIP conferidos.
- **Apresentação:** oito verificações em Chromium, sem rede, cobrindo variantes, máscaras, teclado, ajuste de tamanho, download do ZIP, ligação com o guia, movimento reduzido e leitura sem JavaScript. As amostras 16/32/48/192 mantêm seu tamanho real em sete larguras de tela, de 320 a 1440 px, sem overflow da página.

Estes resultados verificam os artefatos da etapa 2. A aplicação e os builds dos clientes continuam para as etapas 4 e 5.
