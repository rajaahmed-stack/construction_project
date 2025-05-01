import React, { useState } from "react";
import { Button, Box, Grid, Typography, Modal, TextField } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Lock as LockIcon } from "@mui/icons-material";

const departments = [
  "Work Receiving Department",
  "Survey Department",
  "Permission Department",
  "Safety Department",
  "Work Execution Department",
  "Permission Closing Department",
  "Work Closing Department",
  "Drawing",
  "GIS",
  "Store",
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

const DepartmentList = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleDepartmentClick = (department) => {
    setSelectedDepartment(department);
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

      const departmentPath = selectedDepartment.replace(/\s+/g, '-').toLowerCase();
      navigate(`/Departments/${departmentPath}`);

      setShowModal(false);
    } else {
      setErrorMessage("Incorrect username or password. Please try again.");
    }
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 600, textAlign: "center" }}>
        Select a Department
      </Typography>
      <Grid container spacing={2} justifyContent="center" sx={{ marginTop: 4 }}>
        {departments.map((dept, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              onClick={() => handleDepartmentClick(dept)}
              startIcon={<LockIcon />}
            >
              {dept}
            </Button>
          </Grid>
        ))}
      </Grid>

      {/* Modal for credential input */}
      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <Box sx={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          backgroundColor: 'white', 
          padding: 4, 
          borderRadius: 2,
          boxShadow: 3
        }}>
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
            {errorMessage && <Typography color="error" variant="body2" sx={{ textAlign: "center" }}>{errorMessage}</Typography>}
            <Box display="flex" justifyContent="space-between">
              <Button type="submit" variant="contained" color="primary" fullWidth>
                Submit
              </Button>
              <Button
                type="button"
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
            </Box>
          </form>
        </Box>
      </Modal>
    </Box>
  );
};

export default DepartmentList;
