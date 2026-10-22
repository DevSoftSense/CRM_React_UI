import React, { useState } from 'react';
import { Col, Container, Row, Collapse } from 'reactstrap';
import classnames from "classnames";

const faqSections = [
    {
        icon: "ri-question-line",
        title: "General Questions",
        id: "general",
        items: [
            {
                question: "What is SoftOnCloud CRM?",
                answer: "SoftOnCloud CRM is a comprehensive customer relationship management platform that helps you capture leads, manage sales pipelines, track opportunities, and build 360° customer profiles in one place.",
            },
            {
                question: "Can I manage leads, customers, and contacts?",
                answer: "Yes. Create and qualify leads, convert them to customers, manage contact persons with full 360° views, and track every interaction across your sales cycle.",
            },
            {
                question: "Does CRM support visual pipeline management?",
                answer: "Yes. Use Kanban-style pipeline boards with stages like Prospecting, Qualified, Proposal, Negotiation, Closed Won, and Closed Lost with weighted values and win probabilities.",
            },
            {
                question: "Can I track activities and communications?",
                answer: "Yes. Log calls, meetings, emails, and tasks. View a complete communication timeline for every lead, customer, and opportunity.",
            },
            {
                question: "Does CRM include AI-powered insights?",
                answer: "Yes. AI lead scoring, engagement tracking, and smart recommendations help prioritize high-conversion leads and optimize follow-ups.",
            },
        ],
    },
    {
        icon: "ri-hand-coin-line",
        title: "Sales & Pipeline",
        id: "sales",
        items: [
            {
                question: "How does opportunity management work?",
                answer: "Create opportunities with products, quotes, probability percentages, expected close dates, and track them through every sales stage until won or lost.",
            },
            {
                question: "Can I generate quotes and invoices?",
                answer: "Yes. Create quotes directly from opportunities and manage invoices with payment tracking, outstanding amounts, and financial snapshots.",
            },
            {
                question: "What analytics and reports are available?",
                answer: "Sales dashboards with revenue trends, funnel analytics, lead sources, win rates, team performance, forecast vs target, and activity overviews.",
            },
            {
                question: "Can I filter and export data?",
                answer: "Yes. Filter leads, opportunities, and activities by source, status, owner, territory, and date range. Export timelines and reports as needed.",
            },
            {
                question: "Does CRM support document management?",
                answer: "Yes. Upload, organize, and link documents to leads, customers, and opportunities with folder categorization and activity tracking.",
            },
        ],
    },
    {
        icon: "ri-calendar-check-line",
        title: "Activities & Scheduling",
        id: "activities",
        items: [
            {
                question: "What activity types are supported?",
                answer: "Log calls, meetings, emails, tasks, and follow-ups. Each activity links to the relevant lead, customer, contact, or opportunity.",
            },
            {
                question: "Does CRM have a calendar view?",
                answer: "Yes. Manage schedules with day, week, month, and agenda views. Color-coded activities show calls, meetings, emails, tasks, and follow-ups.",
            },
            {
                question: "Can I set follow-up reminders?",
                answer: "Yes. Schedule follow-up calls, meetings, and tasks with date/time reminders so no lead or opportunity is missed.",
            },
            {
                question: "How does the communication timeline work?",
                answer: "Every interaction is logged chronologically with type icons, participant details, duration, and attachments for a complete audit trail.",
            },
        ],
    },
    {
        icon: "ri-shield-keyhole-line",
        title: "Security & Integrations",
        id: "security",
        items: [
            {
                question: "Does CRM support role-based access?",
                answer: "Yes. Granular RBAC controls what admins, sales reps, and team members can see and do across modules and menus.",
            },
            {
                question: "What modules integrate with CRM?",
                answer: "CRM integrates with Book, Invoice, Inventory, POS, SuperStore, HelpDesk, and Task modules for a unified business platform.",
            },
            {
                question: "Does CRM support light/dark themes?",
                answer: "Yes. Switch between light and dark themes to match your team's preferences while keeping the same workflow.",
            },
            {
                question: "Is my CRM data secure?",
                answer: "SoftOnCloud CRM is built with security and privacy in mind, including account controls, permissions, and session management.",
            },
        ],
    },
];

const FaqAccordion = ({ sectionId, items }) => {
    const [openIndex, setOpenIndex] = useState(-1);

    const toggle = (index) => {
        setOpenIndex(openIndex === index ? -1 : index);
    };

    return (
        <div
            className="accordion custom-accordionwithicon custom-accordion-border accordion-border-box"
            id={`${sectionId}-accordion`}
        >
            {items.map((item, index) => (
                <div className="accordion-item" key={item.question}>
                    <h2 className="accordion-header" id={`${sectionId}-heading-${index}`}>
                        <button
                            className={classnames("accordion-button", "fw-medium", {
                                collapsed: openIndex !== index,
                            })}
                            type="button"
                            onClick={() => toggle(index)}
                            style={{ cursor: "pointer" }}
                        >
                            {item.question}
                        </button>
                    </h2>
                    <Collapse isOpen={openIndex === index} className="accordion-collapse">
                        <div className="accordion-body ff-secondary">{item.answer}</div>
                    </Collapse>
                </div>
            ))}
        </div>
    );
};

const Faqs = () => {
    return (
        <React.Fragment>
            <section className="section" id="faqs">
                <Container>
                    <Row className="justify-content-center">
                        <Col lg={8}>
                            <div className="text-center mb-5">
                                <h3 className="mb-3 fw-semibold">Frequently Asked Questions</h3>
                                <p className="text-muted mb-4 ff-secondary">
                                    If you can not find answer to your question in our FAQ, you can
                                    always contact us or email us. We will answer you shortly!
                                </p>

                                <div className="hstack gap-2 justify-content-center">
                                    <a
                                        href="mailto:noreply@softoncloud.com"
                                        className="btn btn-danger rounded-pill"
                                    >
                                        <i className="ri-mail-line align-middle me-2"></i>
                                        Email Us
                                    </a>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Row className="g-lg-5 g-4">
                        {faqSections.map((section) => (
                            <Col lg={6} key={section.id}>
                                <div className="d-flex align-items-center mb-2">
                                    <div className="flex-shrink-0 me-1">
                                        <i className={`${section.icon} fs-24 align-middle text-danger me-1`}></i>
                                    </div>
                                    <div className="flex-grow-1">
                                        <h5 className="mb-0 fw-semibold">{section.title}</h5>
                                    </div>
                                </div>
                                <FaqAccordion sectionId={section.id} items={section.items} />
                            </Col>
                        ))}
                    </Row>
                </Container>
            </section>
        </React.Fragment>
    );
};

export default Faqs;
