# Farm Invasion — Atlases v2 (Phaser)
Esta pasta espera cinco PNGs com grades perfeitas, sem margem e sem espaçamento extra.

| Arquivo | Grade | Frame | Total |
|---|---:|---:|---:|
| farmer.png | 8 × 6 | 64 × 64 | 48 |
| enemies.png | 8 × 4 | 64 × 64 | 32 |
| items.png | 10 × 5 | 64 × 64 | 50 |
| tools.png | 8 × 4 | 64 × 64 | 32 |
| terrain.png | 8 × 8 | 48 × 48 | 64 |

Os arquivos ficam em `assets/v2/`, ao lado deste README. O script `assets-v2.js` valida o tamanho real antes de habilitar um atlas. Enquanto um deles não estiver no repositório, o jogo continua abrindo com os assets antigos e os gráficos procedurais de fallback.

O PNG de cada atlas é importado pelo Phaser como `spritesheet`, sem operações manuais de recorte, com filtros nearest-neighbor. A ordem é linha por linha, da esquerda para a direita.
- Farmer: linha 0 andar baixo, 1 esquerda, 2 direita, 3 cima, 4 plantar/regar, 5 atacar.
- Enemies: linha 0 slime, 1 morcego, 2 goblin, 3 chefe.
- Items: linhas 3 e 4, estágios das plantações.
- Terrain: linhas 0-1 solo; 2 cercas; 3 árvores.
- Tools: 32 ícones; atlas pronto para hotbar e futuras implementações.

## Validação

Execute `node scripts/check-v2-atlases.cjs` para conferir PNGs e dimensões. Os testes de GitHub Actions também executam o verificador quando todas as folhas estão presentes.
