# Licenças e avisos

## O kit

`LICENSE`: todos os direitos reservados; fornecido aos participantes das aulas para uso pessoal de aprendizado. Os vídeos que você renderiza são seus.

## O que o kit traz de terceiros

Tudo listado com texto ou link em `NOTICES.md`:

- **HyperFrames** (HeyGen), Apache-2.0: motor de render. Sem limite de pessoas, sem custo, pode ser usado por você e por clientes.
- **GSAP** 3.14.2 (GreenSock/Webflow), GSAP Standard License: biblioteca de animação, vendorizada em `src/vendor/`. Não é open source. Uso gratuito em sites, apps e vídeos; não pode ser usada para construir um editor visual de animação concorrente.
- **Temas Tokyo Night e Osaka Jade** (basecamp/omarchy), MIT: só os `colors.toml`, copiados sem alteração, com atribuição em `themes/*/NOTICE`.
- **JetBrains Mono** 2.304 e **Inter**, SIL Open Font License 1.1: podem ser distribuídas com o kit mantendo o arquivo de licença ao lado; a licença não se aplica aos vídeos gerados.

## O que o aluno instala por conta própria

Chrome headless shell (baixado pelo HyperFrames para o cache do usuário), FFmpeg, git, Python e Node.js. Nada disso é redistribuído pelo kit.

## Sua identidade

- Use só logos e marcas que você possui ou tem autorização para usar.
- Fontes próprias em `brand/fonts/` precisam de licença que permita incorporação em vídeo; coloque o arquivo de licença na mesma pasta. Fontes do Google Fonts (OFL, Apache ou UFL) servem.
- Não versione fontes com licença que proíba redistribuição em repositório; mantenha-as fora do Git ou use as do kit.

## O que o kit nunca faz

Não publica (`hyperframes publish`), não usa render hospedado, não pede login, não envia telemetria (`HYPERFRAMES_NO_TELEMETRY=1` em todos os scripts).
