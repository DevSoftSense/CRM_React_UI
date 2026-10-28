import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * SoftOnCloud CRM sidebar only (mock Main menu).
 * Removed Velzon demos (Crypto, NFT, Ecommerce, demo CRM, etc.).
 * Integration apps (Book, Invoice, …) = SKIP — other SOC products.
 */
const Navdata = () => {
  const history = useNavigate();
  const [iscurrentState, setIscurrentState] = useState("CRM");

  useEffect(() => {
    document.body.classList.remove("twocolumn-panel");
  }, [history, iscurrentState]);

  const menuItems = [
    {
      label: "Main Menu",
      isHeader: true,
    },
    {
      id: "crm-dashboard",
      label: "Dashboard",
      icon: "ri-dashboard-2-line",
      link: "/dashboard-crm",
      click: function () {
        setIscurrentState("Dashboard");
      },
    },
    {
      id: "crm-leads",
      label: "Leads",
      icon: "ri-user-add-line",
      link: "/crm/leads",
      click: function () {
        setIscurrentState("Leads");
      },
    },
    {
      id: "crm-pipeline",
      label: "Pipeline",
      icon: "ri-kanban-view",
      link: "/crm/pipeline",
      click: function () {
        setIscurrentState("Pipeline");
      },
    },
    {
      id: "crm-customers",
      label: "Customers",
      icon: "ri-building-line",
      link: "/crm/customers",
      click: function () {
        setIscurrentState("Customers");
      },
    },
    {
      id: "crm-contacts",
      label: "Contacts",
      icon: "ri-contacts-line",
      link: "/crm/contacts",
      click: function () {
        setIscurrentState("Contacts");
      },
    },
    {
      id: "crm-opportunities",
      label: "Opportunities",
      icon: "ri-briefcase-4-line",
      link: "/crm/opportunities",
      click: function () {
        setIscurrentState("Opportunities");
      },
    },
    {
      id: "crm-activities",
      label: "Activities",
      icon: "ri-phone-line",
      link: "/crm/activities",
      click: function () {
        setIscurrentState("Activities");
      },
    },
    {
      id: "crm-calendar",
      label: "Calendar",
      icon: "ri-calendar-2-line",
      link: "/crm/calendar",
      click: function () {
        setIscurrentState("Calendar");
      },
    },
    {
      id: "crm-tasks",
      label: "Tasks",
      icon: "ri-task-line",
      link: "/crm/tasks",
      click: function () {
        setIscurrentState("Tasks");
      },
    },
    {
      id: "crm-documents",
      label: "Documents",
      icon: "ri-folder-2-line",
      link: "/crm/documents",
      click: function () {
        setIscurrentState("Documents");
      },
    },
    {
      id: "crm-reports",
      label: "Reports",
      icon: "ri-bar-chart-2-line",
      link: "/crm/reports",
      click: function () {
        setIscurrentState("Reports");
      },
    },
    {
      id: "crm-campaigns",
      label: "Campaigns",
      icon: "ri-megaphone-line",
      link: "/crm/campaigns",
      click: function () {
        setIscurrentState("Campaigns");
      },
    },
    {
      id: "crm-owners",
      label: "Owners",
      icon: "ri-user-star-line",
      link: "/crm/owners",
      click: function () {
        setIscurrentState("Owners");
      },
    },
    {
      id: "crm-settings",
      label: "Settings",
      icon: "ri-settings-3-line",
      link: "/crm/settings",
      click: function () {
        setIscurrentState("Settings");
      },
    },
  ];

  return <React.Fragment>{menuItems}</React.Fragment>;
};

export default Navdata;
