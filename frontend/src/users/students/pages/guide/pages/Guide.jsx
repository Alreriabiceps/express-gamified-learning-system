import React, { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Guide.module.css";
import {
  FaChartBar,
  FaCalendarAlt,
  FaUserFriends,
  FaTrophy,
  FaUsers,
  FaUser,
  FaBookOpen,
  FaUserNinja,
  FaQuestionCircle,
  FaLightbulb,
  FaRocket,
  FaGamepad,
  FaComments,
  FaGraduationCap,
  FaStar,
  FaChevronRight,
  FaChevronDown,
  FaInfoCircle,
  FaPlay,
  FaSearch,
  FaFilter,
  FaDownload,
  FaHeart,
  FaCrown,
  FaMedal,
  FaFire,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserPlus,
} from "react-icons/fa";
import FloatingStars from "../../../components/FloatingStars/FloatingStars";

const Guide = () => {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const sections = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: <FaChartBar />,
      description: "Your main hub for tracking progress and achievements",
      features: [
        {
          title: "Points Progress",
          description:
            "Track your MMR (Match Making Rating) and rank progression",
          icon: <FaStar />,
        },
        {
          title: "Weekly Challenges",
          description: "View active weekly tests and assignments",
          icon: <FaCalendarAlt />,
        },
        {
          title: "Daily Streak",
          description: "Maintain your daily study streak for rewards",
          icon: <FaFire />,
        },
        {
          title: "Leaderboards",
          description: "See your ranking among other students",
          icon: <FaTrophy />,
        },
      ],
    },
    {
      id: "weeklytest",
      title: "Weekly Test",
      icon: <FaCalendarAlt />,
      description:
        "Take scheduled weekly tests to earn points and improve your rank",
      features: [
        {
          title: "Subject Selection",
          description:
            "Choose from available subjects like Mathematics, Science, etc.",
          icon: <FaBookOpen />,
        },
        {
          title: "Week Selection",
          description: "Select the specific week you want to test on",
          icon: <FaClock />,
        },
        {
          title: "Timed Questions",
          description:
            "Answer questions within the time limit to maximize points",
          icon: <FaPlay />,
        },
        {
          title: "Results & Scoring",
          description: "View your score, points earned, and rank changes",
          icon: <FaMedal />,
        },
      ],
    },
    {
      id: "versusmode",
      title: "Versus Mode",
      icon: <FaUserNinja />,
      description: "Challenge other students in real-time competitive matches",
      features: [
        {
          title: "Create Lobby",
          description: "Start your own lobby and invite friends to join",
          icon: <FaUsers />,
        },
        {
          title: "Join Lobby",
          description: "Join existing lobbies created by other students",
          icon: <FaUserFriends />,
        },
        {
          title: "Quick Match",
          description: "Get matched with random opponents for instant play",
          icon: <FaRocket />,
        },
        {
          title: "Live Battles",
          description: "Compete in real-time question battles",
          icon: <FaGamepad />,
        },
      ],
    },
    {
      id: "partyqueue",
      title: "Party Queue",
      icon: <FaUserFriends />,
      description: "Team up with friends for collaborative weekly tests",
      features: [
        {
          title: "Create Party",
          description: "Form a study group with your friends",
          icon: <FaUsers />,
        },
        {
          title: "Join Party",
          description: "Join existing parties and study together",
          icon: <FaUserFriends />,
        },
        {
          title: "Team Tests",
          description: "Take weekly tests as a team for shared rewards",
          icon: <FaGraduationCap />,
        },
        {
          title: "Party MMR",
          description: "Track your party's collective performance",
          icon: <FaChartBar />,
        },
      ],
    },
    {
      id: "reviewers",
      title: "Reviewers",
      icon: <FaBookOpen />,
      description: "Access study materials and review resources",
      features: [
        {
          title: "Search Materials",
          description: "Find reviewers by subject, type, or keywords",
          icon: <FaSearch />,
        },
        {
          title: "Filter Options",
          description: "Filter by file type, difficulty, or subject",
          icon: <FaFilter />,
        },
        {
          title: "Download Files",
          description: "Download PDF, DOCX, and other study materials",
          icon: <FaDownload />,
        },
        {
          title: "Favorites",
          description: "Save your favorite reviewers for quick access",
          icon: <FaHeart />,
        },
      ],
    },
    {
      id: "rankings",
      title: "Rankings",
      icon: <FaTrophy />,
      description: "View leaderboards and track your competitive standing",
      features: [
        {
          title: "Weekly Rankings",
          description: "See top performers for the current week",
          icon: <FaCrown />,
        },
        {
          title: "PvP Rankings",
          description: "View versus mode competitive rankings",
          icon: <FaMedal />,
        },
        {
          title: "Your Position",
          description: "Find your current rank and nearby competitors",
          icon: <FaUser />,
        },
        {
          title: "Trending Players",
          description: "See who's climbing the ranks fastest",
          icon: <FaFire />,
        },
      ],
    },
    {
      id: "crew",
      title: "Crew",
      icon: <FaUsers />,
      description: "Manage your friends list and social connections",
      features: [
        {
          title: "Add Friends",
          description: "Send friend requests to other students",
          icon: <FaUserPlus />,
        },
        {
          title: "Friend Requests",
          description: "Accept or decline incoming friend requests",
          icon: <FaCheckCircle />,
        },
        {
          title: "Friends List",
          description: "View and manage your accepted friends",
          icon: <FaUsers />,
        },
        {
          title: "Social Features",
          description: "Connect with classmates and study partners",
          icon: <FaUserFriends />,
        },
      ],
    },
    {
      id: "messenger",
      title: "Messenger",
      icon: <FaComments />,
      description: "Chat with your friends and study partners",
      features: [
        {
          title: "Private Chats",
          description: "Send messages to your friends privately",
          icon: <FaComments />,
        },
        {
          title: "Real-time Messaging",
          description: "Instant messaging with live updates",
          icon: <FaClock />,
        },
        {
          title: "Chat History",
          description: "View your conversation history",
          icon: <FaBookOpen />,
        },
        {
          title: "Online Status",
          description: "See which friends are currently online",
          icon: <FaCheckCircle />,
        },
      ],
    },
    {
      id: "profile",
      title: "Profile",
      icon: <FaUser />,
      description: "View your personal statistics and achievements",
      features: [
        {
          title: "Personal Stats",
          description: "View your test scores, accuracy, and streaks",
          icon: <FaChartBar />,
        },
        {
          title: "Achievements",
          description: "Unlock and view your earned achievements",
          icon: <FaMedal />,
        },
        {
          title: "PvP History",
          description: "Track your versus mode match history",
          icon: <FaGamepad />,
        },
        {
          title: "Test History",
          description: "Review your past weekly test results",
          icon: <FaBookOpen />,
        },
      ],
    },
  ];

  const rankSystem = [
    {
      name: "Absent Legend",
      min: 0,
      max: 149,
      color: "#CD7F32",
      description: "Just starting your journey",
    },
    {
      name: "The Crammer",
      min: 150,
      max: 299,
      color: "#C0C0C0",
      description: "Getting serious about studies",
    },
    {
      name: "Seatwarmer",
      min: 300,
      max: 449,
      color: "#FFD700",
      description: "Consistent attendance",
    },
    {
      name: "Group Project Ghost",
      min: 450,
      max: 599,
      color: "#E5E4E2",
      description: "Working behind the scenes",
    },
    {
      name: "Google Scholar (Unofficial)",
      min: 600,
      max: 749,
      color: "#50C878",
      description: "Research enthusiast",
    },
    {
      name: "The Professor's Pet",
      min: 750,
      max: 899,
      color: "#4169E1",
      description: "Teacher's favorite",
    },
    {
      name: "Valedictorian",
      min: 900,
      max: 999,
      color: "#FF69B4",
      description: "Top of the class",
    },
    {
      name: "Academic Overlord",
      min: 1000,
      max: Infinity,
      color: "#8A2BE2",
      description: "Ultimate scholar",
    },
  ];

  return (
    <div className={styles.guideContainer}>
      <FloatingStars />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <FaGraduationCap className={styles.titleIcon} />
            Student Guide
          </h1>
          <p className={styles.subtitle}>
            Your complete guide to mastering the AGILA learning platform
          </p>
        </div>
      </div>

      {/* Quick Start */}
      <div className={styles.quickStart}>
        <h2 className={styles.sectionTitle}>
          <FaLightbulb className={styles.sectionIcon} />
          Quick Start Guide
        </h2>
        <div className={styles.quickStartSteps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <h3>Check Your Dashboard</h3>
              <p>
                Start by visiting your dashboard to see your current progress
                and available activities.
              </p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <h3>Take Weekly Tests</h3>
              <p>
                Complete weekly tests to earn points and improve your academic
                ranking.
              </p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <h3>Challenge Others</h3>
              <p>
                Use Versus Mode to compete with classmates in real-time battles.
              </p>
            </div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>4</div>
            <div className={styles.stepContent}>
              <h3>Study Together</h3>
              <p>
                Join parties and use reviewers to enhance your learning
                experience.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <div className={styles.featuresOverview}>
        <h2 className={styles.sectionTitle}>
          <FaRocket className={styles.sectionIcon} />
          Platform Features
        </h2>
        <div className={styles.featuresGrid}>
          {sections.map((section) => (
            <div key={section.id} className={styles.featureCard}>
              <div className={styles.featureHeader}>
                <div className={styles.featureIcon}>{section.icon}</div>
                <div className={styles.featureInfo}>
                  <h3 className={styles.featureTitle}>{section.title}</h3>
                  <p className={styles.featureDescription}>
                    {section.description}
                  </p>
                </div>
                <button
                  className={styles.expandButton}
                  onClick={() => toggleSection(section.id)}
                >
                  {expandedSection === section.id ? (
                    <FaChevronDown />
                  ) : (
                    <FaChevronRight />
                  )}
                </button>
              </div>

              {expandedSection === section.id && (
                <div className={styles.featureDetails}>
                  <div className={styles.featureList}>
                    {section.features.map((feature, index) => (
                      <div key={index} className={styles.featureItem}>
                        <div className={styles.featureItemIcon}>
                          {feature.icon}
                        </div>
                        <div className={styles.featureItemContent}>
                          <h4 className={styles.featureItemTitle}>
                            {feature.title}
                          </h4>
                          <p className={styles.featureItemDescription}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.featureAction}>
                    <Link
                      to={`/student/${
                        section.id === "versusmode"
                          ? "versusmodelobby"
                          : section.id === "partyqueue"
                          ? "partymmr"
                          : section.id === "messenger"
                          ? "chats"
                          : section.id
                      }`}
                      className={styles.tryButton}
                    >
                      <FaPlay className={styles.tryButtonIcon} />
                      Try {section.title}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ranking System */}
      <div className={styles.rankingSystem}>
        <h2 className={styles.sectionTitle}>
          <FaCrown className={styles.sectionIcon} />
          Ranking System
        </h2>
        <p className={styles.rankingDescription}>
          Earn points through weekly tests and versus battles to climb the
          academic ranks!
        </p>
        <div className={styles.ranksGrid}>
          {rankSystem.map((rank, index) => (
            <div key={index} className={styles.rankCard}>
              <div className={styles.rankHeader}>
                <div
                  className={styles.rankIcon}
                  style={{ backgroundColor: rank.color }}
                >
                  <FaMedal />
                </div>
                <div className={styles.rankInfo}>
                  <h3 className={styles.rankName}>{rank.name}</h3>
                  <p className={styles.rankRange}>
                    {rank.min} - {rank.max === Infinity ? "∞" : rank.max} points
                  </p>
                </div>
              </div>
              <p className={styles.rankDescription}>{rank.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tips & Tricks */}
      <div className={styles.tipsSection}>
        <h2 className={styles.sectionTitle}>
          <FaLightbulb className={styles.sectionIcon} />
          Tips & Tricks
        </h2>
        <div className={styles.tipsGrid}>
          <div className={styles.tipCard}>
            <FaFire className={styles.tipIcon} />
            <h3>Maintain Your Streak</h3>
            <p>
              Complete daily activities to build your streak and earn bonus
              rewards.
            </p>
          </div>
          <div className={styles.tipCard}>
            <FaUsers className={styles.tipIcon} />
            <h3>Study with Friends</h3>
            <p>
              Join parties and take team tests for shared rewards and
              collaborative learning.
            </p>
          </div>
          <div className={styles.tipCard}>
            <FaTrophy className={styles.tipIcon} />
            <h3>Compete Strategically</h3>
            <p>
              Use Versus Mode to challenge opponents and climb the competitive
              rankings.
            </p>
          </div>
          <div className={styles.tipCard}>
            <FaBookOpen className={styles.tipIcon} />
            <h3>Use Reviewers</h3>
            <p>
              Download study materials and reviewers to prepare for upcoming
              tests.
            </p>
          </div>
        </div>
      </div>

      {/* Help & Support */}
      <div className={styles.helpSection}>
        <h2 className={styles.sectionTitle}>
          <FaQuestionCircle className={styles.sectionIcon} />
          Need Help?
        </h2>
        <div className={styles.helpContent}>
          <div className={styles.helpCard}>
            <FaInfoCircle className={styles.helpIcon} />
            <h3>Still Have Questions?</h3>
            <p>
              If you need additional help or have questions about any feature,
              don't hesitate to reach out to your teachers or administrators.
            </p>
          </div>
          <div className={styles.helpCard}>
            <FaExclamationTriangle className={styles.helpIcon} />
            <h3>Report Issues</h3>
            <p>
              Found a bug or experiencing technical difficulties? Contact
              support for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guide;
