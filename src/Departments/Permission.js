import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Box, Typography, Paper, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Modal, TextField, Snackbar } from "@mui/material";




const processPermissionData = (data) => {
  const today = new Date();
  return data.map((record) => {
    if (record.survey_created_at && record.permission_created_at) {
      const workCreatedAt = new Date(record.survey_created_at);
      const surveyCreatedAt = new Date(record.permission_created_at);
      const deadline = new Date(workCreatedAt);
      deadline.setDate(deadline.getDate() + 3);

      let statusColor = '';
      let deliveryStatus = 'On Time';

      if (surveyCreatedAt > deadline) {
        // statusColor = 'red';
        deliveryStatus = 'Delayed';
      } else if (surveyCreatedAt < deadline) {
        // statusColor = 'green';
        deliveryStatus = 'On Time';
      } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
        // statusColor = 'yellow';
        deliveryStatus = 'Near Deadline';
      }

      return { ...record, deadline, statusColor, delivery_status: deliveryStatus };
    }
    return record;
  });
};
const Permission = () => {
  const [upperData, setUpperData] = useState([]);
  const [lowerData, setLowerData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [alertData, setAlertData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    work_order_id: "",
    request_date: "",
    request_status: "",
    saadad_payment: "",
    start_date: "",
    end_date: "",
    permission_number: "",
    permission_renewal: "",
    Document: "",
    remaining_days: 0,
  });



  useEffect(() => {
    const fetchData = async () => {
      try {
        const [comingResponse, permissionResponse] = await Promise.all([
          axios.get("https://constructionproject-production.up.railway.app/api/permission/permission-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/permission/permission-data"),
        ]);
  
      
        const updatedData = processPermissionData(permissionResponse.data);
    
        setLowerData(updatedData);
        setUpperData(comingResponse.data || []);
       
  
        // ✅ Ensure `updatedData` is not empty before updating backend
        if (updatedData.length > 0) {
          console.log("Updating delivery statuses in backend...");
  
          await Promise.all(updatedData.map(async (record) => {
            if (record.work_order_id && record.delivery_status) {
              try {
                const response = await axios.put("https://constructionproject-production.up.railway.app/api/permission/update-pdelivery-status", {
                  work_order_id: record.work_order_id,
                  delivery_status: record.delivery_status,
                });
                console.log("Update response:", response.data);
              } catch (error) {
                console.error("Error updating delivery status:", error.response?.data || error);
              }
            }
          }));
        } else {
          console.warn("No records to update in the backend.");
        }
  
        // Filter alerts for work orders nearing or past deadlines
        const urgentOrders = updatedData.filter((record) => record.statusColor !== "");
        setAlertData(urgentOrders);
  
        if (urgentOrders.length > 0) {
          const alertMessage = urgentOrders
            .map((order) => `Work Order: ${order.work_order_id || "N/A"}, Status: ${order.delivery_status}`)
            .join("\n");
  
          // alert(`Warning: Some work orders are close to or past their deadline.\n\n${alertMessage}`);
        }
      } catch (error) {
        console.error("Error fetching survey data:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []); // ✅ Keep dependency array empty to prevent infinite loops
  
  

  const handleAddData = (record) => {
    setFormData({ ...formData, work_order_id: record.work_order_id });
    setShowForm(true);
  };
  const downloadFile = (url) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = url.substring(url.lastIndexOf("/") + 1);
    link.click();
  };
  const refreshPermissionData = async () => {
      try {
        const [comingResponse, permissionResponse] = await Promise.all([
          axios.get("https://constructionproject-production.up.railway.app/api/permission/permission-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/permission/permission-data"),
        ]);
    
        const updatedData = processPermissionData(permissionResponse.data);
    
        setUpperData(comingResponse.data || []);
        setLowerData(updatedData);
      } catch (error) {
        console.error("Error refreshing survey data:", error);
      }
    };
  const handleSave = async (e) => {
    e.preventDefault();
  
    // Validate required fields
    const requiredFields = ['work_order_id', 'permission_number', 'request_date', 'start_date', 'end_date'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill all the fields. Missing: ${field}`);
        showSnackbar('Please fill all fields and attach a valid file.');

        return;
      }
    }
  
    if (files.length === 0) {
      alert("Please select at least one file.");
      return;
    }
    
    const formDataWithFile = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formDataWithFile.append('Document', files[i]);
    }
    
    formDataWithFile.append('work_order_id', formData.work_order_id);
    formDataWithFile.append('permission_number', formData.permission_number);
    formDataWithFile.append('request_date', formData.request_date);
    // formDataWithFile.append('permission_renewal', formData.permission_renewal);
    formDataWithFile.append('start_date', formData.start_date);
    formDataWithFile.append('end_date', formData.end_date);
  
    const today = new Date();
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 2);
  
    let deliveryStatus = 'on time';
    if (today > deadline) {
      deliveryStatus = 'delayed';
    } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
      deliveryStatus = 'nearing deadline';
    }
  
    formDataWithFile.append('delivery_status', deliveryStatus);
  
    const url = formData.isEditing
      ? `https://constructionproject-production.up.railway.app/api/permission/edit-permission/${formData.work_order_id}`
      : 'https://constructionproject-production.up.railway.app/api/permission/upload-and-save-pdocument';
  
    try {
     const response = formData.isEditing
            ? await axios.put(url, formDataWithFile, { headers: { 'Content-Type': 'multipart/form-data' } })
            : await axios.post(url, formDataWithFile, { headers: { 'Content-Type': 'multipart/form-data' } });
      
  
      if (response.status === 200) {
        alert(formData.isEditing ? 'Record updated successfully' : 'Data saved successfully');
        await refreshPermissionData();
        // Update the lowerData state with the new or updated record
        // const updatedRecord = {
        //   ...formData,
        //   Document: response.data.filePath || formData.Document, // Use the file path from the response if available
        // };
  
        
  
        // Reset the form and close the modal
        setFormData({
          work_order_id: "",
          permission_number: "",
          Document: "",
          request_date: "",
          // permission_renewal: "",
          start_date: "",
          end_date: "",
          // remaining_days: 0,
          isEditing: false,
        });
        setFiles([]); // ✅ Clear selected files after successful save
        setShowForm(false);
      } else {
        alert('Operation failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('An error occurred while saving data.');
    }
  };
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };
  
  const handleEdit = (record) => {
    setFormData({
      work_order_id: record.work_order_id,
      permission_number: record.permission_number || "", // FIXED LINE
      request_date: record.request_date,
      permission_renewal: record.permission_renewal,
      start_date: record.start_date,
      end_date: record.end_date,
      Document: null,
      isEditing: true,
    });
    setShowForm(true);
  };
  const handleRemoveFile = (indexToRemove) => {
    setFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
  };
    
  

  
  
  
  // Calculate remaining days
  // Calculate remaining days
  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDifference = end.getTime() - start.getTime();
    return Math.ceil(timeDifference / (1000 * 3600 * 24)); // returns the number of days
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      const updatedData = { ...prevData, [name]: value };
      if (name === "end_date" && updatedData.start_date) {
        updatedData.remaining_days = calculateDays(value);
        

      }
      return updatedData;
    });
  };
  const handleSendToSafety = async (workOrderId) => {
    try {
      await axios.post("https://constructionproject-production.up.railway.app/api/permission/update-permissiondepartment", {
        workOrderId,
      });
      alert("Work Order moved to Safety department.");
      const updatedData = await axios.get("https://constructionproject-production.up.railway.app/api/permission/permission-data");
      setLowerData(updatedData.data || []);
    } catch (error) {
      console.error("Error updating department:", error);
    }
  };
  const showSnackbar = (msg) => {
    setSnackbarMessage(msg);
    setOpenSnackbar(true);
  };
  return (
    <Container className="survey-container">
      <Box className="survey-header">
        <Typography variant="h3" color="primary">Welcome to the Permission Department</Typography>

        {/* Upper Section: Displaying Incoming Permission Data */}
        <Box className="survey-data-box" sx={{ padding: 2 }}>
          <Paper className="survey-paper">
            <Typography variant="h5">Load Incoming Permission Data</Typography>
            {upperData.length === 0 ? (
              <Typography>No incoming permission data available.</Typography>
            ) : (
              upperData.map((record) => (
                <Box key={record.work_order_id} sx={{ marginBottom: 2 }}>
                  <Typography><strong>Work Order:</strong> {record.work_order_id}</Typography>
                  <Typography><strong>Job Type:</strong> {record.job_type}</Typography>
                  <Typography><strong>Sub Section:</strong> {record.sub_section}</Typography>
                  <Typography><strong>Work Receiving Files</strong>
                      {record.file_path  ? (
                        <a href={`https://constructionproject-production.up.railway.app/api/permission/permission1_download/${record.work_order_id}`} download>
                          ✅ 📂 Download
                        </a>
                      ) : (
                        "❌ No File"
                      )}
                    </Typography>
                  <Typography><strong>Survey Files</strong>
                      {record.survey_file_path ? (
                        <a href={`https://constructionproject-production.up.railway.app/api/permission/permission2_download/${record.work_order_id}`} download>
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
            <Typography variant="h5">Load Permission Data</Typography>
            {lowerData.length === 0 ? (
              <Typography>No permission data available.</Typography>
            ) : (
              <TableContainer className="survey-table-container">
                <Table className="survey-table">
                  <TableHead>
                    <TableRow>
                      {['Sr.No.','Work Order ID', 'Job Type', 'Sub Section', 'Permission Number', 'Request Date', 'Start Date', 'End Date', 'Attachment', 'Action'].map((header) => (
                        <TableCell key={header} className="survey-table-header">
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowerData.map((record, index) => (
                      
                      <TableRow key={record.work_order_id}>
                        <TableCell>{index+1}</TableCell>
                        <TableCell>{record.work_order_id}</TableCell>
                        <TableCell>{record.job_type}</TableCell>
                        <TableCell>{record.sub_section}</TableCell>
                        <TableCell>{record.permission_number}</TableCell>
                        <TableCell>{new Date(record.request_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(record.start_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(record.end_date).toLocaleDateString()}</TableCell>
                        {/* <TableCell>{record.permission_renewal}</TableCell> */}
                        <TableCell> {record.Document_complete ? "✅" : "❌"}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleEdit(record)}
                            sx={{ backgroundColor: '#6a11cb', color: 'white', '&:hover': { backgroundColor: 'black' } }}
                          >
                            Edit
                          </Button>
                        </TableCell>
                        {/* <TableCell>
  {record.Document ? (
    <a href={record.Document} target="_blank" rel="noopener noreferrer" download>
      Download Document
    </a>
  ) : (
    "No Document"
  )}
</TableCell> */}


                        {/* <TableCell>
                        {record.current_department !== 'Safety' && (
                            <Button
                              variant="contained"
                              color="secondary"
                              onClick={() => handleSendToSafety(record.work_order_id)}
                              className="survey-button"
                            >
                              Send to Safety
                            </Button>
                          )}
                        </TableCell> */}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>

        {/* Modal Form for Adding Permission Data */}
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
              <Typography variant="h6" gutterBottom>Permission Data Form</Typography>
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
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                    required
                  />
                <TextField
                  label="Request Date"
                  name="request_date"
                  value={formData.request_date}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  type="date"
                  InputLabelProps={{ shrink: true }}

                />
               
              
                {/* <TextField
                  label="Permission Renewal"
                  name="permission_renewal"
                  value={formData.permission_renewal}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                /> */}
               
                <TextField
                  label="Start Date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="End Date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                />
               <input
                                 accept="*"
                                 style={{ display: 'none' }}
                                 id="upload-files"
                                 type="file"
                                 multiple
                                 onChange={handleFileChange}
                               />
                               <label htmlFor="upload-files">
                                 <Button variant="outlined" component="span">
                                   + Add Files
                                 </Button>
                               </label>
               
                               {/* Display selected file names */}
                               <div style={{ marginTop: 10 }}>
                {files.length > 0 ? (
                  files.map((file, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}>
                      <Typography variant="body2" sx={{ marginRight: 1 }}>
                        📎 {file.name}
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRemoveFile(index)}
                      >
                        ❌
                      </Button>
                    </div>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No files selected.
                  </Typography>
                )}
              </div>
                <Box sx={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                  <Button type="submit" variant="contained" color="primary" fullWidth>
                    Save Data
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
      <Snackbar
                    open={openSnackbar}
                    autoHideDuration={3000}
                    onClose={() => setOpenSnackbar(false)}
                    message={snackbarMessage}
                    />
    </Container>
  );
};

export default Permission;
