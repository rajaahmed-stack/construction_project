import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import '../styles/CredentialForm.css';

const departmentCredentials = {
  "Work Receiving Department": "wr1",
  "Survey Department": "s2",
  "Permission Department": "p3",
  "Safety Department": "sf4",
  "Work Execution Department": "execution123",
  "Laboratory Department": "lab123",
  "Permission Closing Department": "permclose123",
  "Work Closing Department": "workclose123",
  "Drawing": "drawing123",
  "GIS": "gis123",
  "Store": "store123",
};

const CredentialForm = () => {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const department = params.get("department");

  const handleSubmit = () => {
    if (departmentCredentials[department] === password) {
      navigate(`/departments/${department.replace(/\s+/g, "-").toLowerCase()}`);
    } else {
      alert("Invalid credentials!");
    }
  };

  return (
    <div className="credential-form-container">
      <h2>{department}</h2>
      <input
        type="password"
        placeholder="Enter Department Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="credential-input"
      />
      <button onClick={handleSubmit} className="credential-button">
        Login
      </button>
    </div>
  );
};

export default CredentialForm;
