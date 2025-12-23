import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Fetch user on mount
    fetch('/api/current_user')
      .then(res => res.json())
      .then(data => {
        // data will be empty string or object. If object and googleId, it's user.
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setUser(data);
        } else {
          setUser(null);
        }
      })
      .catch(err => {
        console.error("Error fetching user:", err);
        setUser(null);
      });
  }, []);

  const handleLogin = () => {
    // Redirect to backend auth route
    window.location.href = 'http://localhost:5000/auth/google';
  };

  const handleLogout = () => {
    window.location.href = 'http://localhost:5000/api/logout';
  };

  return (
    <div className="app-container">
      <header>
        <h1>Google Auth Integration</h1>
      </header>
      <main>
        {user ? (
          <div className="profile-card">
            <h2>Welcome Back!</h2>
            <div className="profile-info">
              <p><strong>Name:</strong> {user.displayName}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>ID:</strong> {user.googleId}</p>
            </div>
            <button className="btn logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <div className="login-card">
            <h2>Please Sign In</h2>
            <p>Access your profile by logging in with Google.</p>
            <button className="btn login-btn" onClick={handleLogin}>Sign in with Google</button>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
