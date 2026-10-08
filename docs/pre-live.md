# Antes da aula ao vivo

Faça isto um dia antes, com internet boa. Na aula não há tempo para downloads.

## 1. Programas

| programa | versão | como conferir |
|---|---|---|
| Node.js | 22 ou maior | `node -v` |
| ffmpeg | qualquer recente | `ffmpeg -version` |
| git | qualquer recente | `git --version` |
| python3 | 3.9 ou maior | `python3 --version` |
| bash | qualquer | `bash --version` |

- **Linux:** instale pelo gerenciador de pacotes da distribuição.
- **macOS:** `brew install node ffmpeg git python`. O bash já vem.
- **Windows:** use o **WSL2** (Ubuntu) e instale tudo dentro dele. O runner de captura precisa de bash e python3; o render funciona no Windows nativo, mas o caminho suportado na aula é o WSL2.

## 2. Um agente de programação

Qualquer um: Claude Code, Codex, Gemini CLI, Cursor, Copilot, OpenCode. O repositório traz `AGENTS.md` e os arquivos que cada agente lê.

## 3. O repositório

Abra https://github.com/oros-data/motion-kit, clique em **Use this template** e em **Create a new repository**, marque **Private** e dê um nome à sua cópia. Depois clone a SUA cópia:

```bash
git clone <url-da-sua-copia> motion-kit
cd motion-kit
npm ci
HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_NO_UPDATE_CHECK=1 npx hyperframes@0.8.142 browser ensure
npm run doctor
npm run smoke
```

- `npm ci` instala o HyperFrames (cerca de 125 MB).
- `browser ensure` baixa o Chrome headless de render (cerca de 260 MB) para o cache do usuário.
- `doctor` tem que terminar com `tudo pronto.`
- `smoke` tem que terminar com `smoke ok`. Leva 30 s a 2 min.

## 4. Sua identidade

Separe: nome, até 7 cores (ou escolha um tema pronto), um logo em SVG, as fontes (opcional; o kit traz Inter e JetBrains Mono) e uma frase de assinatura. Leia `docs/identity.md`.

## 5. Se der errado

Anote a saída de `npm run doctor` e traga para a aula. Em último caso, um colega pode renderizar o seu vídeo: o repositório inteiro é portátil.
