import { useHotkeys } from "react-hotkeys-hook";
import { useCallback } from "react";

export const useKeyboardShortcuts = ({
  onSearch,
  onClearFilters,
  onRefresh,
  onToggleFavorites,
  onFocusFirstResult,
  onEscape,
}) => {
  // Search shortcut (Ctrl+K or Cmd+K)
  useHotkeys(
    "ctrl+k, cmd+k",
    useCallback(
      (e) => {
        e.preventDefault();
        onSearch?.();
      },
      [onSearch]
    ),
    { enableOnFormTags: true }
  );

  // Clear filters (Ctrl+Shift+X)
  useHotkeys(
    "ctrl+shift+x, cmd+shift+x",
    useCallback(
      (e) => {
        e.preventDefault();
        onClearFilters?.();
      },
      [onClearFilters]
    )
  );

  // Refresh (Ctrl+R, but only when not in form)
  useHotkeys(
    "ctrl+r, cmd+r, f5",
    useCallback(
      (e) => {
        e.preventDefault();
        onRefresh?.();
      },
      [onRefresh]
    ),
    { enableOnFormTags: false }
  );

  // Toggle favorites view (Ctrl+F)
  useHotkeys(
    "ctrl+f, cmd+f",
    useCallback(
      (e) => {
        e.preventDefault();
        onToggleFavorites?.();
      },
      [onToggleFavorites]
    ),
    { enableOnFormTags: false }
  );

  // Focus first result (Arrow down when not in input)
  useHotkeys(
    "down",
    useCallback(
      (e) => {
        if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
          e.preventDefault();
          onFocusFirstResult?.();
        }
      },
      [onFocusFirstResult]
    )
  );

  // Escape key
  useHotkeys(
    "escape",
    useCallback(() => {
      onEscape?.();
    }, [onEscape]),
    { enableOnFormTags: true }
  );
};

// Hook for individual card shortcuts
export const useCardShortcuts = ({
  onToggleFavorite,
  onAccess,
  onExpand,
  isEnabled = true,
}) => {
  // Favorite (F key)
  useHotkeys(
    "f",
    useCallback(
      (e) => {
        if (isEnabled) {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite?.();
        }
      },
      [onToggleFavorite, isEnabled]
    ),
    { enableOnFormTags: false }
  );

  // Access (Enter or Space)
  useHotkeys(
    "enter, space",
    useCallback(
      (e) => {
        if (isEnabled) {
          e.preventDefault();
          e.stopPropagation();
          onAccess?.();
        }
      },
      [onAccess, isEnabled]
    ),
    { enableOnFormTags: false }
  );

  // Expand details (D key)
  useHotkeys(
    "d",
    useCallback(
      (e) => {
        if (isEnabled) {
          e.preventDefault();
          e.stopPropagation();
          onExpand?.();
        }
      },
      [onExpand, isEnabled]
    ),
    { enableOnFormTags: false }
  );
};
