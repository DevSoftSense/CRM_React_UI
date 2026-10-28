import { createSlice } from "@reduxjs/toolkit";
import {
  getBalanceChartsData,
  getDialChartsData,
  getSalesChartsData,
} from "./thunk";

export const initialState = {
  balanceOverviewData: [],
  dialTypeData: [],
  salesForecastData: [],
  error: null,
};

const readRejectError = (action) =>
  action.payload?.error ||
  action.payload?.message ||
  action.error?.message ||
  null;

const DashboardCRMSlice = createSlice({
  name: "DashboardCRM",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getBalanceChartsData.fulfilled, (state, action) => {
      state.balanceOverviewData = action.payload || [];
      state.error = null;
    });
    builder.addCase(getBalanceChartsData.rejected, (state, action) => {
      state.error = readRejectError(action);
    });

    builder.addCase(getDialChartsData.fulfilled, (state, action) => {
      state.dialTypeData = action.payload || [];
      state.error = null;
    });
    builder.addCase(getDialChartsData.rejected, (state, action) => {
      state.error = readRejectError(action);
    });

    builder.addCase(getSalesChartsData.fulfilled, (state, action) => {
      state.salesForecastData = action.payload || [];
      state.error = null;
    });
    builder.addCase(getSalesChartsData.rejected, (state, action) => {
      state.error = readRejectError(action);
    });
  },
});

export default DashboardCRMSlice.reducer;
