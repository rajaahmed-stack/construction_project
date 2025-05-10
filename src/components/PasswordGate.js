import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import axios from "axios";
const departments = [
  { name:  "Work Receiving", path: "/Departments/work-receiving-department" },
  { name:   "Survey", path:"/Departments/survey-department" },
  { name:   "Permission",path: "/Departments/permission-department" },
  { name:   "Safety", path: "/Departments/safety-department" },
  { name:   "Work Execution", path: "/Departments/work-execution-department" },
  { name:   "Permission Closing", path: "/Departments/permission-closing-department" },
  { name:   "Work Closing ", path: "/Departments/work-closing-department" },
  { name:   "Drawing", path: "/Departments/drawing" },
  { name:   "GIS", path: "/Departments/gis" },
  { name:   "Store", path: "/Departments/store" },
];
const PasswordGate = () => {
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    // Admin check
    if (username === "admin" && password === "admin123") {
      login();
      navigate("/Home");
      return;
    }

    // Check user credentials from database
    try {
      const response = await axios.get(`https://constructionproject-production.up.railway.app/api/users`);
      const users = response.data;

      const user = users.find((user) => user.department === username && user.password === password);

      if (user) {
        login(); // optional: depending if you want to consider all logged-in users
        alert(`Welcome to the ${user.department}'s Department`);
        navigate(`/Departments/${user.department.toLowerCase()}`);
      } else {
        alert("❌ Incorrect username or password. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching users", error);
      alert("⚠️ Error checking credentials. Please try again.");
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
          <input
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
          />
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
