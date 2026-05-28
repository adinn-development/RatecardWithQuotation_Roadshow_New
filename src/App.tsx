/* eslint-disable */
// @ts-nocheck


import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import MainApp from "./mainPage.tsx";
import RoadshowQO from "./RoadshowQO.tsx";
import NewPage from "./newPage.tsx";
import RoadshowQuotationList from "./RoadshowQuotationList.tsx";

function AdminQuickAccess() {
  
  const [showQuickAccess, setShowQuickAccess] = useState(false);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) return;

      const clickableElement = target.closest(
        "button, a, [role='button'], input[type='button'], input[type='submit']",
      ) as HTMLElement | null;

      if (!clickableElement) return;

      const text = (
        clickableElement.innerText ||
        clickableElement.textContent ||
        clickableElement.getAttribute("value") ||
        clickableElement.getAttribute("aria-label") ||
        ""
      )
        .trim()
        .toLowerCase();

      const isLoginClick =
        text === "login" ||
        text === "log in" ||
        text.includes("login") ||
        text.includes("log in") ||
        clickableElement.id?.toLowerCase().includes("login") ||
        clickableElement.className?.toString().toLowerCase().includes("login");

      if (!isLoginClick) return;

     
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  if (!showQuickAccess) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: 99999,
        width: "230px",
        padding: "14px",
        borderRadius: "14px",
        background: "#ffffff",
        border: "1px solid rgba(15, 23, 42, 0.12)",
        boxShadow: "0 18px 45px rgba(15, 23, 42, 0.18)",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "10px",
          alignItems: "flex-start",
        }}
      >
        <div>
          <strong
            style={{
              display: "block",
              fontSize: "14px",
              color: "#111827",
              marginBottom: "4px",
            }}
          >
            Admin Access
          </strong>

          <span
            style={{
              display: "block",
              fontSize: "12px",
              lineHeight: 1.4,
              color: "#6b7280",
            }}
          >
            Roadshow quotation records
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowQuickAccess(false)}
          style={{
            width: "24px",
            height: "24px",
            border: "none",
            borderRadius: "999px",
            background: "#f3f4f6",
            color: "#4b5563",
            cursor: "pointer",
            lineHeight: "24px",
          }}
        >
          ×
        </button>
      </div>

      <Link
        to="/roadshow-quotations"
        style={{
          display: "block",
          marginTop: "12px",
          padding: "10px 12px",
          borderRadius: "10px",
          background: "#111827",
          color: "#ffffff",
          textDecoration: "none",
          fontSize: "13px",
          fontWeight: 700,
          textAlign: "center",
        }}
      >
        Show Quotations List
      </Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AdminQuickAccess />

      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/roadshowQO" element={<RoadshowQO />} />
        <Route path="/newPage" element={<NewPage />} />
        <Route path="/roadshow-quotations" element={<RoadshowQuotationList />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;