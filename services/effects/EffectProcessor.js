class EffectProcessor {
  // Process damage effects
  static processDamageEffects(gameState, attackerId, targetId, baseDamage) {
    try {
      const attacker = (gameState.players || []).find(
        (p) => String(p.userId) === String(attackerId)
      );
      const defender = (gameState.players || []).find(
        (p) => String(p.userId) === String(targetId)
      );
      if (!attacker) {
        return { damage: Math.max(0, Math.floor(baseDamage)) };
      }

      let multiplier = 1;

      // Consume one-time damage multiplier power-ups if available
      if (
        Array.isArray(attacker.activePowerUps) &&
        attacker.activePowerUps.length
      ) {
        const remainingPowerUps = [];
        for (const pu of attacker.activePowerUps) {
          if (pu && pu.type === "damage_multiplier" && pu.usesLeft > 0) {
            multiplier *= Number(pu.multiplier || 1);
            const newUses = (pu.usesLeft || 1) - 1;
            if (newUses > 0) {
              remainingPowerUps.push({ ...pu, usesLeft: newUses });
            }
            // Do not push back if consumed
          } else {
            remainingPowerUps.push(pu);
          }
        }
        attacker.activePowerUps = remainingPowerUps;
      }

      let finalDamage = Math.max(0, Math.floor(baseDamage * multiplier));
      let barrierAbsorbed = 0;

      // Defensive traps on defender
      if (
        defender &&
        defender.defenseTrap &&
        defender.defenseTrap.usesLeft > 0
      ) {
        const trap = defender.defenseTrap;

        if (trap.type === "barrier") {
          const absorb = Math.min(trap.absorb || 0, finalDamage);
          finalDamage -= absorb;
          barrierAbsorbed = absorb;
          trap.usesLeft -= 1;
          defender.defenseTrap = trap.usesLeft > 0 ? trap : null;
        }

        if (trap && trap.type === "safety_net") {
          // handled after damage application in caller, but retain marker
        }
      }

      return { damage: finalDamage, barrierAbsorbed };
    } catch (_) {
      return { damage: Math.max(0, Math.floor(baseDamage)) };
    }
  }
}

module.exports = EffectProcessor;
