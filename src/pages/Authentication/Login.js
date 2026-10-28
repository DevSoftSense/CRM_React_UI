import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  FormFeedback,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "reselect";
import * as Yup from "yup";
import { useFormik } from "formik";

import withRouter from "../../Components/Common/withRouter";
import ParticlesAuth from "../AuthenticationInner/ParticlesAuth";
import { loginUser, resetLoginFlag } from "../../slices/thunks";
import { brandLogos, brandText } from "../../config/brandConfig";

const ORG_ID_STORAGE_KEY = "crm_last_org_id";

const Login = (props) => {
  const dispatch = useDispatch();
  const [passwordShow, setPasswordShow] = useState(false);

  const loginpageData = createSelector(
    (state) => state,
    (state) => ({
      error: state.Login.error,
      loading: state.Login.loading,
      errorMsg: state.Login.errorMsg,
    })
  );

  const { error, loading, errorMsg } = useSelector(loginpageData);

  const validation = useFormik({
    enableReinitialize: true,
    initialValues: {
      orgId: localStorage.getItem(ORG_ID_STORAGE_KEY) || "",
      email: "",
      password: "",
      rememberMe: false,
    },
    validationSchema: Yup.object({
      orgId: Yup.number()
        .typeError("Organisation ID must be a number")
        .positive("Organisation ID must be greater than zero")
        .required("Please enter your Organisation ID"),
      email: Yup.string()
        .email("Please enter a valid email")
        .required("Please enter your email"),
      password: Yup.string().required("Please enter your password"),
    }),
    onSubmit: (values) => {
      dispatch(loginUser(values, props.router.navigate));
    },
  });

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => dispatch(resetLoginFlag()), 5000);
      return () => clearTimeout(timer);
    }
  }, [dispatch, errorMsg]);

  const loginReason = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return String(params.get("reason") || "").toLowerCase();
    } catch {
      return "";
    }
  }, []);

  const reasonMessage =
    loginReason === "password_changed"
      ? "Your password was changed. Please sign in with your new password."
      : loginReason === "session_ended"
        ? "Your session has ended. Please sign in again."
        : "";

  document.title = `Sign In | ${brandText.fullName}`;

  return (
    <ParticlesAuth>
      <div className="auth-page-content mt-lg-5">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="text-center mt-sm-5 mb-4 text-white-50">
                <div>
                  <Link to="/login" className="d-inline-block auth-logo">
                    <img src={brandLogos.main} alt={brandText.fullName} height="48" />
                  </Link>
                </div>
                <p className="mt-3 fs-15 fw-medium">{brandText.tagline}</p>
              </div>
            </Col>
          </Row>

          <Row className="justify-content-center">
            <Col md={8} lg={6} xl={5}>
              <Card className="mt-4">
                <CardBody className="p-4">
                  <div className="text-center mt-2">
                    <h5 className="text-primary">Welcome Back!</h5>
                    <p className="text-muted">
                      Sign in as admin to continue to {brandText.productName}.
                    </p>
                  </div>

                  {error || errorMsg ? (
                    <Alert color="danger" className="mt-3 mb-0">
                      {typeof error === "string" && error.trim()
                        ? error
                        : "Unable to sign in. Please check Organisation ID, email, and password."}
                    </Alert>
                  ) : reasonMessage ? (
                    <Alert color="warning" className="mt-3 mb-0">
                      {reasonMessage}
                    </Alert>
                  ) : null}

                  <div className="p-2 mt-4">
                    <Form
                      onSubmit={(e) => {
                        e.preventDefault();
                        validation.handleSubmit();
                      }}
                    >
                      <div className="mb-3">
                        <Label htmlFor="orgId" className="form-label">
                          Organisation ID <span className="text-danger">*</span>
                        </Label>
                        <Input
                          id="orgId"
                          name="orgId"
                          type="number"
                          min="1"
                          className="form-control"
                          placeholder="Enter your organisation ID"
                          onChange={validation.handleChange}
                          onBlur={validation.handleBlur}
                          value={validation.values.orgId}
                          invalid={
                            validation.touched.orgId && Boolean(validation.errors.orgId)
                          }
                        />
                        {validation.touched.orgId && validation.errors.orgId ? (
                          <FormFeedback type="invalid">
                            {validation.errors.orgId}
                          </FormFeedback>
                        ) : null}
                      </div>

                      <div className="mb-3">
                        <Label htmlFor="email" className="form-label">
                          Email <span className="text-danger">*</span>
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          className="form-control"
                          placeholder="Enter email address"
                          autoComplete="username"
                          onChange={validation.handleChange}
                          onBlur={validation.handleBlur}
                          value={validation.values.email}
                          invalid={
                            validation.touched.email && Boolean(validation.errors.email)
                          }
                        />
                        {validation.touched.email && validation.errors.email ? (
                          <FormFeedback type="invalid">
                            {validation.errors.email}
                          </FormFeedback>
                        ) : null}
                      </div>

                      <div className="mb-3">
                        <Label className="form-label" htmlFor="password">
                          Password <span className="text-danger">*</span>
                        </Label>
                        <div className="position-relative auth-pass-inputgroup mb-3">
                          <Input
                            id="password"
                            name="password"
                            type={passwordShow ? "text" : "password"}
                            className="form-control pe-5"
                            placeholder="Enter password"
                            autoComplete="current-password"
                            onChange={validation.handleChange}
                            onBlur={validation.handleBlur}
                            value={validation.values.password}
                            invalid={
                              validation.touched.password &&
                              Boolean(validation.errors.password)
                            }
                          />
                          {validation.touched.password && validation.errors.password ? (
                            <FormFeedback type="invalid">
                              {validation.errors.password}
                            </FormFeedback>
                          ) : null}
                          <button
                            className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted"
                            type="button"
                            onClick={() => setPasswordShow(!passwordShow)}
                            aria-label={passwordShow ? "Hide password" : "Show password"}
                          >
                            <i className="ri-eye-fill align-middle"></i>
                          </button>
                        </div>
                      </div>

                      <div className="form-check">
                        <Input
                          className="form-check-input"
                          type="checkbox"
                          id="rememberMe"
                          name="rememberMe"
                          checked={validation.values.rememberMe}
                          onChange={validation.handleChange}
                        />
                        <Label className="form-check-label" htmlFor="rememberMe">
                          Remember me
                        </Label>
                      </div>

                      <div className="mt-4">
                        <Button
                          color="success"
                          className="w-100"
                          type="submit"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              Signing in...
                            </>
                          ) : (
                            "Sign In"
                          )}
                        </Button>
                      </div>
                    </Form>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </ParticlesAuth>
  );
};

export default withRouter(Login);
