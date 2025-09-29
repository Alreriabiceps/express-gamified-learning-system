import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import FloatingStars from '../components/FloatingStars/FloatingStars';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      if (!backendUrl) {
        throw new Error('Backend URL is not configured. Please check environment variables.');
      }
      const response = await fetch(`${backendUrl}/api/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send reset link. Please try again.');
      setMessage('If an account exists with that email, a password reset link has been sent. Please check your inbox (and spam folder).');
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginPageWrapper}>
      <FloatingStars />
      <div className={styles.loginPanel}>
        <h1 className={styles.loginTitle}>Reset Password</h1>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Your Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className={styles.inputField}
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="Enter your email"
              autoComplete="username"
              required
            />
          </div>

          {error && <p className={`${styles.errorMessage}`}>{error}</p>}
          {message && <p className={`${styles.successMessage}`}>{message}</p>}
          
          <button
            type="submit"
            className={styles.loginButton}
            disabled={isLoading}
          >
            {isLoading ? 'SENDING LINK...' : 'SEND RESET LINK'}
          </button>
        </form>

        <button
          type="button"
          className={styles.auxiliaryLink}
          style={{ marginTop: '1.5rem' }}
          onClick={() => navigate('/')}
          disabled={isLoading}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword; 