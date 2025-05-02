import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext"; // 👈 import the auth context
import axios from "axios"; // Import axios for API calls

const PasswordGate = () => {
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // Username state
  const { login } = useAuth(); // 👈 use login function
  const navigate = useNavigate();
  
  const correctPassword = "admin123";
  // const correctUsername = "admin"; // Admin username

  // Handle login logic
  const handleLogin = async (e) => {
    e.preventDefault();

    // Check if the credentials are for admin
    if ( password === correctPassword) {
      login();
      navigate('/home'); // Navigate to home page if admin
    } else {
      // If not admin, check from users database
      try {
        const response = await axios.get(`https://constructionproject-production.up.railway.app/api/users`);
        const users = response.data;

        // Find matching user by username and password
        const user = users.find((user) =>  user.password === password);
        
        if (user) {
          // If user is found, navigate to their respective department page
          alert(`Welcome to the ${user.username}'s Department`);
          navigate(`/Departments/${user.username.toLowerCase()}`);
        } else {
          alert("❌ Incorrect username or password. Please try again.");
        }
      } catch (error) {
        console.error("Error fetching users", error);
        alert("Error checking credentials. Please try again.");
      }
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #74ebd5, #ACB6E5)",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: "40px",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: "360px",
          textAlign: "center",
          animation: "fadeIn 0.8s ease-in-out",
        }}
      >
        <h2 style={{ marginBottom: "20px", color: "#333" }}>Welcome To MMC File Management System</h2>
        <h2 style={{ marginBottom: "20px", color: "#333" }}>🔐 Secure Access</h2>

        <form onSubmit={handleLogin}>
          {/* <input
            type="text"
            placeholder="Enter username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "16px",
              marginBottom: "20px",
              outline: "none",
            }}
          /> */}
          <input
            type="password"
            placeholder="Enter password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              fontSize: "16px",
              marginBottom: "20px",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer",
              transition: "background-color 0.3s",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#45a049")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#4CAF50")}
          >
            🔓 Unlock
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordGate;
