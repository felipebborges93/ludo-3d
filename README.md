# Ludo 3D

Ludo 3D carismático para navegador (desktop e celular) com modo Local, Bots e Multiplayer Online WebRTC. Three.js + TypeScript + Vite.

## Rodar Localmente

```bash
npm install
npm run dev              # abre em http://localhost:5173
npm run dev -- --host   # para testar no celular na mesma rede Wi-Fi
npm test                 # testes unitários (Vitest)
npm run build            # build estático em dist/
npm run preview          # serve a versão final de produção
```

## Modos de Jogo

### 🏠 Local & Bots
1. Escolha 2, 3 ou 4 jogadores no menu.
2. Configure cada jogador como `👤 Humano`, `🤖 Bot Fácil`, `🤖 Bot Médio` ou `🤖 Bot Difícil` (ou use o botão rápido `🤖 1 vs Bots`).
3. Toque em **🎲 Rolar dado** (ou barra de espaço).
4. Toque na peça desejada. Jogadas únicas são realizadas automaticamente.

### 🌐 Multiplayer Online (WebRTC P2P)
- **Criar Sala:** Gera um código de 4 letras e link direto com cópia rápida (`?room=ABCD`).
- **Entrar em Sala:** Basta digitar o código da sala ou abrir o link compartilhado.
- **Autoritativo & Seguro:** O anfitrião valida todas as jogadas pelo motor de regras puro (`src/game/engine.ts`).
- **Temporizador de 30s:** Cada turno possui contagem regressiva visível (`⏱️ 30s`). Se o tempo expirar ou o jogador desconectar, o Bot assume a jogada automaticamente.
- **Zero backend dedicado:** Funciona 100% estático via WebRTC (DataChannels PeerJS), ideal para hospedagem na Vercel ou GitHub Pages.

## Personagens e Personalidades
- **▲ Vermelho: Dona Cocorina** — galinha dramática que desmaia com espanto ao ser capturada.
- **● Verde: Abelardo** — abacate filósofo que reflete sobre o destino e a existência.
- **■ Amarelo: Bananildo** — banana estabanada que tropeça no caminho.
- **◆ Azul: Seu Gelinho** — pinguim polido e cavalheiro que pede desculpas ao capturar.

Cada time possui 4 variações de personagens (cartola, laço, coroa e gorro de festa) além dos ícones flutuantes para acessibilidade e daltonismo.

## Áudio e Performance Mobile
- Efeitos sonoros sintetizados via Web Audio API (rolagem de dado, pulos, tropeços, capturas, chegada e fanfarra de vitória).
- Música procedural suave em escala pentatônica.
- Zero assets pesados de áudio ou 3D no carregamento inicial.
- Enquadramento dinâmico e otimizado para celulares em modo retrato ou paisagem.
- Pixel ratio limitado a 2, geometrias e buffers de partículas reutilizados para 60 fps estáveis.

## Deploy na Vercel
O projeto já inclui `vercel.json` configurado:
```bash
npm run build   # gera a pasta dist/ estática
vercel          # ou conecte seu repositório Git diretamente no painel da Vercel
```

Veja `AGENTS.md` para a arquitetura completa do projeto.
