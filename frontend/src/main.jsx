import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ToastContainer } from "react-toastify";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthContext";
import { GuideModeProvider } from "./contexts/GuideModeContext";
import ToastErrorBoundary from "./components/ToastErrorBoundary";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <GuideModeProvider>
            <App />
            <ToastErrorBoundary>
              <ToastContainer
                position="bottom-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
                enableMultiContainer={false}
                limit={5}
                toastStyle={{
                  background: "rgba(30, 45, 60, 0.95)",
                  border: "1px solid #f1c40f",
                  color: "#fff",
                }}
              />
            </ToastErrorBoundary>
          </GuideModeProvider>
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
