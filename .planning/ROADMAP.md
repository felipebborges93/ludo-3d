# Roadmap: Ludo 3D

## Overview

Este marco foca no refinamento da interação 3D e na coreografia cinematográfica da câmera, removendo redundâncias da interface DOM (eliminando os botões de seleção de peça em favor do toque direto nas peças 3D), implementando jogada automática em turnos de opção única, e introduzindo um ciclo de câmera inteligente (visão aérea top-down para escolha da jogada, acompanhamento ultra-close desacelerado durante o movimento da peça, e retorno suave à visão padrão).

## Phases

- [ ] **Phase 1: Interação 3D Pura e Auto-Play** - Remover barra de botões DOM e implementar jogada automática quando houver apenas 1 movimento legal.
- [ ] **Phase 2: Coreografia e Dinâmica da Câmera** - Visão aérea (top-down) na escolha de jogada, zoom ultra-close desacelerado acompanhando o personagem e retorno suave ao término do percurso.

## Phase Details

### Phase 1: Interação 3D Pura e Auto-Play
**Goal**: Tornar o tabuleiro 3D a única interface de escolha de peças e acelerar o ritmo com jogada automática de opção única.
**Depends on**: Nothing (first phase)
**Requirements**: INT-01, INT-02, INT-03
**Success Criteria** (what must be TRUE):
  1. A barra de botões de seleção de personagens (`choicesBar`) não é mais exibida na tela.
  2. O jogador escolhe peças exclusivamente clicando/tocando na peça destacada com o anel de seleção (`selectionRing`).
  3. Quando os dados determinarem apenas uma jogada possível (`moves.length === 1`), a ação de mover é despachada automaticamente sem exigir interação manual.
**Plans**: 1 plan

Plans:
- [ ] 01-01: Remover `choicesBar` e acionar auto-play para movimento único em `src/main.ts`.

### Phase 2: Coreografia e Dinâmica da Câmera
**Goal**: Criar uma coreografia cinematográfica fluida e legível com vista aérea na escolha e close desacelerado na caminhada.
**Depends on**: Phase 1
**Requirements**: CAM-01, CAM-02, CAM-03, CAM-04
**Success Criteria** (what must be TRUE):
  1. Ao entrar na fase `move` com mais de uma jogada possível, a câmera transiciona para um enquadramento aéreo (top-down) mostrando todo o tabuleiro para análise tática.
  2. As interpolações de câmera (lerp e damping) operam com transição desacelerada e suave.
  3. Durante a animação de caminhada (`tokenMoved`), a câmera aproxima-se ainda mais (ultra-close) do personagem, acompanhando cada salto.
  4. Ao término da animação do movimento, a câmera retorna gradualmente à posição e ângulo padrão.
**Plans**: 1 plan

Plans:
- [ ] 02-01: Implementar estados e transições de câmera (Top-Down, Ultra-Close e Default) em `src/render/scene.ts`.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Interação 3D Pura e Auto-Play | 0/1 | Not started | - |
| 2. Coreografia e Dinâmica da Câmera | 0/1 | Not started | - |
