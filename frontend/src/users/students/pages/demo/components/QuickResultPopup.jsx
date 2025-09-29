import React, { useEffect, useState } from "react";
import { FaCheck, FaTimes, FaBolt } from "react-icons/fa";

const QuickResultPopup = ({ isVisible, resultData, onClose }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      // Auto close after 4 seconds
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`quick-result-popup ${isAnimating ? "show" : "hide"}`}>
      <div className="popup-content">
        <div className="popup-header">
          <div
            className={`result-icon ${
              resultData?.isCorrect ? "correct" : "incorrect"
            }`}
          >
            {resultData?.isCorrect ? <FaCheck /> : <FaTimes />}
          </div>
          <h3 className="result-title">
            {resultData?.isCorrect
              ? "Enemy Got It Right!"
              : "Enemy Got It Wrong!"}
          </h3>
        </div>

        <div className="popup-body">
          <div className="question-info">
            <p className="question-text">{resultData?.question}</p>
          </div>

          <div className="answer-info">
            <div className="enemy-answer">
              <span className="label">Enemy's Answer:</span>
              <span
                className={`answer ${
                  resultData?.isCorrect ? "correct" : "incorrect"
                }`}
              >
                {resultData?.opponentAnswer || "Answer submitted"}
              </span>
            </div>

            <div className="correct-answer">
              <span className="label">Correct Answer:</span>
              <span className="answer correct">
                {resultData?.correctAnswer}
              </span>
            </div>
          </div>

          <div className="damage-info">
            <FaBolt className="damage-icon" />
            <span className="damage-text">
              {resultData?.isCorrect
                ? `You take ${resultData?.damage} damage!`
                : `Enemy takes ${resultData?.damage} damage!`}
            </span>
          </div>
        </div>

        <div className="popup-footer">
          <button className="close-btn" onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickResultPopup;
