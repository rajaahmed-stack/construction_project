import React from "react";
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar } from "@mui/material";
import { Home, Business, Assessment, AccountCircle } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const navigate = useNavigate();

  const menuItems = [
    { text: "Home", icon: <Home />, route: "/" },
    { text: "Departments", icon: <Business />, route: "/departments" },
    { text: "Management", icon: <AccountCircle />, route: "/management" },
    { text: "Reports", icon: <Assessment />, route: "/reports" },
  ];

  return (
    <Drawer variant="permanent" sx={{ width: 240, flexShrink: 0 }}>
      <Toolbar />
      <List>
        {menuItems.map(({ text, icon, route }, index) => (
          <ListItem key={index} disablePadding>
            <ListItemButton onClick={() => navigate(route)}>
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
