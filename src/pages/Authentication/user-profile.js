import React, { useState, useEffect } from "react";
import { isEmpty } from "lodash";

import {
  Container,
  Row,
  Col,
  Card,
  Alert,
  CardBody,
  Button,
  Label,
  Input,
  FormFeedback,
  Form,
} from "reactstrap";

import * as Yup from "yup";
import { useFormik } from "formik";

import { useSelector, useDispatch } from "react-redux";

import avatar from "../../assets/images/users/avatar-1.jpg";
import { editProfile, resetProfileFlag } from "../../slices/thunks";
import { createSelector } from "reselect";
import {
  readAuthUser,
  resolveAuthDisplay,
  writeAuthUser,
} from "../../helpers/authSession";
import { isCrmAuth } from "../../helpers/authMode";

const UserProfile = () => {
  const dispatch = useDispatch();

  const [email, setemail] = useState("");
  const [idx, setidx] = useState("1");
  const [userName, setUserName] = useState("Admin");

  const selectLayoutState = (state) => state.Profile;
  const userprofileData = createSelector(selectLayoutState, (state) => ({
    user: state.user,
    success: state.success,
    error: state.error,
  }));
  const { user, success, error } = useSelector(userprofileData);

  useEffect(() => {
    const obj = readAuthUser();
    if (!obj) return;

    // SoftOnCloud CRM session — no Velzon obj.data.first_name
    if (isCrmAuth() || obj.user || obj.productContext) {
      const display = resolveAuthDisplay(obj);
      setUserName(display.name);
      setemail(display.email || "");
      setidx(display.id || "1");
      return;
    }

    // Velzon fake-auth shape only
    if (!isEmpty(user) && obj.data) {
      obj.data.first_name = user.first_name;
      writeAuthUser(obj);
    }

    const display = resolveAuthDisplay(obj);
    setUserName(display.name);
    setemail(display.email || obj?.data?.email || "");
    setidx(display.id || obj?.data?._id || "1");

    setTimeout(() => {
      dispatch(resetProfileFlag());
    }, 3000);
  }, [dispatch, user]);

  const validation = useFormik({
    enableReinitialize: true,
    initialValues: {
      first_name: userName || "Admin",
      idx: idx || "",
    },
    validationSchema: Yup.object({
      first_name: Yup.string().required("Please Enter Your UserName"),
    }),
    onSubmit: (values) => {
      if (isCrmAuth()) return;
      dispatch(editProfile(values));
    },
  });

  document.title = "Profile | SoftOnCloud CRM";
  return (
    <React.Fragment>
      <div className="page-content mt-lg-5">
        <Container fluid>
          <Row>
            <Col lg="12">
              {error ? <Alert color="danger">{error}</Alert> : null}
              {success ? (
                <Alert color="success">Username Updated To {userName}</Alert>
              ) : null}

              <Card>
                <CardBody>
                  <div className="d-flex">
                    <div className="mx-3">
                      <img
                        src={avatar}
                        alt=""
                        className="avatar-md rounded-circle img-thumbnail"
                      />
                    </div>
                    <div className="flex-grow-1 align-self-center">
                      <div className="text-muted">
                        <h5>{userName || "Admin"}</h5>
                        <p className="mb-1">Email Id : {email || "—"}</p>
                        <p className="mb-0">Id No : #{idx || "—"}</p>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {!isCrmAuth() ? (
            <>
              <h4 className="card-title mb-4">Change User Name</h4>
              <Card>
                <CardBody>
                  <Form
                    className="form-horizontal"
                    onSubmit={(e) => {
                      e.preventDefault();
                      validation.handleSubmit();
                      return false;
                    }}
                  >
                    <div className="form-group">
                      <Label className="form-label">User Name</Label>
                      <Input
                        name="first_name"
                        className="form-control"
                        placeholder="Enter User Name"
                        type="text"
                        onChange={validation.handleChange}
                        onBlur={validation.handleBlur}
                        value={validation.values.first_name || ""}
                        invalid={
                          validation.touched.first_name &&
                          Boolean(validation.errors.first_name)
                        }
                      />
                      {validation.touched.first_name &&
                      validation.errors.first_name ? (
                        <FormFeedback type="invalid">
                          {validation.errors.first_name}
                        </FormFeedback>
                      ) : null}
                      <Input name="idx" value={idx} type="hidden" />
                    </div>
                    <div className="text-center mt-4">
                      <Button type="submit" color="danger">
                        Update User Name
                      </Button>
                    </div>
                  </Form>
                </CardBody>
              </Card>
            </>
          ) : (
            <Card>
              <CardBody>
                <p className="text-muted mb-0">
                  SoftOnCloud profile name and password are managed from your
                  SoftOnCloud account. Full CRM account settings will be added
                  in a later module.
                </p>
              </CardBody>
            </Card>
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

export default UserProfile;
