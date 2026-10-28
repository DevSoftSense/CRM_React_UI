import React from "react";
import { Col, Container, Row } from "reactstrap";
import { brandText } from "../config/brandConfig";

const Footer = () => {
  return (
    <React.Fragment>
      <footer className="footer">
        <Container fluid className="px-0">
          <Row className="align-items-center g-0">
            <Col xs={12} className="text-center">
              <div className="footer-brand-text">{brandText.poweredBy}</div>
            </Col>
          </Row>
        </Container>
      </footer>
    </React.Fragment>
  );
};

export default Footer;
