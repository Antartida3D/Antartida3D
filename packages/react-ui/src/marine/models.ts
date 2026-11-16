/**
 * Colors of the Océano models (#8), which are low-poly (lowPolyMarine.ts, #196). Shapes and colors
 * are illustrations: they keep the marks that tell each animal apart, not its exact anatomy.
 */
export const MARINE_PALETTE = {
  black: 0x1f2a36, white: 0xf7fafb, eyeWhite: 0xe9f1f4,
  // Humpback: dark grey back, white flippers and throat, knobs on the head, dark baleen.
  // Antarctic minke, as SEA_MODELS.minke.
  minke: 0x3d4852,
  whale: 0x55606b, whaleKnob: 0x47515b, pleat: 0xd9dee2, pleatLine: 0x9aa5ae, baleen: 0x3b3530, fringe: 0xb9a98f,
  // Leopard seal: dark grey back, pale spotted throat and belly.
  leopard: 0x5f6b75, leopardPale: 0xbfc8ce, leopardSpot: 0x3a434b, tooth: 0xf1ead8, gum: 0xb7707a,
  // Emperor penguin, as in sightingModels.ts.
  emperorYellow: 0xf2c14e, emperorChest: 0xf6e7a8, emperorBill: 0xe59a6b,
  // Antarctic krill: almost transparent with red pigment spots, big black eyes, green gut.
  krillShell: 0xe7b3a2, krillRed: 0xc8472a, krillGut: 0x6f9a3c, krillLeg: 0xf0cfc2,
  // Diatoms: golden-brown cells with darker plastids.
  diatom: 0xc9a24b, diatomRim: 0x9c7a32, diatomGlass: 0xe8dcae, plastid: 0x6e7f2e,
  // Antarctic silverfish and squid.
  silver: 0xc9d3d8, silverDark: 0x7f8f99, squid: 0xd99a8a, squidDark: 0xa8635a, squidSpot: 0x8c3f36,
} as const;
