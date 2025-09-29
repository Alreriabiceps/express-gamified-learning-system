import React, { useRef, useEffect, useState, useCallback } from "react";

import { useInView } from "react-intersection-observer";
import { FaFilePdf, FaSpinner } from "react-icons/fa";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import { cacheManager } from "../utils/db";
import styles from "./PdfThumbnail.module.css";

// Configure PDF.js worker - use a local worker to avoid CORS issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.2.133/pdf.worker.min.js`;

const PdfThumbnail = ({
  url,
  scale = 0.2,
  className = "",
  fallbackIcon = <FaFilePdf />,
  enableLazyLoading = true,
  enableCaching = true,
  onError,
  onLoad,
}) => {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cachedBlob, setCachedBlob] = useState(null);

  // Intersection observer for lazy loading
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
    triggerOnce: true,
    skip: !enableLazyLoading,
  });

  // Set refs callback
  const setRefs = useCallback(
    (node) => {
      canvasRef.current = node;
      inViewRef(node);
    },
    [inViewRef]
  );

  const renderThumbnail = useCallback(async () => {
    if (!url || !canvasRef.current || isLoaded) return;

    setIsLoading(true);
    setError(false);

    try {
      // Check cache first if enabled
      if (enableCaching) {
        const cached = await cacheManager.getCachedThumbnail(url);
        if (cached) {
          setCachedBlob(cached);
          const img = new Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            setIsLoaded(true);
            setIsLoading(false);
            onLoad?.();
          };
          img.src = URL.createObjectURL(cached);
          return;
        }
      }

      // Render from PDF
      const loadingTask = pdfjsLib.getDocument({
        url,
        cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.2.133/cmaps/`,
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Cache the thumbnail if enabled
      if (enableCaching) {
        canvas.toBlob(
          async (blob) => {
            if (blob) {
              await cacheManager.setCachedThumbnail(url, blob);
            }
          },
          "image/png",
          0.8
        );
      }

      setIsLoaded(true);
      onLoad?.();
    } catch (err) {
      console.error("Error rendering PDF thumbnail:", err);
      setError(true);
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  }, [url, scale, enableCaching, isLoaded, onLoad, onError]);

  // Trigger rendering when in view (or immediately if lazy loading disabled)
  useEffect(() => {
    if ((!enableLazyLoading || inView) && url && !isLoaded && !error) {
      renderThumbnail();
    }
  }, [inView, enableLazyLoading, renderThumbnail, url, isLoaded, error]);

  // Clean up blob URL
  useEffect(() => {
    return () => {
      if (cachedBlob) {
        URL.revokeObjectURL(cachedBlob);
      }
    };
  }, [cachedBlob]);

  if (error) {
    return (
      <div
        className={`${styles.thumbnailContainer} ${styles.error} ${className}`}
      >
        <div className={styles.fallbackIcon}>{fallbackIcon}</div>
      </div>
    );
  }

  return (
    <div className={`${styles.thumbnailContainer} ${className}`}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <FaSpinner className={styles.spinner} />
        </div>
      )}

      <canvas
        ref={setRefs}
        className={`${styles.thumbnailCanvas} ${isLoaded ? styles.loaded : ""}`}
        style={{ opacity: isLoaded ? 1 : 0 }}
      />

      {!isLoaded && !isLoading && (
        <div className={styles.placeholder}>
          <div className={styles.fallbackIcon}>{fallbackIcon}</div>
        </div>
      )}
    </div>
  );
};

export default PdfThumbnail;
