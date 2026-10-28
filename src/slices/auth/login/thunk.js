import { APIClient, setAuthorization } from "../../../helpers/api_helper";
import { crmLogin } from "../../../helpers/crmAuthApi";
import { isCrmAuth } from "../../../helpers/authMode";
import {
  bindTabPasswordEpoch,
  clearAuthUser,
  clearTabForceLogout,
  getStoredAuthToken,
  kickOtherTabsAfterLogout,
  writeAuthUser,
} from "../../../helpers/authSession";

import {
  apiError,
  loginPending,
  loginSuccess,
  logoutUserSuccess,
  reset_login_flag,
} from "./reducer";

const api = new APIClient();
const ORG_ID_STORAGE_KEY = "crm_last_org_id";

const persistOrgId = (orgId, rememberMe) => {
  if (rememberMe && orgId) {
    localStorage.setItem(ORG_ID_STORAGE_KEY, String(orgId));
  }
};

/**
 * SoftOnCloud admin login only (never Themesbrand fake /auth/signin).
 * Flow: SoftOnCloud login → resolve-context(product 28) → CRM session-renew.
 */
export const loginUser = (user, history) => async (dispatch) => {
  dispatch(loginPending());

  try {
    const session = await crmLogin({
      orgId: user.orgId,
      email: user.email,
      password: user.password,
      rememberMe: user.rememberMe,
    });

    persistOrgId(user.orgId, user.rememberMe);
    clearTabForceLogout();
    writeAuthUser(session);
    setAuthorization(session.token);
    bindTabPasswordEpoch();
    dispatch(loginSuccess(session));
    history("/dashboard-crm");
  } catch (error) {
    const message =
      error?.message ||
      error?.response?.data?.message ||
      (typeof error === "string" ? error : "Unable to sign in. Please try again.");
    dispatch(apiError(message));
  }
};

export const logoutUser = () => async (dispatch) => {
  try {
    const token = getStoredAuthToken();
    if (token && isCrmAuth()) {
      try {
        setAuthorization(token);
        await api.create("/api/auth/logout", { reason: "session_ended" });
      } catch {
        /* still clear local */
      }
    }

    kickOtherTabsAfterLogout();
    clearAuthUser();
    setAuthorization(null);
    dispatch(logoutUserSuccess(true));
  } catch (error) {
    clearAuthUser();
    setAuthorization(null);
    dispatch(apiError(error?.message || "Logout failed"));
  }
};

export const socialLogin = () => async () => {
  /* SoftOnCloud CRM uses org + email + password only */
};

export const resetLoginFlag = () => async (dispatch) => {
  dispatch(reset_login_flag());
};
