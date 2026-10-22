import React from 'react';
import { Col, Container, Row } from 'reactstrap';

import processArrow from "../../../assets/images/landing/process-arrow-img.png";

const steps = [
    {
        step: "01",
        title: "Capture",
        description: "Add leads from website, referral, campaigns, or walk-ins with company details, contacts, and AI scoring.",
        icon: "ri-user-add-line",
    },
    {
        step: "02",
        title: "Nurture",
        description: "Track activities, schedule follow-ups, log communications, and move deals through your sales pipeline.",
        icon: "ri-hand-heart-line",
    },
    {
        step: "03",
        title: "Convert",
        description: "Close opportunities, generate quotes, create invoices, and build lasting customer relationships.",
        icon: "ri-trophy-line",
    },
];

const WorkProcess = () => {
    return (
        <React.Fragment>
            <section className="section bg-light" id="how-it-works">
                <Container>
                    <Row className="justify-content-center">
                        <Col lg={8}>
                            <div className="text-center mb-5">
                                <h3 className="mb-3 fw-semibold">How It Works</h3>
                                <p className="text-muted mb-0 ff-secondary">
                                    Everything organized in 3 simple steps — Capture → Nurture → Convert
                                </p>
                            </div>
                        </Col>
                    </Row>

                    <Row className="text-center">
                        {steps.map((item, index) => (
                            <Col lg={4} key={item.title}>
                                <div className="process-card mt-4">
                                    {index < steps.length - 1 && (
                                        <div className="process-arrow-img d-none d-lg-block">
                                            <img src={processArrow} alt="" className="img-fluid" />
                                        </div>
                                    )}
                                    <div className="avatar-sm icon-effect mx-auto mb-4">
                                        <div className="avatar-title bg-transparent text-danger rounded-circle h1">
                                            <i className={item.icon}></i>
                                        </div>
                                    </div>
                                    <p className="text-danger fw-semibold mb-2">{item.step}</p>
                                    <h5>{item.title}</h5>
                                    <p className="text-muted ff-secondary mb-0">{item.description}</p>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>
        </React.Fragment>
    );
};

export default WorkProcess;
