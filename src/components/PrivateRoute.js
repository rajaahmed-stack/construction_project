// components/PrivateRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext"; // ✅ use the context

const PrivateRoute = ({ element }) => {
  const { isAuthenticated } = useAuth(); // ✅ proper usage

  return isAuthenticated ? element : <Navigate to="/" replace />;
};

export default PrivateRoute;
