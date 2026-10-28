import React, { useEffect } from "react";
import { Navigate, Route } from "react-router-dom";
import { setAuthorization } from "../helpers/api_helper";
import {
  bindTabPasswordEpoch,
  clearAuthUser,
  getStoredAuthToken,
  installAuthCrossTabListener,
  isTabForceLogout,
  markTabForceLogout,
  readAuthUser,
} from "../helpers/authSession";
import { startSoftOnCloudSessionWatch } from "../helpers/softOnCloudSessionWatch";
import { useProfile } from "../Components/Hooks/UserHooks";

const kickThisTabToLogin = (reason = "password_changed") => {
  markTabForceLogout();
  clearAuthUser();
  setAuthorization(null);
  const safe = reason === "session_ended" ? "session_ended" : "password_changed";
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = `/login?reason=${safe}`;
  }
};

const AuthProtected = (props) => {
  const { userProfile, loading, token } = useProfile();

  useEffect(() => {
    const bearer = token || getStoredAuthToken();
    if (bearer) {
      setAuthorization(bearer);
      try {
        const bound = sessionStorage.getItem("soc_tab_password_epoch");
        if (bound == null || bound === "") {
          bindTabPasswordEpoch();
        }
      } catch {
        bindTabPasswordEpoch();
      }
    }
  }, [token, userProfile, loading]);

  useEffect(() => {
    if (isTabForceLogout()) return undefined;
    return installAuthCrossTabListener(kickThisTabToLogin);
  }, []);

  useEffect(() => {
    if (isTabForceLogout()) return undefined;
    if (!readAuthUser() || !getStoredAuthToken()) return undefined;
    return startSoftOnCloudSessionWatch(kickThisTabToLogin);
  }, []);

  if (isTabForceLogout()) {
    return <Navigate to="/login?reason=password_changed" replace />;
  }

  const storedUser = userProfile || readAuthUser();
  const storedToken = token || getStoredAuthToken();

  if (!storedUser || !storedToken) {
    return (
      <Navigate to={{ pathname: "/login", state: { from: props.location } }} />
    );
  }

  return <>{props.children}</>;
};

const AccessRoute = ({ component: Component, ...rest }) => {
  return (
    <Route
      {...rest}
      render={(props) => (
        <>
          <Component {...props} />
        </>
      )}
    />
  );
};

export { AuthProtected, AccessRoute };
