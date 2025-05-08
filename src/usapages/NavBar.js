import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Grid,
  Box,
  Card,
  CardContent,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { motion } from "framer-motion";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import "../styles/navbar.css";

const NavBar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleDropdownClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleDropdownClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box>
      {/* Header */}
      <AppBar
        position="static"
        sx={{
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
        }}
      >
        <Toolbar>
          <Typography
            variant="h5"
            sx={{
              flexGrow: 1,
              fontWeight: "bold",
              background: "linear-gradient(to right, #00f2fe, #4facfe)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: 1,
            }}
          >
            AI Work Management
          </Typography>

          <Button color="inherit">Home</Button>

          {/* Dropdown for Products */}
          <Button
            color="inherit"
            endIcon={<ExpandMoreIcon />}
            onClick={handleDropdownClick}
          >
            Products
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleDropdownClose}
            MenuListProps={{ onMouseLeave: handleDropdownClose }}
            PaperProps={{
              sx: {
                backgroundColor: "#1a237e",
                color: "white",
              },
            }}
          >
            {["Hospitals", "Construction", "Media", "Marketing", "HR"].map(
              (item, i) => (
                <MenuItem key={i} onClick={handleDropdownClose}>
                  {item}
                </MenuItem>
              )
            )}
          </Menu>

          <Button color="inherit">Team</Button>
          <Button color="inherit">Contact</Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          height: "100vh",
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8)), url('https://source.unsplash.com/1600x900/?technology,ai')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          textAlign: "center",
          px: 2,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <Typography variant="h2" sx={{ fontWeight: "bold", mb: 3 }}>
            Revolutionize Your Workflow
          </Typography>
          <Typography
            variant="h6"
            sx={{ mb: 4, maxWidth: 700, mx: "auto" }}
          >
            AI Work Management System delivers smart automation and powerful
            tools for diverse industries — including healthcare, construction,
            media, marketing, and HR — helping your teams focus on what truly
            matters.
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{
              background: "linear-gradient(to right, #00f2fe, #4facfe)",
              fontWeight: "bold",
              px: 4,
              py: 1.5,
              borderRadius: "30px",
              boxShadow: 3,
            }}
          >
            Explore Solutions
          </Button>
        </motion.div>
      </Box>

     {/* What We Offer */}
      <Box sx={{ py: 8, px: 2, backgroundColor: "#f5f5f5" }}>
        <Typography variant="h4" sx={{ textAlign: "center", fontWeight: "bold", mb: 4 }}>
          What Does a Company Need Help With?
        </Typography>
        <Grid container spacing={4}>
          {[
            { title: "Task Automation", img: "https://source.unsplash.com/400x300/?automation" },
            { title: "Project Coordination", img: "https://source.unsplash.com/400x300/?project,team" },
            { title: "Real-time Reporting", img: "https://source.unsplash.com/400x300/?data,report" },
            { title: "Cross-Department Sync", img: "https://source.unsplash.com/400x300/?collaboration" },
          ].map((item, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring" }}>
                <Card sx={{ boxShadow: 4 }}>
                  <img src={item.img} alt={item.title} style={{ width: "100%", height: 180, objectFit: "cover" }} />
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold">{item.title}</Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Products Section */}
      <Box sx={{ py: 8, px: 2 }}>
        <Typography variant="h4" sx={{ textAlign: "center", fontWeight: "bold", mb: 4 }}>
          Our Products
        </Typography>
        <Grid container spacing={4}>
          {[
            {
              title: "Hospital AI",
              description: "Smart scheduling, patient data management, and predictive health analytics.",
              img: "https://source.unsplash.com/400x300/?hospital,technology",
            },
            {
              title: "Construction AI",
              description: "Project monitoring, cost forecasting, and resource optimization.",
              img: "https://source.unsplash.com/400x300/?construction,ai",
            },
            {
              title: "Media AI",
              description: "Content generation, audience analysis, and campaign optimization.",
              img: "https://source.unsplash.com/400x300/?media,ai",
            },
            {
              title: "Marketing AI",
              description: "Lead generation, personalized ads, and engagement analysis.",
              img: "https://source.unsplash.com/400x300/?marketing,ai",
            },
            {
              title: "HR AI",
              description: "Automated hiring, performance tracking, and HR analytics.",
              img: "https://source.unsplash.com/400x300/?hr,technology",
            },
          ].map((item, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring" }}>
                <Card sx={{ height: "100%", boxShadow: 3 }}>
                  <img src={item.img} alt={item.title} style={{ width: "100%", height: 180, objectFit: "cover" }} />
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>{item.title}</Typography>
                    <Typography>{item.description}</Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Why Choose Us */}
      <Box sx={{ py: 8, px: 2, backgroundColor: "#f0f8ff" }}>
        <Typography variant="h4" sx={{ textAlign: "center", fontWeight: "bold", mb: 4 }}>
          Why Choose Us?
        </Typography>
        <Grid container spacing={4}>
          {[
            "Tailored AI solutions for each department",
            "Seamless integration with your workflow",
            "Expert team with deep domain knowledge",
            "Affordable and scalable technology",
          ].map((reason, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring" }}>
                <Card sx={{ textAlign: "center", padding: 3, boxShadow: 2 }}>
                  <Typography>{reason}</Typography>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Our Services */}
      <Box sx={{ py: 8, px: 2 }}>
        <Typography variant="h4" sx={{ textAlign: "center", fontWeight: "bold", mb: 4 }}>
          What Can Our Software Do?
        </Typography>
        <Grid container spacing={4}>
          {[
            "Automate repetitive tasks",
            "Generate insights from data",
            "Predict delays or risks",
            "Enable real-time collaboration",
          ].map((service, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card sx={{ textAlign: "center", padding: 3, boxShadow: 2 }}>
                <Typography>{service}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Role of AI */}
      <Box
        sx={{
          py: 8,
          px: 2,
          backgroundColor: "#000",
          color: "#fff",
          textAlign: "center",
          backgroundImage: "url('https://source.unsplash.com/1600x900/?artificialintelligence')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Box sx={{ backgroundColor: "rgba(0,0,0,0.7)", py: 6, px: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
            The Role of AI in Modern Workflows
          </Typography>
          <Typography sx={{ maxWidth: 800, mx: "auto", mb: 3 }}>
            Artificial Intelligence empowers businesses to do more with less — reducing errors, saving time, and making informed decisions faster. Our AI models adapt and learn with your data to maximize productivity.
          </Typography>
          <motion.img
            src="https://media.giphy.com/media/QBQb0Eom7PHhK/giphy.gif"
            alt="AI Animation"
            style={{ width: "200px", height: "200px" }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1 }}
          />
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          backgroundColor: "#1a237e",
          color: "white",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <Typography variant="body1">
          © {new Date().getFullYear()} AI Work Management System. All rights
          reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default NavBar;
