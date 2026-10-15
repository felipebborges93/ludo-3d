export const CAMERA_CONFIG = {
  // Velocidades de interpolação no loop frame (lerp alpha: menor = mais suave/lento)
  lerpSpeedFollow: 0.045,      // Câmera acompanhando o personagem durante o trajeto
  lerpSpeedReturn: 0.038,      // Câmera retornando à visão inicial
  lerpSpeedOverview: 0.045,    // Câmera subindo para visão panorâmica de cima
  lerpSpeedApproach: 0.05,     // Câmera se aproximando do personagem antes de andar
  targetLerpSpeed: 0.055,      // Suavidade do ponto focal (controls.target)

  // Duração dos passos da animação de andar
  hopStepDuration: 280,        // ms por casa (desacelerado para animação nítida)
  hopSettleDuration: 100,      // ms de impacto/bounce após o salto

  // Delays da sequência e jogada automática
  autoPlayDelayMs: 650,        // Pausa antes da jogada automática de peça única
  overviewHoldMs: 380,         // Pausa na visão de cima antes do zoom-in
  approachDurationMs: 400,     // Duração da transição de aproximação
  returnWaitMs: 350,           // Pausa após término da caminhada antes de recuar

  // Proximidade e enquadramento da câmera durante o movimento
  zoomOffsetY: 1.1,            // Altura da câmera em relação ao personagem
  zoomOffsetForward: 1.4,      // Distância à frente/diagonal da peça (bem próxima)
  focusOffsetY: 0.5,           // Altura do ponto de foco no personagem

  // Altura da visão de cima (overview do tabuleiro)
  topDownHeight: 22,
};
