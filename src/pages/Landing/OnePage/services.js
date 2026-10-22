import React from 'react';
import { Col, Container, Row } from 'reactstrap';

const serviceItems = [
    {
        icon: "ri-user-search-line",
        title: "Lead Management",
        description: "Capture, qualify, and score leads with AI-powered insights, ratings, and automated follow-up reminders.",
    },
    {
        icon: "ri-layout-column-line",
        title: "Sales Pipeline",
        description: "Visualize deals across prospecting, qualified, proposal, negotiation, and closed stages with Kanban boards.",
    },
    {
        icon: "ri-hand-coin-line",
        title: "Opportunity Tracking",
        description: "Manage opportunities with products, quotes, probability, expected close dates, and weighted pipeline value.",
    },
    {
        icon: "ri-contacts-book-line",
        title: "360° Customer View",
        description: "Complete company and contact profiles with billing, activities, documents, invoices, and relationship history.",
    },
    {
        icon: "ri-calendar-check-line",
        title: "Activities & Calendar",
        description: "Log calls, meetings, emails, and tasks. Schedule follow-ups with color-coded calendar views.",
    },
    {
        icon: "ri-brain-line",
        title: "AI Lead Scoring",
        description: "Predict conversion likelihood with AI-powered lead scores, engagement levels, and smart recommendations.",
    },
    {
        icon: "ri-bar-chart-box-line",
        title: "Reports & Analytics",
        description: "Sales dashboards with revenue trends, funnel analytics, win rates, team performance, and forecast vs target.",
    },
    {
        icon: "ri-plug-line",
        title: "Integrated Modules",
        description: "Connect with Book, Invoice, Inventory, POS, SuperStore, HelpDesk, and Task modules seamlessly.",
    },
];

const Services = () => {
    return (
        <React.Fragment>
            <section className="section" id="services">
                <Container>
                    <Row className="justify-content-center">
                        <Col lg={8}>
                            <div className="text-center mb-5">
                                <h5 className="fs-12 text-uppercase text-danger mb-2">Powerful Features</h5>
                                <h3 className="mb-3 fw-semibold">Everything You Need to Grow Sales</h3>
                                <p className="text-muted mb-0 ff-secondary">
                                    All the tools you need to capture leads, manage pipelines, and close deals effortlessly.
                                </p>
                            </div>
                        </Col>
                    </Row>

                    <Row className="g-3">
                        {serviceItems.map((item) => (
                            <Col lg={3} md={6} key={item.title}>
                                <div className="d-flex p-3">
                                    <div className="flex-shrink-0 me-3">
                                        <div className="avatar-sm icon-effect">
                                            <div className="avatar-title bg-transparent text-danger rounded-circle">
                                                <i className={`${item.icon} fs-36`}></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-grow-1">
                                        <h5 className="fs-18">{item.title}</h5>
                                        <p className="text-muted mb-0 ff-secondary">{item.description}</p>
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>
        </React.Fragment>
    );
};

export default Services;
