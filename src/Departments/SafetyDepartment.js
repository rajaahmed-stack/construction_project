import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Grid, Paper, Typography, Table, TableHead, TableBody, TableRow, TableCell, Button, TextField, Input, Card, CardContent, Snackbar 
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddIcon from "@mui/icons-material/Add";
import ReactDOM from "react-dom";
import "../styles/safety.css";
import CloseIcon from '@mui/icons-material/Close'; // Make sure this is imported


const processSafetyData = (data) => {
  const today = new Date();
  return data.map((record) => {
    if (record.safety_created_at && record.permission_created_at) {
      const workCreatedAt = new Date(record.permission_created_at);
      const surveyCreatedAt = new Date(record.safety_created_at);
      const deadline = new Date(workCreatedAt);
      deadline.setDate(deadline.getDate() + 5);

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

const SafetyDepartment = () => {
  console.log("SafetyDepartment component rendered.");
  const [upperData, setUpperData] = useState([]);
  const [lowerData, setLowerData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [alertData, setAlertData] = useState([]);
  const [loading, setLoading] = useState(true);
   const [snackbarMessage, setSnackbarMessage] = useState('');
    const [openSnackbar, setOpenSnackbar] = useState(false);
  const [formData, setFormData] = useState({
    safetySigns: null,
    safetySignsCompleted: false,
    safetyBarriers: null,
    safetyBarriersCompleted: false,
    safetyLights: null,
    safetyLightsCompleted: false,
    safetyBoards: null,
    safetyBoardCompleted: false,
    permissions: null,
    permissionsCompleted: false,
    safetyDocumentation: null,
    safetyDocumentationCompleted: false,
    siteRecheckingDate: "",
    remarks: "",
    safetyPenalties: "",
  });
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(12);
  const [isSendEnabled, setIsSendEnabled] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({});


  // Check if timer is saved in localStorage or set it to 7 days if not
  const savedTimer = localStorage.getItem('safetyTimer');
  const initialTimer = savedTimer ? parseInt(savedTimer, 10) : 7 * 24 * 60 * 60; // 7 days
  const [timer, setTimer] = useState(initialTimer);



  useEffect(() => {
    // Set the timer in localStorage to persist across reloads
    localStorage.setItem('safetyTimer', timer);

    // Timer interval
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    // Trigger alert if time is low (1 day remaining)
    if (timer <= 24 * 60 * 60 && timer > 0) {
      alert("Time is running out! Only 1 day left.");
    }

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [timer]);



  useEffect(() => {
    const fetchData = async () => {
      try {
        const [comingResponse, permissionResponse] = await Promise.all([
          axios.get("https://constructionproject-production.up.railway.app/api/safety/safety-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/safety/safety-data"),
        ]);
  
        const updatedData = processSafetyData(permissionResponse.data);
  
        setLowerData(updatedData);
        setUpperData(comingResponse.data || []);
  
        // 🔁 Update delivery status for each record in backend
        await Promise.all(
          updatedData.map(async (record) => {
            if (record.work_order_id && record.delivery_status) {
              try {
                await axios.put("https://constructionproject-production.up.railway.app/api/safety/update-delivery-status", {
                  work_order_id: record.work_order_id,
                  delivery_status: record.delivery_status,
                });
              } catch (error) {
                console.error("Error updating delivery status:", error.response?.data || error.message);
              }
            }
          })
        );
  
        // 🚨 Filter alerts
        const urgentOrders = updatedData.filter((record) => record.statusColor !== "green");
        setAlertData(urgentOrders);
  
        if (urgentOrders.length > 0) {
          const alertMessage = urgentOrders
            .map((order) => `Work Order: ${order.work_order_id || "N/A"}, Status: ${order.delivery_status}`)
            .join("\n");
          // alert(`Warning: Some work orders are close to or past their deadline.\n\n${alertMessage}`);
        }
  
      } catch (error) {
        console.error("Error fetching safety data:", error.message);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []);
  
  

  const handleSendToNext = async (workOrderId) => {
    try {
      await axios.post("https://constructionproject-production.up.railway.app/api/safety/update-nextdepartment", {
        workOrderId,
      });
      alert("Work Order moved to next department.");
  
      // Fetch updated data from the database
      const updatedData = await axios.get("https://constructionproject-production.up.railway.app/api/safety/safety-data");
      
      // Filter out records that have moved to WorkExecution
      const filteredData = updatedData.data.filter(record => record.current_department !== "WorkExecution");
  
      setLowerData(filteredData);
    } catch (error) {
      console.error("Error updating department:", error);
    }
  };
  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
  
    if (file) {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
  
      axios.post("https://constructionproject-production.up.railway.app/api/safety/upload", uploadForm)
        .then((response) => {
          const { filename } = response.data;
          setFormData((prevData) => ({
            ...prevData,
            [fieldName]: { filename, path: `uploads/${filename}` },
          }));
        })
        .catch((error) => {
          console.error(`Error uploading ${fieldName}:`, error);
        });
    }
  };
  
  

  const handleAddData = async (record) => {
    const today = new Date();
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 2);
  
    let deliveryStatus = 'on time';
    if (today > deadline) {
      deliveryStatus = 'delayed';
    } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
      deliveryStatus = 'nearing deadline';
    }
  
    // Ensure `delivery_status` is included in `formData`
    const updatedFormData = { ...formData, delivery_status: deliveryStatus };
    try {
      // Sending a POST request to the backend with work_order_id in the request body
      await axios.post("https://constructionproject-production.up.railway.app/api/safety/save-safety-workorder", {
        work_order_id: record.work_order_id,
        permission_number: record.permission_number, // Pass permission_number if needed
        // Include document if needed, depending on how you're handling files
        
      }, updatedFormData);
      
  
     
  
      // Update the state after the request is successful
      setUpperData((prev) => prev.filter((item) => item.work_order_id !== record.work_order_id));
      setLowerData((prev) => [...prev, record]);
  
      // Notify the user about success
      alert("Work order saved successfully and document downloaded!");
    } catch (error) {
      console.error("Error saving work order:", error);
  
      // Enhanced error handling
      if (error.response) {
        console.error("Response data:", error.response.data);
        alert(`Error: ${error.response.data || "Failed to save work order."}`);
      } else if (error.request) {
        console.error("Request data:", error.request);
        alert("Error: No response received from the server.");
      } else {
        console.error("Error message:", error.message);
        alert(`Error: ${error.message}`);
      }
    }
  };
  
  

  // const handleFileUpload = async (fieldName, file) => {
  //   if (!file) {
  //     alert("Please select a file to upload.");
  //     return;
  //   }
  
  //   const formData = new FormData();
  //   formData.append("file", file);
  
  //   try {
  //     const response = await axios.post(
  //       `https://constructionproject-production.up.railway.app/api/safety/upload-safety-file/${fieldName}`,
  //       formData,
  //       {
  //         headers: { "Content-Type": "multipart/form-data" },
  //       }
  //     );
  
  //     if (response.data && response.data.filePath) {
  //       console.log("File upload response:", response.data);
  //       setFormData((prevData) => ({
  //         ...prevData,
  //         [fieldName]: response.data.filePath, // Store the file path
  //       }));
  //     } else {
  //       alert("File upload failed. Please try again.");
  //     }
  //   } catch (error) {
  //     console.error("Error uploading file:", error);
  //     alert("Failed to upload file. Please try again.");
  //   }
  // };
  


  const handleFileUpload = async (fieldName, files) => {
    if (!files || files.length === 0) return;
  
    const formDataWithFiles = new FormData();
  
    for (let i = 0; i < files.length; i++) {
      formDataWithFiles.append("file", files[i]);
    }
  
    try {
      const response = await axios.post(
        `https://constructionproject-production.up.railway.app/api/safety/upload-safety-files/${fieldName}`,
        formDataWithFiles,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
  
      console.log("Files upload response:", response.data);
  
      // Append new file paths to the already uploaded files
      setFormData((prevData) => ({
        ...prevData,
        [fieldName]: [
          ...(prevData[fieldName] || []),
          ...(response.data.filePaths || []),
        ],
      }));
  
      setUploadedFiles((prev) => ({
        ...prev,
        [fieldName]: [
          ...(prev[fieldName] || []),
          ...(response.data.filePaths || []),
        ],
      }));
  
      handleTaskCompletion(`${fieldName}Completed`);
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload files. Please try again.");
    }
  };
  
  
    const handleTaskCompletion = (fieldName) => {
      setFormData((prevData) => ({
        ...prevData,
        [fieldName]: true,
      }));
      setCompletedTasks((prev) => prev + 1);
      if (completedTasks + 1 === totalTasks) {
        setIsSendEnabled(true);
      }
    };
  
  
    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    };
    useEffect(() => {
      const { siteRecheckingDate, remarks, safetyPenalties } = formData;
      
      // Check if all required fields are filled
      const isValid =
        siteRecheckingDate && remarks && safetyPenalties && !isNaN(safetyPenalties) && Number(safetyPenalties) >= 0;
      
      setIsFormValid(isValid); // Update form validity state
    }, [formData]);
  
    const handleSaveData = async (workOrderId) => {
      try {
        if (!workOrderId) {
          alert("Work Order ID is missing!");
          return;
        }
    
        const { siteRecheckingDate, remarks, safetyPenalties } = formData;
    
        // Basic validations
        if (!siteRecheckingDate || !remarks || !safetyPenalties) {
          alert("Please fill all required fields before saving!");
          return;
        }
    
        // Validate site rechecking date format
        const date = new Date(siteRecheckingDate);
        if (isNaN(date.getTime())) {
          alert("Please enter a valid date for Site Rechecking Date.");
          return;
        }
    
        // Validate safety penalties - must be a positive number
        if (isNaN(safetyPenalties) || Number(safetyPenalties) < 0) {
          alert("Safety Penalties must be a valid non-negative number.");
          return;
        }
    
        // Prepare the data to send
        const dataToSend = {
          site_rechecking_date: siteRecheckingDate,
          remarks: remarks.trim(),
          safety_penalties: Number(safetyPenalties),
          work_order_id: workOrderId,
        };
    
        console.log("Data being sent:", dataToSend);
    
        // Send POST request
        const response = await axios.post(
          "https://constructionproject-production.up.railway.app/api/safety/save-safety",
          dataToSend
        );
    
        console.log("Server response:", response.data);
        alert("Data saved successfully!");
        await refreshSafetyData();

        // Update the lowerData state after saving
        setLowerData((prevData) =>
          prevData.map((item) =>
            item.work_order_id === workOrderId
              ? {
                  ...item,
                  site_rechecking_date: siteRecheckingDate,
                  safety_penalties: safetyPenalties,
                  remarks: remarks,
                }
              : item
          )
        );
    
        // Optionally reset formData
        setFormData({
          siteRecheckingDate: "",
          safetyPenalties: "",
          remarks: "",
        });
      } catch (error) {
        console.error("Error saving data:", error);
        if (error.response) {
          alert("Error from server: " + error.response.data);
        } else if (error.request) {
          alert("No response from server.");
        } else {
          alert("Error: " + error.message);
        }
      }
    };
     const refreshSafetyData = async () => {
          try {
            const [comingResponse, permissionResponse] = await Promise.all([
              axios.get("https://constructionproject-production.up.railway.app/api/safety/safety-coming"),
              axios.get("https://constructionproject-production.up.railway.app/api/safety/safety-data"),
            ]);
        
            const updatedData = processSafetyData(permissionResponse.data);
        
            setUpperData(comingResponse.data || []);
            setLowerData(updatedData);
          } catch (error) {
            console.error("Error refreshing survey data:", error);
          }
        };
    const handleSaveSafetySign = async (field, workOrderId) => { 
      try {
        if (!workOrderId) {
          alert("Work Order ID is missing!");
          return;
        }
    
        const dataToSend = {
          safety_signs: formData.safetySigns || null,
          safety_signs_completed: formData.safetySignsCompleted,
          work_order_id: workOrderId,
        };
    
        const response = await axios.post(
          "https://constructionproject-production.up.railway.app/api/safety/save-safety-signs",
          dataToSend
        );
    
        alert(`${field} saved successfully!`);
        await refreshSafetyData();
        setFormData((prevData) => ({
          ...prevData,
          [`${field}Completed`]: true,
        }));
    
        setCompletedTasks((prev) => prev + 1);
        if (completedTasks + 1 === totalTasks) {
          setIsSendEnabled(true);
        }
      } catch (error) {
        console.error("Error saving field:", error);
      }
    };
    const handleSaveSafetyBarriers = async (field, workOrderId) => { 
      try {
        if (!workOrderId) {
          alert("Work Order ID is missing!");
          return;
        }
    
        const dataToSend = {
          safety_barriers: formData.safetyBarriers || null,
          safety_barriers_completed: formData.safetyBarriersCompleted,
          work_order_id: workOrderId,
        };
    
        const response = await axios.post(
          "https://constructionproject-production.up.railway.app/api/safety/save-safety-barriers",
          dataToSend
        );
    
        alert(`${field} saved successfully!`);
        await refreshSafetyData();
        setFormData((prevData) => ({
          ...prevData,
          [`${field}Completed`]: true,
        }));
    
        setCompletedTasks((prev) => prev + 1);
        if (completedTasks + 1 === totalTasks) {
          setIsSendEnabled(true);
        }
      } catch (error) {
        console.error("Error saving field:", error);
      }
    };
    
  const handleSaveSafetyLights = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        safety_lights: formData.safetyLights ? `uploads/${formData.safetyLights.filename}` : null,
        safety_lights_completed: formData.safetyLightsCompleted,
        work_order_id: workOrderId,
      };
  
      const response = await axios.post("https://constructionproject-production.up.railway.app/api/safety/save-safety-lights", dataToSend);
  
      alert(`${field} saved successfully!`);
      await refreshSafetyData();
      setFormData((prevData) => ({
        ...prevData,
        [`${field}Completed`]: true,
      }));
  
      setCompletedTasks((prev) => prev + 1);
      if (completedTasks + 1 === totalTasks) {
        setIsSendEnabled(true);
      }
    } catch (error) {
      console.error("Error saving field:", error);
    }
  };
  
  const handleSaveSafetyBoards = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        safety_boards: formData.safetyBoards ? `uploads/${formData.safetyBoards.filename}` : null,
        safety_board_completed: true, // Mark as completed
        work_order_id: workOrderId,
      };
  
      console.log("Payload for Safety Boards:", dataToSend); // Debugging log
  
      const response = await axios.post(
        "https://constructionproject-production.up.railway.app/api/safety/save-safety-boards",
        dataToSend
      );
  
      alert(`${field} saved successfully!`);
      await refreshSafetyData();
      setFormData((prevData) => ({
        ...prevData,
        [`${field}Completed`]: true,
      }));
  
      setCompletedTasks((prev) => prev + 1);
      if (completedTasks + 1 === totalTasks) {
        setIsSendEnabled(true);
      }
    } catch (error) {
      console.error("Error saving Safety Boards:", error);
      alert("Failed to save Safety Boards. Please try again.");
    }
  };
  const handleSaveSafetyDocumentation = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        safety_documentation: formData.safetyDocumentation ? `uploads/${formData.safetyDocumentation.filename}` : null,
        safety_documentation_completed: true, // Mark as completed
        work_order_id: workOrderId,
      };
  
      console.log("Payload for Safety Documentation:", dataToSend); // Debugging log
  
      const response = await axios.post(
        "https://constructionproject-production.up.railway.app/api/safety/save-safety-document",
        dataToSend
      );
  
      alert(`${field} saved successfully!`);
      await refreshSafetyData();
      setFormData((prevData) => ({
        ...prevData,
        [`${field}Completed`]: true,
      }));
  
      setCompletedTasks((prev) => prev + 1);
      if (completedTasks + 1 === totalTasks) {
        setIsSendEnabled(true);
      }
    } catch (error) {
      console.error("Error saving Safety Documentation:", error);
      alert("Failed to save Safety Documentation. Please try again.");
    }
  };
  const handleSaveSafetyPermission = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        permissions:  formData.safetyDocumentation ? `uploads/${formData.safetyDocumentation.filename}` : null,
        permissions_completed: true, // Mark as completed
        work_order_id: workOrderId,
      };
  
      console.log("Payload for Safety Permission:", dataToSend); // Debugging log
  
      const response = await axios.post(
        "https://constructionproject-production.up.railway.app/api/safety/save-safety-permission",
        dataToSend
      );
  
      alert(`${field} saved successfully!`);
      await refreshSafetyData();
      setFormData((prevData) => ({
        ...prevData,
        [`${field}Completed`]: true,
      }));
  
      setCompletedTasks((prev) => prev + 1);
      if (completedTasks + 1 === totalTasks) {
        setIsSendEnabled(true);
      }
    } catch (error) {
      console.error("Error saving Safety Permission:", error);
      alert("Failed to save Safety Permission. Please try again.");
    }
  };
  const showSnackbar = (msg) => {
    setSnackbarMessage(msg);
    setOpenSnackbar(true);
  };
  const handleRemoveFile = (key, index) => {
    setUploadedFiles((prev) => {
      const updated = [...(prev[key] || [])];
      updated.splice(index, 1);
      return {
        ...prev,
        [key]: updated
      };
    });
  };
  
  
return (
  
  <Grid container spacing={3} sx={{ padding: "20px" }}>
    {/* Page Title */}
    <Grid item xs={12}>
      <Typography variant="h4" sx={{ textAlign: "center", fontWeight: "bold" }}>
        Welcome to the Safety Department
      </Typography>
    </Grid>

    {/* Upper Section: Incoming Safety Data */}
    <Grid item xs={12} md={5}>
  <Paper elevation={3} sx={{ padding: "20px", backgroundColor: "#f8f9fa", overflow: "auto", maxHeight: "500px" }}>
    <Typography variant="h6">Incoming Safety Data</Typography>
    {upperData.length === 0 ? (
      <Typography color="error">No safety coming data available.</Typography>
    ) : (
      <Table sx={{ minWidth: "100%" }}>
  <TableHead>
    <TableRow>
      {["Work Order ID", "Job Type", "Sub Section", "Permission No.", "Files", "Action"].map((header) => (
        <TableCell key={header} sx={{ fontWeight: "bold" }}>{header}</TableCell>
      ))}
    </TableRow>
  </TableHead>
  <TableBody>
    {upperData.map((record) => (
      <TableRow key={record.work_order_id}>
        <TableCell>{record.work_order_id}</TableCell>
        <TableCell>{record.job_type}</TableCell>
        <TableCell>{record.sub_section}</TableCell>
        <TableCell>{record.permission_number}</TableCell>
        
        {/* Combined file section */}
        <TableCell>
          <div><strong>Work Receiving Files: </strong>
            {record.file_path ? (
              <a
                href={`https://constructionproject-production.up.railway.app/api/safety/Safety1_download/${record.work_order_id}`}
                download
              >
                ✅ 📂 Download
              </a>
            ) : "❌ No File"}
          </div>
          <div><strong>Survey Files: </strong>
            {record.survey_file_path ? (
              <a
                href={`https://constructionproject-production.up.railway.app/api/safety/Safety2_download/${record.work_order_id}`}
                download
              >
                ✅ 📂 Download
              </a>
            ) : "❌ No File"}
          </div>
          <div><strong>Permission Files: </strong>
            {record.Document ? (
              <a
                href={`https://constructionproject-production.up.railway.app/api/safety/Safety3_download/${record.work_order_id}`}
                download
              >
                ✅ 📂 Download
              </a>
            ) : "❌ No File"}
          </div>
        </TableCell>
              {/* Check if Document is a Buffer or a valid image, then convert or render accordingly */}
              <TableCell>
                <Button variant="contained" color="primary" onClick={() => handleAddData(record)}>
                  Add Data
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </Paper>
</Grid>


    {/* Lower Section: Existing Safety Data */}
    <Grid item xs={12} md={7}>
      <Paper elevation={3} sx={{ padding: "20px" }}>
        <Typography variant="h6">Existing Safety Data</Typography>
        {lowerData.length === 0 ? (
          <Typography color="error">No safety data available.</Typography>
        ) : (
          lowerData.map((record) => (
            <Card key={record.work_order_id} sx={{ marginBottom: "20px", backgroundColor: "#e3f2fd" }}>
              <CardContent>
                <Typography variant="h6">
                  Work Order: {record.work_order_id}
                </Typography>
                <Typography >Job Type: {record.job_type}</Typography>
                <Typography>Sub Section: {record.sub_section}</Typography>
                <Typography>Permission No.: {record.permission_number}</Typography>
                <Typography>Site Rechecking Date.: {record.site_rechecking_date}</Typography>
                <Typography>Safety Penalties.: {record.safety_penalties}</Typography>
                <Typography>Remarks.: {record.remarks}</Typography>
                
                {/* Safety Checks */}
                <Grid container spacing={2} sx={{ marginTop: "10px" }}>
                {[
                    { label: "Safety Signs", key: ["safety_signs", "safety_signs_completed"] },
                    { label: "Safety Barriers", key: ["safety_barriers", "safety_barriers_completed"] },
                    { label: "Safety Lights", key: ["safety_lights", "safety_lights_completed"] },
                    { label: "Safety Boards", key: ["safety_boards", "safety_board_completed"] },
                    { label: "Safety Documentation", key: ["safety_documentation", "safety_documentation_completed"] },
                    { label: "Safety Permission", key: ["permissions", "permissions_completed"] },
                  ].map(({ label, key }) => {
                    const dataKey = key.find(k => record[k] !== undefined);
                  const isDone = record[dataKey];
                    return (
                      <Grid item key={label}>
                        <Typography>
                          <strong>{label}:</strong>{" "}
                            {isDone ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}
                        </Typography>
                      </Grid>
                    );
                  })}
                </Grid>

                {/* File Upload Section */}
                <Grid container spacing={2} sx={{ marginTop: "10px" }}>
                  {[
                    ...(record.safety_signs_completed !== 1 
                      ? [{ label: "Safety Signs", handler: handleSaveSafetySign, key: "safetySigns", disabled: record.safety_signs_completed || record.safety_signs }]
                      : []),
                    ...(record.safety_barriers_completed !==1 
                      ? [{ label: "Barriers", handler: handleSaveSafetyBarriers, key: "safetyBarriers", disabled: record.safety_barriers_completed || record.safety_barriers }]
                      : []),
                    ...(record.safety_lights_completed !==1
                      ?[{ label: "Lights", handler: handleSaveSafetyLights, key: "safetyLights", disabled: record.safety_lights_completed || record.safety_lights }]
                      :[]),
                    ...(record.safety_board_completed !==1
                      ?[{ label: "Boards", handler: handleSaveSafetyBoards, key: "safetyBoards", disabled: record.safety_board_completed || record.safety_boards }]
                      :[]),
                    ...(record.safety_documentation_completed !==1
                      ?[{ label: "Safety Documentation", handler: handleSaveSafetyDocumentation, key: "safetyDocumentation", disabled: record.safety_documentation_completed || record.safety_documentation }]
                      :[]),
                    ...(record.permissions_completed !==1
                      ?[{ label: "Safety Permission", handler: handleSaveSafetyPermission, key: "safetyPermission", disabled: record.permissions_completed || record.permissions }]
                      :[]),
                  ].map(({ label, handler, key, disabled }) => (
                    <Grid item xs={6} key={key}>
                     <Button
                        variant="contained"
                        component="label"
                        startIcon={<CloudUploadIcon />}
                        disabled={disabled}
                        sx={{ marginRight: 1 }}
                      >
                        Upload {label}
                        <input
                          type="file"
                          hidden
                          multiple
                          onChange={(e) => handleFileUpload(key, e.target.files)}
                        />
                      </Button>

                      {/* "+" Button to upload more files */}
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<AddIcon />}
                        disabled={disabled}
                      >
                        
                        <input
                          type="file"
                          hidden
                          multiple
                          onChange={(e) => handleFileUpload(key, e.target.files)}
                        />
                      </Button>

                      {/* Optional: Show uploaded file names */}
                      {uploadedFiles[key]?.map((filePath, index) => (
                        <div key={index} style={{ fontSize: "0.8rem" }}>
                          ✅ {filePath.split("/").pop()}
                          <CloseIcon
                            onClick={() => handleRemoveFile(key, index)}
                            sx={{
                              fontSize: 16,
                              color: "red",
                              marginLeft: 1,
                              cursor: "pointer"
                            }}
                          />
                        </div>
                      ))}
                      <Button
                        variant="outlined"
                        sx={{ marginLeft: "10px" }}
                        onClick={() => handler(key, record.work_order_id)}
                        disabled={disabled}
                      >
                        Save
                      </Button>
                    </Grid>
                  ))}
                </Grid>

                 {/* Additional Fields */}
      <Grid container spacing={2} sx={{ marginTop: "10px" }}>
        <Grid item xs={6}>
          {record.site_rechecking_date == null ? (
            <TextField
              fullWidth
              type="date"
              label="Site Rechecking Date"
              name="siteRecheckingDate"
              onChange={handleChange}
              value={formData.siteRecheckingDate}
              InputLabelProps={{ shrink: true }}
            />
          ) : null}
        </Grid>
        <Grid item xs={6}>
          {record.safety_penalties == null ? (
            <TextField
              fullWidth
              label="Safety Penalties"
              name="safetyPenalties"
              onChange={handleChange}
              value={formData.safetyPenalties}
            />
          ) : null}
        </Grid>
        <Grid item xs={12}>
          {record.remarks == null ? (
            <TextField
              fullWidth
              label="Remarks"
              name="remarks"
              onChange={handleChange}
              value={formData.remarks}
              multiline
              rows={2}
            />
          ) : null}
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Grid container spacing={2} sx={{ marginTop: "10px" }}>
        <Grid item>
          {record.site_rechecking_date == null ||
          record.safety_penalties == null ||
          record.remarks == null ? (
            <Button
              variant="contained"
              color="success"
              disabled={
                (record.site_rechecking_date == null && !formData.siteRecheckingDate) ||
                (record.safety_penalties == null && !formData.safetyPenalties) ||
                (record.remarks == null && !formData.remarks)
              }
              onClick={() => handleSaveData(record.work_order_id)}
            >
              Save All Data
            </Button>
          ) : null}
        </Grid>
      </Grid>
                 
{/*                  
                  <TableCell>
                  {record.current_department !== "WorkExecution" ? (
                    <Button variant="contained" color="secondary" onClick={() => handleSendToNext(record.work_order_id)}>
                      Send to Work Execution
                    </Button>
                  ) : null}
                </TableCell> */}


                  
              </CardContent>
            </Card>
          ))
        )}
      </Paper>
    </Grid>
     <Snackbar
                        open={openSnackbar}
                        autoHideDuration={3000}
                        onClose={() => setOpenSnackbar(false)}
                        message={snackbarMessage}
                        />
  </Grid>
);
};

export default SafetyDepartment;
