import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LogPage } from './pages/LogPage';
import { TimelinePage } from './pages/TimelinePage';
import { TrendsPage } from './pages/TrendsPage';
import { ManagePage } from './pages/ManagePage';
import { DataPage } from './pages/DataPage';
import { seedDefaultData } from './db';

function App() {
  useEffect(() => {
    seedDefaultData();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LogPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/manage" element={<ManagePage />} />
          <Route path="/data" element={<DataPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
