import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Switch, Card, Row, Col, Menu, Dropdown } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { Modal, Box, Typography, TextField, Button } from "@mui/material";
import {
  FiMenu, FiHome, FiFileText, FiSettings,
  FiCheckCircle, FiAlertTriangle, FiDollarSign
} from "react-icons/fi";
import axios from "axios";
import "../styles/Home.css";

const departments = [
  { name:  "Work Receiving Department", path: "/Departments/work-receiving-department" },
  { name:   "Survey Department", path:"/Departments/survey-department" },
  { name:   "Permission Department",path: "/Departments/permission-department" },
  { name:   "Safety Department", path: "/Departments/safety-department" },
  { name:   "Work Execution Department", path: "/Departments/work-execution-department" },
  { name:   "Permission Closing Department", path: "/Departments/permission-closing-department" },
  { name:   "Work Closing Department", path: "/Departments/work-closing-department" },
  { name:   "Drawing", path: "/Departments/drawing" },
  { name:   "GIS", path: "/Departments/gis" },
  { name:   "Store", path: "/Departments/store" },
];

const departmentCredentials = {
  "Work Receiving Department": { username: "workrecieving", password: "wr1" },
  "Survey Department": { username: "survey", password: "s2" },
  "Permission Department": { username: "permission", password: "p3" },
  "Safety Department": { username: "safety", password: "sf4" },
  "Work Execution Department": { username: "workexe", password: "we5" },
  "Permission Closing Department": { username: "pclosing", password: "pc6" },
  "Work Closing Department": { username: "wclosing", password: "wc7" },
  "Drawing": { username: "drawing", password: "d" },
  "GIS": { username: "gis", password: "g" },
  "Store": { username: "store", password: "s" },
};

const Home = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [stats, setStats] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(
          "https://constructionproject-production.up.railway.app/api/stats"
        );
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching stats", error);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    document.body.className = darkMode ? "dark-mode" : "";
  }, [darkMode]);

  const handleDepartmentClick = (departmentName) => {
    setSelectedDepartment(departmentName);
    setShowModal(true);
    setUsername("");
    setPassword("");
    setErrorMessage("");
  };

  const handleCredentialSubmit = (event) => {
    event.preventDefault();
    const credentials = departmentCredentials[selectedDepartment];

    if (credentials && username === credentials.username && password === credentials.password) {
      alert(`Welcome to the ${selectedDepartment}`);
      const department = departments.find(d => d.name === selectedDepartment);
      navigate(department?.path || "/");
      setShowModal(false);
    } else {
      setErrorMessage("Incorrect username or password. Please try again.");
    }
  };

  const departmentMenu = (
    <Menu>
      {departments.map((dept, index) => (
        <Menu.Item key={index} onClick={() => handleDepartmentClick(dept.name)}>
          {dept.name}
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <>
      <div className={`home-container ${darkMode ? "dark" : "light"}`}>
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <div className="logo">
            <h2>🚧 Admin</h2>
            <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FiMenu />
            </button>
          </div>
          <nav className="nav-links">
            <p onClick={() => navigate("/")}>
              <FiHome /> Home
            </p>
            <Dropdown overlay={departmentMenu} placement="bottomLeft" arrow>
              <p style={{ cursor: "pointer" }}>
                <FiFileText /> Departments <DownOutlined />
              </p>
            </Dropdown>
            <p onClick={() => navigate("/management")}>
              <FiSettings /> Management
            </p>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="main-content">
          {/* Header */}
          <header className="home-header">
            <div>
              <h1>🏗️ Mansour Al Mosaid Group</h1>
              <p>“Building the Future with Excellence”</p>
            </div>
            <div className="mode-switch">
              <span>{darkMode ? "🌙" : "☀️"}</span>
              <Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
            </div>
          </header>

          {/* Welcome Banner */}
          <div className="welcome-banner">
            <h2>Welcome back, Admin 👋</h2>
            <p>Here's a quick look at your operations today.</p>
          </div>

          {/* Dashboard Overview */}
          <section className="overview">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Card className="status-card success" bordered={false}>
                  <FiCheckCircle size={30} />
                  <h3>{stats.projectsCompleted} Projects Completed</h3>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="status-card warning" bordered={false}>
                  <FiAlertTriangle size={30} />
                  <h3>{stats.ongoingEmergencies} Ongoing Emergencies</h3>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="status-card finance" bordered={false}>
                  <FiDollarSign size={30} />
                  <h3>${stats.budget} Budget</h3>
                </Card>
              </Col>
            </Row>
          </section>

          {/* Footer */}
          <footer className="home-footer">
            <div className="footer-content">
              <p>
                © 2025 <strong>Mansour Al Mosaid Group</strong>. All Rights Reserved.
              </p>
            </div>
          </footer>
        </div>
      </div>

      {/* Modal for credentials */}
      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            padding: 4,
            borderRadius: 2,
            boxShadow: 3,
            width: 350
          }}
        >
          <Typography variant="h5" sx={{ textAlign: "center", marginBottom: 3 }}>
            Enter Credentials for {selectedDepartment}
          </Typography>
          <form onSubmit={handleCredentialSubmit}>
            <TextField
              label="Username"
              variant="outlined"
              fullWidth
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ marginBottom: 2 }}
            />
            <TextField
              label="Password"
              variant="outlined"
              fullWidth
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ marginBottom: 2 }}
            />
            {errorMessage && (
              <Typography color="error" variant="body2" sx={{ textAlign: "center" }}>
                {errorMessage}
              </Typography>
            )}
            <Box display="flex" justifyContent="space-between" mt={2}>
              <Button type="submit" variant="contained" color="primary" fullWidth>
                Submit
              </Button>
              <Button
                type="button"
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={() => setShowModal(false)}
                sx={{ ml: 2 }}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>
    </>
  );
};

export default Home;
