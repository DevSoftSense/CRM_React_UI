import React from "react";
import { Col, Row } from "reactstrap";

/** Same idea as Appointment PageHeader — title + optional actions */
const PageHeader = ({ title, pageTitle, description, actions }) => (
  <Row className="mb-3 pb-1">
    <Col xs={12}>
      <div className="d-flex align-items-lg-center flex-lg-row flex-column">
        <div className="flex-grow-1">
          <h4 className="fs-16 mb-1">{pageTitle ? `${pageTitle} / ${title}` : title}</h4>
          {description ? <p className="text-muted mb-0">{description}</p> : null}
        </div>
        {actions ? <div className="mt-3 mt-lg-0">{actions}</div> : null}
      </div>
    </Col>
  </Row>
);

export default PageHeader;
