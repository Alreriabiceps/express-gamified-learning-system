import React, { useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import styles from "./GameNavbar.module.css";
import {
  FaChartBar,
  FaCalendarAlt,
  FaUserFriends,
  FaTrophy,
  FaUsers,
  FaUser,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaVolumeUp,
  FaVolumeMute,
  FaBookOpen,
  FaUserNinja,
  FaQuestionCircle,
} from "react-icons/fa";
import {
  GiCrossedSwords,
  GiPerspectiveDiceSixFacesRandom,
} from "react-icons/gi";

const Icons = {
  Dashboard: <FaChartBar />,
  Challenges: <GiCrossedSwords />,
  WeeklyTest: <FaCalendarAlt />,
  Duels: <FaUserNinja />,
  PartyQueue: <FaUserFriends />,
  Reviewers: <FaBookOpen />,
  Rankings: <FaTrophy />,
  Crew: <FaUsers />,
  Profile: <FaUser />,
  Guide: <FaQuestionCircle />,
  Logout: <FaSignOutAlt />,
  MenuOpen: <FaBars />,
  MenuClose: <FaTimes />,
  Mute: <FaVolumeUp />,
  Unmute: <FaVolumeMute />,
};

const MUSIC_MAP = {
  weekly: ["/student/weeklytest"],
  demo: ["/student/demo"], // Demo page gets no music
};

const getMusicTrack = (path) => {
  if (MUSIC_MAP.weekly.includes(path)) return "/weeklytest.mp3";
  if (MUSIC_MAP.demo.includes(path)) return null; // No music on demo page
  return "/dashboard.mp3"; // Dashboard music for all other pages
};

const BURGER_BREAKPOINT = 1200;

const GameNavbar = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isChallengesOpen, setChallengesOpen] = useState(false);
  const [isMuted, setMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const [currentTrack, setCurrentTrack] = useState(
    getMusicTrack(location.pathname)
  );
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const navigate = useNavigate();
  const audioRef = useRef(null);
  const challengesRef = useRef();
  const menuRef = useRef();
  const justOpenedRef = useRef(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
    setChallengesOpen(false);
  };

  const toggleChallenges = (e) => {
    e.stopPropagation();
    setChallengesOpen((prev) => {
      const next = !prev;
      if (next) {
        justOpenedRef.current = true;
        setTimeout(() => {
          justOpenedRef.current = false;
        }, 100);
      }
      return next;
    });
  };

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setChallengesOpen(false);
  };

  const handleLogout = () => {
    closeMenus();
    navigate("/");
  };

  const toggleMute = () => {
    setMuted((prev) => {
      const newMuted = !prev;
      if (audioRef.current) {
        audioRef.current.muted = newMuted;
        if (!newMuted && audioRef.current.volume === 0) {
          audioRef.current.volume = 0.5;
          setVolume(50);
        } else if (!newMuted) {
          audioRef.current.volume = volume / 100;
        }
      }
      return newMuted;
    });
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
      if (newVolume > 0 && isMuted) {
        setMuted(false);
        audioRef.current.muted = false;
      } else if (newVolume === 0 && !isMuted) {
        setMuted(true);
        audioRef.current.muted = true;
      }
    }
  };

  // Initial audio setup
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && currentTrack) {
      audio.src = currentTrack;
      audio.load();
      audio.volume = 0;

      const delay = 500;
      const fadeDuration = 2000;

      setTimeout(() => {
        audio
          .play()
          .then(() => {
            let vol = 0;
            const step = 0.05;
            const interval = setInterval(() => {
              vol += step;
              if (vol >= volume / 100) {
                vol = volume / 100;
                clearInterval(interval);
              }
              audio.volume = vol;
            }, fadeDuration * step);
          })
          .catch((error) => {
            console.log("Audio play failed:", error);
          });
      }, delay);
    }
  }, []); // Only run once on mount

  // Handle track changes
  useEffect(() => {
    const newTrack = getMusicTrack(location.pathname);
    if (newTrack !== currentTrack) {
      const audio = audioRef.current;

      // Stop current audio
      audio.pause();
      audio.currentTime = 0;

      // If no track (null), just stop and don't play anything
      if (!newTrack) {
        setCurrentTrack(null);
        return;
      }

      // Set new track
      audio.src = newTrack;
      audio.load();
      audio.volume = 0;
      setCurrentTrack(newTrack);

      const delay = 500;
      const fadeDuration = 2000;

      setTimeout(() => {
        // Play the new track
        audio
          .play()
          .then(() => {
            let vol = 0;
            const step = 0.05;
            const interval = setInterval(() => {
              vol += step;
              if (vol >= volume / 100) {
                vol = volume / 100;
                clearInterval(interval);
              }
              audio.volume = vol;
            }, fadeDuration * step);
          })
          .catch((error) => {
            console.log("Audio play failed:", error);
          });
      }, delay);
    }
  }, [location.pathname, currentTrack, volume]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (justOpenedRef.current) return;
      if (challengesRef.current && !challengesRef.current.contains(e.target)) {
        setChallengesOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeMenus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navLinkClass = ({ isActive }) =>
    isActive ? `${styles.navbarLink} ${styles.activeLink}` : styles.navbarLink;

  const dropdownItemClass = ({ isActive }) =>
    isActive
      ? `${styles.dropdownItem} ${styles.activeLink}`
      : styles.dropdownItem;

  const NavLinks = ({ isMobile }) => (
    <>
      <NavLink
        to="/student/dashboard"
        className={navLinkClass}
        onClick={closeMenus}
      >
        {isMobile && (
          <span className={styles.panelIcon}>{Icons.Dashboard}</span>
        )}{" "}
        Dashboard
      </NavLink>
      <div
        className={`${styles.dropdown} ${isChallengesOpen ? styles.open : ""}`}
        ref={challengesRef}
      >
        <button
          type="button"
          className={styles.dropdownToggle}
          onClick={toggleChallenges}
        >
          {isMobile && (
            <span className={styles.panelIcon}>{Icons.Challenges}</span>
          )}{" "}
          Challenges
        </button>
        {isChallengesOpen && (
          <div className={styles.dropdownMenu}>
            <NavLink
              to="/student/weeklytest"
              className={dropdownItemClass}
              onClick={closeMenus}
            >
              <span className={styles.panelIcon}>{Icons.WeeklyTest}</span>{" "}
              Weekly Test
            </NavLink>
            <NavLink
              to="/student/versusmodelobby"
              className={dropdownItemClass}
              onClick={closeMenus}
            >
              <span className={styles.panelIcon}>{Icons.Duels}</span> Versus
              Mode
            </NavLink>
            <NavLink
              to="/student/partymmr"
              className={dropdownItemClass}
              onClick={closeMenus}
            >
              <span className={styles.panelIcon}>{Icons.PartyQueue}</span> Party
              Queue
            </NavLink>
          </div>
        )}
      </div>
      <NavLink
        to="/student/reviewers"
        className={navLinkClass}
        onClick={closeMenus}
      >
        {isMobile && (
          <span className={styles.panelIcon}>{Icons.Reviewers}</span>
        )}{" "}
        Reviewers
      </NavLink>
      <NavLink
        to="/student/ranking"
        className={navLinkClass}
        onClick={closeMenus}
      >
        {isMobile && <span className={styles.panelIcon}>{Icons.Rankings}</span>}{" "}
        Rankings
      </NavLink>
      <NavLink to="/student/crew" className={navLinkClass} onClick={closeMenus}>
        {isMobile && <span className={styles.panelIcon}>{Icons.Crew}</span>}{" "}
        Crew
      </NavLink>
      <NavLink
        to="/student/chats"
        className={navLinkClass}
        onClick={closeMenus}
      >
        {isMobile && (
          <span className={styles.panelIcon}>{Icons.PartyQueue}</span>
        )}{" "}
        Messenger
      </NavLink>
      <NavLink
        to="/student/guide"
        className={navLinkClass}
        onClick={closeMenus}
      >
        {isMobile && <span className={styles.panelIcon}>{Icons.Guide}</span>}{" "}
        Guide
      </NavLink>
      <NavLink
        to="/student/profile"
        className={navLinkClass}
        onClick={closeMenus}
      >
        {isMobile && <span className={styles.panelIcon}>{Icons.Profile}</span>}{" "}
        Profile
      </NavLink>
      <button className={styles.navbarLink} onClick={handleLogout}>
        {isMobile && <span className={styles.panelIcon}>{Icons.Logout}</span>}{" "}
        Logout
      </button>
    </>
  );

  return (
    <nav className={styles.navbar} ref={menuRef}>
      <div className={styles.navbarBrand} style={{ marginRight: "20px" }}>
        <Link
          to="/student/dashboard"
          className={styles.navbarLogo}
          onClick={closeMenus}
        >
          AGILA
        </Link>
      </div>
      {windowWidth >= BURGER_BREAKPOINT && (
        <div className={styles.desktopNavLinks} style={{ marginLeft: "auto" }}>
          <NavLinks isMobile={false} />
        </div>
      )}
      <button className={styles.mobileMenuButton} onClick={toggleMobileMenu}>
        {isMobileMenuOpen ? Icons.MenuClose : Icons.MenuOpen}
      </button>
      {isMobileMenuOpen && windowWidth < BURGER_BREAKPOINT && (
        <div
          className={`${styles.mobileNavLinks} ${styles.open}`}
          style={{
            position: "fixed",
            top: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999,
            background:
              "linear-gradient(135deg, var(--color-bg), var(--color-bg-alt))",
            borderRadius: "0 0 22px 22px",
            boxShadow: "0 8px 32px var(--color-shadow)",
            padding: "18px 0 18px 0",
            maxHeight: "60vh",
            maxWidth: "340px",
            width: "90vw",
            overflowY: "auto",
          }}
        >
          <NavLinks isMobile={true} />
        </div>
      )}
      <div className={styles.volumeControls}>
        <button
          className={styles.muteButton}
          onClick={toggleMute}
          style={{ marginRight: "10px" }}
        >
          {isMuted ? Icons.Unmute : Icons.Mute}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className={styles.volumeSlider}
          style={{ width: "100px", cursor: "pointer" }}
        />
      </div>
      <audio ref={audioRef} loop muted={isMuted}>
        <source src={currentTrack} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </nav>
  );
};

export default GameNavbar;
