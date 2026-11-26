# Documentação da v2 · mapa

| Documento | Para que serve |
|---|---|
| [visao.md](visao.md) | Decisões (stack, estilo, jogador fixo, pianista, consequências corporais) e o que está ou não documentado sobre a noite |
| [HISTORICO.md](HISTORICO.md) | Cada pedido do Felipe, com data, e o que mudou por causa dele |
| [estilos_v1.md](estilos_v1.md) | Proposta dos 3 estilos de ambiente; escolhido: **Âmbar Noturno** |
| [personagens-e-curva.md](personagens-e-curva.md) | Curva de estranheza e fichas originais dos 15 clientes |
| [personagens_mascara_v1.md](personagens_mascara_v1.md) | Os 15 clientes no estilo **Máscara** (aprovado): roupa, máscara, comportamento |
| [ASSETS.md](ASSETS.md) | Catálogo de todos os modelos `.glb` e o script que gera cada um |
| [estilos/](estilos/) | Capturas de tela de cada rodada (nada é apagado; versões `_v1`, `_v2`…) e prints de referência do Felipe |
| [../../DEVLOG_SPIRITS_AND_SPIRITS_CODEX.md](../../DEVLOG_SPIRITS_AND_SPIRITS_CODEX.md) | Especificação original do jogo (roteiro, mecânicas, epílogo). A stack de lá (A-Frame) foi substituída |

Documentos da primeira entrega acadêmica (v1) continuam em `docs/` (ficha, planejamento, plano de testes, resultados).

## Duas frentes no código

- **Jogo** (`index.html`, `src/main.ts`, `src/domain`, `src/interaction`, `src/scene`): mecânica jogável com o cenário provisório de blocos. Frente da mecânica.
- **Laboratório de arte** (`estilos.html`, `src/lab`, `public/models`, `art/`): o bar final (Âmbar Noturno) e as pessoas (Máscara). Frente da arte. A integração da arte no jogo é um passo futuro.
