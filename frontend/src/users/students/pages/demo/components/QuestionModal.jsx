import React, { useState, useEffect, useCallback } from "react";
import { FaTimes, FaCheck } from "react-icons/fa";
import questionService from "../services/questionService";

const QuestionModal = ({
  isOpen,
  onClose,
  cardData,
  onAnswerSubmit,
  isProcessing = false,
  deadlineTs = null, // absolute timestamp when timer ends
}) => {
  // Simple state - no complex refs or multiple flags
  const [question, setQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);

  const loadQuestion = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let gameQuestion;

      // Handle different question data structures
      if (cardData.questionData) {
        // Card has real question data from database
        gameQuestion = questionService.transformQuestionToGameFormat(
          cardData.questionData
        );

        // If transform didn't find correctAnswer, use cardData.answer as fallback
        if (!gameQuestion.correctAnswer && cardData.answer) {
          gameQuestion.correctAnswer = cardData.answer;
        }
      } else if (cardData.question && cardData.choices) {
        // Card has question data directly in the card object
        const possibleCorrectAnswer =
          cardData.correctAnswer ||
          cardData.answer ||
          cardData.correct_answer ||
          cardData.solution;

        gameQuestion = {
          question: cardData.question,
          choices: cardData.choices,
          correctAnswer: possibleCorrectAnswer,
          bloomLevel: cardData.bloomLevel || cardData.bloom_level,
        };
      } else {
        // Fallback: Get random question for the card's Bloom's level
        const dbQuestion = await questionService.getRandomQuestionByBloomLevel(
          cardData.bloomLevel
        );
        gameQuestion =
          questionService.transformQuestionToGameFormat(dbQuestion);
      }

      setQuestion(gameQuestion);
    } catch (error) {
      console.error("Error loading question:", error);
      setError("Failed to load question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [cardData]);

  // Load question when modal opens
  useEffect(() => {
    if (isOpen && cardData) {
      loadQuestion();
    }
  }, [isOpen, cardData, loadQuestion]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuestion(null);
      setSelectedAnswer(null);
      setIsSubmitted(false);
      setError(null);
      setTimeLeft(30);
    }
  }, [isOpen]);

  // Start countdown based on absolute deadline when question is ready
  useEffect(() => {
    if (!isOpen || !question || isSubmitted) return;

    // Determine initial remaining time from deadlineTs if provided
    const computeRemaining = () => {
      if (deadlineTs) {
        const ms = Math.max(0, deadlineTs - Date.now());
        return Math.ceil(ms / 1000);
      }
      return 30;
    };

    setTimeLeft(computeRemaining());
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const remaining = deadlineTs
          ? Math.ceil(Math.max(0, deadlineTs - Date.now()) / 1000)
          : prev - 1;

        if (remaining <= 0) {
          clearInterval(interval);
          // Auto-submit as incorrect if time runs out and not submitted
          if (!isSubmitted && onAnswerSubmit) {
            setIsSubmitted(true);
            onAnswerSubmit({
              question: question,
              selectedAnswer: null,
              correctAnswer: question.correctAnswer,
              isCorrect: false,
              damage: 0,
              isTimerTimeout: true, // Flag to indicate this is a timer timeout
            });
            setTimeout(() => {
              onClose();
            }, 5000);
          }
          return 0;
        }
        return remaining ?? prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, question, isSubmitted, onAnswerSubmit, onClose, deadlineTs]);

  const handleAnswerSelect = (answer) => {
    if (isSubmitted) return; // Prevent selection after submission
    setSelectedAnswer(answer);
  };

  const handleSubmit = () => {
    if (!selectedAnswer || !question || isSubmitted) return;

    const isCorrect = selectedAnswer === question.correctAnswer;

    // Set submitted state IMMEDIATELY - this triggers highlighting
    setIsSubmitted(true);

    // Call parent callback
    if (onAnswerSubmit) {
      onAnswerSubmit({
        question: question,
        selectedAnswer: selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: isCorrect,
        damage: questionService.getDamageByBloomLevel(question.bloomLevel),
      });
    }

    // Auto close after 5 seconds
    setTimeout(() => {
      onClose();
    }, 5000);
  };

  // Simple, direct choice class logic - no complex conditions
  const getChoiceClass = (choice) => {
    let classes = "choiceButton";

    // Add selected class
    if (selectedAnswer === choice) {
      classes += " selected";
    }

    // Add result classes ONLY after submission
    if (isSubmitted) {
      if (choice === question.correctAnswer) {
        classes += " correct";
      } else if (choice === selectedAnswer) {
        classes += " incorrect";
      }
    }

    return classes;
  };

  if (!isOpen) return null;

  return (
    <div className="questionModalOverlay">
      <div className="questionModal">
        <div className="modalHeader">
          <h2>Answer the Question</h2>
          <div
            style={{
              marginLeft: "auto",
              fontWeight: 700,
              color:
                timeLeft > 10
                  ? "#22c55e"
                  : timeLeft > 5
                  ? "#f59e0b"
                  : "#ef4444",
            }}
          >
            {timeLeft}s
          </div>
          <button className="closeButton" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modalContent">
          {isLoading ? (
            <div className="loading">
              <p>Loading question...</p>
            </div>
          ) : error ? (
            <div className="error">
              <p>{error}</p>
            </div>
          ) : question ? (
            <>
              {/* Question */}
              <div className="questionText">
                <h3>{question.question}</h3>
              </div>

              {/* Answer Choices */}
              <div className="answerChoices">
                {question.choices.map((choice, index) => {
                  return (
                    <button
                      key={index}
                      className={getChoiceClass(choice)}
                      onClick={() => handleAnswerSelect(choice)}
                      disabled={isSubmitted}
                    >
                      <span className="choiceLetter">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="choiceText">{choice}</span>
                      {isSubmitted && choice === question.correctAnswer && (
                        <FaCheck className="correctIcon" />
                      )}
                      {isSubmitted &&
                        selectedAnswer === choice &&
                        choice !== question.correctAnswer && (
                          <FaTimes className="incorrectIcon" />
                        )}
                    </button>
                  );
                })}
              </div>

              {/* Submit Button */}
              {!isSubmitted && (
                <div className="submitSection">
                  <button
                    className="submitButton"
                    onClick={handleSubmit}
                    disabled={!selectedAnswer || isProcessing}
                  >
                    {isProcessing ? "Submitting..." : "Submit Answer"}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default QuestionModal;
