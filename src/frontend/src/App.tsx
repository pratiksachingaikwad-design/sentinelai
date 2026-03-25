import { useState } from "react";
import Layout from "./components/Layout";
import { Toaster } from "./components/ui/sonner";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import AddCriminalPage from "./pages/AddCriminalPage";
import AddMissingPage from "./pages/AddMissingPage";
import CriminalsPage from "./pages/CriminalsPage";
import DashboardPage from "./pages/DashboardPage";
import EvidencePage from "./pages/EvidencePage";
import LoginPage from "./pages/LoginPage";
import LogsPage from "./pages/LogsPage";
import MissingPage from "./pages/MissingPage";
import SurveillancePage from "./pages/SurveillancePage";

export type Page =
  | "dashboard"
  | "surveillance"
  | "criminals"
  | "criminals-new"
  | "missing"
  | "missing-new"
  | "logs"
  | "evidence";

export default function App() {
  const { identity } = useInternetIdentity();
  const [page, setPage] = useState<Page>("dashboard");

  if (!identity) {
    return (
      <>
        <Toaster position="top-right" />
        <LoginPage />
      </>
    );
  }

  function renderPage() {
    switch (page) {
      case "dashboard":
        return <DashboardPage navigate={setPage} />;
      case "surveillance":
        return <SurveillancePage />;
      case "criminals":
        return <CriminalsPage navigate={setPage} />;
      case "criminals-new":
        return <AddCriminalPage navigate={setPage} />;
      case "missing":
        return <MissingPage navigate={setPage} />;
      case "missing-new":
        return <AddMissingPage navigate={setPage} />;
      case "logs":
        return <LogsPage />;
      case "evidence":
        return <EvidencePage />;
      default:
        return <DashboardPage navigate={setPage} />;
    }
  }

  return (
    <>
      <Toaster position="top-right" />
      <Layout page={page} navigate={setPage}>
        {renderPage()}
      </Layout>
    </>
  );
}
