import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './Login.module.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const response = await fetch(`${backendUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reset password');
      setMessage('Your password has been reset! You can now log in.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.loginScreen}>
        <div className={styles.loginContainer}>
          <h2>Invalid or missing reset token.</h2>
          <button className={styles.gameButton} onClick={() => navigate('/')}>Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginScreen}>
      <div className={styles.scanlineOverlay}></div>
      <div className={styles.loginContainer}>
        <h1 className={`${styles.loginTitle} ${styles.textShadowGlow}`}>// SET NEW PASSWORD //</h1>
        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="newPassword">New Password:</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={isLoading}
              placeholder="Enter new password"
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">Confirm New Password:</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={isLoading}
              placeholder="Confirm new password"
            />
          </div>
          {error && <p className={styles.errorMessage}>{error}</p>}
          {message && <p className={styles.successMessage}>{message}</p>}
          <button
            type="submit"
            className={styles.gameButton}
            disabled={isLoading}
            style={{ marginTop: '1.2rem' }}
          >
            {isLoading ? 'RESETTING...' : 'RESET PASSWORD'}
          </button>
        </form>
        <button
          type="button"
          className={styles.gameButton}
          style={{ marginTop: '1rem', background: '#222', color: '#fff', fontSize: '0.8rem', padding: '6px 14px' }}
          onClick={() => navigate('/')}
          disabled={isLoading}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPassword; 