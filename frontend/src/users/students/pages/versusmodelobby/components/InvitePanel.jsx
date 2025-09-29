import React from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import styles from '../pages/VersusModeLobby.module.css';

const InvitePanel = ({ inviteUsername, handleInviteChange, handleInviteSubmit, isLoadingAction, isQueueing }) => (
  <div className={`${styles.panel} ${styles.invitePanel}`}>
    <h3 className={styles.panelHeader}>
      <span className={styles.panelIcon}><FaPaperPlane /></span> Challenge a Pilot
    </h3>
    <form className={styles.inviteForm} onSubmit={handleInviteSubmit}>
      <label htmlFor="invite-username" className="sr-only">
        Friend's Username
      </label>
      <div style={{ position: 'relative', width: '100%' }}>
        <FaPaperPlane style={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#FF6961',
          fontSize: '1.2rem',
          pointerEvents: 'none',
          zIndex: 2
        }} />
        <input
          type="text"
          id="invite-username"
          value={inviteUsername}
          onChange={handleInviteChange}
          className={styles.inviteInput}
          placeholder="Enter Pilot Username..."
          disabled={isLoadingAction || isQueueing}
          required
          style={{ paddingLeft: 44 }}
        />
      </div>
      <button
        type="submit"
        className={`${styles.gameButton} ${styles.inviteButton}`}
        disabled={isLoadingAction || isQueueing || !inviteUsername.trim()}
      >
        {isLoadingAction ? "Sending..." : "Send Duel Invite"}
      </button>
    </form>
  </div>
);

export default InvitePanel; 