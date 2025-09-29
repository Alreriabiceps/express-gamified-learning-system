import React, { useState, useRef, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaTimes, FaClock } from "react-icons/fa";
import styles from "./SearchBar.module.css";

const SearchBar = ({
  value,
  onChange,
  onClear,
  searchHistory = [],
  suggestions = [],
  placeholder = "Search reviewers...",
  className = "",
  autoFocus = false,
  onSubmit,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionRefs = useRef([]);

  // Focus input externally
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Combine history and suggestions
  const allSuggestions = [
    ...searchHistory
      .slice(0, 3)
      .map((item) => ({ type: "history", text: item })),
    ...suggestions
      .slice(0, 5)
      .map((item) => ({ type: "suggestion", text: item })),
  ].filter(
    (item) =>
      item.text.toLowerCase().includes(value.toLowerCase()) &&
      item.text.toLowerCase() !== value.toLowerCase()
  );

  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 150);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || allSuggestions.length === 0) {
      if (e.key === "Enter" && onSubmit) {
        onSubmit(value);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < allSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : allSuggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selectedSuggestion = allSuggestions[selectedIndex];
          onChange(selectedSuggestion.text);
          setShowSuggestions(false);
          inputRef.current?.blur();
        } else if (onSubmit) {
          onSubmit(value);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion.text);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    onChange("");
    onClear?.();
    inputRef.current?.focus();
  };

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex].scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  return (
    <div className={`${styles.searchContainer} ${className}`}>
      <div
        className={`${styles.searchInputContainer} ${
          isFocused ? styles.focused : ""
        }`}
      >
        <FaSearch className={styles.searchIcon} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={styles.searchInput}
          autoComplete="off"
        />
        {value && (
          <button
            className={styles.clearButton}
            onClick={handleClear}
            title="Clear search"
          >
            <FaTimes />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showSuggestions && allSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={styles.suggestionsContainer}
          >
            {allSuggestions.map((suggestion, index) => (
              <motion.div
                key={`${suggestion.type}-${suggestion.text}`}
                ref={(el) => (suggestionRefs.current[index] = el)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`${styles.suggestionItem} ${
                  index === selectedIndex ? styles.selected : ""
                }`}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className={styles.suggestionIcon}>
                  {suggestion.type === "history" ? <FaClock /> : <FaSearch />}
                </div>
                <span className={styles.suggestionText}>{suggestion.text}</span>
                {suggestion.type === "history" && (
                  <span className={styles.suggestionType}>Recent</span>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
