// import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainApp from "./mainPage.tsx";
import RoadshowQO from "./RoadshowQO.tsx";
import NewPage  from "./newPage.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/roadshowQO" element={<RoadshowQO />} />
        <Route path="/newPage" element={<NewPage />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;