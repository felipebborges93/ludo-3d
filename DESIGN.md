---
name: Ludo 3D
description: Jogo de tabuleiro 3D dinâmico com mascotes carismáticos, cartas de ação e multiplayer P2P instantâneo.
colors:
  primary: "#ff8a3d"
  primary-deep: "#c45d1a"
  team-red: "#e84a4a"
  team-green: "#3dbb5c"
  team-yellow: "#f5c518"
  team-blue: "#3b7be8"
  neutral-bg: "#bfe6ff"
  card-defense: "#3b82f6"
  card-help: "#10b981"
  card-attack: "#ef4444"
  card-chaos: "#8b5cf6"
  surface-overlay: "#ffffffdd"
  surface-card: "#ffffff"
  text-primary: "#1e293b"
  text-muted: "#64748b"
typography:
  display:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "2.8rem"
    fontWeight: 800
    lineHeight: 1.1
  headline:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.4
  label:
    fontFamily: "system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "20px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "0.6em 1.2em"
  button-primary-active:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "0.6em 1.2em"
  button-secondary:
    backgroundColor: "{colors.card-defense}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "0.6em 1.2em"
  card-container:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  menu-panel:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "18px 24px"
---

# Design System: Ludo 3D

## Overview

**Creative North Star: "O Tabuleiro Vivo dos Mascotes"**

O universo visual de Ludo 3D combina a nostalgia calorosa do clássico jogo de tabuleiro com a energia vibrante e responsiva de um arcade mobile moderno. O centro gravitacional da experiência são os quatro mascotes carismáticos — Dona Cocorina (Vermelho), Seu Gelinho (Azul), Abelardo (Verde) e Bananildo (Amarelo) — que dão vida física a cada movimento, captura e vitória. A interface complementa a cena 3D sem competir com ela: flutua sobre o campo de jogo com transparências vítreas suaves (glassmorphism) e controles táteis altamente responsivos.

O ritmo do design é ágil, claro e alegre. Não há menus burocráticos ou ornamentos desnecessários; toda decisão visual foca em acelerar o jogador para a rolagem de dados e para a execução estratégica de cartas. A paleta celebra as 4 cores canônicas de Ludo em equilíbrio com o tom acolhedor de céu do fundo e contrastes nítidos de leitura.

**Key Characteristics:**
- **Fidelidade aos 4 Quadrantes:** Cores canônicas vibrantes com suporte a daltônicos (ícones geométricos flutuantes em cada peão).
- **Híbrido Tátil-Arcade:** Painéis em vidro translúcido com desfoque de fundo (backdrop-filter) que destacam botões primários físicos e energéticos.
- **Micro-momentos de Humor:** Balões de fala reativos, diálogos expressivos e animações de salto que humanizam o tabuleiro.
- **Ergonomia Mobile-First:** Áreas de toque confortáveis (mínimo de 44px de altura) e visual legível sob qualquer iluminação de tela.

## Colors

A paleta une os 4 quadrantes clássicos do Ludo, organizados para leitura instantânea tanto nas malhas 3D quanto nos elementos do HUD e categorias de cartas.

### Primary
- **Laranja Impulso** (#ff8a3d / shadow: #c45d1a): Cor mestra de ação primária (botão de rolar dados, botões de ação de cartas e botões principais de confirmação).

### Secondary
- **Azul Ação / Defesa** (#3b82f6 / #4a90e2): Utilizado para ações secundárias do menu, lobbies e cartas de defesa/proteção.

### Quadrantes de Mascotes / Jogadores
- **Dona Cocorina (Vermelho Diva)** (#e84a4a): Quadrante vermelho, peões e cartas de ataque.
- **Seu Gelinho (Azul Polido)** (#3b7be8): Quadrante azul, peões e cartas de defesa.
- **Abelardo (Verde Filosófico)** (#3dbb5c): Quadrante verde, peões e cartas de suporte/ajuda.
- **Bananildo (Amarelo Travesso)** (#f5c518): Quadrante amarelo, peões e cartas de caos/imprevisibilidade.

### Neutral
- **Céu Lúdico** (#bfe6ff): Fundo principal do canvas/body, transmitindo leveza e clima ensolarado de domingo.
- **Superfície Vidro Menu** (#ffffffdd): Fundo dos menus centrais e modais com transparência e desfoque suave.
- **Superfície Vidro HUD** (#ffffffdd / #fffd): Badges de turno, cronômetro e mensagens flutuantes.
- **Texto Grafite** (#1e293b / #333333): Leitura de títulos e instruções em alto contraste.
- **Texto Secundário** (#64748b / #666666): Dicas, descrições de cartas e metadados.

### Named Rules
**The Team Palette Rule.** Cada jogador e mascote retém sua cor correspondente em 100% dos indicadores (anéis de seleção 3D, borda da base, balões de diálogo e slots do lobby).
**The Action Contrast Rule.** Botões interativos nunca se camuflam com o fundo: sempre possuem sombra chanfrada ou borda de estado clicável.

## Typography

**Display Font:** `system-ui, -apple-system, sans-serif`
**Body Font:** `system-ui, -apple-system, sans-serif`
**Label / Mono Font:** `system-ui, -apple-system, sans-serif`

**Character:** Direta, nativa e sem overhead de download de fontes externas, garantindo que o jogo carregue instantaneamente mesmo em redes 3G/4G instáveis.

### Hierarchy
- **Display** (800, `2.8rem`, `1.1`): Título principal do menu inicial e tela de vitória com sombra de relevo (`0 3px 0 #0005`).
- **Headline** (700, `1.2rem`, `1.2`): Títulos de seções de lobby, código de sala e banners de notificação.
- **Title** (700, `0.95rem`, `1.3`): Cabeçalhos de cartas, slots de jogadores e indicadores de turno.
- **Body** (600, `0.95rem`, `1.4`): Rótulos de botões, balões de fala dos personagens e mensagens de instrução.
- **Label / Micro** (800, `0.72rem - 0.75rem`, `1.2`, letterSpacing `0.05em`): Textos descritivos das cartas, logs de jogada e contador de tempo regressivo.

## Layout

O tabuleiro 3D ocupa 100% da viewport e centraliza a visualização da grade 15x15. O HUD e os overlays se organizam em camadas flutuantes sem bloquear a perspectiva do tabuleiro:

- **HUD Inferior Centralizado:** Fixado em `bottom: max(16px, env(safe-area-inset-bottom))`, centralizado horizontalmente (`transform: translateX(-50%)`). Agrupa timer, turno atual, mensagens do jogo, barra de cartas e botão de rolar dados.
- **Controles de Canto Superior:** Botão de silenciar som (`mute-btn`) posicionado em `top: max(12px, env(safe-area-inset-top))` e `right: max(12px, env(safe-area-inset-right))` com tamanho mínimo de toque de 44x44px.
- **Menu Central:** Modal em tela cheia com overlay escurecido (`#0007`) e caixa de conteúdo centralizada (`max-width: 440px`), otimizada para uso em uma só mão no celular.
- **Barra de Cartas:** Grid horizontal flexível com quebra automática (`flex-wrap: wrap`) que preserva a visibilidade das peças em jogo.

## Elevation & Depth

O sistema utiliza uma abordagem híbrida: superfícies de conteúdo são tonalmente translúcidas com efeito vidro (backdrop-filter de 4px a 8px), enquanto elementos de ação interativos utilizam relevo físico tátil com sombras sólidas.

### Shadow Vocabulary
- **Botão Primário em Repouso:** `box-shadow: 0 4px 0 #c45d1a` — dá sensação de bloco de plástico/arcade clicável.
- **Botão Pressionado:** `transform: translateY(3px); box-shadow: 0 1px 0 #c45d1a` — feedback tátil instantâneo ao toque.
- **Menu Box Flutuante:** `box-shadow: 0 12px 30px #0004` com `backdrop-filter: blur(8px)`.
- **Card de Ação:** `box-shadow: 0 3px 6px rgba(0,0,0,0.08)` com elevação no hover (`translateY(-2px)`).
- **Banner de Carta Jogada:** `box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35)` com animação elástica `bannerPop`.

### Named Rules
**The Tactile Button Rule.** Todo botão clicável principal deve afundar fisicamente (`translateY(3px)`) no `:active`, mimetizando um botão físico de fliperama/tabuleiro.

## Shapes

- **Botões de Ação:** Totalmente arredondados no estilo pílula (`border-radius: 999px`) para conforto máximo aos polegares.
- **Cartas e Painéis:** Cantos suavemente amigáveis (`border-radius: 12px` para cards, `20px` para o container do menu).
- **Balões de Diálogo:** Balão com cantos arredondados (`border-radius: 14px`) e seta inferior centralizada (`border: 8px solid transparent`), apontando diretamente para o peão no espaço 3D.
- **Tokens 3D:** Geometrias volumétricas simples e limpas (cilindros de base com raio 0.32-0.34 e ícones no topo).

## Components

### Buttons
- **Botão Primário (Rolar Dado / Iniciar):** Pílula sólida laranja (`#ff8a3d`), texto branco em negrito, sombra física inferior de 4px (`#c45d1a`), recuo de 3px ao clicar.
- **Botão Secundário (1 vs Bots):** Pílula azul (`#4a90e2`), sombra azul escura (`#2868b2`).
- **Botão de Alternância de Abas:** Pílula translúcida com pill ativa branca e texto destacado em laranja.

### Cards (Cartas de Poder)
- **Estrutura:** Cartão retangular vertical com cantos arredondados (12px), fundo branco, borda neutra e destaque de categoria no topo (4px de espessura colorida conforme o tipo: Ataque = Vermelho, Defesa = Azul, Suporte = Verde, Caos = Roxo).
- **Ação:** Mini-botão "Usar" embutido no rodapé da carta.

### Dialog Bubbles (Balões dos Mascotes)
- **Estrutura:** Balão branco com sombra discreta que se posiciona sobre a projeção 2D do peão na tela.
- **Animação:** Efeito `pop` com escala rápida (`0.25s ease-out`), desaparecendo suavemente após a fala.

### HUD Turn & Timer
- **Badge do Cronômetro:** Pílula branca com ícone ⏱️, texto vermelho em negrito e contagem regressiva visível.
- **Badge do Turno:** Superfície em vidro translúcido exibindo a cor e o nome do jogador ativo.

## Do's and Don'ts

### Do:
- **Do** manter a área de clique de botões e seletores com pelo menos 44x44px para acessibilidade móvel.
- **Do** utilizar `safe-area-inset` para evitar sobreposição em entalhes de câmeras (notches) em iPhones e Androids.
- **Do** associar cada carta a uma das 4 cores de categoria sem misturar as convenções estabelecidas.
- **Do** preservar a sensação física nos cliques com a redução de sombra e deslocamento `translateY`.

### Don't:
- **Don't** utilizar fontes pesadas da web que retardem o carregamento inicial do jogo.
- **Don't** poluir o centro da tela com menus estáticos durante a rolagem de dados ou movimento de peças.
- **Don't** remover os ícones geométricos dos peões 3D, pois eles garantem suporte a jogadores daltônicos.
- **Don't** criar sombras puramente decorativas que interfiram na nitidez das peças ou do tabuleiro.
