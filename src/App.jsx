// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import ManagePage from "./pages/ManagePage";
// import SettlementPage from "./pages/SettlementPage";

// function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/manage" element={<ManagePage />} />
//         <Route path="/settlement" element={<SettlementPage />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }

// export default App;

import { useEffect } from "react";
import { runAutoSettlement } from "./autoSettlement";

function App() {
  useEffect(() => {
    runAutoSettlement();
  }, []);

  return <div>자동 정산 테스트</div>;
}

export default App;
