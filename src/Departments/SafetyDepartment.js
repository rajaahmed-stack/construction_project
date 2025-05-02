import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Grid, Paper, Typography, Table, TableHead, TableBody, TableRow, TableCell, Button, TextField, Input, Card, CardContent 
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ReactDOM from "react-dom";
import "../styles/safety.css";

const SafetyDepartment = () => {
  console.log("SafetyDepartment component rendered.");
  const [upperData, setUpperData] = useState([]);
  const [lowerData, setLowerData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [alertData, setAlertData] = useState([]);
  const [loading, setLoading] = useState(true);
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
  
        const today = new Date();
  
        const updatedData = permissionResponse.data.map((record) => {
          if (record.safety_created_at && record.permission_created_at) {
            const workCreatedAt = new Date(record.permission_created_at);
            const surveyCreatedAt = new Date(record.safety_created_at);
            const deadline = new Date(workCreatedAt);
            deadline.setDate(deadline.getDate() + 2);
  
            let statusColor = "";
            let deliveryStatus = "On Time";
  
            if (surveyCreatedAt > deadline) {
              statusColor = "red";
              deliveryStatus = "Delayed";
            } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
              statusColor = "yellow";
              deliveryStatus = "Near Deadline";
            } else {
              statusColor = "green";
              deliveryStatus = "On Time";
            }
  
            return { ...record, deadline, statusColor, delivery_status: deliveryStatus };
          }
          return record;
        });
  
        setLowerData(updatedData);
        setUpperData(comingResponse.data || []);
  
        // Update delivery statuses in the backend
        if (updatedData.length > 0) {
          await Promise.all(
            updatedData.map(async (record) => {
              if (record.work_order_id && record.delivery_status) {
                try {
                  await axios.put("https://constructionproject-production.up.railway.app/api/safety/update-sdelivery-status", {
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
          alert(`Warning: Some work orders are close to or past their deadline.\n\n${alertMessage}`);
        }
      } catch (error) {
        console.error("Error fetching safety data:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, []); // Ensure dependency array is empty to prevent infinite loops
  

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
  const handleFileChange = (e) => {
    const file = e.target.files[0]; // Get the selected file
  
    if (file) {
      // Create FormData object to handle file upload
      const formData = new FormData();
      formData.append('file', file);
  
      // Send the file to the server to be saved
      axios.post("https://constructionproject-production.up.railway.app/api/safety/upload", formData)
        .then(response => {
          // Update formData with the file path returned from the server
          const { filename } = response.data; // Ensure server sends back the filename or file path
          setFormData((prevData) => ({
            ...prevData,
            safetySigns: { filename: filename, path: `uploads/${filename}` },
          }));
        })
        .catch(error => console.error("Error uploading file:", error));
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
  
  

  const handleFileUpload = async (fieldName, file) => {
    const formDataWithFile = new FormData();
    formDataWithFile.append("file", file);
    console.log("File to be uploaded:", file);  // Log the file being uploaded
  
    try {
      const response = await axios.post(`https://constructionproject-production.up.railway.app/api/safety/upload-safety-file/${fieldName}`, formDataWithFile);
      console.log("File upload response:", response.data); // Log the response from backend
      setFormData((prevData) => ({
        ...prevData,
        [fieldName]: response.data.filePath,  // Update state with file path
      }));
      handleTaskCompletion(`${fieldName}Completed`);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };
  const handleTaskCompletion = (fieldName) => {
    setFormData((prevData) => ({
      ...prevData,
      [fieldName]: true,
    }));
  
    setCompletedTasks((prev) => {
      const newCompletedTasks = prev + 1;
      if (newCompletedTasks === totalTasks) {
        setIsSendEnabled(true); // Enable send button when all tasks are completed
      }
      return newCompletedTasks;
    });
  };
  

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value || "", // Make sure that null or undefined values are handled
    }));
  };
  const handleSaveData = async () => {
    try {
      // Ensure Work Order ID is available
      const workOrderId = lowerData[0]?.work_order_id;
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      // Validate form data
      if (!formData.siteRecheckingDate || !formData.remarks || !formData.safetyPenalties) {
        alert("Please fill all required fields before saving!");
        return;
      }
  
      // Prepare the data to send
      const dataToSend = {
        site_rechecking_date: formData.siteRecheckingDate || null,
        remarks: formData.remarks,
        safety_penalties: formData.safetyPenalties,
        work_order_id: workOrderId,
      };
  
      // Log the data being sent
      console.log("Data being sent:", dataToSend);
  
      // Send POST request to save data
      const response = await axios.post("https://constructionproject-production.up.railway.app/api/safety/save-safety", dataToSend);
  
      // Check the response and inform the user
      console.log("Server response:", response.data);
      alert("Data saved successfully!");
  
      // Reset form data after successful submission
      setFormData({
        siteRecheckingDate: "",
        remarks: "",
        safetyPenalties: "",
      });
  
    } catch (error) {
      console.error("Error saving data:", error);
      if (error.response) {
        // Server responded with an error
        alert("Error from server: " + error.response.data);
      } else if (error.request) {
        // No response from server
        alert("No response from server.");
      } else {
        // Other errors
        alert("Error: " + error.message);
      }
    }
  };
  
  const handleSaveSafetySign = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        safety_signs: formData.safetySigns ? `uploads/${formData.safetySigns.filename}` : null,
        safety_signs_completed: formData.safetySignsCompleted,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://constructionproject-production.up.railway.app/api/safety/save-safety-signs", dataToSend);
  
      alert(`${field} saved successfully!`);
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
        safety_barriers: formData.safetyBarriers ? `uploads/${formData.safetyBarriers.filename}` : null,
        safety_barriers_completed: formData.safetyBarriersCompleted,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://constructionproject-production.up.railway.app/api/safety/save-safety-barriers", dataToSend);
  
      alert(`${field} saved successfully!`);
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
  
      await axios.post("https://constructionproject-production.up.railway.app/api/safety/save-safety-lights", dataToSend);
  
      alert(`${field} saved successfully!`);
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
        safety_boards_completed: formData.safetyBoardsCompleted,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://constructionproject-production.up.railway.app/api/safety/save-safety-boards", dataToSend);
  
      alert(`${field} saved successfully!`);
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
  const handleSaveSafetyDocumentation = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        safety_documentation: formData.safetyDocumentation ? `uploads/${formData.safetyDocumentation.filename}` : null,
        safety_documentation_completed: formData.safetyDocumentationCompleted,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://constructionproject-production.up.railway.app/api/safety/save-safety-document", dataToSend);
  
      alert(`${field} saved successfully!`);
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
  const handleSaveSafetyPermission = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        permissions: formData.permissions ? `uploads/${formData.permissions.filename}` : null,
        permissions_completed: formData.permissionsCompleted,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://constructionproject-production.up.railway.app/api/safety/save-safety-permission", dataToSend);
  
      alert(`${field} saved successfully!`);
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
            {["Work Order ID", "Job Type", "Sub Section", "Permission No.", "File", "Action"].map((header) => (
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
              <TableCell>
                {record.Document ? (
                  <a href={`https://constructionproject-production.up.railway.app/api/safety/Safety_download/${record.work_order_id}`} download>
                    ✅ 📂 Download
                  </a>
                ) : (
                  "❌ No File"
                )}
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
                    { label: "Safety Signs", key: "safety_signs_completed" },
                    { label: "Safety Barriers", key: "safety_barriers_completed" },
                    { label: "Safety Lights", key: "safety_lights_completed" },
                    { label: "Safety Boards", key: "safety_board_completed" },
                    { label: "Safety Documentation", key: "safety_documentation_completed" },
                    { label: "Safety Permission", key: "permissions_completed" },
                  ].map(({ label, key }) => (
                    <Grid item xs={6} key={key}>
                      <Typography>
                        <strong>{label}:</strong>{" "}
                        {record[key] ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>

                {/* File Upload Section */}
                <Grid container spacing={2} sx={{ marginTop: "10px" }}>
                  {[
                    ...(record.safety_signs_completed !== 1 
                      ? [{ label: "Safety Signs", handler: handleSaveSafetySign, key: "safetySigns", disabled: record.safety_signs_completed }]
                      : []),
                    ...(record.safety_barriers_completed !==1 
                      ? [{ label: "Barriers", handler: handleSaveSafetyBarriers, key: "safetyBarriers", disabled: record.safety_barriers_completed }]
                      : []),
                    ...(record.safety_lights_completed !==1
                      ?[{ label: "Lights", handler: handleSaveSafetyLights, key: "safetyLights", disabled: record.safety_lights_completed }]
                      :[]),
                    ...(record.safety_board_completed !==1
                      ?[{ label: "Boards", handler: handleSaveSafetyBoards, key: "safetyBoards", disabled: record.safety_board_completed }]
                      :[]),
                    ...(record.safety_documentation_completed !==1
                      ?[{ label: "Safety Documentation", handler: handleSaveSafetyDocumentation, key: "safetyDocumentation", disabled: record.safety_documentation_completed }]
                      :[]),
                    ...(record.permissions_completed !==1
                      ?[{ label: "Safety Permission", handler: handleSaveSafetyPermission, key: "safetyPermission", disabled: record.permissions_completed }]
                      :[]),
                  ].map(({ label, handler, key, disabled }) => (
                    <Grid item xs={6} key={key}>
                      <Button
                        variant="contained"
                        component="label"
                        startIcon={<CloudUploadIcon />}
                        disabled={disabled}
                      >
                        Upload {label}
                        <input type="file" hidden onChange={(e) => handleFileUpload(key, e.target.files[0])} />
                      </Button>
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
                    ) : null}  {/* Instead of [] */}
                  </Grid>
                  <Grid item xs={6}>
                  {record.safety_penalties == null ? (
                    <TextField
                      fullWidth
                      label="Safety Penalties"
                      name="safetyPenalties"
                      onChange={handleChange}
                      value={formData.safetyPenalties}
                    />  ) : null}  {/* Instead of [] */}
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
                    /> ) : null}  {/* Instead of [] */}
                  </Grid>
                </Grid>

                {/* Action Buttons */}
              
                <Grid container spacing={2} sx={{ marginTop: "10px" }}>
                  
                  <Grid item>
                    <Button variant="contained" color="success" onClick={handleSaveData}>
                      Save All Data
                    </Button>
                  </Grid>
                 
{/*                  
                  <TableCell>
                  {record.current_department !== "WorkExecution" ? (
                    <Button variant="contained" color="secondary" onClick={() => handleSendToNext(record.work_order_id)}>
                      Send to Work Execution
                    </Button>
                  ) : null}
                </TableCell> */}


                  
                </Grid>
              </CardContent>
            </Card>
          ))
        )}
      </Paper>
    </Grid>
  </Grid>
);
};

export default SafetyDepartment;
