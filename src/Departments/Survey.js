import React, { useState, useEffect } from "react";
import axios from "axios";
import { Box, Button, TextField, Modal, Typography, Paper, Container, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Snackbar } from "@mui/material";
import "../styles/survey.css";  // Importing the stylesheet

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
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [comingResponse, surveyResponse] = await Promise.all([
          axios.get("https://constructionproject-production.up.railway.app/api/survey/survey-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/survey/survey-data"),
        ]);
  
        const today = new Date();
  
        const updatedData = surveyResponse.data.map((record) => {
          if (record.survey_created_at && record.created_at) {
            const workCreatedAt = new Date(record.created_at);
            const surveyCreatedAt = new Date(record.survey_created_at);
            const deadline = new Date(workCreatedAt);
            deadline.setDate(deadline.getDate() + 2);
  
            let statusColor = '';
            let deliveryStatus = 'On Time';
  
            if (surveyCreatedAt > deadline) {
              statusColor = 'red';
              deliveryStatus = 'Delayed';
            } else if (surveyCreatedAt < deadline) {
              statusColor = 'Green';
              deliveryStatus = 'On Time';
            } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
              statusColor = 'yellow';
              deliveryStatus = 'Near Deadline';
            }
  
            return { ...record, deadline, statusColor, delivery_status: deliveryStatus };
          }
          return record;
        });
  
        setLowerData(updatedData);
        setUpperData(comingResponse.data || []);
  
        // Send updated statuses to backend
        await Promise.all(updatedData.map(async (record) => {
          if (record.delivery_status) {
            try {
              console.log("Sending update for:", record.work_order_id, record.delivery_status);
              const response = await axios.put("https://constructionproject-production.up.railway.app/api/survey/update-delivery-status", {
                work_order_id: record.work_order_id,
                delivery_status: record.delivery_status,
              });
              console.log("Update response:", response.data);
            } catch (error) {
              console.error("Error updating delivery status:", error.response ? error.response.data : error);
            }
          }
        }));
  
        // Filter alerts for work orders nearing or past deadlines
        const urgentOrders = updatedData.filter((record) => record.statusColor !== '');
        setAlertData(urgentOrders);
  
        if (urgentOrders.length > 0) {
          const alertMessage = urgentOrders.map((order) =>
            `Work Order: ${order.work_order_id || 'N/A'}, Status: ${order.delivery_status}`
          ).join('\n');
  
          // alert(`Warning: Some work orders are close to or past their deadline.\n\n${alertMessage}`);
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
    setFormData(record);
    setShowForm(true);
  };

  // const handleSaveData = async (e) => {
  //   const formDataWithFile = new FormData();
  //   formDataWithFile.append('file_path', formData.file_path); 
  
  //   const requiredFields = ['work_order_id', 'handover_date', 'return_date', 'remark'];
  //   for (const field of requiredFields) {
  //     if (!formData[field]) {
  //       alert(`Please fill all the fields. Missing: ${field}`);
  //       return;
  //     }
  //   }
  
    // const today = new Date();
    // const deadline = new Date();
    // deadline.setDate(deadline.getDate() + 2);
  
    // let deliveryStatus = 'on time';
    // if (today > deadline) {
    //   deliveryStatus = 'delayed';
    // } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
    //   deliveryStatus = 'nearing deadline';
    // }
  
  //   // Ensure `delivery_status` is included in `formData`
  //   const updatedFormData = { ...formData, delivery_status: deliveryStatus };
  
  //   try {
  //     const response = await axios.post("https://constructionproject-production.up.railway.app/api/survey/save-survey", updatedFormData);
  //     if (response.status === 200) {
  //       alert("Data saved successfully!");
  //       setShowForm(false);
  //       setFormData({});
  //       const updatedData = await axios.get("https://constructionproject-production.up.railway.app/api/survey/survey-data");
  //       setLowerData(updatedData.data || []);
  //     } else {
  //       alert(`Failed to save data. Status Code: ${response.status}. ${response.data.message || 'Unknown error'}`);
  //     }
  //   } catch (error) {
  //     console.error("Error saving survey data:", error);
  //     alert(`Error: ${error.response?.status || 'Unknown'} - ${error.response?.data?.message || 'Unknown error'}`);
  //   }
  // };
  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      survey_file_path: e.target.files[0], // Store actual file object
    });
  };
  
  const handleSaveData = async (e) => {
    e.preventDefault();
  
    // Validate required fields
    const requiredFields = ['work_order_id', 'handover_date', 'return_date', 'remark'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill all the fields. Missing: ${field}`);
        showSnackbar('Please fill all fields and attach a valid file.');

        return;
      }
    }
  
    if (!formData.survey_file_path) {
      alert("Please upload a file.");
      return;
    }
  
    // Prepare form data for submission
    const formDataWithFile = new FormData();
    formDataWithFile.append('survey_file_path', formData.survey_file_path);
  
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
  
        // Update the lowerData state with the new or updated record
        const updatedRecord = {
          ...formData,
          survey_file_path: response.data.filePath || formData.survey_file_path, // Use the file path from the response if available
        };
  
        setLowerData((prevData) => {
          if (formData.isEditing) {
            // Replace the existing record in case of editing
            return prevData.map((record) =>
              record.work_order_id === updatedRecord.work_order_id ? updatedRecord : record
            );
          } else {
            // Add the new record to the lowerData
            return [...prevData, updatedRecord];
          }
        });
  
        // Reset the form and close the modal
        setFormData({});
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
                  <Typography><strong>Send From W.R:</strong> {record.created_at}</Typography>
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
                      {['Work Order ID', 'Job Type', 'Sub Section', 'Hand Over Date', 'Return Date', 'Remarks','Created At', 'Created At Survey','Deadline','File', 'Action'].map((header) => (
                        <TableCell key={header} className="survey-table-header">
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lowerData.map((record) => (
                      <TableRow key={record.work_order_id}>
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
                       <TableCell>
                        {record.created_at ? new Date(record.created_at).toLocaleString() : 'N/A'}
                      </TableCell>
                       <TableCell>
                       {record.survey_created_at ? new Date(record.survey_created_at).toLocaleString() : 'N/A'}
                      </TableCell>
                       <TableCell>
                       <TableCell>
                        {record.deadline ? record.deadline.toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell> {record.file_path ? "✅" : "❌"}</TableCell>
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
                  type="file"
                  name="survey_file_path"
                  onChange={(e) => setFormData({ ...formData, survey_file_path: e.target.files[0] })}
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
