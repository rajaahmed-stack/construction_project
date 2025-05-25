import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Box, Typography, Paper, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Modal, TextField } from "@mui/material";
import "../styles/permissionclosing.css";


const processWorkClosingData = (data) => {
  const today = new Date();
  return data.map((record) => {
    const wcCreatedAt = record.wc_created_at ? new Date(record.wc_created_at) : null;
    const pcCreatedAt = record.pc_created_at ? new Date(record.pc_created_at) : null;

    if (wcCreatedAt && pcCreatedAt) {
      const deadline = new Date(pcCreatedAt);
      deadline.setDate(deadline.getDate() + 2);

      let statusColor = '';
      let deliveryStatus = 'On Time';

      if (wcCreatedAt > deadline) {
        // statusColor = 'red';
        deliveryStatus = 'Delayed';
      } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
        // statusColor = 'yellow';
        deliveryStatus = 'Near Deadline';
      } else {
        // statusColor = 'green';
        deliveryStatus = 'On Time';
      }

      return { ...record, deadline, statusColor, delivery_status: deliveryStatus };
    }

    // Return the record anyway, with default values
    return { ...record, delivery_status: 'Not Enough Info', statusColor: 'gray' };
  });
};
const WorkClosing = () => {
  const [upperData, setUpperData] = useState([]);
  const [lowerData, setLowerData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [alertData, setAlertData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    work_order_id: "",
    // submission_date: "",
    // resubmission_date: "",
    // approval_date: "",
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
  const retryFetchData = async (retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        await refreshWorkClosingData();
        return; // Exit if successful
      } catch (error) {
        console.error(`Retry ${i + 1} failed:`, error);
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay)); // Wait before retrying
        }
      }
    }
    alert("Failed to fetch updated data after saving. Please refresh the page.");
  };
  const refreshWorkClosingData = async () => {
    try {
      setLoading(true);
      const [comingResponse, workclosingResponse] = await Promise.all([
        axios.get("https://constructionproject-production.up.railway.app/api/work-closing/workclosing-coming"),
        axios.get("https://constructionproject-production.up.railway.app/api/work-closing/workClosing-data"),
      ]);
  
      const updatedData = processWorkClosingData(workclosingResponse.data);
  
      setUpperData(comingResponse.data || []);
      setLowerData(updatedData);
  
      // Optionally update delivery status again
      await Promise.all(updatedData.map(async (record) => {
        if (record.work_order_id && record.delivery_status) {
          try {
            await axios.put("https://constructionproject-production.up.railway.app/api/work-closing/update-wcdelivery-status", {
              work_order_id: record.work_order_id,
              delivery_status: record.delivery_status,
            });
          } catch (error) {
            console.error("Error updating delivery status:", error);
          }
        }
      }));
  
      setAlertData(updatedData.filter((r) => r.statusColor !== ""));
    } catch (error) {
      console.error("Error refreshing work closing data:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };
  
  const handleSave = async (e) => {
    e.preventDefault();
  
    const requiredFields = ['work_order_id'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill all the fields. Missing: ${field}`);
        return;
      }
    }
  
    const formDataWithFile = new FormData();
    formDataWithFile.append('work_order_id', formData.work_order_id);
  
    if (files.length === 0) {
      alert("Please select at least one file.");
      return;
    }
  
    // Append multiple files
    for (let i = 0; i < files.length; i++) {
      formDataWithFile.append('mubahisa', files[i]);
    }
  
    const url = formData.isEditing
      ? `https://constructionproject-production.up.railway.app/api/work-closing/edit-workclosing/${formData.work_order_id}`
      : 'https://constructionproject-production.up.railway.app/api/work-closing/upload-and-save-wcdocument';
  
    try {
      const response = formData.isEditing
        ? await axios.put(url, formDataWithFile, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await axios.post(url, formDataWithFile, { headers: { 'Content-Type': 'multipart/form-data' } });
  
      if (response.status === 200) {
        alert(formData.isEditing ? 'Record updated successfully' : 'Data saved successfully');
  
        // ✅ Update the lowerData state locally
        setLowerData((prevData) => [
          ...prevData,
          {
            work_order_id: formData.work_order_id,
            mubahisa: true, // Mark as uploaded
          },
        ]);
  
        // ✅ Refresh data from the backend with retries
        await retryFetchData();
  
        // ✅ Reset the form
        setFormData({
          work_order_id: "",
          mubahisa: null,
          isEditing: false,
        });
        setFiles([]); // Clear selected files after successful save
  
        // ✅ Close the modal
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
      // submission_date: record.submission_date || "", // Set existing submission date or empty if not available
      // resubmission_date: record.resubmission_date || "", // Set existing resubmission date or empty
      // approval_date: record.approval_date || "", // Set existing approval date or empty
      mubahisa: null, // Reset file input for new upload
      isEditing: true, // Set edit mode flag
    });
    setFiles([]); // ✅ Clear selected files after successful save
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
  const handleRemoveFile = (indexToRemove) => {
    setFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
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
  {record.job_type === "Cabinet" || record.job_type === "Meter" ? (
    record.file_path ? (
      <a
        href={`https://constructionproject-production.up.railway.app/api/work-closing/workclosing2_download/${record.work_order_id}`}
        download
        style={{ color: "#1976d2", textDecoration: "none" }}
      >
        ✅ 📂 E&M Download
      </a>
    ) : (
      "❌ No File"
    )
  ) : (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {[
        { label: "Work Receiving Files", key: "file_path", downloadId: "workclosing1_download" },
        { label: "Survey Files", key: "survey_file_path", downloadId: "workclosing3_download" },
        { label: "Permission Files", key: "Document", downloadId: "workclosing4_download" },
        { label: "Safety Signs", key: "safety_signs", downloadId: "workclosing5_download" },
        { label: "Safety Barriers", key: "safety_barriers", downloadId: "workclosing6_download" },
        { label: "Safety Lights", key: "safety_lights", downloadId: "workclosing7_download" },
        { label: "Safety Boards", key: "safety_boards", downloadId: "workclosing8_download" },
        { label: "Safety Permissions", key: "permissions", downloadId: "workclosing9_download" },
        { label: "Safety Documentation", key: "safety_documentation", downloadId: "workclosing10_download" },
        { label: "Work Exe Asphalt", key: "asphalt", downloadId: "workclosing11_download" },
        { label: "Work Exe Milling", key: "milling", downloadId: "workclosing12_download" },
        { label: "Work Exe Concrete", key: "concrete", downloadId: "workclosing13_download" },
        { label: "Work Exe Sand", key: "sand", downloadId: "workclosing14_download" },
        { label: "Work Exe Cable lying", key: "cable_lying", downloadId: "workclosing15_download" },
        { label: "Work Exe Trench", key: "trench", downloadId: "workclosing16_download" },
        { label: "Work Closing Certificate", key: "work_closing_certificate", downloadId: "workclosing23_download" },
        { label: "Final Closing Certificate", key: "final_closing_certificate", downloadId: "workclosing24_download" },
      ].map((item, i) => (
        <Box key={i}>
          <strong>{item.label}:</strong>{" "}
          {record[item.key] ? (
            <a
              href={`https://constructionproject-production.up.railway.app/api/work-closing/${item.downloadId}/${record.work_order_id}`}
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
                    {['Sr.No','Work Order ID', 'Job Type', 'Sub Section',  'Mubahisa'].map((header) => (
                      <TableCell key={header} className="survey-table-header">
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lowerData.map((record,index) => (
                    <TableRow key={record.work_order_id}>
                      <TableCell>{index +1}</TableCell>
                      <TableCell>{record.work_order_id}</TableCell>
                      <TableCell>{record.job_type || record.eam_job_type}</TableCell>
                      <TableCell>{record.sub_section || record.eam_sub_section}</TableCell>
                      {/* <TableCell>{new Date(record.submission_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(record.resubmission_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(record.approval_date).toLocaleDateString()}</TableCell> */}
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
              {/* <TextField
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

              />      */}
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
  </Container>
  );
};

export default WorkClosing;
