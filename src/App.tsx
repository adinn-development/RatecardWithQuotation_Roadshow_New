// import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainApp from "./mainPage.tsx";
import RoadshowQO from "./RoadshowQO.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/roadshowQO" element={<RoadshowQO />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;