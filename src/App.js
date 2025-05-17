import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./components/AuthContext"; // 👈 Import your AuthContext
import PasswordGate from "./components/PasswordGate";
import DepartmentList from "./components/DepartmentList";
import CredentialForm from "./components/CredentialForm";
import WorkReceiving from "./Departments/WorkRecieving";
import Survey from "./Departments/Survey";
import Permission from "./Departments/Permission";
import SafetyDepartment from "./Departments/SafetyDepartment";
import DrawingDepartment from "./Departments/DrawingDepartment";
import WorkExecution from "./Departments/WorkExecution";
import PermissionClosing from "./Departments/PermissionClosing";
import WorkClosing from "./Departments/WorkClosing";
import GisDepartment from "./Departments/GisDepartment";
import Store from "./Departments/StoreDepartment";
import Invoice from "./Departments/Invoice";
import Laboratory from "./Departments/Laboratory";
import EmergencyMaintainence from "./Departments/EmergencyMaintainence";
import Management from "./components/Management";
import AIRecommendations from "./components/AIRecommendations";
import UserManagement from "./components/UserManagement";
import Home from "./components/Home";
// import NavBar from "../src/usapages/NavBar";

const App = () => (
  <AuthProvider> {/* 👈 Wrap everything inside AuthProvider */}
    <Router>
      <Routes>
        <Route path="/" element={<PasswordGate />} />
        {/* <Route path="/NavBar" element={<NavBar />} /> */}
        <Route path="/home" element={<Home />} />
        <Route path="/departments" element={<DepartmentList />} />
        <Route path="/management" element={<Management />} />
        <Route path="/AIRecommendations" element={<AIRecommendations />} />
        <Route path="/credentials" element={<CredentialForm />} />
        <Route path="/Departments/work-receiving-department" element={<WorkReceiving />} />
        <Route path="/Departments/survey-department" element={<Survey />} />
        <Route path="/Departments/permission-department" element={<Permission />} />
        <Route path="/Departments/safety-department" element={<SafetyDepartment />} />
        <Route path="/Departments/work-execution-department" element={<WorkExecution />} />
        <Route path="/Departments/permission-closing-department" element={<PermissionClosing />} />
        <Route path="/Departments/work-closing-department" element={<WorkClosing />} />
        <Route path="/Departments/drawing" element={<DrawingDepartment />} />
        <Route path="/Departments/gis" element={<GisDepartment />} />
        <Route path="/Departments/store" element={<Store />} />
        <Route path="/Departments/Invoice" element={<Invoice />} />
        <Route path="/Departments/Laboratory" element={<Laboratory />} />
        <Route path="/Departments/EmergencyMaintainence" element={<EmergencyMaintainence />} />
        <Route path="/users" element={<UserManagement />} />
      </Routes>
    </Router>
  </AuthProvider>
);

export default App;
