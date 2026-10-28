import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, CardBody, Col, Container, Row, Spinner } from "reactstrap";
import { Link, useNavigate } from "react-router-dom";
import FeatherIcon from "feather-icons-react";
import SimpleBar from "simplebar-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import BootstrapTheme from "@fullcalendar/bootstrap";
import listPlugin from "@fullcalendar/list";
import PageHeader from "../components/PageHeader";
import { getActivityCalendar } from "../../../helpers/crmActivityApi";
import { toastApiError } from "../../../helpers/crmToast";

const pad = (n) => String(n).padStart(2, "0");

const localStamp = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

const eventClassName = (status) => {
  const v = String(status || "").toUpperCase();
  if (v === "COMPLETED") return "bg-success-subtle text-success";
  if (v === "SCHEDULED") return "bg-info-subtle text-info";
  return "bg-warning-subtle text-warning";
};

const Calendar = () => {
  document.title = "Calendar | SoftOnCloud CRM";

  const navigate = useNavigate();
  const rangeRef = useRef("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRange = useCallback(async (start, end) => {
    const key = `${start.toISOString()}|${end.toISOString()}`;
    if (rangeRef.current === key) return;
    rangeRef.current = key;

    setLoading(true);
    setError("");
    try {
      const result = await getActivityCalendar({
        startFrom: localStamp(start),
        startTo: localStamp(end),
      });
      setItems(result?.items || result?.Items || []);
    } catch (err) {
      setItems([]);
      const msg = err?.message || "Failed to load calendar.";
      setError(msg);
      toastApiError(err, msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const events = useMemo(
    () =>
      (items || []).map((a) => ({
        id: String(a.activityId),
        title: a.subject || a.actTypeName || "Activity",
        start: a.startTime,
        end: a.endTime || undefined,
        className: eventClassName(a.activityStatus),
        extendedProps: a,
      })),
    [items]
  );

  const upcoming = useMemo(() => {
    const now = Date.now();
    return [...events]
      .filter((e) => e.start && new Date(e.start).getTime() >= now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 12);
  }, [events]);

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title="Calendar"
          pageTitle="CRM"
          description="Theme calendar showing CRM activities."
          actions={
            <Button color="primary" tag={Link} to="/crm/activities">
              <i className="ri-phone-line align-bottom me-1" />
              Activities list
            </Button>
          }
        />

        {error ? <Alert color="danger">{error}</Alert> : null}

        <Row>
          <Col xl={3}>
            <Card>
              <CardBody className="bg-info-subtle">
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <FeatherIcon icon="calendar" className="text-info icon-dual-info" />
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="fs-15">Welcome to your Calendar!</h6>
                    <p className="text-muted mb-0">
                      CRM activities appear here. Click an event for details, or use Activities list to add one.
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <div>
              <h5 className="mb-1">Upcoming Activities</h5>
              <p className="text-muted">Don&apos;t miss scheduled activities</p>
              {loading ? (
                <div className="text-center py-4">
                  <Spinner color="primary" size="sm" />
                </div>
              ) : (
                <SimpleBar className="pe-2 me-n1 mb-3" style={{ height: "400px" }}>
                  {upcoming.length === 0 ? (
                    <p className="text-muted fs-13">No upcoming activities in this view.</p>
                  ) : (
                    upcoming.map((event) => (
                      <Card key={event.id} className="mb-2">
                        <CardBody className="p-3">
                          <Link
                            to={`/crm/activities/${event.id}`}
                            className="fw-semibold d-block text-truncate"
                          >
                            {event.title}
                          </Link>
                          <div className="text-muted fs-12 mt-1">
                            {new Date(event.start).toLocaleString()}
                          </div>
                        </CardBody>
                      </Card>
                    ))
                  )}
                </SimpleBar>
              )}
            </div>
          </Col>

          <Col xl={9}>
            <Card className="card-h-100">
              <CardBody>
                <FullCalendar
                  plugins={[BootstrapTheme, dayGridPlugin, interactionPlugin, listPlugin]}
                  initialView="dayGridMonth"
                  handleWindowResize
                  themeSystem="bootstrap"
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,dayGridWeek,dayGridDay,listWeek",
                  }}
                  events={events}
                  editable={false}
                  droppable={false}
                  selectable={false}
                  datesSet={(info) => {
                    loadRange(info.start, info.end);
                  }}
                  eventClick={(info) => {
                    const id = info.event.id;
                    if (id) navigate(`/crm/activities/${id}`);
                  }}
                />
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Calendar;
