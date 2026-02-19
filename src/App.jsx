import { BrowserRouter, Routes, Route } from "react-router-dom";
import ManagePage from "./pages/ManagePage";
import SettlementPage from "./pages/SettlementPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/manage" element={<ManagePage />} />
        <Route path="/settlement" element={<SettlementPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
