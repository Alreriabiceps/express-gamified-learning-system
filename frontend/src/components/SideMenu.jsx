import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useGuideMode } from "../contexts/GuideModeContext";
import {
  MdDashboard,
  MdBook,
  MdQuiz,
  MdAddCircle,
  MdCalendarToday,
  MdPeople,
  MdSettings,
  MdSportsEsports,
  MdLeaderboard,
  MdDarkMode,
  MdLightMode,
  MdMenu,
  MdClose,
  MdLink,
  MdBarChart,
  MdCloudUpload,
  MdExpandMore,
  MdExpandLess,
  MdLogout,
  MdChevronLeft,
  MdChevronRight,
  MdAccountCircle,
  MdAutoAwesome,
  MdBolt,
} from "react-icons/md";

const SideMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { guideMode, setGuideMode } = useGuideMode();
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme || "light";
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleSection = (sectionTitle) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  const isActive = (path) => location.pathname === path;
  const isPathInSection = (items) => items?.some((item) => isActive(item.path));

  const adminMenuItems = [
    {
      title: "Dashboard",
      path: "/admin/dashboard",
      icon: <MdDashboard />,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-gradient-to-r from-blue-500/10 to-blue-600/10",
      hoverColor: "hover:from-blue-500/20 hover:to-blue-600/20",
      textColor: "text-blue-600 dark:text-blue-400",
      badge: "overview",
    },
    {
      title: "Content Management",
      icon: <MdBook />,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-gradient-to-r from-emerald-500/10 to-emerald-600/10",
      hoverColor: "hover:from-emerald-500/20 hover:to-emerald-600/20",
      textColor: "text-emerald-600 dark:text-emerald-400",
      badge: "content",
      items: [
        {
          title: "Subjects",
          path: "/admin/subjects",
          icon: <MdBook />,
          description: "Manage academic subjects",
        },
        {
          title: "Add Questions",
          path: "/admin/addquestions",
          icon: <MdAddCircle />,
          description: "Create new questions",
        },
        {
          title: "Question Bank",
          path: "/admin/questionlist",
          icon: <MdQuiz />,
          description: "View all questions",
        },
        {
          title: "Reviewer Links",
          path: "/admin/reviewer-links",
          icon: <MdLink />,
          description: "External study materials",
        },
      ],
    },
    {
      title: "Weekly Tests",
      icon: <MdCalendarToday />,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-gradient-to-r from-purple-500/10 to-purple-600/10",
      hoverColor: "hover:from-purple-500/20 hover:to-purple-600/20",
      textColor: "text-purple-600 dark:text-purple-400",
      badge: "schedule",
      items: [
        {
          title: "Create Schedule",
          path: "/admin/weeks/schedule",
          icon: <MdAddCircle />,
          description: "Plan weekly assessments",
        },
        {
          title: "Active Schedules",
          path: "/admin/weeks/current",
          icon: <MdCalendarToday />,
          description: "Current test schedules",
        },
      ],
    },
    {
      title: "Student Management",
      icon: <MdPeople />,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-gradient-to-r from-orange-500/10 to-orange-600/10",
      hoverColor: "hover:from-orange-500/20 hover:to-orange-600/20",
      textColor: "text-orange-600 dark:text-orange-400",
      badge: "students",
      items: [
        {
          title: "Add Student",
          path: "/admin/addstudent",
          icon: <MdAddCircle />,
          description: "Register new students",
        },
        {
          title: "Student Directory",
          path: "/admin/studentlist",
          icon: <MdPeople />,
          description: "Manage student accounts",
        },
      ],
    },
    {
      title: "Analytics & Reports",
      path: "/admin/reports",
      icon: <MdBarChart />,
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-gradient-to-r from-indigo-500/10 to-indigo-600/10",
      hoverColor: "hover:from-indigo-500/20 hover:to-indigo-600/20",
      textColor: "text-indigo-600 dark:text-indigo-400",
      badge: "insights",
    },
    {
      title: "Settings",
      path: "/admin/settings",
      icon: <MdSettings />,
      color: "from-gray-500 to-gray-600",
      bgColor: "bg-gradient-to-r from-gray-500/10 to-gray-600/10",
      hoverColor: "hover:from-gray-500/20 hover:to-gray-600/20",
      textColor: "text-gray-600 dark:text-gray-400",
      badge: "config",
    },
  ];

  const studentMenuItems = [
    {
      title: "Dashboard",
      path: "/student/dashboard",
      icon: <MdDashboard />,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-gradient-to-r from-blue-500/10 to-blue-600/10",
      hoverColor: "hover:from-blue-500/20 hover:to-blue-600/20",
      textColor: "text-blue-600 dark:text-blue-400",
      badge: "home",
    },
    {
      title: "Weekly Tests",
      path: "/student/weeklytest",
      icon: <MdQuiz />,
      color: "from-green-500 to-green-600",
      bgColor: "bg-gradient-to-r from-green-500/10 to-green-600/10",
      hoverColor: "hover:from-green-500/20 hover:to-green-600/20",
      textColor: "text-green-600 dark:text-green-400",
      badge: "tests",
    },
    {
      title: "Leaderboard",
      path: "/student/leaderboard",
      icon: <MdLeaderboard />,
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-gradient-to-r from-yellow-500/10 to-yellow-600/10",
      hoverColor: "hover:from-yellow-500/20 hover:to-yellow-600/20",
      textColor: "text-yellow-600 dark:text-yellow-400",
      badge: "ranks",
    },
  ];

  const menuItems = user?.role === "admin" ? adminMenuItems : studentMenuItems;

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate(user?.role === "admin" ? "/alogin" : "/login");
  };

  // Initialize expanded sections based on current path
  useEffect(() => {
    const newExpandedSections = {};
    menuItems.forEach((item) => {
      if (item.items && isPathInSection(item.items)) {
        newExpandedSections[item.title] = true;
      }
    });
    setExpandedSections(newExpandedSections);
  }, [location.pathname]);

  const SidebarContent = ({ isMobile = false }) => (
    <div
      className={`flex flex-col h-full ${
        isMobile ? "w-full" : ""
      } relative overflow-hidden min-h-screen`}
    >
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-8 right-3 w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full blur-2xl"></div>
        <div className="absolute bottom-16 left-3 w-16 h-16 bg-gradient-to-br from-accent to-info rounded-full blur-2xl"></div>
      </div>

      {/* Header */}
      <div
        className={`relative z-10 flex items-center justify-between p-3 border-b border-base-300/50 backdrop-blur-sm ${
          isCollapsed && !isMobile ? "px-2" : ""
        }`}
      >
        <div
          className={`flex items-center gap-3 ${
            isCollapsed && !isMobile ? "justify-center" : ""
          }`}
        >
          <div className="relative group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary via-secondary to-accent rounded-xl flex items-center justify-center shadow-lg shadow-primary/25 transition-all duration-300 group-hover:scale-105">
              <MdAutoAwesome className="text-white text-lg animate-pulse" />
            </div>
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-xl opacity-20 blur animate-pulse"></div>
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex flex-col">
              <span className="font-black text-lg bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent tracking-tight">
                AGILA
              </span>
              <span className="text-xs text-base-content/50 font-medium tracking-wider uppercase -mt-0.5">
                Learning Hub
              </span>
            </div>
          )}
        </div>
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg hover:bg-base-300/60 transition-all duration-300 hover:scale-105 active:scale-95"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <MdChevronRight className="w-4 h-4 text-base-content/70" />
            ) : (
              <MdChevronLeft className="w-4 h-4 text-base-content/70" />
            )}
          </button>
        )}
      </div>

      {/* User Info */}
      <div
        className={`relative z-10 p-3 border-b border-base-300/50 ${
          isCollapsed && !isMobile ? "px-2" : ""
        }`}
      >
        <div
          className={`flex items-center gap-3 ${
            isCollapsed && !isMobile ? "justify-center" : ""
          }`}
        >
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-accent via-secondary to-primary rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-accent/25 transition-all duration-300 hover:scale-105">
              {user?.firstName && user?.lastName
                ? `${user.firstName[0]}${user.lastName[0]}`
                : "A"}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-br from-success to-green-400 rounded-full border-2 border-base-100 shadow-md animate-pulse"></div>
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent to-primary rounded-xl opacity-20 blur animate-pulse"></div>
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-base-content truncate leading-tight">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-base-content/60 capitalize font-medium">
                  {user?.role}
                </span>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-success/20 to-green-400/20 text-success text-xs rounded-full border border-success/20">
                  <div className="w-1 h-1 bg-success rounded-full animate-pulse"></div>
                  <span className="font-medium text-xs">Online</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent flex-grow">
        <ul className="space-y-2">
          {menuItems.map((item, idx) => (
            <li key={idx}>
              {item.items ? (
                <div className="space-y-1">
                  <button
                    onClick={() => !isCollapsed && toggleSection(item.title)}
                    onMouseEnter={() => setHoveredItem(item.title)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`group relative flex items-center gap-3 w-full text-left p-3 rounded-xl transition-all duration-300 overflow-hidden
                      ${
                        isPathInSection(item.items)
                          ? `${item.bgColor} ${item.textColor} shadow-md shadow-black/5 scale-102`
                          : `hover:bg-base-300/50 ${item.hoverColor}`
                      }
                      ${isCollapsed && !isMobile ? "justify-center" : ""}
                    `}
                  >
                    {/* Background Gradient on Hover */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    ></div>

                    <div className="relative z-10 flex items-center gap-3 w-full">
                      <span
                        className={`text-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3
                        ${
                          isPathInSection(item.items)
                            ? item.textColor
                            : "text-base-content/70"
                        }`}
                      >
                        {item.icon}
                      </span>
                      {(!isCollapsed || isMobile) && (
                        <>
                          <div className="flex-1">
                            <span className="font-semibold text-sm">
                              {item.title}
                            </span>
                            {item.badge && (
                              <div className="mt-0.5">
                                <span
                                  className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r ${item.color} text-white/90`}
                                >
                                  {item.badge}
                                </span>
                              </div>
                            )}
                          </div>
                          <span
                            className={`transition-all duration-300 ${
                              expandedSections[item.title] ? "rotate-180" : ""
                            }`}
                          >
                            <MdExpandMore className="w-4 h-4" />
                          </span>
                        </>
                      )}
                    </div>

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && !isMobile && hoveredItem === item.title && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-base-content text-base-100 text-xs rounded-md shadow-xl z-50 whitespace-nowrap">
                        {item.title}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-2 border-transparent border-r-base-content"></div>
                      </div>
                    )}
                  </button>

                  {(!isCollapsed || isMobile) && (
                    <div
                      className={`overflow-hidden transition-all duration-400 ${
                        expandedSections[item.title]
                          ? "max-h-80 opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <ul className="ml-4 space-y-1 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-base-300 via-base-300/50 to-transparent"></div>

                        {item.items.map((subItem, subIdx) => (
                          <li key={subIdx} className="relative">
                            <button
                              onClick={() => handleNavigation(subItem.path)}
                              onMouseEnter={() => setHoveredItem(subItem.path)}
                              onMouseLeave={() => setHoveredItem(null)}
                              className={`group relative flex items-center gap-3 w-full text-left p-2.5 rounded-lg transition-all duration-300 overflow-hidden
                              ${
                                isActive(subItem.path)
                                  ? "bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/25 translate-x-1"
                                  : "hover:bg-base-300/60 hover:translate-x-1"
                              }
                              `}
                            >
                              {/* Active Indicator */}
                              <div
                                className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-gradient-to-b from-primary to-secondary rounded-r-full transition-all duration-300
                                ${
                                  isActive(subItem.path)
                                    ? "opacity-100 -translate-x-2"
                                    : "opacity-0"
                                }`}
                              ></div>

                              <span
                                className={`text-sm transition-all duration-300 group-hover:scale-110
                                ${
                                  isActive(subItem.path)
                                    ? "text-white"
                                    : "text-base-content/60"
                                }`}
                              >
                                {subItem.icon}
                              </span>
                              <div className="flex-1">
                                <span
                                  className={`font-medium text-xs transition-colors duration-300
                                  ${
                                    isActive(subItem.path)
                                      ? "text-white"
                                      : "text-base-content"
                                  }`}
                                >
                                  {subItem.title}
                                </span>
                                {subItem.description && (
                                  <p
                                    className={`text-xs mt-0.5 transition-colors duration-300 leading-tight
                                    ${
                                      isActive(subItem.path)
                                        ? "text-white/80"
                                        : "text-base-content/50"
                                    }`}
                                  >
                                    {subItem.description}
                                  </p>
                                )}
                              </div>

                              {/* Tooltip */}
                              {hoveredItem === subItem.path && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-base-content text-base-100 text-xs rounded-md shadow-xl z-50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  {subItem.description || subItem.title}
                                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-2 border-transparent border-r-base-content"></div>
                                </div>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleNavigation(item.path)}
                  onMouseEnter={() => setHoveredItem(item.title)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`group relative flex items-center gap-3 w-full text-left p-3 rounded-xl transition-all duration-300 overflow-hidden
                      ${
                        isActive(item.path)
                          ? `${item.bgColor} ${item.textColor} shadow-md shadow-black/5 scale-102`
                          : `hover:bg-base-300/50 ${item.hoverColor}`
                      }
                    ${isCollapsed && !isMobile ? "justify-center" : ""}
                  `}
                >
                  {/* Background Gradient */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                  ></div>

                  <div className="relative z-10 flex items-center gap-3 w-full">
                    <span
                      className={`text-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3
                      ${
                        isActive(item.path)
                          ? item.textColor
                          : "text-base-content/70"
                      }`}
                    >
                      {item.icon}
                    </span>
                    {(!isCollapsed || isMobile) && (
                      <div className="flex-1">
                        <span className="font-semibold text-sm">
                          {item.title}
                        </span>
                        {item.badge && (
                          <div className="mt-0.5">
                            <span
                              className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r ${item.color} text-white/90`}
                            >
                              {item.badge}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {isActive(item.path) && (!isCollapsed || isMobile) && (
                      <div className="w-2 h-2 bg-gradient-to-r from-primary to-secondary rounded-full shadow-md animate-pulse"></div>
                    )}
                  </div>

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && !isMobile && hoveredItem === item.title && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-base-content text-base-100 text-xs rounded-md shadow-xl z-50 whitespace-nowrap">
                      {item.title}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-2 border-transparent border-r-base-content"></div>
                    </div>
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section - Fixed at Bottom */}
      <div
        className={`relative z-10 p-3 border-t border-base-300/50 space-y-3 backdrop-blur-sm mt-auto flex-shrink-0 ${
          isCollapsed && !isMobile ? "px-2" : ""
        }`}
      >
        {/* Theme Toggle */}
        <div
          className={`flex items-center gap-3 ${
            isCollapsed && !isMobile ? "justify-center" : "justify-between"
          }`}
        >
          {(!isCollapsed || isMobile) && (
            <span className="text-xs font-semibold text-base-content/70">
              Theme
            </span>
          )}
          <button
            onClick={toggleTheme}
            className={`group relative w-12 h-6 rounded-full transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-primary/20 hover:scale-105 active:scale-95
              ${
                theme === "dark"
                  ? "bg-gradient-to-r from-primary to-secondary shadow-md shadow-primary/25"
                  : "bg-gradient-to-r from-base-300 to-base-400 shadow-md shadow-gray-300/25"
              }`}
            aria-label="Toggle theme"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-500 group-hover:scale-110
                ${theme === "dark" ? "translate-x-6" : "translate-x-0"}`}
            >
              {theme === "light" ? (
                <MdDarkMode className="w-3 h-3 text-gray-600" />
              ) : (
                <MdLightMode className="w-3 h-3 text-yellow-500" />
              )}
            </span>
          </button>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          className={`group relative flex items-center gap-3 w-full text-left p-2.5 text-error hover:bg-gradient-to-r hover:from-error/10 hover:to-red-500/10 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden
            ${isCollapsed && !isMobile ? "justify-center" : ""}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-error to-red-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <MdLogout className="w-5 h-5 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-12 relative z-10" />
          {(!isCollapsed || isMobile) && (
            <span className="font-semibold text-sm relative z-10">
              Sign Out
            </span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`drawer-side transition-all duration-500 ease-out ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        <label htmlFor="my-drawer-2" className="drawer-overlay"></label>
        <aside
          className={`hidden lg:flex min-h-screen bg-base-100/95 text-base-content flex-col shadow-2xl border-r border-base-300/30 backdrop-blur-xl relative transition-all duration-500 ease-out
          ${isCollapsed ? "w-16" : "w-64"}`}
        >
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-base-100 via-base-100/98 to-base-200/50 pointer-events-none"></div>
          <SidebarContent />
        </aside>
      </div>

      {/* Mobile Menu Toggle Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-base-100/90 text-base-content shadow-xl border border-base-300/50 hover:scale-110 active:scale-95 transition-all duration-300 backdrop-blur-xl"
        aria-label="Toggle mobile menu"
      >
        <div className="relative">
          {isMobileMenuOpen ? (
            <MdClose className="w-5 h-5" />
          ) : (
            <MdMenu className="w-5 h-5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 hover:opacity-20 rounded-full transition-opacity duration-300"></div>
        </div>
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-40 transition-all duration-500"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Mobile Menu */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-base-100/95 text-base-content shadow-2xl border-r border-base-300/30 backdrop-blur-xl transform transition-all duration-500 ease-out z-50 relative
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-base-100 via-base-100/98 to-base-200/50 pointer-events-none"></div>
        <SidebarContent isMobile={true} />
      </div>
    </>
  );
};

export default SideMenu;
