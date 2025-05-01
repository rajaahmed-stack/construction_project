import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Box, Typography, Paper, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Modal, TextField } from "@mui/material";
import "../styles/permissionclosing.css";

const PermissionClosing = () => {
  const [upperData, setUpperData] = useState([]);
  const [lowerData, setLowerData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [alertData, setAlertData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    work_order_id: "",
    permission_number: "",
    Work_closing_certificate: null,
    work_closing_certificate_completed: false,
    final_closing_certificate: null,
    final_closing_certificate_completed: false,
    sadad_payment: "",
    closing_date: "",
    penalty_reason: "",
    penalty_amount: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [comingResponse, permissionResponse] = await Promise.all([
          axios.get("https://mmcmadina.com/api/permission-closing/permissionclosing-coming"),
          axios.get("https://mmcmadina.com/api/permission-closing/PermissionClosing-data"),
        ]);

        const today = new Date();

        const updatedData = permissionResponse.data.map((record) => {
          if (record.pc_created_at && record.workexe_created_at) {
            const workCreatedAt = new Date(record.workexe_created_at);
            const surveyCreatedAt = new Date(record.pc_created_at);
            const deadline = new Date(workCreatedAt);
            deadline.setDate(deadline.getDate() + 2);

            let statusColor = "";
            let deliveryStatus = "On Time";

            if (surveyCreatedAt > deadline) {
              statusColor = "red";
              deliveryStatus = "Delayed";
            } else if (surveyCreatedAt < deadline) {
              statusColor = "green";
              deliveryStatus = "On Time";
            } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
              statusColor = "yellow";
              deliveryStatus = "Near Deadline";
            }

            return { ...record, deadline, statusColor, delivery_status: deliveryStatus };
          }
          return record;
        });

        setLowerData(updatedData);
        setUpperData(comingResponse.data || []);

        // Filter alerts for work orders nearing or past deadlines
        const urgentOrders = updatedData.filter((record) => record.statusColor !== "");
        setAlertData(urgentOrders);

        if (urgentOrders.length > 0) {
          const alertMessage = urgentOrders
            .map((order) => `Work Order: ${order.work_order_id || "N/A"}, Status: ${order.delivery_status}`)
            .join("\n");

          alert(`Warning: Some work orders are close to or past their deadline.\n\n${alertMessage}`);
        }
      } catch (error) {
        console.error("Error fetching survey data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddData = (record) => {
    setFormData({
      ...formData,
      work_order_id: record.work_order_id,
      permission_number: record.permission_number,
    });
    setShowForm(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      alert('Please select a file.');
      return;
    }

    // Ensure both certificates are set separately
    if (e.target.name === 'Work_closing_certificate') {
      setFormData((prevData) => ({
        ...prevData,
        Work_closing_certificate: file,
      }));
    } else if (e.target.name === 'final_closing_certificate') {
      setFormData((prevData) => ({
        ...prevData,
        final_closing_certificate: file,
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.Work_closing_certificate || !formData.final_closing_certificate) {
      alert('Please select both files to upload.');
      return;
    }

    try {
      const formDataWithFile = new FormData();
      formDataWithFile.append('Work_closing_certificate', formData.Work_closing_certificate);
      formDataWithFile.append('final_closing_certificate', formData.final_closing_certificate);
      formDataWithFile.append('work_order_id', formData.work_order_id);
      formDataWithFile.append('permission_number', formData.permission_number);
      formDataWithFile.append('closing_date', formData.closing_date);
      formDataWithFile.append('penalty_reason', formData.penalty_reason);
      formDataWithFile.append('penalty_amount', formData.penalty_amount);

      const today = new Date();
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 2);

      let deliveryStatus = 'on time';
      if (today > deadline) {
        deliveryStatus = 'delayed';
      } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
        deliveryStatus = 'nearing deadline';
      }
      const updatedFormData = { ...formData, delivery_status: deliveryStatus };

      const response = await axios.post(
        'https://mmcmadina.com/api/permission-closing/upload-and-save-pcdocument',
        formDataWithFile,
        { headers: { 'Content-Type': 'multipart/form-data' }, updatedFormData }
      );

      if (response.data.success) {
        alert('File uploaded and data saved successfully');
        setShowForm(false);
        setFormData({
          work_order_id: "",
          permission_number: "",
          Work_closing_certificate: null,
          work_closing_certificate_completed: false,
          final_closing_certificate: null,
          final_closing_certificate_completed: false,
          closing_date: "",
          penalty_reason: "",
          penalty_amount: "",
        });

        // Refresh data
        const [comingResponse, permissionResponse] = await Promise.all([
          axios.get("https://mmcmadina.com/api/permission-closing/permissionclosing-coming"),
          axios.get("https://mmcmadina.com/api/permission-closing/PermissionClosing-data"),
        ]);
        setUpperData(comingResponse.data || []);
        setLowerData(permissionResponse.data || []);
      } else {
        alert('Failed to upload the file');
      }

    } catch (error) {
      console.error('Error uploading file and saving data:', error);
      alert('Failed to upload file and save data. Please try again.');
    }
  };

  
  
  
  // Update Remaining Days Automatically
  useEffect(() => {
    const updateRemainingDays = () => {
      const today = new Date();
      const updatedData = lowerData.map((record) => {
        const endDate = new Date(record.end_date);
        const remainingDays = Math.max(
          Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)),
          0
        );
        return { ...record, remaining_days: remainingDays };
      });
      setLowerData(updatedData);
    };

    const interval = setInterval(updateRemainingDays, 24 * 60 * 60 * 1000); // Update every day
    updateRemainingDays(); // Initial calculation

    return () => clearInterval(interval); // Cleanup interval
  }, [lowerData]);



  const handleSaveData = async (e) => {
    e.preventDefault();
    try {
      await axios.post("https://mmcmadina.com/api/permission-closing/save-permission_closing", formData);
      setShowForm(false);
      setFormData({
        work_order_id: "",
        permission_number: "",
        closing_date: "",
        penalty_reason: "",
        penalty_amount: "",
      });

      const [comingResponse, permissionResponse] = await Promise.all([
        axios.get("https://mmcmadina.com/api/permission-closing/permissionclosing-coming"),
        axios.get("https://mmcmadina.com/api/permission-closing/PermissionClosing-data"),
      ]);
      setUpperData(comingResponse.data || []);
      setLowerData(permissionResponse.data || []);
    } catch (error) {
      console.error("Error saving permission data:", error);
    }
  };
  

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      const updatedData = { ...prevData, [name]: value };
      if (name === "end_date" && updatedData.start_date) {
        const startDate = new Date(updatedData.start_date);
        const endDate = new Date(value);
        const remainingDays = Math.ceil(
          (endDate - startDate) / (1000 * 60 * 60 * 24)
        );
        updatedData.remaining_days = remainingDays > 0 ? remainingDays : 0;
      }
      return updatedData;
    });
  };
  
  const handleSendToNext = async (workOrderId) => {
    try {
      await axios.post("https://mmcmadina.com/api/permission-closing/update-pcdepartment", {
        workOrderId,
      });
      alert("Work Order moved to work Closing department.");
    } catch (error) {
      console.error("Error updating department:", error);
    }
  };

  return (
  
    <Container className="survey-container">
    <Box className="survey-header">
      <Typography variant="h3" color="primary">Welcome to the Permission Closing Department</Typography>

      {/* Upper Section: Displaying Incoming Permission Data */}
      <Box className="survey-data-box" sx={{ padding: 2 }}>
        <Paper className="survey-paper">
          <Typography variant="h5">Load Incoming Permission Closing Data</Typography>
          {upperData.length === 0 ? (
            <Typography>No incoming permission  closing data available.</Typography>
          ) : (
            upperData.map((record) => (
              <Box key={record.work_order_id} sx={{ marginBottom: 2 }}>
                <Typography><strong>Work Order:</strong> {record.work_order_id}</Typography>
                <Typography><strong>Job Type:</strong> {record.job_type}</Typography>
                <Typography><strong>Sub Section:</strong> {record.sub_section}</Typography>
                <Typography><strong>Permission No.:</strong> {record.permission_number}</Typography>
                <Typography>
                      {(record.file_path || record.survey_file_path) ? (
                        <a href={`https://mmcmadina.com/api/permission-closing/permissionclosing_download/${record.work_order_id}`} download>
                          ✅ 📂 Download
                        </a>
                      ) : (
                        "❌ No File"
                      )}
                    </Typography>
                <Button onClick={() => handleAddData(record)} variant="contained" color="success">
                  Add Data
                </Button>
              </Box>
            ))
          )}
        </Paper>

        {/* Lower Section: Displaying Permission Data */}
        <Paper className="survey-paper">
          <Typography variant="h5">Load Permission Closing Data</Typography>
          {lowerData.length === 0 ? (
            <Typography>No permission Closing data available.</Typography>
          ) : (
            <TableContainer className="survey-table-container">
              <Table className="survey-table">
                <TableHead>
                  <TableRow>
                    {['Work Order ID', 'Job Type', 'Sub Section', 'Permission Number','Closing Date', 'Penalty Reason', 'Penalty Amount', 'Work Closing Certificate', 'Final Closing Certificate'].map((header) => (
                      <TableCell key={header} className="survey-table-header">
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowerData.map((record) => (
                    <TableRow key={record.work_order_id}>
                      <TableCell>{record.work_order_id}</TableCell>
                      <TableCell>{record.job_type}</TableCell>
                      <TableCell>{record.sub_section}</TableCell>
                      <TableCell>{record.permission_number}</TableCell>
                      <TableCell>{new Date(record.closing_date).toLocaleDateString()}</TableCell>
                      <TableCell>{record.penalty_reason}</TableCell>
                      <TableCell>{record.penalty_amount}</TableCell>
                      <TableCell> {record.work_closing_certificate_completed ? "✅" : "❌"}</TableCell>
                      <TableCell> {record.final_closing_certificate_completed ? "✅" : "❌"}</TableCell>
                      {/* <TableCell>{record.remaining_days} days left</TableCell> */}
                      <TableCell>
                      {/* {record.current_department !== "WorkClosing" && (
                
                        <Button variant="contained" color="secondary" onClick={() => handleSendToNext(record.work_order_id)}>
                          Send to Work Closing
                        </Button>
                      
                    )} */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      {/* Modal Form for Adding Permission Closing Data */}
      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}>
          <Box sx={{
            width: { xs: '90%', sm: '400px' },
            maxHeight: '80vh',
            backgroundColor: 'white',
            padding: 3,
            borderRadius: 2,
            boxSizing: 'border-box',
            boxShadow: 3,
            overflowY: 'auto',
          }}>
            <Typography variant="h6" gutterBottom>Permission Closing Data Form</Typography>
            <form onSubmit={handleSave}>
              <TextField
                label="Work Order Number"
                name="work_order_id"
                value={formData.work_order_id}
                fullWidth
                margin="normal"
                readOnly
                variant="outlined"
              />
               <TextField
                label="Permission Number"
                name="permission_number"
                value={formData.permission_number}
                readOnly               
                fullWidth
                margin="normal"
                variant="outlined"
              />
              <TextField
                label="Closing Date"
                name="closing_date"
                value={formData.closing_date}
                onChange={handleChange}
                fullWidth
                margin="normal"
                variant="outlined"
                type="date"
                InputLabelProps={{ shrink: true }}

              />
              <TextField
                label="Penalty Reason"
                name="penalty_reason"
                value={formData.penalty_reason}
                onChange={handleChange}
                fullWidth
                margin="normal"
                variant="outlined"
              />
              <TextField
                label="Penalty Amount"
                name="penalty_amount"
                value={formData.penalty_amount}
                onChange={handleChange}
                fullWidth
                margin="normal"
                variant="outlined"
              />
            
             
             <input
                label="Work Closing Certificate"
                type="file"
                name="Work_closing_certificate"
                onChange={(e) => setFormData({ ...formData, Work_closing_certificate: e.target.files[0] })}
                accept="image/*,application/pdf"
              />
             <input
                label="Final Closing Certificate"
                type="file"
                name="final_closing_certificate"
                onChange={(e) => setFormData({ ...formData, final_closing_certificate: e.target.files[0] })}
                accept="image/*,application/pdf"
              />
              <Box sx={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <Button type="submit" variant="contained" color="primary" fullWidth>
                  Save Changes
                </Button>
                <Button variant="contained" color="secondary" onClick={() => setShowForm(false)} fullWidth>
                  Cancel
                </Button>
              </Box>
            </form>
          </Box>
        </Box>
      </Modal>
    </Box>
  </Container>
  );
};

export default PermissionClosing;
