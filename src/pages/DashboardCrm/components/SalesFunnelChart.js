import React, { useState } from "react";
import { Card, CardBody, CardHeader } from "reactstrap";
import { formatNumber, formatCurrency } from "./dashboardUtils";

const SalesFunnelChart = ({ data = [] }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Fallback if data is empty: 5 standard stages
  const stages =
    data && data.length > 0
      ? data
      : [
          { stage_code: "LEAD", stage_name: "Lead", count: 0, amount: 0, percentage: 0 },
          { stage_code: "QUALIFIED", stage_name: "Qualified", count: 0, amount: 0, percentage: 0 },
          { stage_code: "PROPOSAL", stage_name: "Proposal", count: 0, amount: 0, percentage: 0 },
          { stage_code: "NEGOTIATION", stage_name: "Negotiation", count: 0, amount: 0, percentage: 0 },
          { stage_code: "CLOSED_WON", stage_name: "Won", count: 0, amount: 0, percentage: 0 },
        ];

  // Helper safely get stage data by index
  const getStage = (idx, fallbackName) => {
    return stages[idx] || { stage_name: fallbackName, count: 0, amount: 0, percentage: 0 };
  };

  const sLead = getStage(0, "Lead");
  const sQual = getStage(1, "Qualified");
  const sProp = getStage(2, "Proposal");
  const sNego = getStage(3, "Negotiation");
  const sWon = getStage(4, "Won");

  return (
    <Card className="crm-card-3d crm-accent-maroon h-100">
      <CardHeader
        className="bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between"
        style={{ borderColor: "#f1f5f9" }}
      >
        <div className="d-flex align-items-center">
          <span
            style={{
              width: "3.5px",
              height: "16px",
              backgroundColor: "#b91c1c",
              marginRight: "8px",
              display: "inline-block",
            }}
          />
          <h5
            className="card-title mb-0 fw-bold"
            style={{ fontSize: "0.9375rem", color: "#1e293b", letterSpacing: "-0.01em" }}
          >
            Sales Funnel Overview
          </h5>
        </div>
        <span className="rounded-0 px-2 py-1 fw-semibold crm-header-badge"
          style={{
            backgroundColor: "#f8fafc",
            color: "#64748b",
            border: "1px solid #e2e8f0",
            fontSize: "0.72rem",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          5 Stages
        </span>
      </CardHeader>

      <CardBody className="p-3 d-flex flex-column align-items-center justify-content-center">
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            margin: "0 auto",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            viewBox="-25 8 505 396"
            width="100%"
            height="100%"
            style={{ overflow: "visible", display: "block" }}
          >
            <defs>
              {/* Drop Shadow filter for 3D tier layers */}
              <filter id="funnel-tier-shadow" x="-30%" y="-30%" width="160%" height="170%">
                <feDropShadow dx="0" dy="5" stdDeviation="4.5" floodColor="#0f172a" floodOpacity="0.25" />
              </filter>

              {/* Crisp Dual Drop Shadow for ultra-visible white text & icons */}
              <filter id="crisp-text-contrast" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="1.2" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.85" />
                <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.4" />
              </filter>

              {/* Ambient floor glow for pedestal */}
              <filter id="pedestal-floor-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="9" result="blur" />
              </filter>

              {/* ── Tier 1: Lead (Crimson / Deep Ruby Red) ── */}
              <radialGradient id="lead-lid" cx="45%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ff4d6d" />
                <stop offset="35%" stopColor="#e11d48" />
                <stop offset="75%" stopColor="#be123c" />
                <stop offset="100%" stopColor="#881337" />
              </radialGradient>
              <linearGradient id="lead-body" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#881337" />
                <stop offset="14%" stopColor="#be123c" />
                <stop offset="28%" stopColor="#ff758f" />
                <stop offset="48%" stopColor="#e11d48" />
                <stop offset="78%" stopColor="#9f1239" />
                <stop offset="100%" stopColor="#4c0519" />
              </linearGradient>

              {/* ── Tier 2: Qualified (Vibrant Coral / Warm Red) ── */}
              <radialGradient id="qual-lid" cx="45%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="35%" stopColor="#ef4444" />
                <stop offset="75%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#991b1b" />
              </radialGradient>
              <linearGradient id="qual-body" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#991b1b" />
                <stop offset="14%" stopColor="#dc2626" />
                <stop offset="28%" stopColor="#fca5a5" />
                <stop offset="48%" stopColor="#ef4444" />
                <stop offset="78%" stopColor="#b91c1c" />
                <stop offset="100%" stopColor="#7f1d1d" />
              </linearGradient>

              {/* ── Tier 3: Proposal (Warm Tangerine / Amber) ── */}
              <radialGradient id="prop-lid" cx="45%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="35%" stopColor="#f97316" />
                <stop offset="75%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#9a3412" />
              </radialGradient>
              <linearGradient id="prop-body" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#9a3412" />
                <stop offset="14%" stopColor="#ea580c" />
                <stop offset="28%" stopColor="#fed7aa" />
                <stop offset="48%" stopColor="#f97316" />
                <stop offset="78%" stopColor="#c2410c" />
                <stop offset="100%" stopColor="#7c2d12" />
              </linearGradient>

              {/* ── Tier 4: Negotiation (Deep Slate / Charcoal) ── */}
              <radialGradient id="nego-lid" cx="45%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="35%" stopColor="#64748b" />
                <stop offset="75%" stopColor="#475569" />
                <stop offset="100%" stopColor="#1e293b" />
              </radialGradient>
              <linearGradient id="nego-body" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="14%" stopColor="#475569" />
                <stop offset="28%" stopColor="#cbd5e1" />
                <stop offset="48%" stopColor="#64748b" />
                <stop offset="78%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              {/* ── Tier 5: Won (Vibrant Emerald Green) ── */}
              <radialGradient id="won-lid" cx="45%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="35%" stopColor="#10b981" />
                <stop offset="75%" stopColor="#059669" />
                <stop offset="100%" stopColor="#064e3b" />
              </radialGradient>
              <linearGradient id="won-body" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#064e3b" />
                <stop offset="14%" stopColor="#059669" />
                <stop offset="28%" stopColor="#a7f3d0" />
                <stop offset="48%" stopColor="#10b981" />
                <stop offset="78%" stopColor="#047857" />
                <stop offset="100%" stopColor="#022c22" />
              </linearGradient>

              {/* ── Base Pedestal Gradients ── */}
              <linearGradient id="pedestal-side" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#cbd5e1" />
                <stop offset="30%" stopColor="#f8fafc" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="85%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
              <linearGradient id="pedestal-top" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="60%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </linearGradient>
            </defs>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 1. ILLUMINATED CIRCULAR BASE PEDESTAL                         */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {/* Ambient Cyan Floor Glow */}
            <ellipse
              cx="155"
              cy="384"
              rx="95"
              ry="16"
              fill="rgba(56, 189, 248, 0.35)"
              filter="url(#pedestal-floor-glow)"
            />
            {/* Ambient Shadow Core */}
            <ellipse
              cx="155"
              cy="386"
              rx="80"
              ry="12"
              fill="rgba(15, 23, 42, 0.16)"
              filter="url(#pedestal-floor-glow)"
            />

            {/* Pedestal Cylinder Side Wall */}
            <path
              d="M 81,362 A 74,12 0 0,0 229,362 L 229,376 A 74,12 0 0,1 81,376 Z"
              fill="url(#pedestal-side)"
            />

            {/* Pedestal Top Face */}
            <ellipse
              cx="155"
              cy="362"
              rx="74"
              ry="12"
              fill="url(#pedestal-top)"
              stroke="#e2e8f0"
              strokeWidth="1.2"
            />
            {/* Pedestal Inner Bevel Glow */}
            <ellipse
              cx="155"
              cy="361"
              rx="66"
              ry="9.5"
              fill="none"
              stroke="rgba(255, 255, 255, 0.95)"
              strokeWidth="1"
            />

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 2. 3D CONICAL TIERS (Stacking Painter's Order: 5 -> 1)        */}
            {/* ═════════════════════════════════════════════════════════════ */}

            {/* ──── TIER 5: WON (Bottom) ──── */}
            <g
              filter="url(#funnel-tier-shadow)"
              style={{
                cursor: "pointer",
                transition: "transform 0.2s ease",
                transform: hoveredIndex === 4 ? "translateY(-3px)" : "none",
              }}
              onMouseEnter={() => setHoveredIndex(4)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Conical Body (Front Surface) */}
              <path
                d="M 105,312 A 50,8.5 0 0,0 205,312 L 191,356 A 36,6.5 0 0,1 119,356 Z"
                fill="url(#won-body)"
              />
              {/* Top Oval Lid */}
              <ellipse cx="155" cy="312" rx="50" ry="8.5" fill="url(#won-lid)" />
              {/* Specular Rim */}
              <ellipse
                cx="155"
                cy="311.5"
                rx="48"
                ry="7.5"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="0.8"
              />

              {/* Inside Icon: Trophy (Solid white with crisp dual drop-shadow) */}
              <g filter="url(#crisp-text-contrast)" transform="translate(126, 329)">
                <path
                  d="M 1,2 L 15,2 A 7,7 0 0,1 8,11 L 8,13 L 12,13 L 12,15 L 4,15 L 4,13 L 8,13 L 8,11 A 7,7 0 0,1 1,2 Z"
                  fill="#ffffff"
                />
                <path
                  d="M 1,4 L 0,4 A 2.5,2.5 0 0,0 2,8 L 3,8 M 15,4 L 16,4 A 2.5,2.5 0 0,1 14,8 L 13,8"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </g>

              {/* Inside Stage Name & Live Count (Centered and Ultra-Crisp) */}
              <g filter="url(#crisp-text-contrast)">
                <text
                  x="166"
                  y="333"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12.5"
                  fontWeight="700"
                  letterSpacing="0.3"
                >
                  Won
                </text>
                <text
                  x="166"
                  y="350"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="18.5"
                  fontWeight="900"
                >
                  {formatNumber(sWon.count)}
                </text>
              </g>
            </g>

            {/* ──── TIER 4: NEGOTIATION ──── */}
            <g
              filter="url(#funnel-tier-shadow)"
              style={{
                cursor: "pointer",
                transition: "transform 0.2s ease",
                transform: hoveredIndex === 3 ? "translateY(-3px)" : "none",
              }}
              onMouseEnter={() => setHoveredIndex(3)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Conical Body */}
              <path
                d="M 85,252 A 70,11 0 0,0 225,252 L 207,306 A 52,9 0 0,1 103,306 Z"
                fill="url(#nego-body)"
              />
              {/* Top Oval Lid */}
              <ellipse cx="155" cy="252" rx="70" ry="11" fill="url(#nego-lid)" />
              {/* Specular Rim */}
              <ellipse
                cx="155"
                cy="251.5"
                rx="68"
                ry="9.5"
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="0.9"
              />

              {/* Inside Icon: Handshake (Solid white with crisp dual drop-shadow) */}
              <g filter="url(#crisp-text-contrast)" transform="translate(109, 276)">
                <path
                  d="M 1,5 L 6,1 L 10,4 L 14,1 L 19,5 L 14,10 L 11,7 L 9,9 L 12,12 L 9,15 L 3,9 Z"
                  fill="#ffffff"
                />
              </g>

              {/* Inside Stage Name & Count (Centered and Ultra-Crisp) */}
              <g filter="url(#crisp-text-contrast)">
                <text
                  x="167"
                  y="280"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="12.5"
                  fontWeight="700"
                  letterSpacing="0.2"
                >
                  Negotiation
                </text>
                <text
                  x="167"
                  y="299"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="19.5"
                  fontWeight="900"
                >
                  {formatNumber(sNego.count)}
                </text>
              </g>
            </g>

            {/* ──── TIER 3: PROPOSAL ──── */}
            <g
              filter="url(#funnel-tier-shadow)"
              style={{
                cursor: "pointer",
                transition: "transform 0.2s ease",
                transform: hoveredIndex === 2 ? "translateY(-3px)" : "none",
              }}
              onMouseEnter={() => setHoveredIndex(2)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Conical Body */}
              <path
                d="M 65,188 A 90,13.5 0 0,0 245,188 L 227,246 A 72,11.5 0 0,1 83,246 Z"
                fill="url(#prop-body)"
              />
              {/* Top Oval Lid */}
              <ellipse cx="155" cy="188" rx="90" ry="13.5" fill="url(#prop-lid)" />
              {/* Specular Rim */}
              <ellipse
                cx="155"
                cy="187"
                rx="88"
                ry="12"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="1"
              />

              {/* Inside Icon: Paper Plane (Solid white with crisp dual drop-shadow) */}
              <g filter="url(#crisp-text-contrast)" transform="translate(114, 214)">
                <path d="M 0,9.5 L 18,1 L 12.5,19 L 8,12 Z" fill="#ffffff" />
                <path d="M 8,12 L 18,1 L 11.5,13.5 Z" fill="rgba(255,255,255,0.7)" />
              </g>

              {/* Inside Stage Name & Count (Centered and Ultra-Crisp) */}
              <g filter="url(#crisp-text-contrast)">
                <text
                  x="168"
                  y="218"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="13.5"
                  fontWeight="700"
                  letterSpacing="0.25"
                >
                  Proposal
                </text>
                <text
                  x="168"
                  y="238"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="20.5"
                  fontWeight="900"
                >
                  {formatNumber(sProp.count)}
                </text>
              </g>
            </g>

            {/* ──── TIER 2: QUALIFIED ──── */}
            <g
              filter="url(#funnel-tier-shadow)"
              style={{
                cursor: "pointer",
                transition: "transform 0.2s ease",
                transform: hoveredIndex === 1 ? "translateY(-3px)" : "none",
              }}
              onMouseEnter={() => setHoveredIndex(1)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Conical Body */}
              <path
                d="M 43,118 A 112,16.5 0 0,0 267,118 L 247,182 A 92,14 0 0,1 63,182 Z"
                fill="url(#qual-body)"
              />
              {/* Top Oval Lid */}
              <ellipse cx="155" cy="118" rx="112" ry="16.5" fill="url(#qual-lid)" />
              {/* Specular Rim */}
              <ellipse
                cx="155"
                cy="117"
                rx="110"
                ry="15"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.1"
              />

              {/* Inside Icon: Checkmark in Circle (Larger & thicker) */}
              <g filter="url(#crisp-text-contrast)" transform="translate(118, 157)">
                <circle cx="0" cy="0" r="9.5" fill="none" stroke="#ffffff" strokeWidth="2.4" />
                <path
                  d="M -4.5,0.2 L -1.5,3.2 L 4.5,-2.8"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>

              {/* Inside Stage Name & Count (Centered and Ultra-Crisp) */}
              <g filter="url(#crisp-text-contrast)">
                <text
                  x="169"
                  y="152"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="14"
                  fontWeight="700"
                  letterSpacing="0.25"
                >
                  Qualified
                </text>
                <text
                  x="169"
                  y="173"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="21.5"
                  fontWeight="900"
                >
                  {formatNumber(sQual.count)}
                </text>
              </g>
            </g>

            {/* ──── TIER 1: LEAD (Top Tier) ──── */}
            <g
              filter="url(#funnel-tier-shadow)"
              style={{
                cursor: "pointer",
                transition: "transform 0.2s ease",
                transform: hoveredIndex === 0 ? "translateY(-3px)" : "none",
              }}
              onMouseEnter={() => setHoveredIndex(0)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Conical Body */}
              <path
                d="M 20,40 A 135,21 0 0,0 290,40 L 269,112 A 114,17 0 0,1 41,112 Z"
                fill="url(#lead-body)"
              />
              {/* Solid 3D Convex Top Cap */}
              <ellipse cx="155" cy="40" rx="135" ry="21" fill="url(#lead-lid)" />
              {/* Specular Highlight Rim */}
              <ellipse
                cx="155"
                cy="39"
                rx="133"
                ry="19.5"
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="1.2"
              />

              {/* Inside Icon: Users (Solid white with crisp dual drop-shadow) */}
              <g filter="url(#crisp-text-contrast)" transform="translate(121, 75)">
                <circle cx="6" cy="5" r="4.2" fill="#ffffff" />
                <path d="M 0,18 C 0,13.5 2.8,12 6,12 C 9.2,12 12,13.5 12,18 Z" fill="#ffffff" />
                <circle cx="16" cy="5" r="3.6" fill="#ffffff" opacity="0.95" />
                <path
                  d="M 11,18 C 11,14.5 13.2,13 16,13 C 18.8,13 21,14.5 21,18 Z"
                  fill="#ffffff"
                  opacity="0.95"
                />
              </g>

              {/* Inside Stage Name & Count (Centered and Ultra-Crisp) */}
              <g filter="url(#crisp-text-contrast)">
                <text
                  x="171"
                  y="80"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="14.5"
                  fontWeight="700"
                  letterSpacing="0.3"
                >
                  Lead
                </text>
                <text
                  x="171"
                  y="102"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="22.5"
                  fontWeight="900"
                >
                  {formatNumber(sLead.count)}
                </text>
              </g>
            </g>

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* 3. S-CURVED CONNECTOR LINES & RIGHT SIDE STATS                */}
            {/* ═════════════════════════════════════════════════════════════ */}

            {/* ── Connector 1: Lead (starts y=86 -> curves to dot at y=75) ── */}
            <path
              d="M 280,86 C 312,86 325,75 350,75"
              fill="none"
              stroke="#e11d48"
              strokeWidth="1.8"
              strokeOpacity={hoveredIndex === 0 ? "1" : "0.55"}
              style={{ transition: "stroke-opacity 0.2s ease" }}
            />
            <circle cx="350" cy="75" r="8.5" fill="#e11d48" opacity={hoveredIndex === 0 ? "0.38" : "0.18"} />
            <circle cx="350" cy="75" r="5" fill="#e11d48" />
            <text
              x="368"
              y="75"
              dominantBaseline="central"
              fill="#0f172a"
              fontSize="21"
              fontWeight="800"
              textRendering="geometricPrecision"
            >
              {formatNumber(sLead.count)}
              <tspan dx="8" fill="#475569" fontSize="14.5" fontWeight="600">
                ({Number(sLead.percentage || 0).toFixed(1)}%)
              </tspan>
            </text>

            {/* ── Connector 2: Qualified (starts y=158 -> curves to dot at y=145) ── */}
            <path
              d="M 257,158 C 295,158 320,145 350,145"
              fill="none"
              stroke="#ef4444"
              strokeWidth="1.8"
              strokeOpacity={hoveredIndex === 1 ? "1" : "0.55"}
              style={{ transition: "stroke-opacity 0.2s ease" }}
            />
            <circle cx="350" cy="145" r="8.5" fill="#ef4444" opacity={hoveredIndex === 1 ? "0.38" : "0.18"} />
            <circle cx="350" cy="145" r="5" fill="#ef4444" />
            <text
              x="368"
              y="145"
              dominantBaseline="central"
              fill="#0f172a"
              fontSize="21"
              fontWeight="800"
              textRendering="geometricPrecision"
            >
              {formatNumber(sQual.count)}
              <tspan dx="8" fill="#475569" fontSize="14.5" fontWeight="600">
                ({Number(sQual.percentage || 0).toFixed(1)}%)
              </tspan>
            </text>

            {/* ── Connector 3: Proposal (starts y=224 -> curves to dot at y=215) ── */}
            <path
              d="M 236,224 C 280,224 315,215 350,215"
              fill="none"
              stroke="#f97316"
              strokeWidth="1.8"
              strokeOpacity={hoveredIndex === 2 ? "1" : "0.55"}
              style={{ transition: "stroke-opacity 0.2s ease" }}
            />
            <circle cx="350" cy="215" r="8.5" fill="#f97316" opacity={hoveredIndex === 2 ? "0.38" : "0.18"} />
            <circle cx="350" cy="215" r="5" fill="#f97316" />
            <text
              x="368"
              y="215"
              dominantBaseline="central"
              fill="#0f172a"
              fontSize="21"
              fontWeight="800"
              textRendering="geometricPrecision"
            >
              {formatNumber(sProp.count)}
              <tspan dx="8" fill="#475569" fontSize="14.5" fontWeight="600">
                ({Number(sProp.percentage || 0).toFixed(1)}%)
              </tspan>
            </text>

            {/* ── Connector 4: Negotiation (starts y=285 -> straight to dot at y=285) ── */}
            <path
              d="M 216,285 C 265,285 310,285 350,285"
              fill="none"
              stroke="#64748b"
              strokeWidth="1.8"
              strokeOpacity={hoveredIndex === 3 ? "1" : "0.55"}
              style={{ transition: "stroke-opacity 0.2s ease" }}
            />
            <circle cx="350" cy="285" r="8.5" fill="#64748b" opacity={hoveredIndex === 3 ? "0.38" : "0.18"} />
            <circle cx="350" cy="285" r="5" fill="#64748b" />
            <text
              x="368"
              y="285"
              dominantBaseline="central"
              fill="#0f172a"
              fontSize="21"
              fontWeight="800"
              textRendering="geometricPrecision"
            >
              {formatNumber(sNego.count)}
              <tspan dx="8" fill="#475569" fontSize="14.5" fontWeight="600">
                ({Number(sNego.percentage || 0).toFixed(1)}%)
              </tspan>
            </text>

            {/* ── Connector 5: Won (starts y=338 -> curves down to dot at y=345) ── */}
            <path
              d="M 198,338 C 250,338 305,345 350,345"
              fill="none"
              stroke="#10b981"
              strokeWidth="1.8"
              strokeOpacity={hoveredIndex === 4 ? "1" : "0.55"}
              style={{ transition: "stroke-opacity 0.2s ease" }}
            />
            <circle cx="350" cy="345" r="8.5" fill="#10b981" opacity={hoveredIndex === 4 ? "0.38" : "0.18"} />
            <circle cx="350" cy="345" r="5" fill="#10b981" />
            <text
              x="368"
              y="345"
              dominantBaseline="central"
              fill="#0f172a"
              fontSize="21"
              fontWeight="800"
              textRendering="geometricPrecision"
            >
              {formatNumber(sWon.count)}
              <tspan dx="8" fill="#475569" fontSize="14.5" fontWeight="600">
                ({Number(sWon.percentage || 0).toFixed(1)}%)
              </tspan>
            </text>
          </svg>

          {/* Active Hover Detail Pill */}
          {hoveredIndex !== null && (
            <div
              className="text-center py-1 px-3 border rounded-0"
              style={{
                backgroundColor: "#ffffff",
                borderColor: "#cbd5e1",
                fontSize: "0.8125rem",
                boxShadow: "0 4px 12px rgba(15,23,42,0.12)",
                position: "absolute",
                bottom: "-6px",
                left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                zIndex: 10,
              }}
            >
              <strong style={{ color: "#7f1d1d" }}>{stages[hoveredIndex]?.stage_name}:</strong>{" "}
              <span>{formatNumber(stages[hoveredIndex]?.count)} deals</span> •{" "}
              <span className="fw-semibold text-dark">
                {formatCurrency(stages[hoveredIndex]?.amount)}
              </span>{" "}
              <span className="text-muted">
                ({Number(stages[hoveredIndex]?.percentage || 0).toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default SalesFunnelChart;
