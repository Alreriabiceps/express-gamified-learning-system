import React from 'react';
import styles from '../pages/WeeklyTest.module.css';

const Leaderboard = ({ showLeaderboard, setShowLeaderboard, leaderboard }) => {
  if (!showLeaderboard) return null;
  return (
    <div className={styles.leaderboardOverlay}>
      <div className={styles.leaderboardModal}>
        <h2 className={styles.leaderboardTitle}>Leaderboard</h2>
        <div className={styles.leaderboardContent}>
          {leaderboard.length === 0 ? (
            <div className={styles.noLeaderboardData}>No leaderboard data available.</div>
          ) : (
            <table className={styles.leaderboardTable}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Score</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr key={entry.studentId || idx}>
                    <td>{idx + 1}</td>
                    <td>{entry.name || entry.studentName || 'Unknown'}</td>
                    <td>{entry.score}</td>
                    <td>{entry.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <button
          className={styles.closeButton}
          onClick={() => setShowLeaderboard(false)}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default Leaderboard; 