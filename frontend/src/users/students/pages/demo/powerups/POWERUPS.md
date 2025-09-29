# Power-Ups System (Frontend)

This folder contains a minimal, modular frontend scaffolding for game power-ups.

Core principles:

- Availability is chance-based (8%) at the start of your turn.
- Exactly one random power-up may appear. If unused, it disappears at end of turn.
- Using a power-up is free and does not end your turn.
- Only the active player sees the available power-up; opponent only sees effects.
- Server remains the source of truth for game state; frontend emits `game:use_power_up`.

## Files

- `constants.js`

  - `PowerUpId`: enum of all power-ups
  - `POWER_UPS`: metadata for display
  - `MAX_HP = 100`

- `usePowerUps.js`

  - Hook that:
    - Rolls 8% chance on your turn start to expose one random power-up
    - Exposes `{ availablePowerUpId, isAvailable, usePowerUp }`
    - Emits `game:use_power_up` on `usePowerUp(id)`; clears availability

- `PowerUpPanel.jsx`
  - Simple, responsive UI (right-side panel on desktop, compact bar on mobile)
  - Renders all power-ups; only the available one “glows” and is clickable

## Integration (example)

In `Demo.jsx`:

```js
import usePowerUps from "./powerups/usePowerUps";
import PowerUpPanel from "./powerups/PowerUpPanel";

const { availablePowerUpId, isAvailable, usePowerUp } = usePowerUps({
  isMyTurn,
  players,
  myPlayerIndex,
  opponentIndex,
  socketRef,
  roomId,
  gameId,
});

<PowerUpPanel
  isMobile={isMobile}
  availablePowerUpId={availablePowerUpId}
  isAvailable={isAvailable}
  onUse={usePowerUp}
/>;
```

## Backend contract

Frontend emits:

```json
{
  "roomId": "...",
  "gameId": "...",
  "powerUpId": "HEALTH_POTION|DISCARD_DRAW_5|DOUBLE_DAMAGE|DAMAGE_ROULETTE|HP_SWAP",
  "playerId": "..."
}
```

Event name: `game:use_power_up`

Server should:

- Validate it is the player’s turn and the power-up is legal now
- Apply the effect:
  - Health Potion: +20 HP, clamp to 100
  - Discard & Draw 5: discard all; draw 5 (reshuffle discard if needed)
  - Double/Triple Damage: set `nextAttackMultiplier` to 2 or 3 until next attack
  - Damage Roulette: deal random 1–50 to opponent
  - HP Swap: swap current HP values (clamp to 0..100)
- Broadcast updated game state via existing `game_state_update`

## Rollout plan

1. Health Potion (done in UI; requires server handler)
2. Double Damage (server sets/consumes `nextAttackMultiplier` in attack resolution)
3. Triple Damage (as above)
4. Discard & Draw 5 (server handles deck/reshuffle)
5. Damage Roulette (server random damage)
6. HP Swap (server swaps current HPs)

## Notes

- No local HP math is performed in the frontend beyond display.
- The RNG is client-side for UX; production can move RNG to server to prevent desync/abuse.
- Keep UI minimal; effects/animations can be layered later without changing APIs.
