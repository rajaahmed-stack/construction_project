// components/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem("auth"); // or whatever auth check you use
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
