"use client";

import { Toaster } from "react-hot-toast";

// Values mirror the tokens in app/globals.css (react-hot-toast needs literal colors).
export function ToasterProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#fffffd",
          color: "#3c161c",
          border: "1px solid #f3dbd7",
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(60, 22, 28, 0.12)",
          fontSize: "14px",
        },
        success: { iconTheme: { primary: "#c8404f", secondary: "#fffdfa" } },
        error: { duration: 6000, iconTheme: { primary: "#b3261e", secondary: "#fffdfa" } },
      }}
    />
  );
}
