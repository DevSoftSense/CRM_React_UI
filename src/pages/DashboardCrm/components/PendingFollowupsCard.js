import React, { useRef, useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Modal, ModalHeader, ModalBody, ModalFooter, Button, Spinner } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import { completeTask } from "../../../helpers/crmTaskApi";
import { toastSuccess, toastApiError } from "../../../helpers/crmToast";

// Dynamic styling resolver matching the reference mockup
const getCardTheme = (task, index) => {
  const p = String(task.priority || "").toUpperCase();
  const dateStr = String(task.due_date || "").toLowerCase();
  const isOverdue = Boolean(task.is_overdue);

  // Red theme (High priority or Overdue)
  if (p === "HIGH" || p === "URGENT" || isOverdue || dateStr.includes("yesterday")) {
    if (dateStr.includes("yesterday") || (isOverdue && index % 2 === 1)) {
      // Orange / Peach theme (Yesterday / pending overdue)
      return {
        borderLeft: "3.5px solid #f97316",
        background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
        iconColor: "#ea580c",
        dateColor: "#c2410c",
        badgeBg: "#f87171",
        badgeColor: "#ffffff",
        badgeText: "High",
      };
    }
    // Rose / Red theme (Today / High priority)
    return {
      borderLeft: "3.5px solid #ef4444",
      background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
      iconColor: "#b91c1c",
      dateColor: "#dc2626",
      badgeBg: "#f87171",
      badgeColor: "#ffffff",
      badgeText: "High",
    };
  }

  // Mint / Green theme (Medium priority or Today normal)
  if (p === "MEDIUM") {
    return {
      borderLeft: "3.5px solid #10b981",
      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
      iconColor: "#047857",
      dateColor: "#065f46",
      badgeBg: "#bbf7d0",
      badgeColor: "#166534",
      badgeText: "Medium",
    };
  }

  // Soft Slate / Light theme (Low priority)
  return {
    borderLeft: "3.5px solid #64748b",
    background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    iconColor: "#334155",
    dateColor: "#475569",
    badgeBg: "#e2e8f0",
    badgeColor: "#334155",
    badgeText: "Low",
  };
};

const PendingFollowupsCard = ({ tasks = [], onTaskCompleted }) => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [completing, setCompleting] = useState(false);

  // Step right by exactly one card
  const scrollNext = () => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.firstElementChild;
    const step = card ? card.offsetWidth + 10 : 138;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (el.scrollLeft >= maxScroll - 6) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      el.scrollBy({ left: step, behavior: "smooth" });
    }
  };

  // Step left by exactly one card
  const scrollPrev = () => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.firstElementChild;
    const step = card ? card.offsetWidth + 10 : 138;
    if (el.scrollLeft <= 6) {
      el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    } else {
      el.scrollBy({ left: -step, behavior: "smooth" });
    }
  };

  // Auto-scroll loop: advances one-by-one every 3.2 seconds unless paused or modal is open
  useEffect(() => {
    if (isPaused || selectedTask || !tasks || tasks.length <= 1) return;

    const interval = setInterval(() => {
      scrollNext();
    }, 3200);

    return () => clearInterval(interval);
  }, [isPaused, selectedTask, tasks]);

  const handleCardClick = (t) => {
    setSelectedTask(t);
  };

  const handleArrowClick = (e, t) => {
    e.stopPropagation();
    if (t?.task_id) {
      navigate(`/crm/tasks/${t.task_id}`);
    } else {
      navigate("/crm/tasks");
    }
  };

  const handleCompleteInModal = async () => {
    if (!selectedTask?.task_id) return;
    setCompleting(true);
    try {
      await completeTask(selectedTask.task_id);
      toastSuccess(`Task ${selectedTask.task_code || ""} marked completed.`);
      setSelectedTask(null);
      if (typeof onTaskCompleted === "function") {
        onTaskCompleted();
      } else {
        // Refresh page or trigger state update
        window.location.reload();
      }
    } catch (err) {
      toastApiError(err, "Failed to complete task.");
    } finally {
      setCompleting(false);
    }
  };

  const handleCall = (t) => {
    const phone = t?.contact_phone || "";
    if (phone) {
      window.open(`tel:${phone}`);
    } else {
      alert(`No direct phone registered for ${t?.customer_name || "this customer"}.`);
    }
  };

  const handleWhatsApp = (t) => {
    const phone = (t?.contact_phone || "").replace(/[^0-9]/g, "");
    if (phone) {
      window.open(`https://wa.me/${phone}`, "_blank");
    } else {
      alert(`No WhatsApp number registered for ${t?.customer_name || "this customer"}.`);
    }
  };

  const handleEmail = (t) => {
    window.location.href = `mailto:?subject=${encodeURIComponent(`Follow-up: ${t?.title || "CRM Task"}`)}`;
  };

  return (
    <Card className="crm-card-3d crm-accent-red h-100">
      <CardHeader
        className="bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between"
        style={{ borderColor: "#f1f5f9" }}
      >
        <div className="d-flex align-items-center">
          <i
            className="ri-calendar-event-line me-2"
            style={{ color: "#7f1d1d", fontSize: "1.05rem" }}
          />
          <h5
            className="card-title mb-0 fw-semibold"
            style={{ fontSize: "0.9375rem", color: "#1e293b", letterSpacing: "-0.01em" }}
          >
            Pending Follow-ups
          </h5>
        </div>

        <div className="d-flex align-items-center">
          {/* Manual step arrows if multiple cards */}
          {tasks.length > 2 && (
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
                title="Previous card"
              >
                <i className="ri-arrow-left-s-line" style={{ fontSize: "0.85rem" }} />
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
                title="Next card"
              >
                <i className="ri-arrow-right-s-line" style={{ fontSize: "0.85rem" }} />
              </button>
            </div>
          )}

          <Link
            to="/crm/tasks"
            className="text-decoration-none fw-medium d-inline-flex align-items-center"
            style={{ fontSize: "0.75rem", color: "#7f1d1d" }}
          >
            View All <i className="ri-arrow-right-line ms-1" style={{ fontSize: "0.785rem" }} />
          </Link>
        </div>
      </CardHeader>

      <CardBody
        className="p-3 d-flex flex-column justify-content-center"
        style={{ minHeight: "150px" }}
      >
        {tasks.length === 0 ? (
          <div className="text-center py-4 text-muted w-100">
            <i className="ri-checkbox-circle-line d-block fs-3 text-success mb-1" />
            <span className="fw-semibold text-dark d-block" style={{ fontSize: "0.85rem" }}>
              All follow-ups are up to date!
            </span>
            <small className="text-muted" style={{ fontSize: "0.75rem" }}>
              No pending follow-ups required right now.
            </small>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="crm-followup-track"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            onWheel={(e) => {
              if (e.deltaY !== 0 && scrollRef.current) {
                scrollRef.current.scrollLeft += e.deltaY;
              }
            }}
            style={{
              display: "flex",
              gap: "10px",
              overflowX: "auto",
              scrollBehavior: "smooth",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              msOverflowStyle: "none",
              scrollbarWidth: "none",
              paddingBottom: "4px",
            }}
          >
            {tasks.map((t, idx) => {
              const theme = getCardTheme(t, idx);

              return (
                <div
                  key={t.task_id || idx}
                  className="crm-followup-card"
                  onClick={() => handleCardClick(t)}
                  title={`Click to preview ${t.customer_name} (${t.title || "Follow-up"})`}
                  style={{
                    flex: "0 0 128px",
                    minWidth: "128px",
                    maxWidth: "135px",
                    height: "96px",
                    borderRadius: "12px",
                    borderLeft: theme.borderLeft,
                    background: theme.background,
                    padding: "9px 10px 8px 10px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    scrollSnapAlign: "start",
                    transition: "transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.18s ease",
                    boxShadow: "0 2px 5px rgba(15,23,42,0.04)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 6px 14px rgba(15,23,42,0.10)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 2px 5px rgba(15,23,42,0.04)";
                  }}
                >
                  {/* Row 1: Building Icon + Customer Name */}
                  <div className="d-flex align-items-center">
                    <i
                      className="ri-building-line me-1"
                      style={{ fontSize: "0.85rem", color: theme.iconColor, flexShrink: 0 }}
                    />
                    <span
                      className="fw-bold text-truncate"
                      style={{ fontSize: "0.8125rem", color: "#0f172a" }}
                    >
                      {t.customer_name}
                    </span>
                  </div>

                  {/* Row 2: Calendar Icon + Due Date */}
                  <div className="d-flex align-items-center">
                    <i
                      className="ri-calendar-line me-1"
                      style={{ fontSize: "0.78rem", color: theme.dateColor, flexShrink: 0 }}
                    />
                    <span
                      className="fw-semibold text-truncate"
                      style={{ fontSize: "0.75rem", color: theme.dateColor }}
                    >
                      {t.due_date}
                    </span>
                  </div>

                  {/* Row 3: Priority Pill Badge + White Circular Action Arrow Button */}
                  <div className="d-flex align-items-center justify-content-between">
                    <span
                      className="fw-bold text-capitalize"
                      style={{
                        backgroundColor: theme.badgeBg,
                        color: theme.badgeColor,
                        borderRadius: "12px",
                        padding: "1.5px 8px",
                        fontSize: "0.68rem",
                        lineHeight: 1.2,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {theme.badgeText}
                    </span>

                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center crm-arrow-btn"
                      style={{
                        width: "24px",
                        height: "24px",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 2px 5px rgba(15,23,42,0.12)",
                        flexShrink: 0,
                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      }}
                      onClick={(e) => handleArrowClick(e, t)}
                      title={`Open full task page for ${t.customer_name}`}
                    >
                      <i
                        className="ri-arrow-right-line"
                        style={{ color: "#0f172a", fontSize: "0.8125rem", fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* QUICK FOLLOW-UP PREVIEW MODAL (Stay on Dashboard)              */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {selectedTask && (
        <Modal
          isOpen={Boolean(selectedTask)}
          toggle={() => setSelectedTask(null)}
          centered
          className="rounded-0"
        >
          <ModalHeader
            toggle={() => setSelectedTask(null)}
            className="border-bottom p-3"
            style={{ backgroundColor: "#f8fafc" }}
          >
            <div className="d-flex align-items-center gap-2">
              <i className="ri-building-line text-primary fs-5" />
              <div>
                <h5 className="modal-title mb-0 fw-bold text-dark" style={{ fontSize: "1rem" }}>
                  {selectedTask.customer_name}
                </h5>
                <small className="text-muted" style={{ fontSize: "0.75rem" }}>
                  Code: <strong className="text-dark">{selectedTask.task_code || "TSK-CRM"}</strong>
                </small>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="p-3">
            <div className="mb-3">
              <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.6875rem" }}>
                Task Title / Purpose
              </div>
              <div className="fw-bold text-dark mt-1" style={{ fontSize: "0.95rem" }}>
                {selectedTask.title || "Follow-up"}
              </div>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <div className="p-2 border rounded-0 bg-light">
                  <small className="text-muted d-block" style={{ fontSize: "0.6875rem" }}>Due Date</small>
                  <span className={`fw-semibold ${selectedTask.is_overdue ? "text-danger" : "text-dark"}`} style={{ fontSize: "0.85rem" }}>
                    {selectedTask.due_date} {selectedTask.is_overdue && "(Overdue)"}
                  </span>
                </div>
              </div>
              <div className="col-6">
                <div className="p-2 border rounded-0 bg-light">
                  <small className="text-muted d-block" style={{ fontSize: "0.6875rem" }}>Priority</small>
                  <span className="fw-semibold text-danger" style={{ fontSize: "0.85rem" }}>
                    {selectedTask.priority || "MEDIUM"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: "0.6875rem" }}>
                Assigned Owner
              </div>
              <div className="fw-semibold text-dark mt-1" style={{ fontSize: "0.85rem" }}>
                <i className="ri-user-follow-line me-1 text-muted" />
                {selectedTask.owner_name || "Unassigned"}
              </div>
            </div>

            <hr style={{ borderColor: "#f1f5f9" }} />

            {/* Quick Contact Actions */}
            <div className="mb-2">
              <small className="text-muted text-uppercase fw-semibold d-block mb-2" style={{ fontSize: "0.6875rem" }}>
                Direct Customer Actions
              </small>
              <div className="d-flex gap-2">
                <Button
                  color="light"
                  size="sm"
                  className="rounded-0 border flex-grow-1 d-flex align-items-center justify-content-center py-2"
                  onClick={() => handleCall(selectedTask)}
                >
                  <i className="ri-phone-line me-1 text-danger" />
                  Call
                </Button>
                <Button
                  color="light"
                  size="sm"
                  className="rounded-0 border flex-grow-1 d-flex align-items-center justify-content-center py-2"
                  onClick={() => handleWhatsApp(selectedTask)}
                >
                  <i className="ri-whatsapp-line me-1 text-success" />
                  WhatsApp
                </Button>
                <Button
                  color="light"
                  size="sm"
                  className="rounded-0 border flex-grow-1 d-flex align-items-center justify-content-center py-2"
                  onClick={() => handleEmail(selectedTask)}
                >
                  <i className="ri-mail-line me-1 text-primary" />
                  Email
                </Button>
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="border-top p-2 d-flex justify-content-between">
            <Button
              color="link"
              className="text-decoration-none p-0 text-muted"
              style={{ fontSize: "0.8125rem" }}
              onClick={() => {
                const id = selectedTask.task_id;
                setSelectedTask(null);
                navigate(`/crm/tasks/${id}`);
              }}
            >
              Open Full Task Page <i className="ri-arrow-right-line ms-1" />
            </Button>

            <div className="d-flex gap-2">
              <Button
                color="light"
                size="sm"
                className="rounded-0 border"
                onClick={() => setSelectedTask(null)}
              >
                Close
              </Button>
              <Button
                color="success"
                size="sm"
                className="rounded-0"
                style={{ backgroundColor: "#059669", borderColor: "#059669" }}
                onClick={handleCompleteInModal}
                disabled={completing}
              >
                {completing ? <Spinner size="sm" className="me-1" /> : <i className="ri-check-line me-1" />}
                Mark Completed
              </Button>
            </div>
          </ModalFooter>
        </Modal>
      )}
    </Card>
  );
};

export default PendingFollowupsCard;
