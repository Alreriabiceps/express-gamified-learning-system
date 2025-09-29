import React from "react";
import {
  FaTrophy,
  FaRedo,
  FaTimes,
  FaStar,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";

const VictoryModal = ({
  winner,
  onRestart,
  onClose,
  isVisible,
  isWinner,
  starChange,
}) => {
  if (!isVisible) return null;

  return (
    <div className="victoryModal">
      <div className="victoryCard">
        <div className="victoryIcon">
          <FaTrophy />
        </div>
        <h2 className="victoryTitle">{winner} WINS!</h2>
        <p className="victorySubtitle">Congratulations on your victory!</p>

        {/* Star Reward Section */}
        <div className="starRewardSection">
          <div className="starRewardTitle">
            <FaStar className="starIcon" />
            Star Rewards
          </div>
          <div className="starChange">
            {isWinner ? (
              <div className="starGain">
                <FaArrowUp className="arrowUp" />
                <span className="starAmount">+8 Stars</span>
                <span className="starMessage">Victory Bonus!</span>
              </div>
            ) : (
              <div className="starLoss">
                <FaArrowDown className="arrowDown" />
                <span className="starAmount">-8 Stars</span>
                <span className="starMessage">Better luck next time!</span>
              </div>
            )}
          </div>
        </div>

        <div className="victoryActions">
          <button className="victoryBtn primary" onClick={onRestart}>
            <FaRedo />
            Play Again
          </button>
          <button className="victoryBtn secondary" onClick={onClose}>
            <FaTimes />
            Exit Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default VictoryModal;
