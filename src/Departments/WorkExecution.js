import React, { useState, useEffect } from "react";
import axios from "axios";
import { Grid, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, 
  Modal, Box, TextField, Card, CardContent, FormControl, InputLabel, MenuItem, Select  } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";import "../styles/workexecution.css";

const WorkExecution = () => {
  const [upperData, setUpperData] = useState([]);
  const [lowerData, setLowerData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [contractorVisible, setContractorVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertData, setAlertData] = useState([]);
  const [isRemarkUploaded, setIsRemarkUploaded] = useState(false);
  const [formData, setFormData] = useState({
    work_order_id: "",
    permission_number: "",
    receiving_date: "",
    user_type: "MMC",
    contractorName: "",
    asphalt: "",
    asphalt_completed: false,
    milling: "",
    milling_completed: false,
    concrete: "",
    Concrete_completed: false,
    deck3: "",
    deck3_completed: false,
    deck2: "",
    deck2_completed: false,
    deck1: "",
    deck1_completed: false,
    sand: "",
    sand_completed: false,
    backfilling: "",
    backfilling_completed: false,
    cable_lying: "",
    cable_lying_completed: false,
    trench: "",
    trench_completed: false,
    remark: "",
  });
  const workOrderId = lowerData[0]?.work_order_id;
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


  const formatTime = (seconds) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  };
    // Check if remark is uploaded on component mount (for page refresh)
    useEffect(() => {
      if (formData.remark) {
        setIsRemarkUploaded(true);  // Remark uploaded, disable fields
      }
    }, [formData.remark]); // Re-check when formData.remark changes
  
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [comingResponse, permissionResponse] = await Promise.all([
          axios.get("https://mmcmadina.com/api/work-execution/workExecution-coming"),
          axios.get("https://mmcmadina.com/api/work-execution/workExecution-data"),
        ]);
  
        const today = new Date();
  
        const updatedData = permissionResponse.data.map((record) => {
          if (record.safety_created_at && record.workexe_created_at) {
            const workCreatedAt = new Date(record.safety_created_at);
            const surveyCreatedAt = new Date(record.workexe_created_at);
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
  
        // ✅ Ensure `updatedData` is not empty before updating backend
        if (updatedData.length > 0) {
          console.log("Updating delivery statuses in backend...");
  
          await Promise.all(updatedData.map(async (record) => {
            if (record.work_order_id && record.delivery_status) {
              try {
                const response = await axios.put("https://mmcmadina.com/api/work-execution/update-wedelivery-status", {
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
  
          alert(`Warning: Some work orders are close to or past their deadline.\n\n${alertMessage}`);
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
    setFormData({ ...formData, work_order_id: record.work_order_id || ""  , permission_number: record.permission_number || ""});
    setShowForm(true);
  };
  
  // Handle input change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
   // Handle user type change
  const handleUserTypeChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, user_type: value, contractorName: value === "Contractor" ? "" : "N/A" });
    setContractorVisible(value === "Contractor");
  };
  const calculateProgress = (formData) => {
    const totalFields = 10;
    const completedFields = [
      formData.asphalt_completed,
      formData.milling_completed,
      formData.concrete_completed,
      formData.deck3_completed,
      formData.deck2_completed,
      formData.deck1_completed,
      formData.sand_completed,
      formData.backfilling_completed,
      formData.cable_lying_completed,
      formData.trench_completed,
    ].filter(Boolean).length;
  
    return (completedFields / totalFields) * 100;
  };
  

  // Handle form submission
  const handleSaveData = async (e) => {
    e.preventDefault();
  
    // Check required fields
    if (
      !formData.work_order_id ||
      !formData.receiving_date ||
      !formData.permission_number ||
      !formData.user_type ||
      (formData.user_type !== "MMC" && !formData.contractorName) // If user is Contractor, contractorName is required
    ) {
      alert("Please fill all required fields.");
      return;
    }
  
    setLoading(true);
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
    try {
      const response = await axios.post("https://mmcmadina.com/api/work-execution/save-workexecution-workorder", formData, updatedFormData);
  
      if (response.status === 200) {
        alert("Data saved successfully!");
        setShowForm(false);
  
        // Ensure 'record' is correctly assigned
        const updatedRecord = upperData.find((item) => item.work_order_id === formData.work_order_id);
  
        if (updatedRecord) {
          setUpperData((prev) => prev.filter((item) => item.work_order_id !== formData.work_order_id));
          setLowerData((prev) => [...prev, updatedRecord]);
        }
      }
    } catch (error) {
      console.error("Error saving work execution data:", error);
      alert("Failed to save data. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
const handleSendToNext = async (workOrderId) => {
  try {
    await axios.post("https://mmcmadina.com/api/work-execution/update-wedepartment", {
      workOrderId,
    });
    alert("Work Order moved to Permission Closing department.");
   
  } catch (error) {
    console.error("Error updating department:", error);
  }
};
const handleSaveRemainingData = async () => {
  try {
    // Ensure Work Order ID is available
    const workOrderId = lowerData[0]?.work_order_id;
    if (!workOrderId) {
      alert("Work Order ID is missing!");
      return;
    }

   
    // Prepare the data to send
    const dataToSend = {
      remark: formData.remark,
      work_order_id: workOrderId,
    };

    // Log the data being sent
    console.log("Data being sent:", dataToSend);

    // Send POST request to save data
    const response = await axios.post("https://mmcmadina.com/api/work-execution/save-remainingdata", dataToSend);

    // Check the response and inform the user
    console.log("Server response:", response.data);
    alert("Data saved successfully!");

    // Reset form data after successful submission
    setFormData({
      remark: "",
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
  if (formData.remark) {
    setIsRemarkUploaded(true);
  }  
};

  

  const handleFileUpload = async (fieldName, file) => {
    const formDataWithFile = new FormData();
    formDataWithFile.append("file", file);
    console.log("File to be uploaded:", file);  // Log the file being uploaded
  
    try {
      const response = await axios.post(`https://mmcmadina.com/api/work-execution/upload-workExecution-file/${fieldName}`, formDataWithFile);
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
   // Fetch saved data on page load (useEffect will run when the page is loaded)
   useEffect(() => {
    axios
      .get(`https://mmcmadina.com/api/work-execution/get-work-execution/${workOrderId}`)
      .then((response) => {
        if (response.data) {
          // If there's data, set it in formData state
          setFormData({
            asphalt: response.data.asphalt || "", // Use saved asphalt file name
            asphalt_completed: response.data.asphalt_completed === 1, // Convert DB value to boolean
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching work execution data:", error);
      });
  }, [workOrderId]); // This useEffect runs only when workOrderId changes
  
  const handleSaveAsphalt = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        asphalt: formData.asphalt ? `uploads/${formData.asphalt.filename}` : null,
        asphalt_completed: formData.asphalt_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://mmcmadina.com/api/work-execution/save-asphalt", dataToSend);
  
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
  const handleSaveMilling = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        milling: formData.milling ? `uploads/${formData.milling.filename}` : null,
        milling_completed: formData.milling_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://mmcmadina.com/api/work-execution/save-milling", dataToSend);
  
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
  const handleSaveConcrete = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        concrete: formData.concrete ? `uploads/${formData.concrete.filename}` : null,
        concrete_completed: formData.concrete_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://mmcmadina.com/api/work-execution/save-concrete", dataToSend);
  
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
  
  const handleSaveDeck3 = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        deck3: formData.deck3 ? `uploads/${formData.deck3.filename}` : null,
        deck3_completed: formData.deck3_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://mmcmadina.com/api/work-execution/save-deck3", dataToSend);
  
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
  
  const handleSaveDeck2 = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        deck2: formData.deck2 ? `uploads/${formData.deck2.filename}` : null,
        deck2_completed: formData.deck2_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://mmcmadina.com/api/work-execution/save-deck2", dataToSend);
  
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
  
  const handleSaveDeck1 = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        deck1: formData.deck1 ? `uploads/${formData.deck1.filename}` : null,
        deck1_completed: formData.deck1_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://mmcmadina.com/api/work-execution/save-deck1", dataToSend);
  
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
  const handleSaveSand = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        sand: formData.sand ? `uploads/${formData.sand.filename}` : null,
        sand_completed: formData.sand_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://mmcmadina.com/api/work-execution/save-sand", dataToSend);
  
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
  const handleSaveBackFilling = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        backfilling: formData.backfilling ? `uploads/${formData.backfilling.filename}` : null,
        backfilling_completed: formData.backfilling_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://mmcmadina.com/api/work-execution/save-backfilling", dataToSend);
  
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
  const handleSaveCableLying = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        cable_lying: formData.cable_lying ? `uploads/${formData.cable_lying.filename}` : null,
        cable_lying_completed: formData.cable_lying_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://mmcmadina.com/api/work-execution/save-cable_lying", dataToSend);
  
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
  const handleSaveTrench = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        trench: formData.trench ? `uploads/${formData.trench.filename}` : null,
        trench_completed: formData.trench_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://mmcmadina.com/api/work-execution/save-trench", dataToSend);
  
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
          Welcome to the Work Execution Department
        </Typography>
      </Grid>

      {/* Upper Section: Incoming Work Execution Data */}
      <Grid item xs={12} md={5}>
  <Paper elevation={3} sx={{ padding: "20px", backgroundColor: "#f8f9fa" }}>
    <Typography variant="h6">Incoming Work Execution Data</Typography>
    {upperData.length === 0 ? (
      <Typography color="error">No Work Execution coming data available.</Typography>
    ) : (
      <Table sx={{ width: "100%" }}>
        <TableHead>
          <TableRow>
            {["Work Order ID", "Job Type", "Sub Section", "Permission No.", "File", "Action"].map((header) => (
              <TableCell key={header} sx={{ fontWeight: "bold", padding: "8px" }}>
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {upperData.map((record, index) => (
            <TableRow key={index}>
              <TableCell sx={{ padding: "8px" }}>{record.work_order_id}</TableCell>
              <TableCell sx={{ padding: "8px" }}>{record.job_type}</TableCell>
              <TableCell sx={{ padding: "8px" }}>{record.sub_section}</TableCell>
              <TableCell sx={{ padding: "8px" }}>{record.permission_number}</TableCell>
              <TableCell sx={{ padding: "8px" }}>
                {(record.file_path || record.survey_file_path) ? (
                  <a href={`https://mmcmadina.com/api/work-execution/workexe_download/${record.work_order_id}`} download>
                    ✅ 📂 Download
                  </a>
                ) : (
                  "❌ No File"
                )}
              </TableCell>

              <TableCell sx={{ padding: "8px", textAlign: "center" }}>
                <Button variant="contained" color="primary" sx={{ minWidth: "60px" }} onClick={() => handleAddData(record)}>
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

      {/* Lower Section: Existing Work Execution Data */}
      <Grid item xs={12} md={7}>
        <Paper elevation={3} sx={{ padding: "20px" }}>
          <Typography variant="h6">Existing Work Execution Data</Typography>
          {lowerData.length === 0 ? (
            <Typography color="error">No Work Execution data available.</Typography>
          ) : (
            lowerData.map((record, index) => (
              <Card key={index} sx={{ marginBottom: "20px", backgroundColor: "#e3f2fd" }}>
                <CardContent>
                  <Typography variant="h6">Work Order: {record.work_order_id}</Typography>
                  <Typography variant="h6">Job Type: {record.job_type}</Typography>
                  <Typography variant="h6">Sub Section: {record.sub_section}</Typography>
                  <Typography variant="h6">Permission No.: {record.permission_number}</Typography>
                  <Typography variant="h6">Receiving Date: {record.receiving_date}</Typography>
                  <Typography variant="h6">User Type: {record.user_type}</Typography>
                  {record.user_type !== "MMC" && <Typography variant="h6">Contractor Name: {record.Contractor_name}</Typography>}
                  <Typography variant="h6">Execution Status</Typography>
                <Grid container direction="row" spacing={1}>
                  {[
                    { label: "Asphalt", key: "asphalt_completed" },
                    { label: "Milling", key: "milling_completed" },
                    { label: "Concrete", key: "Concrete_completed" },
                    { label: "Deck3", key: "deck3_completed" },
                    { label: "Deck2", key: "deck2_completed" },
                    { label: "Deck1", key: "deck1_completed" },
                    { label: "Sand", key: "sand_completed" },
                    { label: "Backfilling", key: "backfilling_completed" },
                    { label: "Cable Lying", key: "cable_lying_completed" },
                    { label: "Trench", key: "trench_completed" },
                  ].map(({ label, key }) => (
                    <Grid item key={key}>
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
                  ...(record.asphalt_completed !==1 
                    ?[{ label: "Asphalt", handler: handleSaveAsphalt, key: "asphalt", disabled: record.asphalt_completed }]
                    :[]),
                 ...(record.milling_completed !==1
                  ?[{ label: "Milling", handler: handleSaveMilling, key: "milling" , disabled: record.milling_completed}]
                  :[]),
                ...(record.Concrete_completed !==1
                  ?[{ label: "Concrete", handler: handleSaveConcrete, key: "concrete",  disabled: record.Concrete_completed }]
                  :[]),
                ...(record.deck3_completed !==1
                  ?[{ label: "Deck 3", handler: handleSaveDeck3, key: "deck3",  disabled: record.deck3_completed }]
                  :[]),
                ...(record.deck2_completed !==1
                  ?[{ label: "Deck 2", handler: handleSaveDeck2, key: "deck2",  disabled: record.deck2_completed }]
                  :[]),
                ...(record.deck1_completed !==1
                  ?[{ label: "Deck 1", handler: handleSaveDeck1, key: "deck1",  disabled: record.deck1_completed }]
                  :[]),
                ...(record.sand_completed !==1
                  ?[{ label: "Sand", handler: handleSaveSand, key: "sand",  disabled: record.sand_completed }]
                  :[]),
                ...(record.backfilling_completed !==1
                  ?[{ label: "Backfilling", handler: handleSaveBackFilling, key: "backfilling",  disabled: record.backfilling_completed }]
                  :[]),
                ...(record.cable_lying_completed !==1
                  ?[{ label: "Cable Lying", handler: handleSaveCableLying, key: "cable_lying",  disabled: record.cable_lying_completed }]
                  :[]),
                ...(record.trench_completed !== 1
                  ?[{ label: "Trench", handler: handleSaveTrench, key: "trench",  disabled: record.trench_completed }]
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

              <Grid item xs={6}>
        <TextField
          fullWidth
          label="Remark"
          name="remark"
          onChange={handleChange}
          value={formData.remark}
          disabled={isRemarkUploaded}  // Disable if remark is uploaded
        />
      </Grid>

      {/* Action Buttons */}
      <Grid container spacing={2} sx={{ marginTop: "10px" }}>
        <Grid item>
          <Button
            variant="contained"
            color="success"
            onClick={handleSaveRemainingData}
            disabled={isRemarkUploaded}  // Disable if remark is uploaded
          >
            Save All Data
          </Button>
        </Grid>
                    {/* {record.current_department !== "PermissionClosing" && (
                      <Grid item>
                        <Button variant="contained" color="secondary" onClick={() => handleSendToNext(record.work_order_id)}>
                          Send to Permission Closing
                        </Button>
                      </Grid>
                    )} */}
                  </Grid>
                </CardContent>
              </Card>
            ))
          )}
        </Paper>
      </Grid>

      {/* Modal Form for Adding Work Execution Data */}
      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <Box
            sx={{
              width: { xs: "90%", sm: "400px" },
              maxHeight: "80vh",
              backgroundColor: "white",
              padding: 3,
              borderRadius: 2,
              boxShadow: 3,
              overflowY: "auto",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Work Execution Data Form
            </Typography>
            <form onSubmit={handleSaveData}>
              <TextField label="Work Order Number" name="work_order_id" value={formData.work_order_id} fullWidth margin="normal" variant="outlined" InputProps={{ readOnly: true }} />
              <TextField label="Permission Number" name="permission_number" value={formData.permission_number} onChange={handleChange} fullWidth margin="normal" variant="outlined" />
              {/* User Type Text Field */}
              <TextField
                label="Receiving Date"
                name="receiving_date"
                value={formData.receiving_date}
                onChange={handleChange}
                fullWidth
                margin="normal"
                variant="outlined"
                type="date"
                InputLabelProps={{ shrink: true }}

              />
             <FormControl fullWidth margin="normal" variant="outlined" required>
                <InputLabel>User Type</InputLabel>
                <Select
                  name="user_type"
                  value={formData.user_type}
                  onChange={handleUserTypeChange}
                  label="User Type"
                >
                  <MenuItem value="MMC">MMC</MenuItem>
                  <MenuItem value="Contractor">Contractor</MenuItem>
                </Select>
              </FormControl>

              {/* Conditional Contractor Name Input */}
              {formData.user_type !== "MMC" && (
                <TextField
                  label="Contractor Name"
                  name="contractorName"
                  value={formData.contractorName}
                  onChange={handleFormChange}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  required
                />
              )}
              <Box sx={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <Button type="submit" variant="contained" color="primary" fullWidth>
                  Save Changes
                </Button>
              </Box>
            </form>
          </Box>
        </Box>
      </Modal>
    </Grid>
  );
};

export default WorkExecution;
