import React, { useRef, useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import { Link } from "react-router-dom";

// Helper: Determine theme colors and icons dynamically based on activity data
function getActivityTheme(actType = "", title = "", index = 0) {
  const t = String(actType || "").toUpperCase();
  const lowerTitle = String(title || "").toLowerCase();

  // 1. Call Activities (Red Theme)
  if (t === "CALL" || lowerTitle.includes("call") || lowerTitle.includes("phone")) {
    return {
      icon: "ri-phone-fill",
      iconBg: "#ffe4e6",
      iconColor: "#991b1b",
      dotColor: "#ef4444",
      timeBg: "#fef2f2",
      timeBorder: "#fecaca",
      timeColor: "#991b1b",
    };
  }

  // 2. Document Uploads (Green / Mint Theme)
  if (t === "DOCUMENT" && (lowerTitle.includes("upload") || lowerTitle.includes("create") || lowerTitle.includes("add"))) {
    return {
      icon: "ri-file-text-line",
      iconBg: "#d1fae5",
      iconColor: "#047857",
      dotColor: "#10b981",
      timeBg: "#ecfdf5",
      timeBorder: "#a7f3d0",
      timeColor: "#047857",
    };
  }

  // 3. Document Deletions / Removals (Red Theme)
  if (t === "DOCUMENT" && (lowerTitle.includes("delete") || lowerTitle.includes("remove"))) {
    return {
      icon: "ri-file-text-line",
      iconBg: "#ffe4e6",
      iconColor: "#991b1b",
      dotColor: "#ef4444",
      timeBg: "#fef2f2",
      timeBorder: "#fecaca",
      timeColor: "#991b1b",
    };
  }

  // 4. Meeting Activities (Orange / Peach Theme)
  if (t === "MEETING" || lowerTitle.includes("meet") || lowerTitle.includes("demo")) {
    return {
      icon: "ri-team-line",
      iconBg: "#ffedd5",
      iconColor: "#ea580c",
      dotColor: "#f97316",
      timeBg: "#fff7ed",
      timeBorder: "#fed7aa",
      timeColor: "#ea580c",
    };
  }

  // 5. Email Activities (Blue Theme)
  if (t === "EMAIL" || lowerTitle.includes("mail")) {
    return {
      icon: "ri-mail-line",
      iconBg: "#eff6ff",
      iconColor: "#1d4ed8",
      dotColor: "#3b82f6",
      timeBg: "#f0f9ff",
      timeBorder: "#bae6fd",
      timeColor: "#0369a1",
    };
  }

  // Alternating dynamic fallback if generic document or other type
  const isAlt = index % 2 === 1;
  return {
    icon: "ri-file-text-line",
    iconBg: isAlt ? "#d1fae5" : "#ffe4e6",
    iconColor: isAlt ? "#047857" : "#991b1b",
    dotColor: isAlt ? "#10b981" : "#ef4444",
    timeBg: isAlt ? "#ecfdf5" : "#fef2f2",
    timeBorder: isAlt ? "#a7f3d0" : "#fecaca",
    timeColor: isAlt ? "#047857" : "#991b1b",
  };
}

const RecentActivitiesCard = ({ activities = [] }) => {
  // 100% Dynamic data from PostgreSQL backend
  const list = Array.isArray(activities) ? activities : [];
  const displayCount = list.length;

  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Exact step size: card height (48px) + gap (8px) = 56px
  const STEP_HEIGHT = 56;
  const maxIndex = Math.max(0, list.length - 4);

  // Discrete auto-scroll upward: advances by exact card index every 3.2s
  useEffect(() => {
    if (isPaused || !list || list.length <= 4) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 3200);

    return () => clearInterval(interval);
  }, [isPaused, list, maxIndex]);

  // Synchronize DOM scroll strictly to currentIndex * STEP_HEIGHT (never drifts)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: currentIndex * STEP_HEIGHT,
        behavior: "smooth",
      });
    }
  }, [currentIndex]);

  // Manual step backward
  const scrollPrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  // Manual step forward
  const scrollNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  // Discrete mouse wheel handler: step by 1 card per wheel tick
  const handleWheel = (e) => {
    if (e.deltaY > 20) {
      setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
    } else if (e.deltaY < -20) {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <Card className="crm-card-3d crm-accent-maroon h-100">
      <CardHeader
        className="bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between"
        style={{ borderColor: "#f1f5f9" }}
      >
        <div className="d-flex align-items-center">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center me-2"
            style={{ width: "24px", height: "24px", backgroundColor: "#fff1f2", color: "#991b1b" }}
          >
            <i className="ri-history-line" style={{ fontSize: "0.95rem" }} />
          </div>
          <h5
            className="card-title mb-0 fw-bold"
            style={{ fontSize: "0.9375rem", color: "#1e293b", letterSpacing: "-0.01em" }}
          >
            Recent Activities
          </h5>
        </div>

        <div className="d-flex align-items-center">
          {/* Manual up/down step arrows if more than 4 activities */}
          {list.length > 4 && (
            <div className="d-flex align-items-center me-2 gap-1">
              <button
                type="button"
                className="btn btn-sm p-0 rounded-circle border-0 d-flex align-items-center justify-content-center"
                style={{
                  width: "22px",
                  height: "22px",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onClick={scrollPrev}
                title="Previous activity"
              >
                <i className="ri-arrow-up-s-line" style={{ fontSize: "0.85rem" }} />
              </button>
              <button
                type="button"
                className="btn btn-sm p-0 rounded-circle border-0 d-flex align-items-center justify-content-center"
                style={{
                  width: "22px",
                  height: "22px",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onClick={scrollNext}
                title="Next activity (scroll up)"
              >
                <i className="ri-arrow-down-s-line" style={{ fontSize: "0.85rem" }} />
              </button>
            </div>
          )}

          <Link
            to="/crm/activities"
            className="text-decoration-none fw-medium d-inline-flex align-items-center"
            style={{ fontSize: "0.75rem", color: "#7f1d1d" }}
          >
            View All <i className="ri-arrow-right-s-line ms-1" style={{ fontSize: "0.85rem" }} />
          </Link>
        </div>
      </CardHeader>

      <CardBody className="p-3 d-flex align-items-center">
        {list.length === 0 ? (
          <div className="text-center py-4 text-muted w-100">
            <i className="ri-history-line d-block fs-3 mb-1" style={{ color: "#94a3b8" }} />
            No activities logged yet.
          </div>
        ) : (
          <div className="d-flex align-items-center w-100">
            {/* ═════════════════════════════════════════════════════════════ */}
            {/* LEFT SECTION: 3D GLOSSY RED NOTIFICATION BELL & COUNT PILL    */}
            {/* Guaranteed buffer margin, never touches or crosses timeline   */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div
              className="d-flex flex-column align-items-center justify-content-center flex-shrink-0"
              style={{ width: "116px", marginRight: "14px" }}
            >
              {/* 3D Glossy Bell SVG with Pedestal & Notification Badge */}
              <div style={{ width: "84px", height: "80px", position: "relative" }}>
                <svg
                  viewBox="0 0 110 105"
                  width="100%"
                  height="100%"
                  style={{ overflow: "visible", display: "block" }}
                >
                  <defs>
                    {/* Ambient floor shadow filter */}
                    <filter id="bell-floor-shadow" x="-30%" y="-30%" width="160%" height="170%">
                      <feGaussianBlur stdDeviation="4.5" />
                    </filter>

                    {/* Specular glow filter */}
                    <filter id="sheen-blur" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="0.8" />
                    </filter>

                    {/* Badge drop shadow */}
                    <filter id="badge-drop-shadow" x="-25%" y="-25%" width="150%" height="150%">
                      <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#4c0519" floodOpacity="0.4" />
                    </filter>

                    {/* Pedestal 3D gradient */}
                    <linearGradient id="pedestal-depth" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#e2e8f0" />
                      <stop offset="100%" stopColor="#cbd5e1" />
                    </linearGradient>

                    {/* Bell Glossy 3D Gradient */}
                    <radialGradient id="bell-3d-glossy" cx="42%" cy="38%" r="65%">
                      <stop offset="0%" stopColor="#fb7185" />
                      <stop offset="28%" stopColor="#e11d48" />
                      <stop offset="65%" stopColor="#be123c" />
                      <stop offset="95%" stopColor="#881337" />
                      <stop offset="100%" stopColor="#4c0519" />
                    </radialGradient>

                    {/* Clapper ball gradient */}
                    <radialGradient id="clapper-grad" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="50%" stopColor="#f1f5f9" />
                      <stop offset="100%" stopColor="#94a3b8" />
                    </radialGradient>

                    {/* Badge Gradient */}
                    <linearGradient id="badge-red-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#991b1b" />
                    </linearGradient>
                  </defs>

                  {/* 1. Floor Ambient Drop Shadow */}
                  <ellipse
                    cx="55"
                    cy="89"
                    rx="44"
                    ry="9"
                    fill="rgba(159, 18, 57, 0.22)"
                    filter="url(#bell-floor-shadow)"
                  />

                  {/* 2. 3D Cylindrical Pedestal */}
                  <path
                    d="M 18,78 A 37,9 0 0,0 92,78 L 92,84 A 37,9 0 0,1 18,84 Z"
                    fill="url(#pedestal-depth)"
                  />
                  <ellipse
                    cx="55"
                    cy="78"
                    rx="37"
                    ry="8.5"
                    fill="#ffffff"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />

                  {/* 3. Floating Clapper Ball */}
                  <circle
                    cx="55"
                    cy="68"
                    r="6.8"
                    fill="url(#clapper-grad)"
                    stroke="rgba(226, 232, 240, 0.8)"
                    strokeWidth="0.8"
                  />

                  {/* 4. Bell Underside Rim Flare & Inner Hollow */}
                  <ellipse cx="55" cy="62" rx="27" ry="7" fill="#881337" />
                  <ellipse cx="55" cy="62" rx="23" ry="5.5" fill="#4c0519" />

                  {/* 5. 3D Bell Dome / Body */}
                  <path
                    d="M 55,22 C 60,22 66,28 67,36 C 68,44 73,54 84,60 C 86,61 86,63 84,63 C 74,64 36,64 26,63 C 24,63 24,61 26,60 C 37,54 42,44 43,36 C 44,28 50,22 55,22 Z"
                    fill="url(#bell-3d-glossy)"
                  />

                  {/* 6. Glossy Curved Specular Highlights */}
                  <path
                    d="M 45,26 C 47,33 45,43 35,53"
                    stroke="#ffffff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.65"
                    filter="url(#sheen-blur)"
                  />
                  <path
                    d="M 65,28 C 67,35 69,44 75,53"
                    stroke="#ffffff"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.38"
                  />

                  {/* 7. Top Handle Ring */}
                  <path
                    d="M 50,22 C 50,15 60,15 60,22"
                    fill="none"
                    stroke="#be123c"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 50,22 C 50,15 60,15 60,22"
                    fill="none"
                    stroke="#fda4af"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    opacity="0.75"
                  />

                  {/* 8. Radiating Sound / Alert Rays (Upper-Left) */}
                  <line x1="28" y1="22" x2="21" y2="17" stroke="#be123c" strokeWidth="2.4" strokeLinecap="round" />
                  <line x1="33" y1="16" x2="30" y2="9" stroke="#be123c" strokeWidth="2.4" strokeLinecap="round" />
                  <line x1="42" y1="13" x2="44" y2="6" stroke="#be123c" strokeWidth="2.4" strokeLinecap="round" />

                  {/* 9. Notification Badge on Top-Right of Bell */}
                  <g filter="url(#badge-drop-shadow)">
                    <circle
                      cx="82"
                      cy="28"
                      r="9.5"
                      fill="url(#badge-red-grad)"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text
                      x="82"
                      y="31.5"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      style={{ fontSize: "9.5px", fontWeight: "800", fontFamily: "inherit" }}
                    >
                      {displayCount}
                    </text>
                  </g>
                </svg>
              </div>

              {/* Pill Box Below Bell: Count + "New Activities" (100% Inside Borders, Perfectly Centered) */}
              <div
                className="mt-2"
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
                  borderRadius: "14px",
                  border: "1px solid #fecaca",
                  padding: "6px 8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
                  boxSizing: "border-box",
                }}
              >
                <span
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: "#991b1b",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {displayCount}
                </span>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                    letterSpacing: "-0.01em",
                    lineHeight: 1,
                  }}
                >
                  New Activities
                </span>
              </div>
            </div>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* RIGHT SECTION: VERTICAL AUTO-SCROLLING ACTIVITIES TRACK       */}
            {/* Exactly 4 full cards in view (216px height = 4*48 + 3*8)      */}
            {/* Zero cut-offs, discrete index stepping, synchronized dots     */}
            {/* ═════════════════════════════════════════════════════════════ */}
            <div
              className="flex-grow-1 position-relative"
              style={{ height: "216px", overflow: "hidden" }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
            >
              {/* Continuous vertical timeline connector line in background */}
              <div
                style={{
                  position: "absolute",
                  top: "0px",
                  bottom: "0px",
                  left: "4px",
                  width: "2px",
                  backgroundColor: "#e2e8f0",
                  zIndex: 1,
                }}
              />

              {/* Scrollable track containing dots + cards together */}
              <div
                ref={scrollRef}
                className="crm-activity-scroll-track"
                onWheel={handleWheel}
                style={{
                  height: "100%",
                  overflowY: "auto",
                  scrollBehavior: "smooth",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  paddingRight: "2px",
                  msOverflowStyle: "none",
                  scrollbarWidth: "none",
                }}
              >
                {list.map((a, idx) => {
                  const theme = getActivityTheme(a.act_type, a.title, idx);

                  return (
                    <div
                      key={a.activity_id || idx}
                      className="d-flex align-items-center"
                      style={{ height: "48px", position: "relative", gap: "10px", flexShrink: 0 }}
                    >
                      {/* Timeline node dot centered on connector line */}
                      <div
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          backgroundColor: theme.dotColor,
                          border: "2px solid #ffffff",
                          boxShadow: `0 0 0 1px ${theme.dotColor}50, 0 1px 2px rgba(0,0,0,0.08)`,
                          flexShrink: 0,
                          zIndex: 2,
                        }}
                      />

                      {/* Activity Pill Card */}
                      <div
                        className="flex-grow-1 d-flex align-items-center justify-content-between"
                        style={{
                          height: "48px",
                          backgroundColor: "#ffffff",
                          borderRadius: "14px",
                          border: "1px solid #f1f5f9",
                          boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
                          padding: "0 10px",
                          minWidth: 0,
                          transition: "transform 0.15s ease, box-shadow 0.15s ease",
                          cursor: "default",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateX(2px)";
                          e.currentTarget.style.boxShadow = "0 3px 8px rgba(15,23,42,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "none";
                          e.currentTarget.style.boxShadow = "0 1px 3px rgba(15,23,42,0.04)";
                        }}
                      >
                        {/* Left Circular Icon */}
                        <div
                          className="d-flex align-items-center justify-content-center me-2 flex-shrink-0"
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            backgroundColor: theme.iconBg,
                            color: theme.iconColor,
                            fontSize: "0.85rem",
                          }}
                        >
                          <i className={theme.icon} />
                        </div>

                        {/* Middle Info: Title & Author (Clean Typography & Vertical Alignment) */}
                        <div
                          className="flex-grow-1 text-truncate pe-2"
                          style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}
                        >
                          <div
                            className="fw-bold text-dark text-truncate"
                            style={{ fontSize: "0.78125rem", lineHeight: 1.25, letterSpacing: "-0.01em" }}
                            title={a.title}
                          >
                            {a.title}
                          </div>
                          <div
                            style={{
                              fontSize: "0.6875rem",
                              lineHeight: 1.2,
                              color: "#991b1b",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            by <span className="fw-semibold">{a.employee_name || "Amit Kumar"}</span>
                          </div>
                        </div>

                        {/* Right Time Badge & 3-Dots */}
                        <div className="d-flex align-items-center flex-shrink-0 gap-1">
                          <span
                            className="d-inline-flex align-items-center"
                            style={{
                              backgroundColor: theme.timeBg,
                              color: theme.timeColor,
                              border: `1px solid ${theme.timeBorder}`,
                              borderRadius: "10px",
                              padding: "2px 6px",
                              fontSize: "0.65rem",
                              fontWeight: 600,
                              lineHeight: 1.2,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <i className="ri-time-line me-1" style={{ fontSize: "0.65rem" }} />
                            {a.time_label || "--:--"}
                          </span>

                          <div
                            className="d-flex align-items-center justify-content-center"
                            style={{ width: "16px", height: "24px", cursor: "pointer" }}
                            title="Activity Options"
                          >
                            <i className="ri-more-2-fill text-muted" style={{ fontSize: "0.85rem" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default RecentActivitiesCard;
