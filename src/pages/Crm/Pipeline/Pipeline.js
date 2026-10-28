import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Row,
  Spinner,
} from "reactstrap";
import { Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import PageHeader from "../components/PageHeader";
import {
  getOpportunityPipeline,
  moveOpportunityStage,
} from "../../../helpers/crmOpportunityApi";
import { toastApiError, toastSuccess } from "../../../helpers/crmToast";

const formatAmount = (card) => {
  if (card?.amount == null) return "—";
  return `${card.currencyCode || "INR"} ${card.amount}`;
};

const Pipeline = () => {
  document.title = "Pipeline | SoftOnCloud CRM";

  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getOpportunityPipeline({ search: search || undefined });
      const list = data?.stages || data?.Stages || [];
      setStages(
        list.map((s) => ({
          ...s,
          opportunities: s.opportunities || s.Opportunities || [],
        }))
      );
    } catch (err) {
      setStages([]);
      const msg = err?.message || "Failed to load pipeline.";
      setError(msg);
      toastApiError(err, msg);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const opportunityId = Number(draggableId);
    const toStageId = Number(destination.droppableId);
    if (!opportunityId || !toStageId) return;

    const prev = stages.map((s) => ({
      ...s,
      opportunities: [...(s.opportunities || [])],
    }));

    // optimistic UI
    const next = prev.map((s) => ({
      ...s,
      opportunities: [...(s.opportunities || [])],
    }));
    const fromCol = next.find((s) => String(s.stageId) === String(source.droppableId));
    const toCol = next.find((s) => String(s.stageId) === String(destination.droppableId));
    if (!fromCol || !toCol) return;
    const [moved] = fromCol.opportunities.splice(source.index, 1);
    if (!moved) return;
    toCol.opportunities.splice(destination.index, 0, moved);
    setStages(next);

    setMoving(true);
    try {
      await moveOpportunityStage(opportunityId, toStageId);
      toastSuccess("Stage updated.");
      await loadBoard();
    } catch (err) {
      setStages(prev);
      toastApiError(err, "Failed to move opportunity.");
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <PageHeader
          title="Sales Pipeline"
          pageTitle="CRM"
          description="Drag opportunities across stages. Stages come from CRM opportunity lookups."
          actions={
            <div className="d-flex gap-2 align-items-center">
              <div className="search-box" style={{ minWidth: 220 }}>
                <Input
                  type="text"
                  className="form-control"
                  placeholder="Search pipeline…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <i className="ri-search-line search-icon" />
              </div>
              <Link to="/crm/opportunities" className="btn btn-soft-primary">
                Opportunities list
              </Link>
            </div>
          }
        />

        {error ? <Alert color="danger">{error}</Alert> : null}
        {moving ? (
          <Alert color="info" className="py-2">
            Saving stage…
          </Alert>
        ) : null}

        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" /> Loading pipeline…
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div
              className="d-flex gap-3 align-items-start overflow-auto pb-3"
              style={{ minHeight: 420 }}
            >
              {stages.map((stage) => (
                <div
                  key={stage.stageId}
                  style={{ minWidth: 280, maxWidth: 300, flex: "0 0 280px" }}
                >
                  <Card className="mb-0 h-100">
                    <CardBody className="p-3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0 fw-semibold">{stage.stageName}</h6>
                        <Badge className="bg-primary-subtle text-primary">
                          {(stage.opportunities || []).length}
                        </Badge>
                      </div>
                      <Droppable droppableId={String(stage.stageId)}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`rounded p-2 ${
                              snapshot.isDraggingOver ? "bg-light" : ""
                            }`}
                            style={{ minHeight: 320 }}
                          >
                            {(stage.opportunities || []).map((card, index) => (
                              <Draggable
                                key={String(card.opportunityId)}
                                draggableId={String(card.opportunityId)}
                                index={index}
                              >
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    className={`border rounded p-2 mb-2 bg-white ${
                                      dragSnapshot.isDragging ? "shadow" : ""
                                    }`}
                                  >
                                    <Link
                                      to={`/crm/opportunities/${card.opportunityId}`}
                                      className="fw-semibold text-primary d-block mb-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {card.name}
                                    </Link>
                                    <div className="text-muted fs-12 mb-1">
                                      {card.accountName || "—"}
                                    </div>
                                    <Row className="g-1 fs-12">
                                      <Col xs={6}>{formatAmount(card)}</Col>
                                      <Col xs={6} className="text-end">
                                        {card.probability != null
                                          ? `${card.probability}%`
                                          : ""}
                                      </Col>
                                      <Col xs={12} className="text-muted">
                                        {card.ownerName || "No owner"}
                                        {card.expectedCloseDate
                                          ? ` · ${String(card.expectedCloseDate).slice(0, 10)}`
                                          : ""}
                                      </Col>
                                    </Row>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            {(stage.opportunities || []).length === 0 ? (
                              <div className="text-muted fs-12 text-center py-4">
                                Drop deals here
                              </div>
                            ) : null}
                          </div>
                        )}
                      </Droppable>
                    </CardBody>
                  </Card>
                </div>
              ))}
              {!stages.length ? (
                <div className="text-muted p-4">
                  No stages yet. Create an Opportunity once to seed stages, then refresh.
                </div>
              ) : null}
            </div>
          </DragDropContext>
        )}
      </Container>
    </div>
  );
};

export default Pipeline;
