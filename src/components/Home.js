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
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { useTranslation } from "react-i18next";


const departments = [
  { name:  "Work Receiving Department", path: "/Departments/work-receiving-department" },
  { name:  "Emergency & Maintainence", path: "/Departments/EmergencyMaintainence" },
  { name:   "Survey Department", path:"/Departments/survey-department" },
  { name:   "Permission Department",path: "/Departments/permission-department" },
  { name:   "Safety Department", path: "/Departments/safety-department" },
  { name:   "Work Execution Department", path: "/Departments/work-execution-department" },
  { name:   "Laboratory", path: "/Departments/Laboratory" },
  { name:   "Permission Closing Department", path: "/Departments/permission-closing-department" },
  { name:   "Work Closing Department", path: "/Departments/work-closing-department" },
  { name:   "Invoice", path: "/Departments/Invoice" },
  { name:   "Drawing", path: "/Departments/drawing" },
  { name:   "GIS", path: "/Departments/gis" },
  { name:   "Store", path: "/Departments/store" },
];

const departmentCredentials = {
  "Work Receiving Department": { username: "workrecieving", password: "wr1" },
  "Emergency & Maintainence": { username: "em", password: "em" },
  "Survey Department": { username: "survey", password: "s2" },
  "Permission Department": { username: "permission", password: "p3" },
  "Safety Department": { username: "safety", password: "sf4" },
  "Work Execution Department": { username: "workexe", password: "we5" },
  "Invoice": { username: "in", password: "i" },
  "Laboratory": { username: "lab", password: "l" },
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
  const [recentOrders, setRecentOrders] = useState([
    { title: "Install New Transformer", department: "Work Execution Department", status: "Completed" },
    { title: "Cable Replacement", department: "Survey Department", status: "Pending" },
    { title: "Safety Inspection", department: "Safety Department", status: "Ongoing" }
  ]);
  const [chartData, setChartData] = useState([
    { name: "Work Receiving", projects: 15 },
    { name: "Survey", projects: 10 },
    { name: "Execution", projects: 20 },
  ]);
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    document.body.dir = lng === 'ar' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [statsRes, ordersRes, chartStatsRes, usersRes] = await Promise.all([
          axios.get("https://constructionproject-production.up.railway.app/api/stats"),
          axios.get("https://constructionproject-production.up.railway.app/api/recent-work-orders"),
          axios.get("https://constructionproject-production.up.railway.app/api/chart-stats"),
          axios.get("https://constructionproject-production.up.railway.app/api/users"), // Optional if you want users
        ]);
  
        setStats(statsRes.data);
        setRecentOrders(ordersRes.data);
  
        const stats = chartStatsRes.data;
        const formattedChartData = [
          { name: "Work Receiving", projects: stats.work_receiving },
          { name: "Emergency & Maintainence", projects: stats.emergency_and_maintainence },
          { name: "Survey", projects: stats.survey },
          { name: "Permission", projects: stats.permissions },
          { name: "Safety", projects: stats.safety },
          { name: "Work Execution", projects: stats.work_execution },
          { name: "Laboratory", projects: stats.lab },
          { name: "Permission Closing", projects: stats.permission_closing },
          { name: "Work Closing", projects: stats.work_closing },
          { name: "Invoice", projects: stats.invoice },
          { name: "Drawing", projects: stats.drawing },
          { name: "GIS", projects: stats.gis },
          { name: "Store", projects: stats.store },
        ];
        setChartData(formattedChartData);
  
        // If you want to display users
        // setUsers(usersRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
  
    fetchAllData();
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
            <p onClick={() => navigate("/users")}>
              <FiSettings /> User Registration
            </p>
          </nav>
        </aside>

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
  <div className="welcome-left">
    <div className="emoji-circle">👋</div>
    <div className="welcome-text">
      <h1>Welcome back, Admin</h1>
      <p>Here's a summary of your site’s activities today.</p>
    </div>
  </div>
</div>

{/* Dashboard Overview */}
<section className="overview">
  <Row gutter={[16, 16]}>
    {[
      {
        title: "Projects Completed",
        value: stats.projectsCompleted,
        icon: <FiCheckCircle size={36} />,
      },
      {
        title: "Ongoing Emergencies",
        value: stats.ongoingEmergencies,
        icon: <FiAlertTriangle size={36} />,
      },
      {
        title: "Budget",
        value: `$${stats.budget}`,
        icon: <FiDollarSign size={36} />,
      },
    ].map((item, index) => (
      <Col xs={24} md={8} key={index}>
        <Card className="status-card" bordered={false}>
          <div className="card-content">
            <div className="card-text">
              <h4>{item.title}</h4>
              <h2>{item.value}</h2>
            </div>
            <div className="card-icon">{item.icon}</div>
          </div>
        </Card>
      </Col>
    ))}
  </Row>
</section>

{/* Recent Work Orders */}
<section className="recent-orders">
  <h2>📝 Recent Work Orders</h2>
  <table className="recent-orders-table">
    <thead>
      <tr>
        <th>Work Order #</th>
        <th>Job Type</th>
        <th>Sub Section</th>
        <th>Receiving Date</th>
      </tr>
    </thead>
    <tbody>
      {recentOrders.map((order, idx) => (
        <tr key={idx}>
          <td>{order.work_order_id}</td>
          <td>{order.job_type}</td>
          <td>{order.sub_section}</td>
          <td>{new Date(order.receiving_date).toLocaleDateString()}</td>
        </tr>
      ))}
    </tbody>
  </table>
</section>


{/* Charts Section */}
<section className="dashboard-charts">
  <h2>📊 Department Stats Overview</h2>
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={chartData}>
      <XAxis dataKey="name" />
      <Tooltip />
      <Bar dataKey="projects" fill="#3b82f6" />
    </BarChart>
  </ResponsiveContainer>
</section>

{/* Footer */}
<footer className="home-footer">
  <p>© 2025 <strong>Mansour Al Mosaid Group</strong>. All Rights Reserved.</p>
</footer>
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
      </div>
    </>
  );
};

export default Home;
