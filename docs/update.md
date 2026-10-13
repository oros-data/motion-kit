# Atualizar o kit

Sua cópia foi criada pelo **Use this template** e não tem ligação com o repositório original. `npm run update` traz as melhorias do kit sem mexer em remotes do git: baixa por HTTPS a release publicada de `oros-data/motion-kit` no GitHub e troca só os arquivos do kit.

## O que muda e o que fica

- Atualizados: `src/`, `tools/`, `schemas/`, `themes/`, `docs/`, `runner/`, `package.json`, `package-lock.json`, `AGENTS.md`, `NOTICES.md`, `LICENSE` e `kit.version`.
- Nunca tocados: `brand/`, `videos/`, `examples/`, `build/` e qualquer outro arquivo fora da lista acima.
- Arquivos que só existem na sua cópia (um tema seu em `themes/`, por exemplo) são mantidos e listados.
- Cenas próprias ficam em `videos/<slug>/scenes/` ([scenes.md](scenes.md)), fora do alcance do update. Uma cena que você editou em `src/scenes/` é substituída pela versão da release.

## Como usar

```bash
git status                                # commite antes: o update recusa mudanças pendentes nos arquivos do kit
npm run update                            # modo de teste: lista os arquivos que mudariam (+linhas -linhas), não escreve nada
npm run update -- --apply                 # aplica a última release
npm run update -- --tag v0.2.0 --apply    # aplica uma release específica
```

Depois de aplicar, o comando imprime os próximos passos: revisar com `git diff`, rodar `npm ci` se `package.json` ou `package-lock.json` mudaram, `npm run doctor`, `npm run check` e commitar. Se não gostar, ele também imprime como desfazer antes do commit.

## Segurança

- A origem é fixa: `api.github.com/repos/oros-data/motion-kit` para achar a release e `codeload.github.com/oros-data/motion-kit` para o pacote, sem seguir redirecionamentos.
- Nada do pacote é executado durante o update. Caminhos fora da lista, links simbólicos e caminhos que saem do repositório são recusados.
- O `AGENTS.md` novo vira o contrato do seu agente: leia o diff dele antes de commitar.

## Convenção de release (mantenedores)

- Tag `vMAIOR.MENOR.CORREÇÃO` (por exemplo `v0.2.0`) publicada como release no GitHub; rascunhos e pre-releases não contam como a última.
- O commit da tag tem `kit.version` com exatamente o nome da tag; o update recusa um pacote em que os dois não batem.
- MAIOR muda quando um `video.json` ou `brand/identity.json` existente precisa de ajuste; descreva o ajuste nas notas da release.
