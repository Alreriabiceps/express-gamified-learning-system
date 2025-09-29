import React from "react";
import styles from "../pages/WeeklyTest.module.css";

const FilterPanel = ({
  subjects,
  selectedSubject,
  setSelectedSubject,
  filteredWeeks,
  selectedWeek,
  setSelectedWeek,
  handleResetFilters,
  isLoading,
  isTestStarted,
}) => (
  <div className={styles.filterPanel}>
    <h2 className={styles.panelHeader}>🔧 Filters</h2>
    <div className={styles.filterControls}>
      {/* Subject Filter */}
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Subject</label>
        <select
          value={selectedSubject ? selectedSubject.id : ""}
          onChange={(e) => {
            const subject = subjects.find((s) => s.id === e.target.value);
            setSelectedSubject(subject || "");
          }}
          className={styles.filterSelect}
          disabled={isLoading || isTestStarted}
        >
          <option key="default-subject" value="">
            Select Subject
          </option>
          {Array.isArray(subjects) && subjects.length > 0 ? (
            subjects.map((subject, index) => (
              <option key={`subject-${subject.id}-${index}`} value={subject.id}>
                {subject.name}
              </option>
            ))
          ) : (
            <option value="" disabled>
              No subjects available
            </option>
          )}
        </select>
      </div>
      {/* Week Filter */}
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Week</label>
        <select
          value={selectedWeek ? selectedWeek.number : ""}
          onChange={(e) => {
            const week = filteredWeeks.find(
              (w) => w.number === parseInt(e.target.value)
            );
            setSelectedWeek(week || "");
          }}
          className={styles.filterSelect}
          disabled={isLoading || isTestStarted}
        >
          <option key="default-week" value="">
            Select Week
          </option>
          {Array.isArray(filteredWeeks) && filteredWeeks.length > 0 ? (
            filteredWeeks.map((week, index) => (
              <option
                key={`week-${week.number}-${week.year}-${index}`}
                value={week.number}
              >
                {week.display}
              </option>
            ))
          ) : (
            <option value="" disabled>
              No weeks available
            </option>
          )}
        </select>
      </div>
      {/* Reset Button */}
      <div className={styles.filterGroup}>
        <button
          onClick={handleResetFilters}
          className={styles.filterButton}
          disabled={isLoading || isTestStarted}
        >
          Reset Filters
        </button>
      </div>
    </div>
  </div>
);

export default FilterPanel;
