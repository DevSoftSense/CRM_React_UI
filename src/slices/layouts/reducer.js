import { createSlice } from "@reduxjs/toolkit";
import {
  layoutTypes,
  leftSidebarTypes,
  layoutModeTypes,
  layoutWidthTypes,
  layoutPositionTypes,
  topbarThemeTypes,
  leftsidbarSizeTypes,
  leftSidebarViewTypes,
  leftSidebarImageTypes,
  preloaderTypes,
  sidebarVisibilitytypes,
} from "../../Components/constants/layout";

export const LAYOUT_STATE_KEY = "crm_layoutState";

const savedState = (() => {
  try {
    return JSON.parse(localStorage.getItem(LAYOUT_STATE_KEY) || "{}");
  } catch {
    return {};
  }
})();

if (!savedState.leftSidebarType) {
  savedState.leftSidebarType = leftSidebarTypes.CUSTOM;
}

if (!savedState.topbarThemeType) {
  savedState.topbarThemeType = topbarThemeTypes.LIGHT;
}

const persist = (state) => {
  try {
    localStorage.setItem(LAYOUT_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

export const initialState = {
  layoutType: layoutTypes.VERTICAL,
  leftSidebarType: savedState.leftSidebarType,
  layoutModeType: savedState.layoutModeType || layoutModeTypes.LIGHTMODE,
  layoutWidthType: savedState.layoutWidthType || layoutWidthTypes.FLUID,
  layoutPositionType: savedState.layoutPositionType || layoutPositionTypes.FIXED,
  topbarThemeType: savedState.topbarThemeType,
  leftsidbarSizeType: savedState.leftsidbarSizeType || leftsidbarSizeTypes.DEFAULT,
  leftSidebarViewType:
    savedState.leftSidebarViewType || leftSidebarViewTypes.DEFAULT,
  leftSidebarImageType:
    savedState.leftSidebarImageType || leftSidebarImageTypes.NONE,
  preloader: savedState.preloader || preloaderTypes.DISABLE,
  sidebarVisibilitytype:
    savedState.sidebarVisibilitytype || sidebarVisibilitytypes.SHOW,
};

const LayoutSlice = createSlice({
  name: "LayoutSlice",
  initialState,
  reducers: {
    changeLayoutAction(state, action) {
      state.layoutType = action.payload;
      persist(state);
    },
    changeLayoutModeAction(state, action) {
      state.layoutModeType = action.payload;
      persist(state);
    },
    changeSidebarThemeAction(state, action) {
      state.leftSidebarType = action.payload;
      persist(state);
    },
    changeLayoutWidthAction(state, action) {
      state.layoutWidthType = action.payload;
      persist(state);
    },
    changeLayoutPositionAction(state, action) {
      state.layoutPositionType = action.payload;
      persist(state);
    },
    changeTopbarThemeAction(state, action) {
      state.topbarThemeType = action.payload;
      persist(state);
    },
    changeLeftsidebarSizeTypeAction(state, action) {
      state.leftsidbarSizeType = action.payload;
      persist(state);
    },
    changeLeftsidebarViewTypeAction(state, action) {
      state.leftSidebarViewType = action.payload;
      persist(state);
    },
    changeSidebarImageTypeAction(state, action) {
      state.leftSidebarImageType = action.payload;
      persist(state);
    },
    changePreLoaderAction(state, action) {
      state.preloader = action.payload;
      persist(state);
    },
    changeSidebarVisibilityAction(state, action) {
      state.sidebarVisibilitytype = action.payload;
      persist(state);
    },
  },
});

export const {
  changeLayoutAction,
  changeLayoutModeAction,
  changeSidebarThemeAction,
  changeLayoutWidthAction,
  changeLayoutPositionAction,
  changeTopbarThemeAction,
  changeLeftsidebarSizeTypeAction,
  changeLeftsidebarViewTypeAction,
  changeSidebarImageTypeAction,
  changePreLoaderAction,
  changeSidebarVisibilityAction,
} = LayoutSlice.actions;

export default LayoutSlice.reducer;
