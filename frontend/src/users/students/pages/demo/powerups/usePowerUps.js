import { useEffect, useMemo, useState, useCallback } from "react";
import { PowerUpId, POWER_UPS, MAX_HP } from "./constants";

// Hook to manage power-up availability and usage client-side
// Assumes server is source of truth for HP and effects via socket events
export default function usePowerUps({
  isMyTurn,
  players,
  myPlayerIndex,
  opponentIndex,
  socketRef,
  roomId,
  gameId,
  onUsed,
  availabilityChance = 0.08,
  forcedPowerUpId = null,
}) {
  const [availablePowerUpId, setAvailablePowerUpId] = useState(null);
  const [lastRolledTurnKey, setLastRolledTurnKey] = useState(null);

  const myPlayer = players[myPlayerIndex] || {};
  const opponent = players[opponentIndex] || {};

  // Roll exactly once per my turn start
  useEffect(() => {
    if (!isMyTurn) return;

    // Create a key that changes each time it's my turn
    const turnKey = `${myPlayer?.userId || "me"}_${Date.now()}`;

    if (lastRolledTurnKey === turnKey) return;

    // Chance to make exactly one power-up available (default 8%)
    const roll = Math.random();
    if (roll < availabilityChance) {
      if (forcedPowerUpId) {
        setAvailablePowerUpId(forcedPowerUpId);
      } else {
        const randomIndex = Math.floor(Math.random() * POWER_UPS.length);
        setAvailablePowerUpId(POWER_UPS[randomIndex].id);
      }
    } else {
      setAvailablePowerUpId(null);
    }

    setLastRolledTurnKey(turnKey);
  }, [isMyTurn, myPlayer?.userId, availabilityChance, forcedPowerUpId]);

  // Clear availability when it's no longer my turn
  useEffect(() => {
    if (!isMyTurn && availablePowerUpId) {
      setAvailablePowerUpId(null);
    }
  }, [isMyTurn, availablePowerUpId]);

  const isAvailable = useMemo(
    () => Boolean(isMyTurn && availablePowerUpId),
    [isMyTurn, availablePowerUpId]
  );

  const usePowerUp = useCallback(
    (powerUpId) => {
      if (!isMyTurn || !availablePowerUpId || powerUpId !== availablePowerUpId)
        return false;
      if (!socketRef?.current) return false;

      // Map frontend IDs to backend IDs
      const backendIdMap = {
        HEALTH_POTION: "health_potion",
        DISCARD_DRAW_5: "discard_draw_5",
        DOUBLE_DAMAGE: "double_damage",
        DAMAGE_ROULETTE: "damage_roulette",
        HP_SWAP: "hp_swap",
        EMOJI_TAUNT: "emoji_taunt",
        MIRROR_SHIELD: "mirror_shield",
        BARRIER: "barrier",
        SAFETY_NET: "safety_net",
      };
      const backendPowerUpId = backendIdMap[powerUpId] || powerUpId;

      // Emit server event; server applies effect and updates/broadcasts state
      socketRef.current.emit("use_powerup", {
        roomId,
        gameId,
        powerUpId: backendPowerUpId,
        playerId: myPlayer?.userId,
      });

      // Optimistic local clear; server will send updated state via game_state_update
      setAvailablePowerUpId(null);

      // Optional local feedback
      if (typeof onUsed === "function") {
        try {
          onUsed(powerUpId);
        } catch (_) {}
      }
      return true;
    },
    [
      isMyTurn,
      availablePowerUpId,
      socketRef,
      roomId,
      gameId,
      myPlayer?.userId,
      onUsed,
    ]
  );

  return {
    availablePowerUpId,
    isAvailable,
    usePowerUp,
  };
}
