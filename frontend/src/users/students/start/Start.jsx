import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import styles from "./Start.module.css";
import FloatingStars from "../components/FloatingStars/FloatingStars";
import ApprovalStatus from "../components/ApprovalStatus";

const BACKGROUND_MUSIC_SRC = "/shs.mp3";
const INITIAL_VOLUME = 1;
const SFX_LAUNCH_SRC = "/GLEAS.mp3";

const playSound = (src, volume = 0.5) => {
  try {
    const sound = new Audio(src);
    sound.volume = volume;
    sound.play().catch((e) => console.warn(`SFX play failed: ${e.message}`));
  } catch (e) {
    console.error("Error playing sound:", e);
  }
};

const Start = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [buttonPosition, setButtonPosition] = useState({
    top: "78%",
    left: "50%",
  });
  const [isCorrect, setIsCorrect] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [screenFlash, setScreenFlash] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // AI Security Question State
  const [securityQuestion, setSecurityQuestion] = useState(null);
  const [securityChoices, setSecurityChoices] = useState([]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState(true);

  const audioRef = useRef(null);
  const flashTimeoutRef = useRef(null);
  const containerRef = useRef(null);

  // --- Background Music Setup and Autoplay Attempt ---
  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio(BACKGROUND_MUSIC_SRC);
    audioRef.current.loop = true;
    audioRef.current.volume = INITIAL_VOLUME;
    audioRef.current.muted = false; // Start unmuted, will be set by mute effect
    audioRef.current.preload = "auto";

    // Add error handler
    const handleError = (e) => {
      console.error("Audio error:", e);
      setIsPlaying(false);
    };

    // Add loadeddata handler to attempt autoplay once audio is ready
    const handleLoaded = () => {
      console.log("Audio loaded and ready to play");
      audioRef.current
        .play()
        .then(() => {
          console.log("Autoplay started successfully");
          setIsPlaying(true);
        })
        .catch((e) => {
          console.warn("Autoplay blocked:", e.message);
          setIsPlaying(false);
        });
    };

    // Event listeners for play/pause state
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Attach all event listeners
    audioRef.current.addEventListener("loadeddata", handleLoaded);
    audioRef.current.addEventListener("play", handlePlay);
    audioRef.current.addEventListener("pause", handlePause);
    audioRef.current.addEventListener("error", handleError);

    // Attempt to play on first user interaction with the page
    const handleFirstInteraction = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current
          .play()
          .then(() => console.log("Audio started after user interaction"))
          .catch((e) =>
            console.warn("Audio still failed after interaction:", e)
          );
      }

      // Remove the event listeners after first interaction
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("keydown", handleFirstInteraction);

    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener("loadeddata", handleLoaded);
        audioRef.current.removeEventListener("play", handlePlay);
        audioRef.current.removeEventListener("pause", handlePause);
        audioRef.current.removeEventListener("error", handleError);
        audioRef.current = null;
      }
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
    };
  }, []); // Only run once on mount

  // Effect to handle mute/unmute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Separate effect for other initial setups like stars and event listeners
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Keep window event listener cleanup here
    return () => {
      window.removeEventListener("resize", checkMobile);
      clearTimeout(flashTimeoutRef.current); // Also clear flash timeout
    };
  }, [isMobile]);

  // Handler for the new "Play Anthem" button
  const handlePlayAnthem = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      // Only attempt to play if currently paused
      audioRef.current.volume = INITIAL_VOLUME; // Ensure volume is set
      audioRef.current.muted = isMuted; // Respect current muted state
      audioRef.current
        .play()
        .then(() => {
          // isPlaying state will be updated by the 'play' event listener
        })
        .catch((e) => {
          console.error("Failed to play anthem via button:", e);
          // Optionally give user feedback if play fails
        });
    }
  }, [isMuted]); // Dependencies are stable functions/refs

  // Handler for the mute button
  const handleMuteToggle = useCallback(() => {
    if (audioRef.current) {
      setIsMuted((prev) => !prev);
      // The useEffect hook listening to isMuted will handle pausing/playing the audio element
    }
  }, []); // Depends only on audioRef.current stability

  const handleLaunchClick = useCallback(() => {
    if (isCorrect && !isAnimating) {
      playSound(SFX_LAUNCH_SRC);
      setFeedbackMessage("Let's jump into the adventure!");
      setIsAnimating(true);

      // Fade out music if it's currently playing and not muted
      if (audioRef.current && !audioRef.current.paused && !isMuted) {
        let currentVolume = audioRef.current.volume;
        const fadeOutInterval = setInterval(() => {
          currentVolume -= 0.02;
          if (currentVolume <= 0) {
            clearInterval(fadeOutInterval);
            audioRef.current?.pause();
            audioRef.current.volume = INITIAL_VOLUME; // Reset volume
          } else if (audioRef.current) {
            audioRef.current.volume = Math.max(0, currentVolume);
          } else {
            clearInterval(fadeOutInterval);
          }
        }, 50);
      } else {
        // If music wasn't playing or was muted, just ensure it's paused
        audioRef.current?.pause();
      }

      setTimeout(() => {
        navigate("/student/dashboard");
      }, 1200);
    } else if (!isCorrect) {
      playSound(SFX_INCORRECT_SRC);
      setFeedbackMessage("Not quite! Solve the puzzle to continue!");
      const securityBox = containerRef.current?.querySelector(
        `.${styles.securityPanel}`
      );
      securityBox?.classList.add(styles.shakeAnimationBox);
      setTimeout(() => {
        securityBox?.classList.remove(styles.shakeAnimationBox);
      }, 400);
    }
  }, [
    isCorrect,
    isAnimating,
    navigate,
    isMuted,
    styles.securityPanel,
    styles.shakeAnimationBox,
  ]);

  // Keydown event listener (now in its own effect)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key.toLowerCase() === "m") handleMuteToggle();
      if (
        (event.key === "Enter" || event.key === " ") &&
        isCorrect &&
        !isAnimating
      ) {
        event.preventDefault();
        handleLaunchClick();
      }
      // Add 'A' key to play anthem if not currently playing
      if (
        event.key.toLowerCase() === "a" &&
        !isPlaying &&
        audioRef.current?.paused
      ) {
        event.preventDefault();
        handlePlayAnthem(); // Use the new handler
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isCorrect,
    isAnimating,
    handleLaunchClick,
    handleMuteToggle,
    handlePlayAnthem,
    isPlaying,
  ]); // Depends on relevant states/functions

  const handleMouseMove = (e) => {
    // Only enable button movement if music is NOT playing and other conditions met
    if (!isMobile && !isCorrect && !isAnimating && !isPlaying) {
      const buttonElement = document.getElementById("launch-button");
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const distanceX = Math.abs(e.clientX - (rect.left + rect.width / 2));
        const distanceY = Math.abs(e.clientY - (rect.top + rect.height / 2));
        const avoidDistance = 120;
        if (distanceX < avoidDistance && distanceY < avoidDistance) {
          let newLeftPercent = parseFloat(buttonPosition.left);
          let newTopPercent = parseFloat(buttonPosition.top);
          const moveFactor = 5;
          if (e.clientX < rect.left + rect.width / 2)
            newLeftPercent += moveFactor;
          else newLeftPercent -= moveFactor;
          if (e.clientY < rect.top + rect.height / 2)
            newTopPercent += moveFactor;
          else newTopPercent -= moveFactor;
          newLeftPercent = Math.max(10, Math.min(90, newLeftPercent));
          newTopPercent = Math.max(15, Math.min(85, newTopPercent));
          setButtonPosition({
            top: `${newTopPercent}%`,
            left: `${newLeftPercent}%`,
          });
        }
      }
    }
  };

  // Fetch AI security question on mount and after wrong answer
  const fetchSecurityQuestion = useCallback(async () => {
    setLoadingQuestion(true);
    setIsCorrect(false);
    setFeedbackMessage("");
    try {
      const res = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/api/generate-simple-security-question`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      if (
        !data ||
        !data.questionText ||
        !Array.isArray(data.choices) ||
        !data.correctAnswer
      ) {
        throw new Error("Invalid response format from API");
      }

      setSecurityQuestion(data.questionText);
      setSecurityChoices(data.choices);
      setSecurityAnswer(data.correctAnswer);
    } catch (err) {
      console.error("Error fetching security question:", err);
      // Fallback to a simple question if API fails
      setSecurityQuestion("What is 2 + 2?");
      setSecurityChoices(["3", "4", "5"]);
      setSecurityAnswer("4");
      setFeedbackMessage("Using fallback question due to API error");
    } finally {
      setLoadingQuestion(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurityQuestion();
  }, [fetchSecurityQuestion]);

  const handleAnswer = (answer) => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    if (isCorrect || isAnimating) return;

    const correct = answer === securityAnswer;
    const message = correct
      ? "You did it! The adventure continues!"
      : "Oops! Try working together and try again!";

    setScreenFlash(correct ? "correct" : "wrong");
    setIsCorrect(correct);
    setFeedbackMessage(message);
    if (!isPlaying) {
      setButtonPosition({ top: isMobile ? "65%" : "65%", left: "50%" });
    }

    if (!correct) {
      const securityBox = containerRef.current?.querySelector(
        `.${styles.securityPanel}`
      );
      securityBox?.classList.add(styles.shakeAnimationBox);
      setTimeout(() => {
        securityBox?.classList.remove(styles.shakeAnimationBox);
      }, 400);
      // Fetch a new question after a short delay
      setTimeout(() => {
        fetchSecurityQuestion();
      }, 600);
    }

    flashTimeoutRef.current = setTimeout(() => setScreenFlash(""), 200);
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.startPageWrapper} ${
        isAnimating ? styles.slideUpAnimation : ""
      }`}
      onMouseMove={handleMouseMove}
    >
      <FloatingStars />
      <div
        className={`${styles.screenFlashOverlay} ${
          screenFlash === "correct"
            ? styles.flashCorrect
            : screenFlash === "wrong"
            ? styles.flashWrong
            : ""
        }`}
      ></div>
      {/* Music playing message */}
      {isPlaying && (
        <div className={styles.musicPlayingMessage}>
          <span className={styles.musicIcon}>♪</span>
          <span className={styles.musicText}>GLEAS POP ANTHEM PLAYING</span>
          <span className={styles.musicIcon}>♪</span>
        </div>
      )}

      {/* Mute Button - Always show once audio has loaded */}
      <button
        onClick={handleMuteToggle}
        className={`${styles.gameButton} ${styles.muteButton}`}
        aria-label={
          isMuted ? "Unmute Background Music" : "Mute Background Music"
        }
        title={isMuted ? "Unmute (M)" : "Mute (M)"}
      >
        {isMuted ? "[Unmute]" : "[Mute]"}
      </button>

      <div className={styles.contentWrapper}>
        {/* Logo image above the title */}

        {/* Approval Status */}
        <ApprovalStatus
          isApproved={user?.isApproved}
          isActive={user?.isActive}
        />

        <h1 className={styles.pageTitle}>READY PLAYER?</h1>

        {/* New Play Anthem Button - Show only if music is NOT playing */}
        {!isPlaying && (
          <button
            onClick={handlePlayAnthem}
            className={`${styles.gameButton} ${styles.playAnthemButton}`}
            title="Play The Gleas Anthem (A)"
          >
            Play The Gleas Anthem
          </button>
        )}

        {!isCorrect && (
          <div className={styles.securityPanel}>
            <h2 className={styles.securityTitle}>Security Check:</h2>
            {loadingQuestion ? (
              <p className={styles.securityQuestion}>Loading question...</p>
            ) : (
              <>
                <p className={styles.securityQuestion}>{securityQuestion}</p>
                <div className={styles.answersContainer}>
                  {securityChoices &&
                    securityChoices.map((choice, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(choice)}
                        className={`${styles.gameButton} ${styles.answerButton}`}
                      >
                        {choice}
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {feedbackMessage && (
          <p
            className={`${styles.feedbackMessage} ${
              isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect
            }`}
          >
            {feedbackMessage}
          </p>
        )}
      </div>

      <button
        id="launch-button"
        onClick={handleLaunchClick}
        className={`${styles.gameButton} ${styles.launchButton} ${
          isCorrect ? styles.buttonReady : styles.buttonWaiting
        }`}
        style={{
          top: buttonPosition.top,
          left: buttonPosition.left,
          transform: "translate(-50%, -50%)",
          // Button movement transition only when not correct, not animating, and not playing music
          transition:
            !isCorrect && !isAnimating && !isPlaying
              ? "top 0.3s linear, left 0.3s linear"
              : "none",
        }}
        disabled={!isCorrect || isAnimating}
        title={
          isCorrect
            ? "Launch Application (Enter/Space)"
            : "Complete Security Check First"
        }
      >
        LAUNCH
      </button>
    </div>
  );
};

export default Start;
