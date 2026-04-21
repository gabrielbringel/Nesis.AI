import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { router } from "@/router";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster
      position="top-right"
      toastOptions={{
        style: { fontSize: "0.875rem" },
        success: { iconTheme: { primary: "#2f9796", secondary: "#fff" } },
      }}
    />
  </React.StrictMode>,
);
