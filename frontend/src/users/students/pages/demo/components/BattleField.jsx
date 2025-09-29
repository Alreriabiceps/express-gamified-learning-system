import React from "react";
import {
  FaGamepad,
  FaShieldAlt,
  FaBolt,
  FaCrosshairs,
  FaClock,
  FaCheckCircle,
} from "react-icons/fa";

const BattleField = ({ gamePhase, isMyTurn }) => {
  const getBattleFieldMessage = () => {
    if (gamePhase === "cardSelection" && isMyTurn) {
      return "Select a card to challenge your opponent!";
    }
    if (gamePhase === "cardSelection" && !isMyTurn) {
      return "Waiting for opponent to select a card...";
    }
    if (gamePhase === "waiting") {
      return "Waiting for opponent to answer your challenge...";
    }
    if (gamePhase === "answer") {
      return "Answer the question to deal damage!";
    }
    if (gamePhase === "result") {
      return "Processing result...";
    }
    return "Select a card to challenge your opponent!";
  };

  const getStatusColor = () => {
    if (gamePhase === "cardSelection" && isMyTurn) {
      return "#22c55e"; // Green for your turn
    }
    if (
      gamePhase === "waiting" ||
      (gamePhase === "cardSelection" && !isMyTurn)
    ) {
      return "#f59e0b"; // Orange for waiting
    }
    if (gamePhase === "answer") {
      return "#ef4444"; // Red for battle/answer
    }
    if (gamePhase === "result") {
      return "#8b5cf6"; // Purple for processing
    }
    return "#64748b"; // Default gray
  };

  const getBattleIcon = () => {
    if (gamePhase === "cardSelection" && isMyTurn) {
      return <FaGamepad className="battle-icon" style={{ color: "#22c55e" }} />;
    }
    if (gamePhase === "cardSelection" && !isMyTurn) {
      return <FaClock className="battle-icon" style={{ color: "#f59e0b" }} />;
    }
    if (gamePhase === "waiting") {
      return (
        <FaShieldAlt className="battle-icon" style={{ color: "#f59e0b" }} />
      );
    }
    if (gamePhase === "answer") {
      return (
        <FaCrosshairs className="battle-icon" style={{ color: "#ef4444" }} />
      );
    }
    if (gamePhase === "result") {
      return <FaBolt className="battle-icon" style={{ color: "#8b5cf6" }} />;
    }
    return <FaGamepad className="battle-icon" style={{ color: "#64748b" }} />;
  };

  return (
    <div className="battleZone">
      <div className="battleField">
        <div className="battleField-header">
          <div className="battleField-title">BATTLE ARENA</div>
          <div
            className="battleField-status"
            style={{ color: getStatusColor() }}
          >
            {isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
          </div>
        </div>

        <div className="battleField-content">
          <div className="battleField-message">{getBattleFieldMessage()}</div>

          <div className="battleField-visual">
            <div className="battle-arena">{getBattleIcon()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattleField;
