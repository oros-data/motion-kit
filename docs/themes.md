# Temas

Um tema é uma pasta em `themes/<nome>/` com:

- `colors.toml`: paleta no formato do [Omarchy](https://github.com/basecamp/omarchy) (chaves `background`, `lighter_background`, `dark_background`, `accent`, `foreground`, `bright_foreground`, `muted`, `selection`, `red` … `bright_magenta`).
- `NOTICE`: de onde veio e a licença.
- `theme.toml` (opcional): `[roles]` com papéis sobrescritos, por exemplo `secondary = "#D2689C"`.

Mapeamento para os sete papéis: `background` ← background, `surface` ← lighter_background, `primary` ← accent, `secondary` ← magenta, `text` ← bright_foreground, `danger` ← red, `muted` ← mistura de foreground com background ajustada até 4.5:1 sobre fundo e superfície. O `muted` do Omarchy vira o token `line` (bordas). Os papéis de texto (`concept`, `aside`, `base`, `error`) são as cores de `identity.roles` clareadas em direção ao `text` até 5.5:1 sobre o fundo e 4.5:1 sobre a superfície; `primary` e `secondary` ficam intactos para bordas e brilho. No Osaka Jade isso levanta o verde #509475 para #7aa984 nos títulos; no Tokyo Night nada muda. Terminal: fundo ← dark_background, texto ← foreground, ANSI 30–37 ← background, red, green, yellow, blue, magenta, cyan, foreground; 90–97 ← muted, bright_*, bright_foreground; linha destacada ← selection.

Tema claro: o terminal é sempre escuro (quando `dark_background` não é escuro, o kit o deriva de `background`), mas `foreground`, `bright_foreground`, `lighter_background`, `magenta` e `red` também alimentam `muted`, `text`, `surface`, `secondary` e `danger`. Num tema claro, os papéis da marca vêm de `colors` em `identity.json`; `theme.toml` aceita `[roles]` e `[terminal]` para sobrescrever.

Temas incluídos: `tokyo-night` e `osaka-jade`.

## Adicionar um tema

1. Copie `colors.toml` de `themes/<nome>/` do Omarchy para `themes/<nome>/colors.toml`, sem alterar.
2. Crie `themes/<nome>/NOTICE` com uma linha de atribuição (MIT, Copyright (c) David Heinemeier Hansson).
3. Se um papel ficar estranho (nomes de cor que não batem com o matiz), ajuste em `theme.toml`.
4. `npm run identity:check -- --theme <nome>` mostra a tabela de contraste.

Uma identidade própria sem Omarchy: mantenha um tema como base para o terminal e preencha os sete papéis em `colors` no `identity.json`.
