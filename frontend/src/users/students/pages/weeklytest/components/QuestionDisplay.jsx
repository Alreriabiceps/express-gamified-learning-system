import React from "react";
import styles from "../pages/WeeklyTest.module.css";

const QuestionDisplay = ({
  currentQuestion,
  currentQuestionIndex,
  tests,
  answers,
  handleAnswerSelect,
  handleNextQuestion,
  handlePreviousQuestion,
  isTestStarted,
  showAnimation,
  handleSubmit,
  setCurrentQuestionIndex,
}) => {
  if (!currentQuestion) return null;
  const options = Array.isArray(currentQuestion.choices)
    ? currentQuestion.choices
    : Array.isArray(currentQuestion.options)
    ? currentQuestion.options
    : [];
  // Determine if all questions are answered
  const allAnswered = tests.every((q) => answers[q._id]);
  // Find unanswered question indices
  const unansweredIndices = tests
    .map((q, idx) => (!answers[q._id] ? idx : null))
    .filter((idx) => idx !== null);
  const unansweredCount = unansweredIndices.length;
  // Handler to jump to first unanswered question
  const handleReviewUnanswered = () => {
    if (unansweredIndices.length > 0) {
      // Use window event to communicate to parent (since navigation is in parent)
      // Or, if you want, you can lift a callback prop for setCurrentQuestionIndex
      // For now, use a custom event
      const event = new CustomEvent("jumpToQuestionIndex", {
        detail: { index: unansweredIndices[0] },
      });
      window.dispatchEvent(event);
    }
  };
  return (
    <div className={styles.questionPanel}>
      {/* Question Number Navigation Bar */}
      <div className={styles.questionNavItemContainer}>
        {tests.map((q, idx) => {
          const isCurrent = idx === currentQuestionIndex;
          const isAnswered = !!answers[q._id];
          let itemClass = styles.questionNavItem; // Base class

          if (isCurrent) {
            itemClass = `${styles.questionNavItemCurrent}`;
          } else if (isAnswered) {
            itemClass = `${styles.questionNavItemAnswered}`;
          } else {
            itemClass = `${styles.questionNavItemUnanswered}`;
          }

          return (
            <button
              key={q._id}
              onClick={() => !isCurrent && setCurrentQuestionIndex(idx)} // Prevent action if current
              className={itemClass}
              aria-label={`Go to question ${idx + 1}`}
              disabled={isCurrent} // Disable current button from being "clicked" again
              tabIndex={isCurrent ? -1 : 0} // Improve keyboard navigation
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
      <div className={styles.questionHeader}>
        <span className={styles.questionNumber}>
          Question {currentQuestionIndex + 1} of {tests.length}
        </span>
        {currentQuestion.bloomsLevel && (
          <span className={styles.bloomLevel}>
            Bloom's Level: {currentQuestion.bloomsLevel}
          </span>
        )}
      </div>
      <div
        className={`${styles.questionContainer} ${
          showAnimation ? styles.questionVisible : styles.questionHidden
        }`}
      >
        <div className={styles.questionText}>
          {currentQuestion.questionText}
        </div>
        <div className={styles.answerOptions}>
          {options.length > 0 ? (
            options.map((option, idx) => (
              <button
                key={idx}
                className={
                  answers[currentQuestion._id] === option
                    ? styles.selectedAnswer
                    : styles.answerButton
                }
                onClick={() => handleAnswerSelect(currentQuestion._id, option)}
                disabled={!isTestStarted}
              >
                {option}
              </button>
            ))
          ) : (
            <div style={{ color: "red", fontWeight: "bold", padding: "1em" }}>
              No answer options available for this question.
            </div>
          )}
        </div>
      </div>
      <div className={styles.navigationButtons}>
        <button
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className={styles.navButton} // Uses new base .navButton style
        >
          Previous
        </button>
        {currentQuestionIndex === tests.length - 1 ? (
          // On the last question
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            {!allAnswered && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <span className={styles.unansweredMessage}>
                  {unansweredCount} unanswered question
                  {unansweredCount > 1 ? "s" : ""}.
                </span>
                <button
                  type="button"
                  className={styles.reviewUnansweredButton} // New specific class
                  onClick={handleReviewUnanswered}
                >
                  Review Unanswered
                </button>
              </div>
            )}
            <button
              className={styles.submitButton} // Uses new base .submitButton style
              onClick={handleSubmit}
              disabled={!allAnswered && isTestStarted} // Disable if not all answered (and test is started)
            >
              Submit Test
            </button>
          </div>
        ) : (
          // Not on the last question
          <button
            onClick={handleNextQuestion}
            // No explicit disabled state here, assuming handleNextQuestion handles boundaries
            // or if it should be disabled if current question isn't answered (depends on quiz logic)
            className={styles.navButton} // Uses new base .navButton style
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionDisplay;
