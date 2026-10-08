<!-- firstmate:maintained-by-project -->
# AGENTS.md — contrato do agente no motion-kit

Você é o agente de programação de um aluno. Este repositório gera vídeos de motion design com HyperFrames, renderizados na máquina do aluno, com a identidade dele. Siga estas regras sem exceção.

## Saudação

- Na PRIMEIRA resposta de cada sessão, comece exatamente com `Fala meu polvo!` e nada antes disso.
- Não repita a saudação nas respostas seguintes.
- A saudação é só para o chat. Nunca escreva essa frase em commits, arquivos, conteúdo gerado ou qualquer artefato.

## O que é o quê

- `brand/identity.json`: a identidade do aluno (nome, tema, cores, fontes, logo, voz). Validada por `schemas/identity.schema.json`. É a única fonte de cores e fontes.
- `themes/<nome>/colors.toml`: paletas no formato do Omarchy. `theme` em identity.json escolhe uma; `colors` em identity.json sobrescreve papéis individuais.
- `videos/<slug>/`: um vídeo = `video.json` (cenas e tempos), `steps.json` (comandos do terminal), `transcript.json` (saída real capturada) e `assets/`.
- `examples/primeiro-commit/`: exemplo completo de 31 s. Copie para começar um vídeo novo.
- `src/scenes/*.html`: biblioteca de cenas (uma sub-composição HyperFrames por arquivo; props de cada uma em `docs/scenes.md`). `src/kit.js`: utilitários (ANSI, fade, logo). `tools/`: build e comandos.
- `build/<slug>/`: saída gerada pelo build. Nunca edite nem versione.

## Receitas

### 1. Vídeo novo
1. `cp -r examples/primeiro-commit videos/<slug>` e apague `transcript.json` e `.work/` copiados.
2. Escreva `video.json`: lista `scenes`, cada uma com `id` (minúsculas e hífens), `scene` (nome de arquivo em `src/scenes/`), `seconds` (exceto `terminal`, cuja duração vem da soma dos `wait` dos passos) e `props`. Mantenha 60 a 240 s no total.
3. Se houver cena `terminal`, escreva `steps.json` e capture (receita 3).
4. `npm run build -- videos/<slug>` imprime a grade de tempos. Depois siga o ciclo de validação.

### 2. Adicionar ou mudar uma cena
- Mudar: edite `props` em `video.json` ou o HTML da cena em `src/scenes/`.
- Nova cena: crie `src/scenes/<nome>.html` copiando `closing.html` como base. Regras: um `<template>` com `<style>` (comece com `/*__FONTS__*/`), um `<div data-composition-id="__ID__" data-width="1920" data-height="1080">` e um `<script>` que lê `window.KIT.items["__ID__"]`, monta o DOM a partir de `item.props`, cria `gsap.timeline({ paused: true })` e registra `window.__timelines["__ID__"] = tl`. O build troca `__ID__` pelo id da cena.
- Toda cor vem de `var(--primary)`, `--secondary`, `--text`, `--muted`, `--danger`, `--bg`, `--surface`, `--line`, `--concept`, `--aside`, `--base`, `--error`, `--term-*`, `--ansi-NN`. Toda fonte vem de `var(--font-display)` e `var(--font-mono)`.
- Fique fora da região do apresentador: x 1492–1848, y 830–1030 (canto inferior direito). Mostre-a com `--variables '{"debugSafe":true}'` no render.

### 3. Capturar saída real do terminal (nunca invente saída)
1. Em `steps.json`: `repo_name`, `terminal_columns` e `steps`, cada passo com `id`, `command` (bash), `wait` (segundos na tela), opcionais `callout`, `subcallout`, `highlight` (substring de uma linha da saída), `expected_exit` e `diagram` (lista de operações: `{"op":"chip","file":"X"}`, `{"op":"stage","files":[...]}`, `{"op":"commit","label":"..."}`).
2. `npm run capture -- videos/<slug>` roda os comandos em um repositório descartável (data fixa, locale C, cores ANSI ligadas) e grava `transcript.json`. Precisa de `bash` e `python3`; no Windows use WSL2.
3. Se a saída não for a esperada, corrija `steps.json` e capture de novo. Nunca edite `transcript.json` à mão. Versione o `transcript.json`.
4. Na cena `terminal`, `props.steps` escolhe um subconjunto de ids; sem ele, todos os passos entram.

### 4. Conferir quadros antes do render completo
1. `npm run check -- videos/<slug>`: lint + runtime + layout + movimento + contraste. Corrija todo erro antes de seguir.
2. `npm run snapshot -- videos/<slug>`: quadros em `build/<slug>/snapshots/` (contact-sheet.jpg e phone-sheet-360.png). Olhe os dois; texto ilegível a 360 px é defeito.
3. `npm run preview -- videos/<slug>`: render em 960x540, rápido.
4. Só então `npm run render -- videos/<slug>`. Nunca diga que conferiu um render sem ter olhado os snapshots.

## Regras duras das composições HyperFrames

- Todo elemento com tempo tem `data-start` e `data-duration`; o build já faz isso para as cenas.
- Cada cena registra UMA timeline GSAP pausada em `window.__timelines["<id>"]`; nada roda sozinho.
- Proibido: `Date.now()`, `Math.random()`, `fetch`, `setTimeout`, qualquer rede. Tudo é função determinística do tempo.
- Anime `transform` e `opacity` (x, y, scale), nunca `left`/`top`.
- Só fontes locais (`src/fonts/` ou `brand/fonts/`) e GSAP local (`src/vendor/`). Nenhum CDN.
- Não use `publish`, render hospedado, login ou o app desktop do HyperFrames. A telemetria já está desligada nos scripts.

## Regras da identidade

- Nunca escreva cor em hex, rgb ou nome de fonte em `src/`; leia os tokens.
- Nunca altere `src/fonts/`, `src/vendor/` ou `themes/*/colors.toml`. Para um tema novo, copie a pasta de um tema do Omarchy para `themes/<nome>/` com um `NOTICE`.
- `npm run identity:check` valida o schema, os arquivos e o contraste. Rode antes de qualquer render quando mudar a identidade.

## Ciclo de validação

`npm run doctor` (uma vez) → editar → `npm run check` → `npm run snapshot` → `npm run preview` → `npm run render`. O único teste automatizado do repositório é `npm run smoke`; não crie testes unitários, frameworks de teste nem mocks.

## Preview ao vivo

`npm run dev -- videos/<slug>` abre o Studio do HyperFrames no navegador sobre `build/<slug>/`. É para olhar e ajustar tempos; mudanças definitivas vão em `src/scenes/` e `video.json`.

## Manutenção deste arquivo

Guarde aqui só o que serve a quase toda sessão de agente neste projeto. Não repita o que o código já mostra; aponte para o arquivo ou comando. Prefira reescrever ou podar a acrescentar. Ao atualizar, mantenha esta barra para todos os agentes e as entradas curtas.
