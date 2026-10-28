import { createSlice } from "@reduxjs/toolkit";

export const initialState = {
  user: {},
  error: "",
  loading: false,
  isUserLogout: false,
  errorMsg: false,
};

const loginSlice = createSlice({
  name: "login",
  initialState,
  reducers: {
    apiError(state, action) {
      state.error = action.payload || "Something went wrong";
      state.loading = false;
      state.isUserLogout = false;
      state.errorMsg = true;
    },
    loginPending(state) {
      state.loading = true;
      state.error = "";
      state.errorMsg = false;
    },
    loginSuccess(state, action) {
      state.user = action.payload;
      state.loading = false;
      state.errorMsg = false;
      state.error = "";
    },
    logoutUserSuccess(state) {
      state.isUserLogout = true;
    },
    reset_login_flag(state) {
      state.error = null;
      state.loading = false;
      state.errorMsg = false;
    },
  },
});

export const {
  apiError,
  loginPending,
  loginSuccess,
  logoutUserSuccess,
  reset_login_flag,
} = loginSlice.actions;

export default loginSlice.reducer;
