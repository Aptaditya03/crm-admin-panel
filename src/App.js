import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { ref, onValue } from "firebase/database"; // Import 'onValue'
import { database } from './firebaseConfig'; // Import database
import AddConcern from './AddConcern';
import EmailPage from './EmailPage'; 
import AdminDashboard from './AdminDashboard';
import Login from './Login';
import MyClients from './MyClients';
import AddClient from './AddClient';
import './App.css';
import TemplateManager from './TemplateManager';
 // <-- Import the new component

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [superAdmins, setSuperAdmins] = useState([]); // NEW: State to hold the list of admin emails

  // This effect runs once to fetch the list of Super Admins from the database
  useEffect(() => {
    const managerRef = ref(database, 'Admin/Role/Manager');
    onValue(managerRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Get all the email addresses from the Manager node
            const adminEmails = Object.values(data);
            setSuperAdmins(adminEmails);
        }
    });
  }, []);

  // This effect checks for the currently logged-in user
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(getAuth());
  };

  if (isLoading) {
    return <div className="loading-container">Loading Application...</div>;
  }

  // UPDATED: Check if the logged-in user's email is in the list of superAdmins we fetched
  const isSuperAdmin = user && superAdmins.includes(user.email);

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h2>Client Relationship Management</h2>
          {user && (
            <nav>
              {isSuperAdmin ? (
                <>
                   <Link to={`/admin/${user.uid}`}>Admin Dashboard</Link>
                  <Link to="/add-client">Add Client</Link>
                  <Link to="/templates">Manage Templates</Link>
                </>
              ) : (
                <Link to={`/my-clients/${user.uid}`}>My Clients</Link>
              )}
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </nav>
          )}
        </header>
        <main>
          <Routes>
            {/* The routing logic remains the same, but it's now powered by the dynamic isSuperAdmin check */}
            {!user ? (
              <>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" />} />
              </>
            ) : isSuperAdmin ? (
              <>
                // The ':uid' is a URL parameter that can now be accessed by the component
                <Route path="/admin/:uid" element={<AdminDashboard />} />
                <Route path="/templates" element={<TemplateManager />} />
                <Route path="/add-concern/:clientId" element={<AddConcern />} />
                <Route path="/add-client" element={<AddClient />} />
                <Route path="/email" element={<EmailPage />} />
                <Route path="*" element={<Navigate to={`/admin/${user.uid}`} />} />
              </>
            ) : (
              <>
                 <Route path="/my-clients/:uid" element={<MyClients />} />
                <Route path="/add-concern/:clientId" element={<AddConcern />} />
                <Route path="/email" element={<EmailPage />} />
                <Route path="*" element={<Navigate to={`/my-clients/${user.uid}`} />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;