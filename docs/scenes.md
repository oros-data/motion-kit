# Catálogo de cenas

Cada cena é um arquivo HTML e uma entrada em `video.json`: `{"id": "...", "scene": "<nome>", "seconds": N, "props": {...}}`. As cenas do kit ficam em `src/scenes/`; as cenas próprias de um vídeo ficam em `videos/<slug>/scenes/` (veja abaixo). Cores e fontes vêm sempre da identidade. Imagens do vídeo ficam em `videos/<slug>/assets/` e as cenas as usam como `assets/x.png`. Textos omitidos usam `voice.sample_copy` e `voice.tagline` da identidade.

| cena | para quê | props |
|---|---|---|
| `title` | cartão de abertura: logo, kicker, título digitado dentro de uma moldura neon, subtítulo | `kicker`, `text`, `sub`, `logo: false` para omitir o logo |
| `logo` | revelação do logo com moldura e onda, nome e tagline | `height` (px do logo), `name`, `tagline` (até cerca de 30 caracteres; texto maior passa da moldura; string vazia esconde) |
| `kinetic` | frase grande que entra palavra por palavra | `text`, `highlight: ["palavra", ...]` (cor conceito), `aside: [...]` (cor apoio), `sub` |
| `cards` | título e 1 a 4 cartões numerados em sequência | `kicker`, `headline`, `cards: [{title, body, role?}]`, `footer` |
| `callout` | uma afirmação com barra lateral e explicação | `kicker`, `text`, `sub`, `footer` |
| `compare` | duas colunas lado a lado | `kicker`, `headline`, `left: {title, items: [...], role?}`, `right: {...}`, `vs`, `footer` |
| `flow` | 2 a 4 etapas ligadas por setas | `kicker`, `headline`, `steps: [{label, sub, role?}]`, `footer` |
| `terminal` | terminal com saída real do `transcript.json` e diagrama de lugares sincronizado | `prompt`, `window_title`, `steps: [ids]` (subconjunto), `transcript` (arquivo), `places: [{label, role?}]`, `labels: {step, exit, no_output, tag, footer}` |
| `closing` | encerramento: logo, kicker, linhas de resumo, próximo passo, tagline | `kicker`, `lines: [...]`, `next`, `tagline`, `logo: false` |
| `hero` | abertura grande: eyebrow, linhas gigantes (uma delas em placa com cursor piscando) e subtítulo | `eyebrow`, `lines: [...]` (cerca de 18 caracteres por linha), `accent` (índice da linha em placa), `sub` (`**trecho**` em destaque), `logo: true` para a marca d'água do logo |
| `hub` | diagrama de hub: fontes à esquerda, nó central e destinos à direita, com pontos viajando pelas linhas | `kicker`, `headline`, `sources: [...]` (1 a 5), `targets: [...]` (1 a 4), `center` (rótulo acima do nó), `footer` (`**trecho**` em destaque), `logo: false` para trocar o logo do nó por `name` (padrão: nome da identidade); rótulos até cerca de 16 caracteres |
| `counter` | 1 a 3 contadores animados, cada um com uma barra de progresso | `kicker`, `headline`, `stats: [{kicker, value, prefix?, suffix?, decimals?, max?, label, note}]`; a barra enche até `value / max` (sem `max`, enche toda) |
| `proof` | mural de prova: título e 1 a 3 cartões com nome e afirmação, com imagem opcional | `kicker`, `headline`, `lead`, `cards: [{name, text, image?}]`; `image` é um arquivo em `assets/` (por exemplo `assets/parceiro.png`) |
| `chart` | gráfico de barras e linhas, desenhado em escala a partir dos dados | `kicker`, `headline`, `categories: [...]`, `series: [{label, values: [...], kind?, role?, labels?}]`, `kind` (`bars` ou `line`, padrão `bars`), `unit`, `prefix`, `decimals`, `footer` |

`role` aceita `concept`, `aside`, `base`, `error` (mapeados em `identity.roles`) ou um papel de cor (`primary`, `secondary`, `muted`, `text`, `danger`).

## Chart: dados e escala

`series[].values` tem um número por item de `categories`, todos maiores ou iguais a zero. Todas as séries usam uma única escala, de 0 até um teto arredondado acima do maior valor, então barras e linhas se comparam diretamente. `kind` na série vence o `kind` da cena, o que permite barras com uma linha de meta por cima. A cor vem de `role` (padrão: `concept`, `aside`, `text` na ordem das séries). Cada barra mostra o valor; os pontos de uma linha só mostram o valor quando não há barras na cena, e `labels: true` ou `false` na série muda isso. A legenda aparece com mais de uma série. Use até cerca de 8 categorias e até 3 séries; rótulos de categoria curtos (até cerca de 10 caracteres).

## Terminal: o que vem de `steps.json`

Cada passo: `id`, `command` (comandos maiores que a largura da janela quebram em linhas de continuação, no comando atual e no anterior esmaecido; a saída real quebra do mesmo jeito), `wait` (segundos na tela; a cena dura a soma dos waits), `callout`, `subcallout`, `highlight` (substring de uma linha da saída que recebe a barra de destaque), `expected_exit` (padrão 0; um erro esperado vira saída vermelha com `exit 1`) e `diagram`, uma lista de operações no diagrama de lugares:

Cada passo começa na raiz do repositório descartável e o `cd` não persiste entre passos. A saída real vai para o vídeo: evite `ls -l` e comandos que imprimem nome de usuário, hostname, datas ou caminhos absolutos do home.

| operação | efeito |
|---|---|
| `{"op": "chip", "file": "README.md", "place": 0}` | um arquivo aparece no lugar (padrão: o primeiro) |
| `{"op": "chip", "file": ".env", "role": "error", "tag": "ignorado"}` | arquivo marcado, encostado na borda do lugar |
| `{"op": "stage", "files": ["README.md"], "from": 0, "to": 1}` | cópias dos arquivos viajam de um lugar para outro |
| `{"op": "commit", "label": "primeiro commit", "from": 1, "to": 2}` | as cópias somem, os originais esmaecem e um nó com o hash lido da saída real aparece no destino |

Os lugares vêm de `props.places` na cena; sem `places`, só o terminal e o callout aparecem.

A janela do terminal usa a paleta escura do tema mesmo em identidades claras (tokens `--term-*`).

## Cenas próprias do vídeo

Para uma cena que o kit não tem, crie `videos/<slug>/scenes/<nome>.html` (minúsculas e hífens) a partir de `src/scenes/closing.html` e use `"scene": "<nome>"` no `video.json`. O build procura primeiro em `videos/<slug>/scenes/` e depois em `src/scenes/`, então a cena viaja com o vídeo, passa pelos mesmos `check` e `snapshot` e não é tocada por `npm run update`. Para mudar uma cena do kit, copie-a para essa pasta com outro nome. Um arquivo com o mesmo nome de uma cena do kit a substitui só neste vídeo, e o build imprime um aviso. As regras da cena (template, `__ID__`, timeline pausada, tokens de cor e fonte) estão em `AGENTS.md`.

## Formatos e região da câmera

`format` em `video.json` define o canvas do vídeo inteiro: build, `check`, `snapshot`, `preview` e `render`. Sem `format`, vale `16:9`.

| `format` | canvas | uso | região da câmera (livre em todas as cenas) |
|---|---|---|---|
| `16:9` | 1920x1080 | aula, YouTube | x 1492–1848, y 830–1030 (356x200) |
| `9:16` | 1080x1920 | Reels, Shorts, stories | x 652–1008, y 1440–1760 (356x320) |
| `1:1` | 1080x1080 | feed quadrado | x 652–1008, y 830–1030 (356x200) |

No `9:16`, o conteúdo fica entre y 150 e y 1400; abaixo disso ficam a câmera e a interface do app. HUD no topo (nome // título à esquerda, tagline à direita; quebra em duas linhas quando falta largura) e barra de progresso embaixo são do kit, não da cena.

As nove cenas se ajustam sozinhas aos três formatos. Uma cena nova faz o mesmo: o elemento raiz já é um container CSS (`container-type: size`), então o layout muda com `@container (aspect-ratio <= 1)` (quadrado e vertical) e `@container (aspect-ratio < 1)` (só vertical), e larguras usam `%` ou `calc(100% - ...)`. Tamanhos de fonte em px valem nos três formatos, porque o lado menor é sempre 1080. No script, `window.KIT.width`, `window.KIT.height`, `window.KIT.format` e `window.KIT.camera` dão o canvas e a região da câmera.

Limite: o `terminal` com `places` não cabe no `1:1` e o build para com uma mensagem; no `1:1`, use o terminal sem `places`. No `9:16`, o diagrama de lugares vai para baixo do terminal, ao lado do callout.

## Portões de qualidade do `npm run check`

O `check` roda, depois do lint do HyperFrames, `tools/gates.mjs`: monta as cenas num navegador sem cabeça, posiciona a timeline de cada cena a cada 0,25 s (todo o vídeo de 40 s leva cerca de 1 s) e mede o que está visível. Considera só elementos com opacidade acima de 5% (texto em entrada ou saída, com opacidade abaixo de 95%, só entra nas regras de apresentador e fonte). O HUD e a barra de progresso são do kit e não entram. Cada achado diz cena, tempo e elemento, e o resultado ERRO falha o check.

| regra | nível | dispara quando | o que fazer |
|---|---|---|---|
| `overflow` | erro | texto ou caixa passa mais de 2 px da borda do quadro 1920x1080, da moldura desenhada em SVG (como a do `logo` e do `title`) ou de um contêiner com fundo, borda ou `overflow` cortando | encurte o texto (a `tagline` do `logo` cabe em cerca de 30 caracteres), reduza a fonte ou a largura, quebre a linha |
| `empty` | erro | uma janela maior que `gates.emptySeconds` (padrão 1,0 s) em que a cena não mostra nenhum texto nem elemento gráfico | faça um elemento entrar antes, divida o conteúdo ou reduza `seconds` |
| `small-text` | aviso abaixo de `gates.minFontPx` (padrão 18 px); erro abaixo de 14 px | tamanho renderizado da fonte (com `scale` aplicado) menor que o mínimo | aumente a fonte; um celular mostra 1920 px em 360 px (fator 0,1875), então 18 px viram 3,4 px e 14 px viram 2,6 px, o limite em que até texto em negrito vira borrão. 18 px é o menor rótulo das cenas do kit |
| `presenter` | erro | texto, caixa, imagem ou forma gráfica entra em x 1492–1848, y 830–1030 | mova o elemento; veja a região com `--variables '{"debugSafe":true}'` |
| `long-word` | erro; aviso quando a palavra ocupa 85% do contêiner | palavra ou string sem espaço mais larga que o contêiner, que não consegue quebrar (URLs, hashes, termos longos) | troque, abrevie ou aumente o contêiner; `overflow-wrap: anywhere` já quebra e não dispara |

Para aceitar um achado de propósito, adicione à cena em `video.json` uma entrada justificada. Sem `reason` (mínimo 8 caracteres) ou com regra inexistente o check falha, e o achado aparece como `SILENCIADO` com o motivo:

```json
{ "id": "rodape", "scene": "callout", "seconds": 5, "props": {...},
  "ignore": [{ "rule": "small-text", "reason": "rodapé legal exigido, não precisa ser lido no celular" }] }
```

Limites do vídeo inteiro, também em `video.json`: `"gates": { "emptySeconds": 1.0, "minFontPx": 18 }`.

## Ver todas as cenas

Monte um `video.json` com uma cena de cada (o agente sabe fazer isso a partir desta tabela) e rode `npm run snapshot -- videos/<slug>`.
