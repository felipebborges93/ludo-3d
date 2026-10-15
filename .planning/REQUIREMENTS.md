# Requirements: Ludo 3D

**Defined:** 2026-10-15
**Core Value:** Experiência tátil e cinematográfica autêntica de jogo de tabuleiro em 3D, priorizando interação direta com as peças, câmera expressiva e fluidez em partidas locais e online.

## v1 Requirements

Requirements for current milestone. Each maps to roadmap phases.

### 3D Interaction & Flow

- [ ] **INT-01**: Remover permanentemente a barra de botões DOM de seleção de peças (`choicesBar`), garantindo que apenas cliques/toques no modelo 3D executem a jogada.
- [ ] **INT-02**: Manter anel visual (`selectionRing`) e pulo suave destacando as peças válidas que o jogador pode clicar.
- [ ] **INT-03**: Detectar quando existir apenas um movimento legal (`moves.length === 1`) para o jogador humano (ou forçado) e executar o movimento automaticamente sem aguardar clique.

### Camera Choreography & Visuals

- [ ] **CAM-01**: Posicionar a câmera em vista superior ampla (top-down) do tabuleiro quando o jogador entrar na fase de escolha da peça (`state.phase === 'move'`).
- [ ] **CAM-02**: Desacelerar e suavizar as transições de interpolação e amortecimento (damping/lerp) da câmera para um movimento mais cinematográfico.
- [ ] **CAM-03**: Durante o percurso de caminhada (`tokenMoved`), aproximar a câmera ainda mais do personagem (ultra-close) acompanhando o trajeto.
- [ ] **CAM-04**: Após a conclusão do movimento da peça, transicionar suavemente a câmera de volta para a posição e enquadramento padrão.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Botões DOM redundantes de seleção de peça | Removidos para reforçar a imersão na cena 3D |
| Modelos 3D externos (.glb) pesados | Preservar carregamento instantâneo e 60fps mobile |
| Servidor backend dedicado | Preservar arquitetura 100% estática P2P WebRTC |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INT-01 | Phase 1 | Pending |
| INT-02 | Phase 1 | Pending |
| INT-03 | Phase 1 | Pending |
| CAM-01 | Phase 2 | Pending |
| CAM-02 | Phase 2 | Pending |
| CAM-03 | Phase 2 | Pending |
| CAM-04 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-15*
*Last updated: 2026-10-15 after initial definition*
