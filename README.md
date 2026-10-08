# motion-kit

Kit para fazer vídeos de motion design com a sua identidade, usando qualquer agente de programação e renderizando no seu computador. Motor: [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0), fixado na versão 0.8.142.

## Antes da aula (15 min, com internet boa)

Leia [docs/pre-live.md](docs/pre-live.md). Resumo: Node 22+, ffmpeg, git, python3 e bash (no Windows, WSL2). Depois:

```bash
git clone <url-deste-repositorio> motion-kit
cd motion-kit
npm ci
npx hyperframes@0.8.142 browser ensure
npm run doctor
```

`doctor` precisa terminar com `tudo pronto.`

## Caminho de 60 a 90 minutos

1. **Prova de vida (5 min).** `npm run smoke` captura o exemplo, faz build, confere, tira snapshots e renderiza 3 segundos. Se passar, sua máquina renderiza.
2. **Sua identidade (15 min).** Edite `brand/identity.json`: nome, `theme` (`tokyo-night` ou `osaka-jade`), fontes, logo (troque `brand/logo.svg`), voz. `npm run identity:check` valida e mostra a tabela de contraste. Detalhes em [docs/identity.md](docs/identity.md) e [docs/themes.md](docs/themes.md).
3. **Veja o exemplo com a sua cara (5 min).** `npm run snapshot -- examples/primeiro-commit` e abra `build/primeiro-commit/snapshots/contact-sheet.jpg` e `phone-sheet-360.png`.
4. **Seu vídeo (30 min).** Peça ao agente, por exemplo: "faça um vídeo de 60 s explicando git add com a minha identidade; use a cena terminal com comandos reais". O agente segue `AGENTS.md`: copia o exemplo para `videos/<slug>/`, escreve `steps.json`, captura a saída real com `npm run capture`, escreve `video.json`, roda `npm run check` e `npm run snapshot`.
5. **Prévia e render (15 min).** `npm run preview -- videos/<slug>` (960x540, rápido) e depois `npm run render -- videos/<slug>` (1920x1080). O vídeo fica em `build/<slug>/renders/`.

## Comandos

| comando | o que faz |
|---|---|
| `npm run doctor` | confere node, ffmpeg, python3, bash, git, navegador de render, identidade |
| `npm run identity:check` | valida `brand/identity.json`, arquivos e contraste |
| `npm run capture -- <pasta>` | roda `steps.json` em um repositório descartável e grava `transcript.json` |
| `npm run build -- <pasta>` | compila identidade + vídeo em `build/<slug>/` |
| `npm run dev -- <pasta>` | abre o Studio do HyperFrames no navegador (preview ao vivo) |
| `npm run check -- <pasta>` | lint, runtime, layout, movimento e contraste |
| `npm run snapshot -- <pasta>` | quadros-chave + contact sheet + folha de 360 px |
| `npm run preview -- <pasta>` | render em 960x540 |
| `npm run render -- <pasta>` | render final 1920x1080 30 fps (CPU; `KIT_GPU=1` usa a GPU) |
| `npm run smoke` | tudo acima no exemplo, com render de 3 s |

`<pasta>` é `examples/primeiro-commit` ou `videos/<slug>`. Opções: `--theme osaka-jade` troca o tema só neste build; `--out arquivo.mp4` no render.

## Se algo falhar

- `doctor` reclama do navegador: `npx hyperframes@0.8.142 browser ensure` de novo (baixa ~260 MB).
- Render lento: use `npm run preview` para iterar; o render final de 60 s leva cerca de 1 min em CPU de notebook recente, 2 a 3x mais em máquinas antigas.
- Sem python3 ou bash (Windows sem WSL2): use um `transcript.json` capturado por um colega e pule `capture`.
- Mais em [docs/render.md](docs/render.md).

## Licença

Uso pessoal pelos participantes das aulas; veja [LICENSE](LICENSE). Componentes de terceiros em [NOTICES.md](NOTICES.md).
