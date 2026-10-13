# Identidade (`brand/identity.json`)

Validada por `schemas/identity.schema.json`. `npm run identity:check` mostra erros e a tabela de contraste.

| campo | o que é |
|---|---|
| `name`, `slug`, `language` | nome exibido no HUD, identificador em minúsculas, idioma do HTML (`pt-BR`) |
| `theme` | pasta em `themes/` que fornece as cores base e as 16 cores do terminal |
| `colors` | sobrescreve papéis do tema: `background`, `surface`, `primary`, `secondary`, `muted`, `text`, `danger` (hex). `{}` usa só o tema |
| `roles` | qual cor cada papel semântico usa: `concept` (ideia central), `aside` (apoio), `base`, `error` |
| `fonts.display`, `fonts.body`, `fonts.mono` | três vagas de fonte: `display` (títulos), `body` (texto corrido, descrições, legendas) e `mono` (terminal, rótulos e código). `body` é opcional: sem ele o texto corrido usa a fonte `display`. Cada fonte tem `family`, `files` e, opcional, `license` (veja abaixo). Em `files`, um arquivo por peso: `path` relativo à raiz e `weight` como `"400"` ou `"100 900"` (fonte variável). Pesos suportados: Regular 400, Medium 500, SemiBold 600 e Bold 700; falta de 400 ou 700 gera aviso e o navegador usa o peso mais próximo. Famílias incluídas no kit: Inter (sans) e JetBrains Mono (mono); não há fonte arredondada incluída |
| `logo` | `file` (SVG, PNG, WebP ou JPG dentro do repositório; em SVG use `currentColor` para herdar a cor primária), `min_height_px`, `clearspace_px`, `on` (fundo para o qual o logo foi feito: `dark` ou `light`) |
| `voice` | `tone` (3 a 5 palavras), `tagline` (aparece no HUD e no encerramento), `sample_copy.title` e `caption` (textos padrão) |
| `canvas` | `1920x1080`, `fps` 30 |
| `mode` | `dark` ou `light` (usado quando `colors.background` é próprio) |

A janela da cena `terminal` usa sempre a paleta escura do tema (`themes/<tema>/colors.toml`), com os próprios tons de texto, prompt e destaque ajustados para contraste, independentemente de `mode` e de `colors`: uma identidade clara mantém o terminal escuro e passa o `check`.

Regras de contraste (medidas pelo kit): texto sobre fundo e sobre superfície 4.5:1 ou mais (falha), `muted` 4.5:1 (o kit recalcula `muted` do tema para passar), `primary`, `secondary` e `danger` 3:1 (aviso). Em identidade clara, defina também `colors.danger` (por exemplo `#b3261e`) para evitar o aviso de contraste. Olhe sempre `phone-sheet-360.png`: o que não se lê a 360 px de largura não se lê no celular.

Fontes próprias: copie os `.ttf`, `.otf` ou `.woff2` e o arquivo de licença para `brand/fonts/` e aponte `files` para `brand/fonts/<arquivo>`. O `identity:check` exige, para cada arquivo de fonte, um arquivo de licença (nome com `OFL`, `LICENSE`, `COPYING` ou `NOTICE`) ao lado dele; em `brand/fonts/` solto o nome do arquivo de licença precisa conter o nome da família (`OFL-Roboto.txt` para `Roboto`). Sem arquivo de licença, registre em `license` da fonte que você conferiu o direito de usá-la em vídeo (por exemplo `"OFL-1.1"`). O `identity:check` e o `doctor` listam a fonte e os pesos carregados de cada vaga.

```json
"fonts": {
  "display": { "family": "Liberation Serif", "files": [
    { "path": "brand/fonts/LiberationSerif-Regular.ttf", "weight": "400" },
    { "path": "brand/fonts/LiberationSerif-Bold.ttf", "weight": "700" } ] },
  "body": { "family": "Roboto", "files": [
    { "path": "brand/fonts/Roboto-Regular.ttf", "weight": "400" },
    { "path": "brand/fonts/Roboto-Medium.ttf", "weight": "500" },
    { "path": "brand/fonts/Roboto-Bold.ttf", "weight": "700" } ] },
  "mono": { "family": "Adwaita Mono", "files": [
    { "path": "brand/fonts/AdwaitaMono-Regular.ttf", "weight": "400" },
    { "path": "brand/fonts/AdwaitaMono-Bold.ttf", "weight": "700" } ] }
}
```

Nas cenas, `var(--font-display)`, `var(--font-body)` e `var(--font-mono)` são as únicas fontes permitidas.

Tema claro: `foreground`, `bright_foreground`, `lighter_background`, `magenta` e `red` do `colors.toml` também viram os papéis `muted`, `text`, `surface`, `secondary` e `danger`, enquanto o terminal usa uma paleta escura própria. Para uma marca clara, defina esses papéis em `colors` no `identity.json` e confira com `npm run identity:check`.

## Logo

Aponte `logo.file` direto para o arquivo, sem embrulhar nada. O build cuida do resto e a altura e o posicionamento são os mesmos para todos os formatos.

- **SVG** (melhor opção): vetorial e recolorível. Troque as cores fixas por `currentColor` (herda `--primary`). Precisa de `viewBox`, até 512 KB. É rejeitado se tiver `<script>`, `<foreignObject>`, atributos `on...`, `javascript:`, `@import`, DOCTYPE/ENTITY ou referência fora do arquivo (`href`/`url()` só para `#id` ou imagem `data:` png/jpeg/webp). A mensagem de erro diz o que remover.
- **PNG ou WebP** com fundo transparente: embutido como está, mantendo a proporção; não recolore. Até 4 MB e 4096 px por lado; mire em ~1000 px de altura. Uma altura menor que 2x `min_height_px` gera aviso de serrilhado.
- **JPG** (ou PNG/WebP sem transparência): aparece como um retângulo. O build avisa com a razão de contraste da borda do logo contra o fundo do vídeo.
- O caminho é relativo à raiz do repositório; arquivos fora dele (inclusive via link simbólico) são recusados. O formato é conferido pelo conteúdo, não pela extensão.
- `logo.on` diz em que fundo o logo funciona (`dark` = logo claro). Se não bater com o modo da identidade, `identity:check` e o build avisam; em raster eles também medem a parcela do logo com contraste abaixo de 3:1 contra o fundo.

### Receita: converter o logo de uma página em arquivo usável

1. Procure o logo em SVG: abra a página, clique com o botão direito no logo e use "Inspecionar"; se for `<svg>`, copie o elemento (Copy > Copy outerHTML) para `brand/logo.svg` e adicione `xmlns="http://www.w3.org/2000/svg"` e `viewBox` se faltarem. Ou baixe o arquivo `.svg` que a página referencia.
2. Se só existir imagem, baixe a maior versão em PNG ou WebP com fundo transparente (evite JPG e capturas de tela).
3. Salve em `brand/` (por exemplo `brand/logo.png`) e ajuste `logo.file`. Para um logo de página escura, `logo.on` é `dark`.
4. Rode `npm run identity:check` e depois `npm run snapshot -- videos/<slug>`; olhe o logo no `phone-sheet-360.png`.

Use só logos e fontes que você tem direito de usar.
