import React from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector } from "react-redux";

import "./assets/scss/themes.scss";
import "./helpers/brandTheme";
import Route from "./Routes";

// SoftOnCloud CRM — landing maroon theme + toasts (same as Appointment)

function App() {
  const { layoutModeType } = useSelector((state) => state.Layout || {});

  return (
    <React.Fragment>
      <Route />
      {/* Same toast setup as Appointment — light/dark follows layout theme */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={layoutModeType === "dark" ? "dark" : "light"}
      />
    </React.Fragment>
  );
}

export default App;
