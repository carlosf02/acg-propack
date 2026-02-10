
import { Routes, Route, Link } from 'react-router-dom';
import BackendConnected from './pages/BackendConnected';

export default function App() {
  return (
    <div>
      <nav style={{ padding: '10px', background: '#eee', marginBottom: '20px' }}>
        <Link to="/" style={{ marginRight: '10px' }}>Home</Link>
        <Link to="/backend-connected">Backend Connected</Link>
      </nav>

      <Routes>
        <Route path="/" element={
          <div>
            <h1>AGC ProPack Frontend</h1>
            <p>Welcome to the ProPack application.</p>
          </div>
        } />
        <Route path="/backend-connected" element={<BackendConnected />} />
      </Routes>
    </div>
  );
}
