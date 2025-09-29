import React, { useEffect, useRef } from "react";
import styles from "./FloatingStars.module.css";

const FloatingStars = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let resizeTimeout;

    // Set canvas dimensions based on container
    const setCanvasDimensions = () => {
      const rect = container.getBoundingClientRect();
      // Use device pixel ratio for sharper rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      // Scale the context to match the device pixel ratio
      ctx.scale(dpr, dpr);
      // Set the canvas CSS size to match the container
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    setCanvasDimensions();

    // Star properties
    const numStars = Math.min(
      100,
      Math.floor((canvas.width * canvas.height) / 10000)
    ); // Adjust star count based on area
    const stars = [];

    class Star {
      constructor() {
        this.reset();
      }

      reset() {
        // Ensure stars are distributed across the entire canvas
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.twinkleSpeed = Math.random() * 0.02 + 0.005;
        this.twinkleDirection = 1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
      }

      update() {
        // Move star
        this.x += this.speedX;
        this.y += this.speedY;

        // Twinkle effect
        this.opacity += this.twinkleSpeed * this.twinkleDirection;
        if (this.opacity > 0.8 || this.opacity < 0.2) {
          this.twinkleDirection *= -1;
          this.opacity = Math.max(0.2, Math.min(0.8, this.opacity));
        }

        // Boundary conditions (wrap around screen)
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;

        this.draw();
      }
    }

    const initStars = () => {
      stars.length = 0;
      for (let i = 0; i < numStars; i++) {
        stars.push(new Star());
      }
    };

    initStars();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => star.update());
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      // Debounce resize to prevent too many recalculations
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setCanvasDimensions();
        // Reinitialize stars on resize to ensure proper distribution
        initStars();
      }, 100);
    };

    // Use ResizeObserver for more reliable container size changes
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={styles.starsContainer}>
      <canvas ref={canvasRef} className={styles.starsCanvas} />
    </div>
  );
};

export default FloatingStars;
