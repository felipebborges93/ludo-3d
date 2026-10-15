# Ludo 3D

## What This Is

Um jogo de Ludo 3D carismático, responsivo e imersivo para navegadores desktop e mobile, com suporte a modos Local, Bots inteligentes e Multiplayer Online P2P via WebRTC. Possui personagens estilizados com reações dramáticas e mecânicas adicionais de cartas (Sorte e Azar).

## Core Value

Experiência tátil e cinematográfica autêntica de jogo de tabuleiro em 3D, priorizando interação direta com as peças, câmera expressiva e fluidez em partidas locais e online.

## Requirements

### Validated

- ✓ Tabuleiro clássico 3D com regras oficiais do Ludo (regras puras e isoladas em motor determinístico) — Phase 1
- ✓ 4 Personagens com variações de acessórios e suporte visual a daltonismo — Phase 1
- ✓ Sistema de Cartas de Sorte e Azar com balanceamento simulado headless — Phase 1
- ✓ Bots com três níveis de dificuldade (Fácil, Médio, Difícil) — Phase 1
- ✓ Multiplayer Online P2P WebRTC autoritativo via PeerJS com temporizador de turno — Phase 1
- ✓ Áudio procedural sintetizado via Web Audio API e música pentatônica — Phase 1

### Active

- [ ] **Interação exclusiva 3D:** Remover a barra de botões DOM de seleção de peças (`choicesBar`); a única forma de escolher uma peça é tocando diretamente no modelo 3D no tabuleiro.
- [ ] **Auto-play de jogada única:** Quando houver apenas um movimento legal possível para o jogador, realizar a jogada automaticamente sem exigir interação manual.
- [ ] **Câmera desacelerada e ultra-close:** Ajustar a velocidade de transição e amortecimento da câmera para um movimento mais cinematográfico e suave, posicionando-a ainda mais próxima do personagem em movimento.
- [ ] **Câmera Top-Down na seleção e retorno pós-movimento:** Transicionar a câmera para visão superior (top-down) do tabuleiro ao entrar na fase de escolha da peça, aproximar-se e acompanhar a caminhada do personagem selecionado, e retornar suavemente à vista padrão após o término da animação.

### Out of Scope

- Modelos externos `.glb` pesados no carregamento inicial (mantém primitivas Three.js procedurais leves).
- Servidor de backend dedicado (o jogo continuará 100% estático com WebRTC P2P).
- Suporte a múltiplos cliques simultâneos durante animações de peças.

## Context

- Base Three.js + TypeScript + Vite pura no frontend, hospedável estaticamente na Vercel.
- O loop de renderização utiliza `OrbitControls` e transições dinâmicas de câmera no arquivo `src/render/scene.ts`.
- O fluxo de jogadas e inputs reside em `src/main.ts`, mantendo as regras puras no `src/game/engine.ts`.

## Constraints

- **Performance:** Manter 60 fps estáveis no mobile, limitando o pixel ratio a 2 e evitando alocações por frame.
- **Arquitetura:** `src/game` permanece 100% livre de Three.js e manipulação de DOM.
- **Idioma:** Código e comentários em inglês; interface e falas de personagens em Português do Brasil.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Remover botões DOM de peça | Forçar imersão direta no mundo 3D clicando nas peças destacadas | — Pending |
| Auto-jogada com 1 movimento | Reduzir atrito e acelerar o ritmo da partida | — Pending |
| Ciclo de câmera Top-down -> Close -> Default | Melhor legibilidade tática na escolha e dramaticidade no movimento | — Pending |

---
*Last updated: 2026-10-15 after new-project questioning*
