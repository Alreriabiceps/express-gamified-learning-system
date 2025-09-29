// Power-up constants for the gamified learning system

// Power-up ID enum
export const PowerUpId = {
  HEALTH_POTION: "HEALTH_POTION",
  DISCARD_DRAW_5: "DISCARD_DRAW_5",
  DOUBLE_DAMAGE: "DOUBLE_DAMAGE",
  DAMAGE_ROULETTE: "DAMAGE_ROULETTE",
  HP_SWAP: "HP_SWAP",
  EMOJI_TAUNT: "EMOJI_TAUNT",
  MIRROR_SHIELD: "MIRROR_SHIELD",
  BARRIER: "BARRIER",
  SAFETY_NET: "SAFETY_NET",
};

// Power-up metadata for display
export const POWER_UPS = [
  {
    id: PowerUpId.HEALTH_POTION,
    name: "Health Potion",
    description: "Restore 20 HP",
    icon: "9ea", // beaker symbol via unicode as fallback icon
  },
  {
    id: PowerUpId.DISCARD_DRAW_5,
    name: "Discard & Draw 5",
    description: "Discard all cards, draw 5 new ones",
    icon: "504", // anticlockwise arrows
  },
  {
    id: PowerUpId.DOUBLE_DAMAGE,
    name: "Double Damage",
    description: "Next attack deals 2x damage",
    icon: "694", // crossed swords
  },
  {
    id: PowerUpId.DAMAGE_ROULETTE,
    name: "Damage Roulette",
    description: "Deal 1-15 random damage",
    icon: "3b2", // game die
  },
  {
    id: PowerUpId.HP_SWAP,
    name: "HP Swap",
    description: "Swap HP with opponent",
    icon: "504",
  },
  {
    id: PowerUpId.EMOJI_TAUNT,
    name: "Emoji Taunt",
    description: "Send a silly emote. No gameplay effect.",
    icon: "4a5", // collision spark (neutral)
  },
  // Defensive (armed) power-ups
  {
    id: PowerUpId.MIRROR_SHIELD,
    name: "Mirror Shield",
    description: "Reflect 50% of next damage you take.",
    icon: "67f", // black universal recycling symbol used as abstract mirror
  },
  {
    id: PowerUpId.BARRIER,
    name: "Barrier",
    description: "Absorb 15 damage from the next hit.",
    icon: "9f1", // brick
  },
  {
    id: PowerUpId.SAFETY_NET,
    name: "Safety Net",
    description: "If lethal, survive at 1 HP once.",
    icon: "6df", // ring buoy
  },
];

// Maximum HP constant
export const MAX_HP = 100;
