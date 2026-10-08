# Render e alternativas

- `npm run render -- videos/<slug>`: 1920x1080, 30 fps, H.264 com faixa AAC silenciosa. Padrão amigável para CPU: `--no-browser-gpu --workers 2`. `KIT_GPU=1 npm run render -- …` deixa o HyperFrames usar a GPU.
- `npm run preview -- videos/<slug>`: 960x540, cerca de 3x mais rápido. Use para iterar.
- `--out caminho.mp4` muda o destino; `--theme nome` troca o tema só nesse build.
- `--variables '{"debugSafe":true}'` direto no `npx hyperframes@0.8.142 render build/<slug>` pinta a região reservada ao apresentador (canto inferior direito, 356x200).

Tempos medidos (Intel Core Ultra 7 155H, 22 threads, 30 GB, Linux, CPU com `--no-browser-gpu --workers 2`): o exemplo de 31 s (930 quadros) renderiza em 48 s em Tokyo Night e 47 s em Osaka Jade (captura 39 s, codificação 8 s); o `smoke` de 3 s em 11 s. Notebook antigo: 2 a 3x mais; o HyperFrames usa 1 worker sozinho em máquinas com 8 GB ou menos.

## Se não renderiza

1. `npm run doctor` e resolva os itens FALHA.
2. Navegador: `npx hyperframes@0.8.142 browser ensure --force`.
3. Memória baixa (8 GB ou menos): o HyperFrames entra sozinho em modo de 1 worker.
4. Sem ffmpeg no Windows: instale dentro do WSL2.
5. Último recurso: outro participante renderiza o seu `videos/<slug>/` (o repositório é portátil; versione o `transcript.json`).

Nunca use `hyperframes publish`, render hospedado ou o app desktop: o kit é local.
