import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Switch, Card, Row, Col } from "antd";
import { FiMenu, FiHome, FiFileText, FiSettings, FiBarChart2, FiUsers, FiCheckCircle, FiAlertTriangle, FiDollarSign } from "react-icons/fi";
import axios from "axios";
import "../styles/Home.css";

const Home = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [stats, setStats] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch real-time stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get("https://mmcmadina.com/api/stats");
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

  return (
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
          <p onClick={() => navigate("/")}><FiHome /> Home</p>
          <p onClick={() => navigate("/departments")}><FiFileText /> Departments</p>
          <p onClick={() => navigate("/management")}><FiSettings /> Management</p>
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

        {/* User Management Section */}
        {/* <section className="user-management">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card className="status-card" bordered={false} onClick={() => navigate("/users")}>
                <FiUsers size={30} />
                <h3>Manage Users</h3>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="status-card" bordered={false} onClick={() => navigate("/departments")}>
                <FiFileText size={30} />
                <h3>Manage Departments</h3>
              </Card>
            </Col>
          </Row>
        </section> */}

        {/* Footer */}
        <footer className="home-footer">
          <div className="footer-content">
            <p>© 2025 <strong>Mansour Al Mosaid Group</strong>. All Rights Reserved.</p>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default Home;
