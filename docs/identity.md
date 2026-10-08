# Identidade (`brand/identity.json`)

Validada por `schemas/identity.schema.json`. `npm run identity:check` mostra erros e a tabela de contraste.

| campo | o que é |
|---|---|
| `name`, `slug`, `language` | nome exibido no HUD, identificador em minúsculas, idioma do HTML (`pt-BR`) |
| `theme` | pasta em `themes/` que fornece as cores base e as 16 cores do terminal |
| `colors` | sobrescreve papéis do tema: `background`, `surface`, `primary`, `secondary`, `muted`, `text`, `danger` (hex). `{}` usa só o tema |
| `roles` | qual cor cada papel semântico usa: `concept` (ideia central), `aside` (apoio), `base`, `error` |
| `fonts.display`, `fonts.mono` | família e arquivos (`path` relativo à raiz, `weight` como `"700"` ou `"100 900"`). Famílias incluídas no kit: Inter (sans, para títulos e texto) e JetBrains Mono (mono, para terminal e rótulos); não há fonte arredondada incluída. Para usar a sua: copie o `.ttf`, `.otf` ou `.woff2` e o arquivo de licença para `brand/fonts/` e aponte `files` para `brand/fonts/<arquivo>` com o `weight` do arquivo |
| `logo` | `file` (SVG; use `currentColor` para herdar a cor primária), `min_height_px`, `clearspace_px`, `on` (`dark` ou `light`) |
| `voice` | `tone` (3 a 5 palavras), `tagline` (aparece no HUD e no encerramento), `sample_copy.title` e `caption` (textos padrão) |
| `canvas` | `1920x1080`, `fps` 30 |
| `mode` | `dark` ou `light` (usado quando `colors.background` é próprio) |

A janela da cena `terminal` usa sempre a paleta escura do tema (`themes/<tema>/colors.toml`), com os próprios tons de texto, prompt e destaque ajustados para contraste, independentemente de `mode` e de `colors`: uma identidade clara mantém o terminal escuro e passa o `check`.

Regras de contraste (medidas pelo kit): texto sobre fundo e sobre superfície 4.5:1 ou mais (falha), `muted` 4.5:1 (o kit recalcula `muted` do tema para passar), `primary`, `secondary` e `danger` 3:1 (aviso). Em identidade clara, defina também `colors.danger` (por exemplo `#b3261e`) para evitar o aviso de contraste. Olhe sempre `phone-sheet-360.png`: o que não se lê a 360 px de largura não se lê no celular.

Logo raster (PNG, JPG) precisa de um SVG que o embrulhe: `<svg viewBox="0 0 W H"><image href="data:image/png;base64,..."/></svg>`; ele não herda `currentColor`.

Tema claro: `foreground`, `bright_foreground`, `lighter_background`, `magenta` e `red` do `colors.toml` também viram os papéis `muted`, `text`, `surface`, `secondary` e `danger`, enquanto o terminal usa uma paleta escura própria. Para uma marca clara, defina esses papéis em `colors` no `identity.json` e confira com `npm run identity:check`.

Use só logos e fontes que você tem direito de usar.
