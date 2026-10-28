import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  todayBalanceData,
  lastWeekBalanceData,
  lastMonthBalanceData,
  currentYearBalanceData,
  todayDealData,
  weeklyDealData,
  monthlyDealData,
  yealyDealData,
  octData,
  novData,
  decData,
  janData,
} from "../../common/data";

/**
 * Demo chart series from local common/data (no Themesbrand / fakeBackend API).
 * Real CRM dashboard metrics will replace this later via fn_*.
 */

export const getBalanceChartsData = createAsyncThunk(
  "dashboardCrm/getBalanceChartsData",
  async (period) => {
    switch (period) {
      case "lastWeek":
        return lastWeekBalanceData;
      case "lastMonth":
        return lastMonthBalanceData;
      case "currentYear":
        return currentYearBalanceData;
      case "today":
      default:
        return todayBalanceData;
    }
  }
);

export const getDialChartsData = createAsyncThunk(
  "dashboardCrm/getDialChartsData",
  async (period) => {
    switch (period) {
      case "weekly":
        return weeklyDealData;
      case "monthly":
        return monthlyDealData;
      case "yearly":
        return yealyDealData;
      case "today":
      default:
        return todayDealData;
    }
  }
);

export const getSalesChartsData = createAsyncThunk(
  "dashboardCrm/getSalesChartsData",
  async (period) => {
    switch (period) {
      case "nov":
        return novData;
      case "dec":
        return decData;
      case "jan":
        return janData;
      case "oct":
      default:
        return octData;
    }
  }
);
