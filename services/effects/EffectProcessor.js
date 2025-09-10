class EffectProcessor {
  // Process damage effects
  static processDamageEffects(gameState, attackerId, targetId, baseDamage) {
    return {
      damage: Math.max(0, Math.floor(baseDamage)),
    };
  }
}

module.exports = EffectProcessor;
