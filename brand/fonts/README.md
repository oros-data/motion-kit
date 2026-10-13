Coloque aqui as fontes da sua identidade (TTF, OTF ou WOFF2), com um arquivo de licença por família (por exemplo `OFL-Roboto.txt` para Roboto).
Depois aponte para elas em `brand/identity.json` (`fonts.display.files`, `fonts.body.files` e `fonts.mono.files`), um arquivo por peso: Regular 400, Medium 500, SemiBold 600, Bold 700.
`fonts.body` é opcional; sem ele o texto corrido usa a fonte `display`. Sem arquivos próprios, o kit usa Inter e JetBrains Mono de `src/fonts/`.
Sem arquivo de licença, o `npm run identity:check` pede o campo `license` na fonte. Só use fontes que permitem uso em vídeo.
