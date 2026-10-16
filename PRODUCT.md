# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Jogadores casuais de jogos de tabuleiro, jogando em smartphones ou navegadores desktop para partidas rápidas e descontraídas, seja solo contra bots inteligentes ou em multiplayer com amigos (local ou online via salas P2P).

## Product Purpose

Oferecer uma experiência 3D fluida, acessível e dinâmica do clássico jogo de Ludo diretamente no navegador, sem necessidade de instalação ou login, enriquecida com sistema de cartas táticas e jogabilidade ágil (meta de 60 fps em dispositivos móveis).

## Positioning

Ludo 3D web instantâneo: une a essência tradicional do Ludo de tabuleiro a uma mecânica moderna com cartas de ação, visão tridimensional imersiva e multiplayer peer-to-peer imediato via compartilhamento de link ou código.

## Operating Context

- Partidas rápidas em navegadores móveis e desktop com suporte total a telas de toque e mouse.
- Sessões locais (pass-and-play ou vs IA com diferentes personalidades) e salas online peer-to-peer sem servidor backend intermediador.
- Contexto de uso que varia de pausas rápidas em celular a sessões sociais casuais.

## Capabilities and Constraints

- **Tecnologias:** Three.js + TypeScript + Vite, regras puras e testadas via Vitest, P2P via PeerJS, interface HUD em HTML/CSS nativo.
- **Performance:** Alvo estrito de 60 fps em aparelhos móveis intermediários (cap de pixel ratio em 2, reuso de geometrias, sem alocações por frame).
- **Internacionalização:** Interface inteira em Português do Brasil (pt-BR); código e documentação interna em inglês.
- **Arquitetura desacoplada:** Regras isoladas em `src/game/` sem referências a DOM/Three.js; renderizador 3D reativo a eventos; bots orientados por simulação de jogadas.

## Brand Commitments

- **Identidade:** Ludo 3D.
- **Tom & Direção:** Arcade/gamer moderno refinado — mantendo a legibilidade e vibração dos 4 quadrantes clássicos do Ludo, complementados por glassmorphism sofisticado, iluminação dinâmica e toques sutis de neon/efeitos modernos.

## Product Principles

1. **Acesso Imediato:** Do link ao dado rolando em segundos — sem logins, sem downloads pesados, sem atrito.
2. **Fluidez em Primeiro Lugar:** Animações e resposta ao toque sempre suaves e responsivas, otimizadas para smartphones modestos.
3. **Estratégia Acessível:** O clássico Ludo elevado por cartas de poderes especiais, mantendo regras intuitivas e fáceis de assimilar.
4. **Independência e Robustez:** Lógica puramente desacoplada do renderizador, permitindo estabilidade de regras, testes confiáveis e sincronização P2P enxuta.

## Accessibility & Inclusion

- Contraste visual reforçado entre as 4 cores de jogadores e casas do tabuleiro.
- Áreas de toque generosas nos controles e dados para conforto ergonômico no mobile.
- Opção instantânea para silenciar/ativar efeitos sonoros.
