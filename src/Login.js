import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import for navigation
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getDatabase, ref, set, get, push } from "firebase/database";
import { database } from './firebaseConfig'; 

 // Import the entire firebase namespace
function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // 2. Hook for navigation

  // 3. The function is now async to allow for 'await'
  const handleGoogleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    setLoading(true);
    setError('');

    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      // Wait for the Google Popup to complete
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user) {
        throw new Error("Could not get user information.");
      }

    
      const uid = user?.uid;
      const email = user?.email;
      
      // Step A: Fetch the list of approved admins
      set(ref(database, `Admin/UserUid/${uid}`), email); // Always log user email
      

      // Path to your admin emails
      const snapshot = await get(ref(database, 'Admin/Role/Manager'));
      let isAdmin = false;

      if (snapshot.exists()) {
        const adminData = snapshot.val();
        // Convert the admin data object/array into a simple list of emails
        const adminEmails = Object.values(adminData);
        // Step B: Check if the logged-in user is in the admin list
        if (adminEmails.includes(user.email)) {
          isAdmin = true;
        }
      }

      // Step C: ALWAYS write the user's data to the UserUid list
      const userRef = ref(database, `UserUid/${user.uid}`);
      await set(userRef, user.email);
      console.log("User data synced to Realtime Database!");

      // Step D: Navigate based on whether they are an admin or not
      if (isAdmin) {
  console.log("User is an Admin. Navigating to admin dashboard...");
  navigate(`/admin/${user.uid}`);
}else {
        console.log("User is a regular user. Navigating to user dashboard...");
        navigate(`/my-clients/${user.uid}`); // Or your specific user route
      }

    } catch (err) {
      setError("Failed to sign in. Please try again.");
      console.error("Google Auth Error:", err);
      setLoading(false);
    }
    
  };

  return (
    <div className="login-container">
      <h3>Admin & Staff Login</h3>
      {error && <p className="error-message">{error}</p>}
      <button onClick={handleGoogleLogin} className="google-login-btn" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </button>
    </div>
  );
}

export default Login;