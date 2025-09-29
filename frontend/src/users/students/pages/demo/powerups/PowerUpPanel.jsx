import React, { useState } from "react";
import { POWER_UPS, PowerUpId } from "./constants";
import {
  FaFlask,
  FaSyncAlt,
  FaBolt,
  FaDice,
  FaExchangeAlt,
  FaShieldAlt,
  FaLifeRing,
  FaLaughBeam,
} from "react-icons/fa";

const PowerUpPanel = ({ isMobile, availablePowerUpId, isAvailable, onUse }) => {
  if (!POWER_UPS || POWER_UPS.length === 0) return null;

  const SHOW_TEXT = true;
  const [collapsed, setCollapsed] = useState(isMobile ? true : false);

  const containerStyle = isMobile
    ? {
        position: "fixed",
        bottom: 12,
        left: 12,
        right: 12,
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 6,
        background: "rgba(17, 24, 39, 0.7)",
        border: "1px solid var(--field-border)",
        borderRadius: 12,
        padding: 6,
        zIndex: 20,
      }
    : {
        position: "absolute",
        right: 12,
        top: 100,
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gridAutoRows: "min-content",
        gap: 12,
        background: "rgba(17, 24, 39, 0.7)",
        border: "1px solid var(--field-border)",
        borderRadius: 12,
        padding: 12,
        width: 340,
        boxSizing: "border-box",
        overflow: "hidden",
        maxHeight: "70vh",
        overflowY: "auto",
        zIndex: 10,
      };

  const itemStyle = (enabled) => ({
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 12,
    padding: isMobile ? 6 : 12,
    borderRadius: 10,
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.4,
    border: enabled ? "1px solid var(--legendary-gold)" : "1px solid #334155",
    boxShadow: enabled ? "0 0 10px rgba(234, 179, 8, 0.5)" : "none",
    background: enabled ? "rgba(234, 179, 8, 0.1)" : "transparent",
    transition: "all 0.2s ease",
    minHeight: isMobile ? 56 : 84,
    width: "100%",
    boxSizing: "border-box",
  });

  const getIcon = (id) => {
    switch (id) {
      case PowerUpId.HEALTH_POTION:
        return <FaFlask size={18} />;
      case PowerUpId.DISCARD_DRAW_5:
        return <FaSyncAlt size={18} />;
      case PowerUpId.DOUBLE_DAMAGE:
        return <FaBolt size={18} />;
      case PowerUpId.DAMAGE_ROULETTE:
        return <FaDice size={18} />;
      case PowerUpId.HP_SWAP:
        return <FaExchangeAlt size={18} />;
      case PowerUpId.MIRROR_SHIELD:
      case PowerUpId.BARRIER:
        return <FaShieldAlt size={18} />;
      case PowerUpId.SAFETY_NET:
        return <FaLifeRing size={18} />;
      case PowerUpId.EMOJI_TAUNT:
        return <FaLaughBeam size={18} />;
      default:
        return <FaBolt size={18} />;
    }
  };

  const getColor = (id) => {
    switch (id) {
      case PowerUpId.HEALTH_POTION:
        return "#22c55e";
      case PowerUpId.DISCARD_DRAW_5:
        return "#8b5cf6";
      case PowerUpId.DOUBLE_DAMAGE:
        return "#f59e0b";
      case PowerUpId.DAMAGE_ROULETTE:
        return "#ec4899";
      case PowerUpId.HP_SWAP:
        return "#06b6d4";
      case PowerUpId.MIRROR_SHIELD:
        return "#3b82f6";
      case PowerUpId.BARRIER:
        return "#14b8a6";
      case PowerUpId.SAFETY_NET:
        return "#a3e635";
      case PowerUpId.EMOJI_TAUNT:
        return "#fbbf24";
      default:
        return "#cbd5e1";
    }
  };

  if (!isMobile && collapsed) {
    const glow = isAvailable ? "0 0 10px #22c55e" : "none";
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: "absolute",
          right: 12,
          top: 100,
          background: "rgba(17, 24, 39, 0.9)",
          border: "1px solid var(--field-border)",
          color: "#eab308",
          borderRadius: 9999,
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: glow,
          cursor: "pointer",
          zIndex: 11,
        }}
        title={isAvailable ? "Power-up available" : "Spells"}
        aria-label="Open spells"
      >
        <FaBolt />
      </button>
    );
  }

  // Mobile collapsed bubble
  if (isMobile && collapsed) {
    const glow = isAvailable ? "0 0 10px #22c55e" : "none";
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: "fixed",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(17, 24, 39, 0.9)",
          border: "1px solid var(--field-border)",
          color: "#eab308",
          borderRadius: 9999,
          width: 44,
          height: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: glow,
          cursor: "pointer",
          zIndex: 21,
        }}
        title={isAvailable ? "Power-up available" : "Spells"}
        aria-label="Open spells"
      >
        <FaBolt />
      </button>
    );
  }

  return (
    <div style={containerStyle}>
      {!isMobile && (
        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
            color: "#eab308",
            fontWeight: 700,
          }}
        >
          <span>Spells</span>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: "transparent",
              color: "#cbd5e1",
              border: "none",
              cursor: "pointer",
            }}
            aria-label="Collapse spells"
          >
            ×
          </button>
        </div>
      )}
      {isMobile && (
        <div
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
            color: "#eab308",
            fontWeight: 700,
          }}
        >
          <span>Spells</span>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: "transparent",
              color: "#cbd5e1",
              border: "none",
              cursor: "pointer",
            }}
            aria-label="Collapse spells"
          >
            ×
          </button>
        </div>
      )}
      {POWER_UPS.map((p) => {
        const enabled = isAvailable && p.id === availablePowerUpId;
        return (
          <div
            key={p.id}
            style={itemStyle(enabled)}
            onClick={() => enabled && onUse(p.id)}
            role="button"
            aria-disabled={!enabled}
            title={`${p.name} — ${p.description}`}
          >
            <div style={{ color: getColor(p.id) }}>{getIcon(p.id)}</div>
            {SHOW_TEXT && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  maxWidth: "100%",
                  flex: "1 1 auto",
                  minWidth: 0, // allow ellipsis to work in flexbox
                }}
              >
                <div
                  style={{
                    color: "var(--legendary-gold)",
                    fontWeight: 700,
                    fontSize: 13,
                    lineHeight: 1.25,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    color: "#cbd5e1",
                    fontSize: 11,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {p.description}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PowerUpPanel;
