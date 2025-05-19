import React, { useState, useEffect } from "react";
import axios from "axios";
import { Box, Button, TextField, Modal, Typography, Paper, Container, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Snackbar } from "@mui/material";
import "../styles/survey.css";  // Importing the stylesheet


const processSurveyData = (data) => {
  const today = new Date();
  return data.map((record) => {
    if (record.survey_created_at && record.created_at) {
      const workCreatedAt = new Date(record.created_at);
      const surveyCreatedAt = new Date(record.survey_created_at);
      const deadline = new Date(workCreatedAt);
      deadline.setDate(deadline.getDate() + 2);

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

const Survey = () => {
  const [upperData, setUpperData] = useState([]); // Survey coming data
  const [lowerData, setLowerData] = useState([]); // Existing survey data
  const [showForm, setShowForm] = useState(false); // Form visibility toggle
  const [formData, setFormData] = useState({}); // Form data
  const [loading, setLoading] = useState(true); // Loading state for data fetching
  const [alertData, setAlertData] = useState([]); // For alerting on deadlines
 const [data, setData] = useState([]);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [files, setFiles] = useState([]);

  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [comingResponse, surveyResponse] = await Promise.all([
          axios.get("https://constructionproject-production.up.railway.app/api/survey/survey-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/survey/survey-data"),
        ]);
    
        const updatedData = processSurveyData(surveyResponse.data);
    
        setLowerData(updatedData);
        setUpperData(comingResponse.data || []);
    
        await Promise.all(updatedData.map(async (record) => {
          if (record.delivery_status) {
            try {
              await axios.put("https://constructionproject-production.up.railway.app/api/survey/update-delivery-status", {
                work_order_id: record.work_order_id,
                delivery_status: record.delivery_status,
              });
            } catch (error) {
              console.error("Error updating delivery status:", error.response ? error.response.data : error);
            }
          }
        }));
    
        const urgentOrders = updatedData.filter((record) => record.statusColor !== '');
        setAlertData(urgentOrders);
    
      } catch (error) {
        console.error("Error fetching survey data:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
    
  }, []);
  
  
  

  const handleAddData = (record) => {
    setFormData(record);
    setShowForm(true);
  };

 
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };
  

  const refreshSurveyData = async () => {
    try {
      const [comingResponse, surveyResponse] = await Promise.all([
        axios.get("https://constructionproject-production.up.railway.app/api/survey/survey-coming"),
        axios.get("https://constructionproject-production.up.railway.app/api/survey/survey-data"),
      ]);
  
      const updatedData = processSurveyData(surveyResponse.data);
  
      setUpperData(comingResponse.data || []);
      setLowerData(updatedData);
    } catch (error) {
      console.error("Error refreshing survey data:", error);
    }
  };
  
  const handleSaveData = async (e) => {
    e.preventDefault();
  
    const requiredFields = ['work_order_id', 'handover_date', 'return_date', 'remark'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill all the fields. Missing: ${field}`);
        return;
      }
    }
  
    if (files.length === 0) {
      alert("Please select at least one file.");
      return;
    }
    
    const formDataWithFile = new FormData();
  
    // Append multiple files
    for (let i = 0; i < files.length; i++) {
      formDataWithFile.append('survey_file_path', files[i]);
    }
    
    // Append other fields
    Object.keys(formData).forEach((key) => {
      if (key !== 'survey_file_path') {
        formDataWithFile.append(key, formData[key]);
      }
    });
  
    const url = formData.isEditing
      ? `https://constructionproject-production.up.railway.app/api/survey/edit-survey/${formData.work_order_id}`
      : 'https://constructionproject-production.up.railway.app/api/survey/save-survey';
  
    try {
      const response = formData.isEditing
        ? await axios.put(url, formDataWithFile, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await axios.post(url, formDataWithFile, { headers: { 'Content-Type': 'multipart/form-data' } });
  
      if (response.status === 200) {
        alert("Data saved successfully!");
        await refreshSurveyData();
        setFormData({});
        setFiles([]);
        setShowForm(false);
      } else {
        alert(`Error: ${response.data.message || 'Failed to save data'}`);
      }
    } catch (error) {
      console.error("Error saving survey data:", error);
      alert("Error submitting data.");
    }
  };
  
  const handleEdit = (record) => {
    setFormData({
      work_order_id: record.work_order_id,
      handover_date: record.handover_date,
      return_date: record.return_date,
      remark: record.remark,
      job_type: record.job_type,           // Include job type
      sub_section: record.sub_section,     // Include sub section
      survey_file_path: null,              // Optional: reset or allow new file
      isEditing: true,
    });
    setFiles([]); // ✅ Clear selected files after successful save
    setShowForm(true);
  };
  
  

  
  

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      const updatedData = {
        ...prevData,
        [name]: value,
      };
      return updatedData;
    });
  };

  const handleSendToPermission = async (workOrderId) => {
    try {
      await axios.post("https://constructionproject-production.up.railway.app/api/survey/update-department", {
        workOrderId,
      });
      alert("Work Order moved to Permission department.");
      const updatedData = await axios.get("https://constructionproject-production.up.railway.app/api/survey/survey-data");
      setLowerData(updatedData.data || []);
    } catch (error) {
      console.error("Error updating department:", error);
    }
  };
  const showSnackbar = (msg) => {
    setSnackbarMessage(msg);
    setOpenSnackbar(true);
  };
  const handleRemoveFile = (indexToRemove) => {
    setFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
  };
  return (
    <Container className="survey-container">
      <Box className="survey-header">
        <Typography variant="h3" color="primary">Welcome to the Survey Department</Typography>

        {/* Upper Section: Displaying Coming Survey Data */}
        <Box className="survey-data-box" sx={{ padding: 2 }}>
          <Paper className="survey-paper">
            <Typography variant="h5">Load Survey Coming Data</Typography>
            {loading ? (
              <CircularProgress color="primary" />
            ) : upperData.length === 0 ? (
              <Typography>No survey coming data available.</Typography>
            ) : (
              upperData.map((record) => (
                <Box key={record.work_order_id} sx={{ marginBottom: 2 }}>
                  <Typography><strong>Work Order:</strong> {record.work_order_id}</Typography>
                  <Typography><strong>Job Type:</strong> {record.job_type}</Typography>
                  <Typography><strong>Sub Section:</strong> {record.sub_section}</Typography>
                  {/* <Typography><strong>Send From W.R:</strong> {record.created_at}</Typography> */}
                  <Typography>
                      {record.file_path ? (
                        <a href={`https://constructionproject-production.up.railway.app/api/survey/survey_download/${record.work_order_id}`} download>
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

          {/* Lower Section: Displaying Survey Data */}
          <Paper className="survey-paper">
            <Typography variant="h5">Load Survey Data</Typography>
            {loading ? (
              <CircularProgress color="primary" />
            ) : lowerData.length === 0 ? (
              <Typography>No survey data available.</Typography>
            ) : (
              <TableContainer className="survey-table-container">
                <Table className="survey-table">
                  <TableHead>
                    <TableRow>
                      {['Sr.No','Work Order ID', 'Job Type', 'Sub Section', 'Hand Over Date', 'Return Date', 'Remarks', 'Action'].map((header) => (
                        <TableCell key={header} className="survey-table-header">
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowerData.map((record,index) => (
                      <TableRow key={record.work_order_id}>
                        <TableCell className="survey-table-cell">{index + 1}</TableCell>
                        <TableCell className="survey-table-cell">
                          {record.work_order_id}
                        </TableCell>
                        <TableCell className="survey-table-cell">
                          {record.job_type}
                        </TableCell>
                        <TableCell className="survey-table-cell">
                          {record.sub_section}
                        </TableCell>
                        <TableCell className="survey-table-cell">
                          {new Date(record.handover_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="survey-table-cell">
                          {new Date(record.return_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="survey-table-cell">
                          {record.remark}
                        </TableCell>
                        {/* <TableCell>
                          {record.current_department !== 'Permission' && (
                            <Button
                              variant="contained"
                              color="secondary"
                              onClick={() => handleSendToPermission(record.work_order_id)}
                              className="survey-button"
                            >
                              Send to Permission
                            </Button>
                          )}
                        </TableCell> */}
                       {/* <TableCell>
                        {record.created_at ? new Date(record.created_at).toLocaleString() : 'N/A'}
                      </TableCell>
                       <TableCell>
                       {record.survey_created_at ? new Date(record.survey_created_at).toLocaleString() : 'N/A'}
                      </TableCell> */}
                       <TableCell>
                       {/* <TableCell>
                        {record.deadline ? record.deadline.toLocaleDateString() : 'N/A'}
                      </TableCell> */}
                      {/* <TableCell> {record.file_path ? "✅" : "❌"}</TableCell> */}
                      <TableCell>
                          <Button
                            onClick={() => handleEdit(record)}
                            sx={{ backgroundColor: 'green', color: 'white', '&:hover': { backgroundColor: '#6a11cb' } }}
                          >
                            Edit
                          </Button>
                        </TableCell>

                      </TableCell> 

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>

        {/* Modal Form for Adding Survey Data */}
        <Modal open={showForm} onClose={() => setShowForm(false)}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignrecords: 'center',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}>
            <Box sx={{
              width: { xs: '90%', sm: '400px' },  // Adjusted width
              maxHeight: '80vh',  // Limiting the form's height
              backgroundColor: 'white',
              padding: 3,  // Increased padding for better spacing
              borderRadius: 2,
              boxSizing: 'border-box',
              boxShadow: 3,
              overflowY: 'auto', // Added scrolling inside the form if needed
            }}>
              <Typography variant="h6" gutterBottom>Survey Data Form</Typography>
              <form onSubmit={handleSaveData}>
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
                  label="Job Type"
                  name="job_type"
                  value={formData.job_type}
                  fullWidth
                  margin="normal"
                  readOnly
                  variant="outlined"
                />
                <TextField
                  label="Sub Section"
                  name="sub_section"
                  value={formData.sub_section}
                  fullWidth
                  margin="normal"
                  readOnly
                  variant="outlined"
                />
                <TextField
                  label="Hand Over Date"
                  name="handover_date"
                  value={formData.handover_date}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  type="date"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                <TextField
                  label="Return Date"
                  name="return_date"
                  value={formData.return_date}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  type="date"
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                <TextField
                  label="Remarks"
                  name="remark"
                  value={formData.remark}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  multiline
                  rows={4}  // Increased rows for the remarks field
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

export default Survey;
