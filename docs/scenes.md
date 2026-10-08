# Catálogo de cenas

Cada cena é um arquivo em `src/scenes/` e uma entrada em `video.json`: `{"id": "...", "scene": "<nome>", "seconds": N, "props": {...}}`. Cores e fontes vêm sempre da identidade. Textos omitidos usam `voice.sample_copy` e `voice.tagline` da identidade.

| cena | para quê | props |
|---|---|---|
| `title` | cartão de abertura: logo, kicker, título digitado dentro de uma moldura neon, subtítulo | `kicker`, `text`, `sub`, `logo: false` para omitir o logo |
| `logo` | revelação do logo com moldura e onda, nome e tagline | `height` (px do logo), `name`, `tagline` (string vazia esconde) |
| `kinetic` | frase grande que entra palavra por palavra | `text`, `highlight: ["palavra", ...]` (cor conceito), `aside: [...]` (cor apoio), `sub` |
| `cards` | título e 1 a 4 cartões numerados em sequência | `kicker`, `headline`, `cards: [{title, body, role?}]`, `footer` |
| `callout` | uma afirmação com barra lateral e explicação | `kicker`, `text`, `sub`, `footer` |
| `compare` | duas colunas lado a lado | `kicker`, `headline`, `left: {title, items: [...], role?}`, `right: {...}`, `vs`, `footer` |
| `flow` | 2 a 4 etapas ligadas por setas | `kicker`, `headline`, `steps: [{label, sub, role?}]`, `footer` |
| `terminal` | terminal com saída real do `transcript.json` e diagrama de lugares sincronizado | `prompt`, `window_title`, `steps: [ids]` (subconjunto), `transcript` (arquivo), `places: [{label, role?}]`, `labels: {step, exit, no_output, tag, footer}` |
| `closing` | encerramento: logo, kicker, linhas de resumo, próximo passo, tagline | `kicker`, `lines: [...]`, `next`, `tagline`, `logo: false` |

`role` aceita `concept`, `aside`, `base`, `error` (mapeados em `identity.roles`) ou um papel de cor (`primary`, `secondary`, `muted`, `text`, `danger`).

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

## Layout fixo

Canvas 1920x1080. O canto inferior direito (x 1492–1848, y 830–1030) fica livre para a câmera do apresentador em todas as cenas. HUD no topo (nome // título à esquerda, tagline à direita) e barra de progresso embaixo são do kit, não da cena.

## Ver todas as cenas

Monte um `video.json` com uma cena de cada (o agente sabe fazer isso a partir desta tabela) e rode `npm run snapshot -- videos/<slug>`.
