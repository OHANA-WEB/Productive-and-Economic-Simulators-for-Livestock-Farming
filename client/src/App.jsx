import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Module1Production from './components/modules/Module1Production';
import Module2Transformation from './components/modules/Module2Transformation';
import Module3Lactation from './components/modules/Module3Lactation';
import Module4Yield from './components/modules/Module4Yield';
import Module5Summary from './components/modules/Module5Summary';
import { getAuthToken, setAuthToken, removeAuthToken } from './utils/auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      // In a real app, verify token with backend
      setUser({ token });
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    setAuthToken(token);
    setUser({ ...userData, token });
  };

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
  };

  if (loading) {
    return <div className="container">Cargando...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
          }
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/module1"
          element={
            user ? (
              <Module1Production user={user} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/module2"
          element={
            user ? (
              <Module2Transformation user={user} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/module3"
          element={
            user ? (
              <Module3Lactation user={user} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/module4"
          element={
            user ? (
              <Module4Yield user={user} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/module5"
          element={
            user ? (
              <Module5Summary user={user} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
