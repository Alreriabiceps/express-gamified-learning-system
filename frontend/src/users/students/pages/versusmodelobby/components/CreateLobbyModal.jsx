import React from "react";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";
import styles from "../pages/VersusModeLobby.module.css";

const CreateLobbyModal = ({
  isOpen,
  onClose,
  onSubmit,
  form,
  setForm,
  isLoading,
  hasActiveLobby,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Create {form.isPrivate ? "Private" : "Open"} Lobby</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className={styles.modalContent}>
          {hasActiveLobby ? (
            <div className={styles.infoMessage}>
              <p>
                <FaExclamationTriangle
                  style={{ color: "#FFB347", marginRight: 6 }}
                />{" "}
                You already have an active lobby. Please wait for it to expire
                before creating a new one.
              </p>
            </div>
          ) : (
            <>
              {!form.isPrivate ? (
                <div className={styles.infoMessage}>
                  <p>
                    <FaExclamationTriangle
                      style={{ color: "#FFB347", marginRight: 6 }}
                    />{" "}
                    Open lobbies expire after 3 minutes. You can only have one
                    active lobby at a time.
                  </p>
                  <p>Click "Create Lobby" to proceed.</p>
                </div>
              ) : (
                <>
                  <div className={styles.infoMessage}>
                    <p>
                      <FaExclamationTriangle
                        style={{ color: "#FFB347", marginRight: 6 }}
                      />{" "}
                      Private lobbies expire after 3 minutes. You can only have
                      one active lobby at a time.
                    </p>
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="lobby-name">Lobby Name</label>
                    <input
                      id="lobby-name"
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Enter lobby name"
                      className={styles.modalInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="lobby-password">Password</label>
                    <input
                      id="lobby-password"
                      type="password"
                      value={form.password}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Enter lobby password"
                      className={styles.modalInput}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button
            className={`${styles.gameButton} ${styles.cancelButton}`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`${styles.gameButton} ${styles.submitButton}`}
            onClick={onSubmit}
            disabled={
              (form.isPrivate && (!form.name || !form.password)) ||
              isLoading ||
              hasActiveLobby
            }
          >
            {isLoading ? "Creating..." : "Create Lobby"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateLobbyModal;
