import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import SimpleBar from "simplebar-react";
import { brandLogos, brandText } from "../config/brandConfig";

import VerticalLayout from "./VerticalLayouts";
import TwoColumnLayout from "./TwoColumnLayout";
import { Container } from "reactstrap";
import HorizontalLayout from "./HorizontalLayout";

/** Same pattern as Appointment — icon in white tile + product name (no Velzon wordmark). */
const LogoBox = ({ light = false }) => (
  <>
    <span className="logo-sm">
      <div className="d-flex justify-content-center align-items-center" style={{ height: "70px" }}>
        <div
          className="shadow-sm"
          style={{
            background: "#fff",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "42px",
            height: "42px",
            overflow: "hidden",
          }}
        >
          <img
            src={brandLogos.main}
            alt={brandText.productName}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      </div>
    </span>
    <span className="logo-lg">
      <div className="d-flex align-items-center" style={{ height: "70px" }}>
        <div
          className="shadow-sm"
          style={{
            background: "#fff",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "50px",
            height: "50px",
            minWidth: "50px",
            overflow: "hidden",
          }}
        >
          <img
            src={brandLogos.main}
            alt={brandText.productName}
            style={{ width: "110%", height: "110%", objectFit: "contain" }}
          />
        </div>
        <div className="ms-2 text-start d-flex flex-column justify-content-center" style={{ height: "50px" }}>
          <h3
            className={`mb-0 fw-bolder ${light ? "text-white" : "text-dark"}`}
            style={{ fontSize: "22px", letterSpacing: "0px", lineHeight: "1" }}
          >
            {brandText.productName}
          </h3>
          <span
            className={`mt-1 ${light ? "text-white-50" : "text-muted"}`}
            style={{ fontSize: "13px", fontWeight: "500", letterSpacing: "0.2px", lineHeight: "1" }}
          >
            {brandText.companyName}
          </span>
        </div>
      </div>
    </span>
  </>
);

const Sidebar = ({ layoutType }) => {
  useEffect(() => {
    const verticalOverlay = document.getElementsByClassName("vertical-overlay");
    if (verticalOverlay?.[0]) {
      verticalOverlay[0].addEventListener("click", function () {
        document.body.classList.remove("vertical-sidebar-enable");
      });
    }
  }, []);

  // Collapsed (sm) flyout labels + reliable mouse-wheel scroll
  useEffect(() => {
    const sidebar = document.querySelector(".navbar-menu.app-menu");
    if (!sidebar) return undefined;

    let openItem = null;
    const VIEW_PAD = 8;

    const getScrollEl = () =>
      sidebar.querySelector(".simplebar-content-wrapper") ||
      sidebar.querySelector("#scrollbar");

    const stripFlyoutStyles = (el) => {
      if (!el) return;
      el.classList.remove("flyout-open");
      el.style.removeProperty("--flyout-top");
      el.style.removeProperty("--flyout-link-top");
      el.style.removeProperty("--flyout-left");
      el.style.removeProperty("--flyout-height");
      el.style.removeProperty("--flyout-max-height");
    };

    const clearFlyout = () => {
      sidebar
        .querySelectorAll(".navbar-nav > .nav-item.flyout-open")
        .forEach(stripFlyoutStyles);
      openItem = null;
    };

    const fitDropdownInViewport = (item, linkTop) => {
      const dropdown = item.querySelector(":scope > .menu-dropdown");
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const maxAllowed = Math.max(120, vh - VIEW_PAD * 2);

      item.style.setProperty("--flyout-link-top", `${linkTop}px`);

      if (!dropdown) {
        item.style.setProperty("--flyout-top", `${Math.max(VIEW_PAD, linkTop)}px`);
        item.style.setProperty("--flyout-max-height", `${maxAllowed}px`);
        return;
      }

      item.style.setProperty("--flyout-max-height", `${maxAllowed}px`);
      item.style.setProperty("--flyout-top", `${linkTop}px`);
      const natural =
        dropdown.scrollHeight || dropdown.getBoundingClientRect().height;
      const panelH = Math.min(natural, maxAllowed);
      let top = linkTop;
      if (top + panelH > vh - VIEW_PAD) {
        top = vh - VIEW_PAD - panelH;
      }
      if (top < VIEW_PAD) top = VIEW_PAD;

      item.style.setProperty("--flyout-top", `${top}px`);
      item.style.setProperty("--flyout-max-height", `${panelH}px`);
    };

    const placeFlyout = (item, { fromScroll = false } = {}) => {
      if (!item) return;
      const size = document.documentElement.getAttribute("data-sidebar-size");
      if (size !== "sm") {
        clearFlyout();
        return;
      }

      const link = item.querySelector(":scope > a.menu-link");
      if (!link) return;
      const rect = link.getBoundingClientRect();

      if (!fromScroll) {
        sidebar.querySelectorAll(".navbar-nav > .nav-item.flyout-open").forEach((el) => {
          if (el !== item) stripFlyoutStyles(el);
        });
      }

      item.style.setProperty("--flyout-left", `${rect.left}px`);
      item.style.setProperty("--flyout-link-top", `${rect.top}px`);
      item.style.setProperty("--flyout-top", `${rect.top}px`);
      if (!fromScroll) {
        item.style.setProperty("--flyout-height", `${rect.height}px`);
      }
      item.classList.add("flyout-open");
      openItem = item;

      requestAnimationFrame(() => {
        if (openItem !== item) return;
        fitDropdownInViewport(item, rect.top);
      });
    };

    const onMouseOver = (e) => {
      const item = e.target.closest(".navbar-nav > .nav-item");
      if (!item || !sidebar.contains(item)) return;
      if (!item.parentElement?.classList.contains("navbar-nav")) return;
      if (openItem === item) return;
      placeFlyout(item);
    };

    const onMouseLeave = (e) => {
      if (openItem && e.relatedTarget && openItem.contains(e.relatedTarget)) return;
      clearFlyout();
    };

    const onScroll = () => {
      if (openItem) placeFlyout(openItem, { fromScroll: true });
    };

    const onWheel = (e) => {
      const dropdown = e.target.closest(".nav-item.flyout-open > .menu-dropdown");
      if (dropdown && dropdown.scrollHeight > dropdown.clientHeight + 1) {
        e.preventDefault();
        dropdown.scrollTop += e.deltaY;
        return;
      }

      const el = getScrollEl();
      if (!el) return;
      if (el.scrollHeight <= el.clientHeight + 1) return;
      const atTop = el.scrollTop <= 0 && e.deltaY < 0;
      const atBottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && e.deltaY > 0;
      if (atTop || atBottom) return;
      e.preventDefault();
      el.scrollTop += e.deltaY;
    };

    const onSidebarSizeChange = () => {
      if (document.documentElement.getAttribute("data-sidebar-size") !== "sm") {
        clearFlyout();
      }
    };

    sidebar.addEventListener("mouseover", onMouseOver);
    sidebar.addEventListener("mouseleave", onMouseLeave);
    sidebar.addEventListener("scroll", onScroll, true);
    sidebar.addEventListener("wheel", onWheel, { passive: false });
    const htmlObserver = new MutationObserver(onSidebarSizeChange);
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-sidebar-size"],
    });

    return () => {
      clearFlyout();
      htmlObserver.disconnect();
      sidebar.removeEventListener("mouseover", onMouseOver);
      sidebar.removeEventListener("mouseleave", onMouseLeave);
      sidebar.removeEventListener("scroll", onScroll, true);
      sidebar.removeEventListener("wheel", onWheel);
    };
  }, [layoutType]);

  const addEventListenerOnSmHoverMenu = () => {
    const size = document.documentElement.getAttribute("data-sidebar-size");
    if (size === "sm-hover") {
      document.documentElement.setAttribute("data-sidebar-size", "sm-hover-active");
    } else if (size === "sm-hover-active") {
      document.documentElement.setAttribute("data-sidebar-size", "sm-hover");
    } else {
      document.documentElement.setAttribute("data-sidebar-size", "sm-hover");
    }
  };

  return (
    <React.Fragment>
      <div className="app-menu navbar-menu">
        <div className="navbar-brand-box">
          <Link to="/dashboard-crm" className="logo logo-dark">
            <LogoBox />
          </Link>
          <Link to="/dashboard-crm" className="logo logo-light">
            <LogoBox light />
          </Link>
          <button
            onClick={addEventListenerOnSmHoverMenu}
            type="button"
            className="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover"
            id="vertical-hover"
          >
            <i className="ri-record-circle-line"></i>
          </button>
        </div>
        {layoutType === "horizontal" ? (
          <div id="scrollbar">
            <Container fluid>
              <div id="two-column-menu"></div>
              <ul className="navbar-nav" id="navbar-nav">
                <HorizontalLayout />
              </ul>
            </Container>
          </div>
        ) : layoutType === "twocolumn" ? (
          <React.Fragment>
            <TwoColumnLayout layoutType={layoutType} />
            <div className="sidebar-background"></div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <SimpleBar id="scrollbar" className="h-100">
              <Container fluid>
                <div id="two-column-menu"></div>
                <ul className="navbar-nav" id="navbar-nav">
                  <VerticalLayout layoutType={layoutType} />
                </ul>
              </Container>
            </SimpleBar>
            <div className="sidebar-background"></div>
          </React.Fragment>
        )}
      </div>
      <div className="vertical-overlay"></div>
    </React.Fragment>
  );
};

export default Sidebar;
