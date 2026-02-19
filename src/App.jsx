import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ManagePage from "./pages/ManagePage";
import SettlementPage from "./pages/SettlementPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/settlement" replace />} />
        <Route path="/manage" element={<ManagePage />} />
        <Route path="/settlement" element={<SettlementPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
