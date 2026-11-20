# Xadrez contra o Brambila ♟️

Página de xadrez para jogar contra um bot (Stockfish.js), com escolha de cor, nível de ELO (800 a 2800) e relógio opcional. Funciona no celular e no computador.

## Recursos

- Escolha de cor (brancas, pretas ou sorteio) e ELO de 800 a 2800
- **Dica** com o melhor lance segundo o motor (casas em azul)
- **Barra de avaliação** ao lado do tabuleiro (branco = brancas melhor, preto = pretas melhor)
- **Relógio** opcional (3, 5, 10, 15, 30 min, com ou sem acréscimo por lance)
- **Peças em SVG** (iguais em qualquer navegador)
- **Brambila com personalidade**: balão de fala (provoca, elogia, comenta aberturas) e reação no avatar
- **Exportar PGN** (copiar ou baixar) para analisar no Lichess ou Chess.com
- **Placar** de vitórias/empates/derrotas, salvo no navegador
- **Material capturado** ao lado do tabuleiro, com a vantagem de material
- **Análise pós-jogo** (botão **Analisar**): classifica cada lance como Brilhante (!!), Ótimo (!), Melhor, Excelente, Bom, Teoria, Imprecisão (?!), Erro (?) ou Erro grave (??); mostra a precisão de cada lado, gráfico de avaliação, tabuleiro com setas (seu lance e o melhor lance), lista de lances clicável e atalhos "Seu erro ◀ ▶"

## Arquivos

- `index.html` – estrutura da página
- `style.css` – visual (responsivo)
- `app.js` – lógica do jogo, motor, frases, relógio, PGN e placar
- `analysis.js` – análise pós-jogo (classificação dos lances e tela de revisão)
- `avatar.jpg` – foto do bot

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `xadrez-brambila`).
2. Envie todos os arquivos, incluindo `avatar.jpg`, para a raiz do repositório.
3. Vá em **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e clique em **Save**.
5. Após cerca de 1 minuto, o site estará em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

## Como personalizar

Tudo no topo do `app.js`:

- **Foto do Brambila:** substitua o arquivo `avatar.jpg` (mesmo nome) ou mude `BOT_AVATAR` em `CONFIG`.
- **Nome do bot:** mude `BOT_NAME` em `CONFIG`.
- **Frases do bot:** edite o objeto `PHRASES` (adicione, remova ou troque frases).
- **Comentários de abertura:** edite o objeto `OPENINGS` (sequência de lances → comentário).

## Sobre os níveis de ELO

O Stockfish.js 10 não possui limitação de ELO nativa, então o nível é simulado combinando nível de habilidade (Skill Level), profundidade e tempo de análise, além de uma chance de "erro humano" nos níveis mais baixos. Os valores são aproximados e podem ser ajustados na função `levelFor` do `app.js`.

## Análise pós-jogo

- Fica disponível para a **última partida terminada** (também depois de recarregar a página).
- Cada posição é avaliada pelo Stockfish com as 2 melhores linhas (cerca de 30 s a 1 min no celular). O botão "Análise mais profunda" refaz com mais tempo por posição.
- Os limites de classificação (perda de chance de vitória: Imprecisão ≥ 10%, Erro ≥ 20%, Erro grave ≥ 30%) e o tempo por posição ficam em `analysis.js` (`classifyAll` e `QUALITY`).
- Brilhante = sacrifício de material que o motor aprova; Ótimo = lance praticamente único; Teoria = lances de aberturas listadas em `OPENINGS` no `app.js`.

## Observações

- O botão **Desfazer** fica desativado quando o relógio está ligado.
- A dica e a barra de avaliação usam uma análise rápida do motor, então podem variar um pouco entre uma jogada e outra.
- O placar fica salvo apenas no navegador/dispositivo em que você joga.

## Bibliotecas (carregadas por CDN, precisa de internet)

- [Stockfish.js](https://github.com/nmrugg/stockfish.js) 10.0.2
- [chess.js](https://github.com/jhlywa/chess.js) 0.10.3
