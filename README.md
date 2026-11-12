# Xadrez contra o Brambila ♟️

Página de xadrez para jogar contra um bot (Stockfish.js), com escolha de cor e nível de ELO (800 a 2800). Funciona no celular e no computador.

## Arquivos

- `index.html` – estrutura da página
- `style.css` – visual (responsivo)
- `app.js` – lógica do jogo e integração com o motor
- `avatar.jpg` – foto do bot (**você precisa adicionar este arquivo**)

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `xadrez-brambila`).
2. Envie todos os arquivos desta pasta, incluindo `avatar.jpg`, para a raiz do repositório.
3. Vá em **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**, selecione a branch `main` e a pasta `/ (root)`, e clique em **Save**.
5. Após cerca de 1 minuto, o site estará em `https://SEU-USUARIO.github.io/xadrez-brambila/`.

## Como trocar a foto do Brambila

- **Jeito mais simples:** substitua o arquivo `avatar.jpg` por outra imagem com o mesmo nome (de preferência quadrada).
- **Outro nome/formato:** abra `app.js` e, no topo, altere a linha `BOT_AVATAR: "avatar.jpg"` (ex.: `"minha-foto.png"`).

Se a imagem não for encontrada, aparece um emoji 🐶 no lugar.

## Como mudar o nome do bot

No topo do `app.js`, altere `BOT_NAME: "Brambila"`.

## Sobre os níveis de ELO

O Stockfish.js 10 não possui limitação de ELO nativa, então o nível é simulado combinando: nível de habilidade (Skill Level), profundidade e tempo de análise, além de uma chance de "erro humano" nos níveis mais baixos. Os valores são aproximados e podem ser ajustados na função `levelFor` do `app.js`.

## Bibliotecas (carregadas por CDN, precisa de internet)

- [Stockfish.js](https://github.com/nmrugg/stockfish.js) 10.0.2
- [chess.js](https://github.com/jhlywa/chess.js) 0.10.3
