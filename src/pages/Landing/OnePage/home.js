import React from 'react';
import { Col, Container, Row } from 'reactstrap';

import imgpattern from "../../../assets/images/landing/img-pattern.png";
import crmHero from "../../../assets/images/landing/features/crm-hero.png";

const heroFeatures = [
    "Lead Management with AI-Powered Scoring",
    "Visual Sales Pipeline & Kanban Board",
    "360° Customer & Contact Profiles",
    "Communication Timeline & Activity Tracking",
    "Opportunity, Quote & Invoice Management",
    "Integrated Book, POS, Inventory & HelpDesk",
];

const heroHighlights = [
    { icon: "ri-shield-check-line", label: "Secure & Role-Based" },
    { icon: "ri-refresh-line", label: "Real-Time Updates" },
    { icon: "ri-cursor-line", label: "Easy to Use" },
    { icon: "ri-global-line", label: "Access Anywhere" },
];

const Home = () => {
    return (
        <React.Fragment>
            <section className="section pb-0 hero-section" id="hero">
                <div className="bg-overlay bg-overlay-pattern"></div>
                <Container fluid className="hero-container px-3 px-lg-4 px-xl-5">
                    <Row className="align-items-center hero-content-row g-4 g-lg-4">
                        <Col lg={4} className="order-2 order-lg-1">
                            <div className="hero-copy text-center text-lg-start">
                                <span className="badge bg-danger-subtle text-danger mb-3 fs-12 text-uppercase">
                                    Customer Relationship Management
                                </span>

                                <h1 className="display-6 fw-semibold mb-3 lh-base">
                                    Manage Leads.
                                    <span className="text-danger hero-title-accent"> Close Deals.</span>
                                    <br />
                                    Grow Revenue.
                                </h1>

                                <p className="lead text-muted lh-base mb-4">
                                    SoftOnCloud CRM helps you capture leads, track pipelines, manage opportunities,
                                    and build lasting customer relationships — with AI insights, activity tracking,
                                    and integrated billing in one platform.
                                </p>

                                <ul className="list-unstyled hero-feature-list text-start d-inline-block mb-0">
                                    {heroFeatures.map((feature) => (
                                        <li key={feature} className="d-flex align-items-center gap-2 mb-2">
                                            <span className="avatar-xs flex-shrink-0">
                                                <span className="avatar-title rounded-circle bg-danger-subtle text-danger">
                                                    <i className="ri-check-line"></i>
                                                </span>
                                            </span>
                                            <span className="fw-medium text-body">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-lg-start mb-4 mt-4">
                                    <a href="https://softoncloud.com/" className="btn btn-danger">Start Free Trial</a>
                                    <a href="https://softoncloud.com/" target="_blank" rel="noopener noreferrer" className="btn btn-soft-danger">
                                        Explore All Apps <i className="ri-arrow-right-line align-middle ms-1"></i>
                                    </a>
                                </div>

                                <div className="hero-trust-row justify-content-center justify-content-lg-start mb-3">
                                    {heroHighlights.map((item) => (
                                        <div key={item.label} className="hero-trust-item text-center text-lg-start">
                                            <div className="avatar-xs mx-auto mx-lg-0 mb-1">
                                                <span className="avatar-title rounded-circle bg-light text-danger">
                                                    <i className={item.icon}></i>
                                                </span>
                                            </div>
                                            <div className="fs-12 text-muted fw-medium">{item.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Col>
                        <Col lg={8} className="order-1 order-lg-2">
                            <div className="demo-carousel hero-image-wrap position-relative">
                                <div className="demo-img-patten-top d-none d-sm-block">
                                    <img src={imgpattern} className="d-block img-fluid" alt="" />
                                </div>
                                <div className="demo-img-patten-bottom d-none d-sm-block">
                                    <img src={imgpattern} className="d-block img-fluid" alt="" />
                                </div>
                                <img src={crmHero} className="d-block w-100" alt="SoftOnCloud CRM Dashboard" />
                            </div>
                        </Col>
                    </Row>
                </Container>

                <div className="position-absolute start-0 end-0 bottom-0 hero-shape-svg">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        version="1.1"
                        viewBox="0 0 1440 120"
                    >
                        <g mask='url("#SvgjsMask1003")' fill="none">
                            <path d="M 0,118 C 288,98.6 1152,40.4 1440,21L1440 140L0 140z"></path>
                        </g>
                    </svg>
                </div>
            </section>
        </React.Fragment>
    );
};

export default Home;
