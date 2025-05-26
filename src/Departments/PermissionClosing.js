import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Box, Typography, Paper, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Modal, TextField } from "@mui/material";
import "../styles/permissionclosing.css";


const processPermissionClosingData = (data) => {
  const today = new Date();
  return data.map((record) => {
    if (record.workexe_created_at && record.pc_created_at) {
      const workCreatedAt = new Date(record.workexe_created_at);
      const surveyCreatedAt = new Date(record.pc_created_at);
      const deadline = new Date(workCreatedAt);
      deadline.setDate(deadline.getDate() + 10);

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
const PermissionClosing = () => {
  const [upperData, setUpperData] = useState([]);
  const [lowerData, setLowerData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [alertData, setAlertData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [files2, setFiles2] = useState([]);
  const [formData, setFormData] = useState({
    work_order_id: "",
    permission_number: "",
    work_closing_certificate: null,
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
          axios.get("https://constructionproject-production.up.railway.app/api/permission-closing/permissionclosing-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/permission-closing/PermissionClosing-data"),
        ]);
  
        const updatedData = processPermissionClosingData(permissionResponse.data);

  
        setLowerData(updatedData);
        setUpperData(comingResponse.data || []);
  
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
        console.error("Error fetching permission closing data:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []); // Ensure dependency array is empty to prevent infinite loops
  

  const handleAddData = (record) => {
    setFormData({
      ...formData,
      work_order_id: record.work_order_id,
      permission_number: record.permission_number,
    });
    setShowForm(true);
  };

  const handleWorkClosingFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };
  
  const handleFinalClosingFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles2((prevFiles) => [...prevFiles, ...newFiles]);
  };
  
  const handleRemoveFinalFile = (indexToRemove) => {
    setFiles2((prevFiles) => prevFiles.filter((_, i) => i !== indexToRemove));
  };
  

  const refreshPermissionClosingData = async () => {
        try {
          const [comingResponse, permissionResponse] = await Promise.all([
            axios.get("https://constructionproject-production.up.railway.app/api/permission-closing/permissionclosing-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/permission-closing/PermissionClosing-data"),
          ]);
      
          const updatedData = processPermissionClosingData(permissionResponse.data);
      
          setUpperData(comingResponse.data || []);
          setLowerData(updatedData);
        } catch (error) {
          console.error("Error refreshing survey data:", error);
        }
      };
  const handleSave = async (e) => {
    e.preventDefault();
  
    // Validate required fields
    const requiredFields = ['work_order_id', 'permission_number', 'closing_date'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill all the fields. Missing: ${field}`);
        return;
      }
    }
  
    // Prepare form data for submission
    const formDataWithFile = new FormData();
    formDataWithFile.append('work_order_id', formData.work_order_id);
    formDataWithFile.append('permission_number', formData.permission_number);
    formDataWithFile.append('closing_date', formData.closing_date);
    formDataWithFile.append('penalty_reason', formData.penalty_reason || '');
    formDataWithFile.append('penalty_amount', formData.penalty_amount || '');
  
    if (formData.work_closing_certificate && formData.work_closing_certificate.length > 0) {
      formData.work_closing_certificate.forEach((file) => {
        formDataWithFile.append('work_closing_certificate', file);
      });
    }
    if (files.length === 0 || files2.length === 0) {
      alert("Please select at least one file.");
      return;
    }
    
    
    for (let i = 0; i < files.length; i++) {
      formDataWithFile.append('work_closing_certificate', files[i]);
    }
   
    
    
    for (let i = 0; i < files2.length; i++) {
      formDataWithFile.append('final_closing_certificate', files2[i]);
    }
  
    // Append multiple files for final_closing_certificate
    if (formData.final_closing_certificate && formData.final_closing_certificate.length > 0) {
      formData.final_closing_certificate.forEach((file) => {
        formDataWithFile.append('final_closing_certificate', file);
      });
    }
  
    const url = formData.isEditing
      ? `https://constructionproject-production.up.railway.app/api/permission-closing/edit-permissionclosing/${formData.work_order_id}`
      : 'https://constructionproject-production.up.railway.app/api/permission-closing/upload-and-save-pcdocument';
  
    try {
      const response = formData.isEditing
        ? await axios.put(url, formDataWithFile, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await axios.post(url, formDataWithFile, { headers: { 'Content-Type': 'multipart/form-data' } });
  
      console.log("Backend response:", response.data); // Log the backend response
  
      if (response.status === 200) {
        alert(formData.isEditing ? 'Record updated successfully' : 'Data saved successfully');
        const [comingResponse, permissionResponse] = await Promise.all([
          axios.get("https://constructionproject-production.up.railway.app/api/permission-closing/permissionclosing-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/permission-closing/PermissionClosing-data"),
        ]);
        
        const updatedData = processPermissionClosingData(permissionResponse.data);
        
        setUpperData(comingResponse.data || []);
        setLowerData(updatedData);
  
        // Update the lowerData state with the new or updated record
        // const updatedRecord = {
        //   ...formData,
        //   work_closing_certificate_completed: formData.Work_closing_certificate ? true : false,
        //   final_closing_certificate_completed: formData.final_closing_certificate ? true : false,
        // };
  
      
  
        // Reset the form and close the modal
        setFormData({
          work_order_id: "",
          permission_number: "",
          closing_date: "",
          penalty_reason: "",
          penalty_amount: "",
          work_closing_certificate: null,
          final_closing_certificate: null,
          isEditing: false,
        });
        setFiles([]); // ✅ Clear selected files after successful save
        setFiles2([]); // ✅ Clear selected files after successful save
        setShowForm(false);
      } else {
        alert('Operation failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('An error occurred while saving data.');
    }
  };
  const handleEdit = (record) => {
    setFormData({
      work_order_id: record.work_order_id,
      permission_number: record.permission_number,
      closing_date: record.closing_date || "",// Set existing closing date or empty if not available
      penalty_reason: record.penalty_reason || "", // Set existing penalty reason or empty
      penalty_amount: record.penalty_amount || "", // Set existing penalty amount or empty
      Work_closing_certificate: null, // Reset file input for new upload
      final_closing_certificate: null, // Reset file input for new upload
      work_closing_certificate_completed: record.work_closing_certificate_completed || false, // Existing status
      final_closing_certificate_completed: record.final_closing_certificate_completed || false, // Existing status
      isEditing: true, // Set edit mode flag
    });
    setShowForm(true); // Open the form modal
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
  }, []);



  const handleSaveData = async (e) => {
    e.preventDefault();
    try {
      await axios.post("https://constructionproject-production.up.railway.app/api/permission-closing/save-permission_closing", formData);
      setShowForm(false);
      setFormData({
        work_order_id: "",
        permission_number: "",
        closing_date: "",
        penalty_reason: "",
        penalty_amount: "",
      });

      const [comingResponse, permissionResponse] = await Promise.all([
        axios.get("https://constructionproject-production.up.railway.app/api/permission-closing/permissionclosing-coming"),
        axios.get("https://constructionproject-production.up.railway.app/api/permission-closing/PermissionClosing-data"),
      ]);
      setUpperData(comingResponse.data || []);
      setLowerData(permissionResponse.data || []);
    } catch (error) {
      console.error("Error saving permission data:", error);
    }
  };
  const handleRemoveFile = (indexToRemove) => {
    setFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
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
      await axios.post("https://constructionproject-production.up.railway.app/api/permission-closing/update-pcdepartment", {
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
          ) :  (
            upperData.map((record) => (
              <Box key={record.work_order_id} sx={{ marginBottom: 4, border: '1px solid #ccc', borderRadius: 2, padding: 2 }}>
                <Typography><strong>Work Order:</strong> {record.work_order_id}</Typography>
                <Typography><strong>Job Type:</strong> {record.job_type}</Typography>
                <Typography><strong>Sub Section:</strong> {record.sub_section}</Typography>
                <Typography><strong>Permission No.:</strong> {record.permission_number}</Typography>

                <TableCell sx={{ padding: "8px", verticalAlign: "top" }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {[
                      { label: "Work Receiving Files", key: "file_path", downloadId: "permissionclosing1_download" },
                      { label: "Survey Files", key: "survey_file_path", downloadId: "permissionclosing2_download" },
                      { label: "Permission Files", key: "Document", downloadId: "permissionclosing3_download" },
                      { label: "Safety Signs", key: "safety_signs", downloadId: "permissionclosing4_download" },
                      { label: "Safety Barriers", key: "safety_barriers", downloadId: "permissionclosing5_download" },
                      { label: "Safety Lights", key: "safety_lights", downloadId: "permissionclosing6_download" },
                      { label: "Safety Boards", key: "safety_boards", downloadId: "permissionclosing7_download" },
                      { label: "Safety Permissions", key: "permissions", downloadId: "permissionclosing8_download" },
                      { label: "Safety Documentation", key: "safety_documentation", downloadId: "permissionclosing9_download" },
                      { label: "Work Exe Asphalt", key: "exe_asphalt", downloadId: "permissionclosing10_download" },
                      { label: "Work Exe Milling", key: "exe_milling", downloadId: "permissionclosing11_download" },
                      { label: "Work Exe Concrete", key: "exe_concrete", downloadId: "permissionclosing12_download" },
                      { label: "Work Exe Sand", key: "exe_sand", downloadId: "permissionclosing13_download" },
                      { label: "Work Exe Cable lying", key: "exe_cable_lying", downloadId: "permissionclosing14_download" },
                      { label: "Work Exe Trench", key: "exe_trench", downloadId: "permissionclosing15_download" },
                      { label: "Lab Asphalt Testing", key: "lab_asphalt", downloadId: "permissionclosing16_download" },
                      { label: "Lab Milling Testing", key: "lab_milling", downloadId: "permissionclosing17_download" },
                      { label: "Lab Concrete Testing", key: "lab_concrete", downloadId: "permissionclosing18_download" },
                      { label: "Lab Sand Testing", key: "lab_sand", downloadId: "permissionclosing19_download" },
                      { label: "Lab Cable lying Testing", key: "lab_cable_lying", downloadId: "permissionclosing20_download" },
                      { label: "Lab Trench Testing", key: "lab_trench", downloadId: "permissionclosing21_download" },
                    ].map((item, i) => (
                      <Box key={i}>
                        <strong>{item.label}:</strong>{" "}
                        {record[item.key] ? (
                          <a
                            href={`https://constructionproject-production.up.railway.app/api/permission-closing/${item.downloadId}/${record.work_order_id}`}
                            download
                            style={{ color: "#1976d2", textDecoration: "none" }}
                          >
                            ✅ 📂 Download
                          </a>
                        ) : (
                          "❌ No File"
                        )}
                      </Box>
                    ))}
                            </Box>
                          </TableCell>
                          <Box mt={2}>
                    <Button onClick={() => handleAddData(record)} variant="contained" color="success">
                      Add Data
                    </Button>
                  </Box>
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
                    {['Sr.No','Work Order ID', 'Job Type', 'Sub Section', 'Permission Number','Closing Date', 'Penalty Reason', 'Penalty Amount', 'Work Closing Certificate', 'Final Closing Certificate', 'Action'].map((header) => (
                      <TableCell key={header} className="survey-table-header">
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowerData.map((record, index) => (
                    <TableRow key={record.work_order_id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{record.work_order_id}</TableCell>
                      <TableCell>{record.job_type}</TableCell>
                      <TableCell>{record.sub_section}</TableCell>
                      <TableCell>{record.permission_number}</TableCell>
                      <TableCell>{new Date(record.closing_date).toLocaleDateString()}</TableCell>
                      <TableCell>{record.penalty_reason}</TableCell>
                      <TableCell>{record.penalty_amount}</TableCell>
                      <TableCell> {record.work_closing_certificate_completed ? "✅" : "❌"}</TableCell>
                      <TableCell> {record.final_closing_certificate_completed ? "✅" : "❌"}</TableCell>
                      <TableCell>
                                                <Button
                                                  onClick={() => handleEdit(record)}
                                                  sx={{ backgroundColor: '#6a11cb', color: 'white', '&:hover': { backgroundColor: 'black' } }}
                                                >
                                                  Edit
                                                </Button>
                                              </TableCell>
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
              accept="*"
              style={{ display: 'none' }}
              id="upload-work-closing-files"
              type="file"
              multiple
              onChange={handleWorkClosingFileChange}
            />
            <label htmlFor="upload-work-closing-files">
              <Button variant="outlined" component="span">
                + Add Work Closing Certificate
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
                    <Button size="small" color="error" onClick={() => handleRemoveFile(index)}>
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

                      <input
                        accept="*"
                        style={{ display: 'none' }}
                        id="upload-final-closing-files"
                        type="file"
                        multiple
                        onChange={handleFinalClosingFileChange}
                      />
                      <label htmlFor="upload-final-closing-files">
                        <Button variant="outlined" component="span">
                          + Add Final Closing Certificate
                        </Button>
                      </label>

                         
                                         {/* Display selected file names */}
                                         <div style={{ marginTop: 10 }}>
                {files2.length > 0 ? (
                  files2.map((file, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}>
                      <Typography variant="body2" sx={{ marginRight: 1 }}>
                        📎 {file.name}
                      </Typography>
                      <Button size="small" color="error" onClick={() => handleRemoveFinalFile(index)}>
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
  </Container>
  );
};

export default PermissionClosing;
