# 🌱 Farm Invasion

**Plante de dia. Sobreviva à noite.**

Farm Invasion é um jogo roguelite top-down de agricultura, comércio e defesa da fazenda em pixel art, feito para navegador.

## Controles

| Tecla | Ação |
|---|---|
| WASD ou setas | Mover |
| E | Plantar/colher (perto da horta) |
| R | Regar as culturas próximas |
| Espaço / clique | Disparar contra monstros (mira automática no Espaço) |
| Shift | Esquivar |
| 1, 2 e 3 | Selecionar sementes |
| I | Mercado (durante o dia) |
| Esc | Pausar e fechar janelas |
| M | Alternar som |
| Celular | Joystick e botões na tela |

## Mecânicas

- Cenouras, tomates e abóboras com crescimento, preços e rendimento diferentes.
- Plantar, regar, colher, vender e comprar sementes.
- Vida do jogador e cristal da fazenda, ciclo dia/noite e ondas escalonadas.
- Slimes, goblins, morcegos, cogumelos e chefes a cada 3 noites.
- Upgrades de dano, velocidade, vida, totens de defesa, reparo e espantalho.
- Progressão permanente de legado por noites sobrevividas.
- Interface responsiva, efeitos sonoros sintetizados e sprites 100% originais.
- Salvamento automático local por navegador (localStorage).

## Publicação

O jogo está preparado para GitHub Pages, com deploy em todo push para main.

URL após ativação e deploy: https://eduardolavall.github.io/farmInvasion/

Se necessário, configure uma única vez **Settings > Pages > Build and deployment > Source: GitHub Actions**. A publicação então roda na aba **Actions**.

## Desenvolvimento

Execute python3 -m http.server 8080 na raiz, depois abra http://localhost:8080. Não precisa instalar dependências: o Phaser 3.90.0 carrega pelo jsDelivr.

### Arquivos

- index.html: interface e overlays
- styles.css: tema e HUD mobile
- art.js: pixel art procedural original
- game.js: engine, regras, combate e persistência
- .github/workflows/pages.yml: deploy automático

## Persistência

MVP offline local: localStorage (sem sincronização entre dispositivos). Para nuvem, o próximo passo é conectar DriveBase com Google Drive, Apps Script e backend protegido; nenhum segredo deve ficar no frontend ou repositório.

## Licença

MIT para código e arte original. Phaser possui licença MIT própria. Fonts hospedadas pelo Google Fonts com fallback.
