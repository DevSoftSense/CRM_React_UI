import React from 'react';
import { Col, Container, Row } from 'reactstrap';

import crmFeatures1 from "../../../assets/images/landing/features/crm-features1.png";
import crmFeatures2 from "../../../assets/images/landing/features/crm-features2.png";

const teamTypes = [
    { icon: "ri-admin-line", label: "Sales Admins" },
    { icon: "ri-user-star-line", label: "Sales Reps" },
    { icon: "ri-building-line", label: "Enterprises" },
    { icon: "ri-store-line", label: "Retail & POS" },
    { icon: "ri-team-line", label: "Remote Teams" },
    { icon: "ri-briefcase-line", label: "SMEs" },
];

const Features = () => {
    return (
        <React.Fragment>
            <section className="section bg-light py-5" id="features">
                <Container>
                    <Row className="align-items-center gy-4">
                        <Col lg={6} sm={7} className="mx-auto">
                            <div>
                                <img src={crmFeatures1} alt="SoftOnCloud CRM Sales Dashboard" className="img-fluid mx-auto" />
                            </div>
                        </Col>
                        <Col lg={6}>
                            <div className="text-muted">
                                <h3 className="mb-4 fs-20 text-body">See Your Pipeline. Forecast With Confidence.</h3>
                                <div className="vstack gap-3">
                                    {[
                                        "Visual sales funnel & Kanban pipeline boards",
                                        "Revenue trends, KPI dashboards & win rate analytics",
                                        "AI-powered lead scoring & engagement tracking",
                                        "Weighted pipeline value & forecast vs target gauges",
                                        "Top sales reps, hot opportunities & activity overview",
                                    ].map((item) => (
                                        <div key={item} className="d-flex align-items-center">
                                            <div className="flex-shrink-0 me-2">
                                                <div className="avatar-xs">
                                                    <div className="avatar-title bg-danger text-white rounded-circle">
                                                        <i className="ri-check-line"></i>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-grow-1">
                                                <p className="mb-0 text-body ff-secondary">{item}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>

            <section className="section">
                <Container>
                    <Row className="align-items-center gy-4">
                        <Col lg={6} className="order-2 order-lg-1">
                            <div className="text-muted">
                                <h3 className="mb-4 fs-20 text-body">Built for Every Sales Team</h3>

                                <Row className="g-3 mb-4">
                                    {teamTypes.map((team) => (
                                        <Col xs={6} sm={4} lg={6} xl={4} key={team.label}>
                                            <div className="text-center p-3 bg-light rounded">
                                                <div className="avatar-sm mx-auto mb-2">
                                                    <div className="avatar-title bg-white text-danger rounded">
                                                        <i className={`${team.icon} fs-20`}></i>
                                                    </div>
                                                </div>
                                                <p className="mb-0 fw-medium text-body fs-14">{team.label}</p>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>

                                <p className="mb-0 ff-secondary text-body">
                                    From lead capture to deal closure, SoftOnCloud CRM keeps your entire sales team aligned
                                    with 360° customer views, communication timelines, and integrated invoicing.
                                </p>
                            </div>
                        </Col>

                        <Col lg={6} sm={7} className="col-10 ms-auto order-1 order-lg-2">
                            <div>
                                <img src={crmFeatures2} alt="SoftOnCloud CRM Lead Details" className="img-fluid" />
                            </div>
                        </Col>
                    </Row>
                </Container>
            </section>
        </React.Fragment>
    );
};

export default Features;
