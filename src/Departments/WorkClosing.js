import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Box, Typography, Paper, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Modal, TextField } from "@mui/material";
import "../styles/permissionclosing.css";


const processWorkClosingData = (data) => {
  const today = new Date();
  return data.map((record) => {
    if (record.wc_created_at && record.pc_created_at) {
      const workCreatedAt = new Date(record.pc_created_at);
      const surveyCreatedAt = new Date(record.wc_created_at);
      const deadline = new Date(workCreatedAt);
      deadline.setDate(deadline.getDate() + 2);

      let statusColor = '';
      let deliveryStatus = 'On Time';

      if (surveyCreatedAt > deadline) {
        statusColor = 'red';
        deliveryStatus = 'Delayed';
      } else if (surveyCreatedAt < deadline) {
        statusColor = 'green';
        deliveryStatus = 'On Time';
      } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
        statusColor = 'yellow';
        deliveryStatus = 'Near Deadline';
      }

      return { ...record, deadline, statusColor, delivery_status: deliveryStatus };
    }
    return record;
  });
};
const WorkClosing = () => {
  const [upperData, setUpperData] = useState([]);
  const [lowerData, setLowerData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [alertData, setAlertData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    work_order_id: "",
    submission_date: "",
    resubmission_date: "",
    approval_date: "",
    mubahisa: ""
    
  });

  // // Fetch data from the backend
  // useEffect(() => {
  //   const fetchData = async () => {
  //     setLoading(true); // Start loading
  //     try {
  //       const [comingResponse, workclosingResponse] = await Promise.all([
  //         axios.get("https://constructionproject-production.up.railway.app/api/work-closing/workclosing-coming"),
  //         axios.get("https://constructionproject-production.up.railway.app/api/work-closing/workClosing-data"),
  //       ]);

  //       const today = new Date();
  //       const updatedData = workclosingResponse.data.map((record) => {
  //         if (record.created_at) {
  //           const createdAt = new Date(record.created_at);
  //           const deadline = new Date(createdAt);
  //           deadline.setDate(deadline.getDate() + 2); // Add 2 days to created_at

  //           let statusColor = ''; 
  //           let deliveryStatus = 'on time'; // Default status
  //           if (record.current_department === 'Work Receiving') {
  //             if (today > deadline) {
  //               statusColor = 'red'; // Deadline Passed
  //               deliveryStatus = 'delayed'; // Update status to delayed

  //             } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
  //               statusColor = 'yellow'; // Near Deadline
  //             }
  //           }
  //           return { ...record, deadline, statusColor, delivery_status: deliveryStatus };
  //         }
  //         return record;
  //       });

  //       // Set state with fetched data
  //       setLowerData(updatedData);
  //       setUpperData(comingResponse.data || []);

  //       // Filter alerts for work orders nearing or past deadlines
  //       const urgentOrders = updatedData.filter((record) => record.statusColor !== '');
  //       setAlertData(urgentOrders);

  //       if (urgentOrders.length > 0) {
  //         alert('Warning: Some work orders are close to or past their deadline.');
  //       }
  //     } catch (error) {
  //       console.error("Error fetching work closing data:", error);
  //     } finally {
  //       setLoading(false); // Stop loading
  //     }
  //   };

  //   fetchData();
  // }, []);
   const refreshWorkClosingData = async () => {
          try {
            const [comingResponse, workclosingResponse] = await Promise.all([
            axios.get("https://constructionproject-production.up.railway.app/api/work-closing/workclosing-coming"),
            axios.get("https://constructionproject-production.up.railway.app/api/work-closing/workClosing-data"),
    ]);
        
            const updatedData = processWorkClosingData(workclosingResponse.data);
        
            setUpperData(comingResponse.data || []);
            setLowerData(updatedData);
          } catch (error) {
            console.error("Error refreshing survey data:", error);
          }
        };
  const handleSave = async (e) => {
    e.preventDefault();
  
    // Validate required fields
    const requiredFields = ['work_order_id', 'submission_date', 'resubmission_date', 'approval_date'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill all the fields. Missing: ${field}`);
        return;
      }
    }
  
    // Prepare form data for submission
    const formDataWithFile = new FormData();
    formDataWithFile.append('work_order_id', formData.work_order_id);
    formDataWithFile.append('submission_date', formData.submission_date);
    formDataWithFile.append('resubmission_date', formData.resubmission_date);
    formDataWithFile.append('approval_date', formData.approval_date);
  
    if (formData.mubahisa) {
      formDataWithFile.append('mubahisa', formData.mubahisa);
    }
  
    // Determine the URL based on whether it's an edit or a new record
    const url = formData.isEditing
      ? `https://constructionproject-production.up.railway.app/api/work-closing/edit-workclosing/${formData.work_order_id}`
      : 'https://constructionproject-production.up.railway.app/api/work-closing/upload-and-save-wcdocument';
  
    try {
      const response = formData.isEditing
        ? await axios.put(url, formDataWithFile, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await axios.post(url, formDataWithFile, { headers: { 'Content-Type': 'multipart/form-data' } });
  
      console.log("Backend response:", response.data); // Log the backend response
  
      if (response.status === 200) {
        alert(formData.isEditing ? 'Record updated successfully' : 'Data saved successfully');
        await refreshWorkClosingData();
  
        // Update the lowerData state with the new or updated record
        const updatedRecord = {
          ...formData,
          mubahisa: formData.mubahisa ? true : false, // Mark mubahisa as true if a file was uploaded
        };
  
  
        // Reset the form and close the modal
        setFormData({
          work_order_id: "",
          submission_date: "",
          resubmission_date: "",
          approval_date: "",
          mubahisa: null,
          isEditing: false,
        });
        setShowForm(false);
      } else {
        alert('Operation failed');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      alert('An error occurred while saving data.');
    }
  };
  const handleEdit = (record) => {
    setFormData({
      work_order_id: record.work_order_id,
      submission_date: record.submission_date || "", // Set existing submission date or empty if not available
      resubmission_date: record.resubmission_date || "", // Set existing resubmission date or empty
      approval_date: record.approval_date || "", // Set existing approval date or empty
      mubahisa: null, // Reset file input for new upload
      isEditing: true, // Set edit mode flag
    });
    setShowForm(true); // Open the form modal
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [comingResponse, workclosingResponse] = await Promise.all([
          axios.get("https://constructionproject-production.up.railway.app/api/work-closing/workclosing-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/work-closing/workClosing-data"),
        ]);
  
      
        const updatedData = processWorkClosingData(workclosingResponse.data);

        setLowerData(updatedData);
        setUpperData(comingResponse.data || []);
  
        // Update delivery statuses in the backend
        if (updatedData.length > 0) {
          await Promise.all(
            updatedData.map(async (record) => {
              if (record.work_order_id && record.delivery_status) {
                try {
                  await axios.put("https://constructionproject-production.up.railway.app/api/work-closing/update-wcdelivery-status", {
                    work_order_id: record.work_order_id,
                    delivery_status: record.delivery_status,
                  });
                } catch (error) {
                  console.error("Error updating delivery status:", error.response?.data || error);
                }
              }
            })
          );
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
        console.error("Error fetching work closing data:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []); // Ensure dependency array is empty to prevent infinite loops
  
  const handleAddData = (record) => {
    console.log("Add Data Clicked:", record);
    setFormData({ ...formData, work_order_id: record.work_order_id });
    setShowForm(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      alert('Please select a file.');
      return;
    }
    
    // Ensure both certificates are set separately
    if (e.target.name === 'mubahisa') {
      setFormData((prevData) => ({
        ...prevData,
        mubahisa: file,
      }));
    
    }
  };
  
  // const handleSave = async (e) => {
  //   e.preventDefault();
  
  //   if (!formData.mubahisa) {
  //     alert("Please upload the required file.");
  //     return;
  //   }
  
  //   try {
  //     const formDataWithFile = new FormData();
  //     formDataWithFile.append("mubahisa", formData.mubahisa);
  //     formDataWithFile.append("work_order_id", formData.work_order_id);
  //     formDataWithFile.append("submission_date", formData.submission_date);
  //     formDataWithFile.append("resubmission_date", formData.resubmission_date);
  //     formDataWithFile.append("approval_date", formData.approval_date);
  
  //     const response = await axios.post(
  //       "https://constructionproject-production.up.railway.app/api/work-closing/upload-and-save-wcdocument",
  //       formDataWithFile,
  //       { headers: { "Content-Type": "multipart/form-data" } }
  //     );
  
  //     if (response.data.success) {
  //       alert("File uploaded and data saved successfully.");
  //       setShowForm(false);
  //       setFormData({
  //         work_order_id: "",
  //         submission_date: "",
  //         resubmission_date: "",
  //         approval_date: "",
  //         mubahisa: "",
  //       });
  
  //       // Refresh data
  //       const [comingResponse, workclosingResponse] = await Promise.all([
  //         axios.get("https://constructionproject-production.up.railway.app/api/work-closing/workclosing-coming"),
  //         axios.get("https://constructionproject-production.up.railway.app/api/work-closing/workClosing-data"),
  //       ]);
  //       setUpperData(comingResponse.data || []);
  //       setLowerData(workclosingResponse.data || []);
  //     } else {
  //       alert("Failed to upload the file.");
  //     }
  //   } catch (error) {
  //     console.error("Error uploading file and saving data:", error);
  //     alert("Failed to upload file and save data. Please try again.");
  //   }
  // };
  
  
  
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



//   const handleSaveData = async (e) => {
//     e.preventDefault();
//     try {
//       await axios.post("https://constructionproject-production.up.railway.app/api/work-closing/save-permission_closing", formData);
//       setShowForm(false);
//       setFormData({
//         work_order_id: "",
//         permission_number: "",
//         closing_date: "",
//         penalty_reason: "",
//         penalty_amount: "",
//       });

//       const [comingResponse, workclosingResponse] = await Promise.all([
//         axios.get("https://constructionproject-production.up.railway.app/api/work-closing/permissionclosing-coming"),
//         axios.get("https://constructionproject-production.up.railway.app/api/work-closing/PermissionClosing-data"),
//       ]);
//       setUpperData(comingResponse.data || []);
//       setLowerData(workclosingResponse.data || []);
//     } catch (error) {
//       console.error("Error saving permission data:", error);
//     }
//   };
  

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
      await axios.post("https://constructionproject-production.up.railway.app/api/work-closing/update-wcdepartment", {
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
      <Typography variant="h3" color="primary">Welcome to the Work Closing Department</Typography>

      {/* Upper Section: Displaying Incoming Permission Data */}
      <Box className="survey-data-box" sx={{ padding: 2 }}>
        <Paper className="survey-paper">
          <Typography variant="h5">Load Incoming Work Closing Data</Typography>
          {upperData.length === 0 ? (
            <Typography>No incoming Work  closing data available.</Typography>
          ) : (
            upperData.map((record) => (
              <Box key={record.work_order_id} sx={{ marginBottom: 2 }}>
                <Typography><strong>Work Order:</strong> {record.work_order_id}</Typography>
                <Typography><strong>Job Type:</strong> {record.job_type}</Typography>
                <Typography><strong>Sub Section:</strong> {record.sub_section}</Typography>
                <Typography>
                      {(record.file_path || record.survey_file_path || record.Document) ? (
                        <a href={`https://constructionproject-production.up.railway.app/api/work-closing/workclosing_download/${record.work_order_id}`} download>
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
          <Typography variant="h5">Load Work Closing Data</Typography>
          {lowerData.length === 0 ? (
            <Typography>No Work Closing data available.</Typography>
          ) : (
            <TableContainer className="survey-table-container">
              <Table className="survey-table">
                <TableHead>
                  <TableRow>
                    {['Work Order ID', 'Job Type', 'Sub Section', 'Submission Date','Resubmission Date', 'Approval Date', 'Mubahisa'].map((header) => (
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
                      <TableCell>{new Date(record.submission_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(record.resubmission_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(record.approval_date).toLocaleDateString()}</TableCell>
                      <TableCell> {record.mubahisa ? "✅" : "❌"}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleEdit(record)}
                            sx={{ backgroundColor: '#6a11cb', color: 'white', '&:hover': { backgroundColor: 'black' } }}
                            >
                            Edit
                          </Button>
                        </TableCell>
                      {/* <TableCell>{record.remaining_days} days left</TableCell> */}
                      {/* <TableCell>
                        <Button variant="contained" color="secondary" onClick={() => alert('Send to next department')}>
                          Send Invoice
                        </Button>
                      </TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>

      {/* Modal Form for Adding Work Closing Data */}
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
            <Typography variant="h6" gutterBottom>Work Closing Data Form</Typography>
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
                label="Submission Date"
                name="submission_date"
                value={formData.submission_date}
                onChange={handleChange}
                fullWidth
                margin="normal"
                variant="outlined"
                type="date"
                InputLabelProps={{ shrink: true }}

              />
              <TextField
                label="ReSubmission Date"
                name="resubmission_date"
                value={formData.resubmission_date}
                onChange={handleChange}
                fullWidth
                margin="normal"
                variant="outlined"
                type="date"
                InputLabelProps={{ shrink: true }}

              />
              <TextField
                label="Approval Date"
                name="approval_date"
                value={formData.approval_date}
                onChange={handleChange}
                fullWidth
                margin="normal"
                variant="outlined"
                type="date"
                InputLabelProps={{ shrink: true }}

              />     
             <input
                type="file"
                name="mubahisa"
                onChange={(e) => setFormData({ ...formData, mubahisa: e.target.files[0] })}
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

export default WorkClosing;
