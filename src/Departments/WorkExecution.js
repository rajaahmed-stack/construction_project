import React, { useState, useEffect } from "react";
import axios from "axios";
import { Grid, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, 
  Modal, Box, TextField, Card, CardContent, FormControl, InputLabel, MenuItem, Select  } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import "../styles/workexecution.css";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from '@mui/icons-material/Close'; // Make sure this is imported


const processWorkExeData = (data) => {
  const today = new Date();
  return data.map((record) => {
    if (record.safety_created_at && record.workexe_created_at) {
      const workCreatedAt = new Date(record.safety_created_at);
      const surveyCreatedAt = new Date(record.workexe_created_at);
      const deadline = new Date(workCreatedAt);
      deadline.setDate(deadline.getDate() + 18);

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

const WorkExecution = () => {
  const [upperData, setUpperData] = useState([]);
  const [lowerData, setLowerData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [contractorVisible, setContractorVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertData, setAlertData] = useState([]);
  const [isRemarkUploaded, setIsRemarkUploaded] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({});
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
    concrete_completed: false,
    // deck3: "",
    // deck3_completed: false,
    // deck2: "",
    // deck2_completed: false,
    // deck1: "",
    // deck1_completed: false,
    sand: "",
    sand_completed: false,
    // backfilling: "",
    // backfilling_completed: false,
    cable_lying: "",
    cable_lying_completed: false,
    // trench: "",
    // trench_completed: false,
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
            axios.get("https://constructionproject-production.up.railway.app/api/work-execution/workExecution-coming"),
            axios.get("https://constructionproject-production.up.railway.app/api/work-execution/workExecution-data"),
          ]);
    
          const updatedData = processWorkExeData(permissionResponse.data);

    
          setLowerData(updatedData);
          setUpperData(comingResponse.data || []);
    
          // Update delivery statuses in the backend
          if (updatedData.length > 0) {
            await Promise.all(
              updatedData.map(async (record) => {
                if (record.work_order_id && record.delivery_status) {
                  try {
                    await axios.put("https://constructionproject-production.up.railway.app/api/work-execution/update-wedelivery-status", {
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
          console.error("Error fetching work execution data:", error);
        } finally {
          setLoading(false);
        }
      };
    
      fetchData();
    }, []); // Ensure dependency array is empty to prevent infinite loops
    


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
  const refreshWorkExeData = async () => {
            try {
              const [comingResponse, permissionResponse] = await Promise.all([
                axios.get("https://constructionproject-production.up.railway.app/api/work-execution/workExecution-coming"),
                axios.get("https://constructionproject-production.up.railway.app/api/work-execution/workExecution-data"),
              ]);
          
              const updatedData = processWorkExeData(permissionResponse.data);
          
              setUpperData(comingResponse.data || []);
              setLowerData(updatedData);
            } catch (error) {
              console.error("Error refreshing work execution data:", error);
            }
          };

  // Handle form submission
  const handleSaveData = async (e) => {
    e.preventDefault();
  
    if (
      !formData.work_order_id ||
      !formData.receiving_date ||
      !formData.permission_number ||
      !formData.user_type ||
      (formData.user_type !== "MMC" && !formData.contractorName)
    ) {
      alert("Please fill all required fields.");
      return;
    }
  
    setLoading(true);
  
    try {
      const response = await axios.post(
        "https://constructionproject-production.up.railway.app/api/work-execution/save-workexecution-workorder",
        formData
      );
  
      if (response.status === 200) {
        alert("Data saved successfully!");
        await refreshWorkExeData(); // Fetch updated data from the backend
        setShowForm(false);
  
        // Reset form data
        setFormData({
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
          concrete_completed: false,
          // deck3: "",
          // deck3_completed: false,
          // deck2: "",
          // deck2_completed: false,
          // deck1: "",
          // deck1_completed: false,
          sand: "",
          sand_completed: false,
          // backfilling: "",
          // backfilling_completed: false,
          cable_lying: "",
          cable_lying_completed: false,
          // trench: "",
          // trench_completed: false,
          remark: "",
        });
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
    await axios.post("https://constructionproject-production.up.railway.app/api/work-execution/update-wedepartment", {
      workOrderId,
    });
    alert("Work Order moved to Permission Closing department.");
   
  } catch (error) {
    console.error("Error updating department:", error);
  }
};
const handleSaveRemainingData = async (workOrderId) => {
  try {
    if (!workOrderId) {
      alert("Work Order ID is missing!");
      return;
    }

    const dataToSend = {
      remark: formData.remark,
      work_order_id: workOrderId,
    };

    const response = await axios.post(
      "https://constructionproject-production.up.railway.app/api/work-execution/save-remainingdata",
      dataToSend
    );

    alert("Data saved successfully!");
    await refreshWorkExeData();

    // Reset the remark field for the current record
    setFormData((prevData) => ({
      ...prevData,
      remark: "",
    }));

    // Update the local state to reflect the saved remark
    setLowerData((prevData) =>
      prevData.map((record) =>
        record.work_order_id === workOrderId
          ? { ...record, remark: formData.remark }
          : record
      )
    );
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

  

// const handleFileUpload = async (fieldName, files) => {
//   const formDataWithFiles = new FormData();

//   for (let i = 0; i < files.length; i++) {
//     formDataWithFiles.append("files", files[i]); // use 'files' as the field name (plural)
//   }

//   console.log("Files to be uploaded:", files);

//   try {
//     const response = await axios.post(
//       `https://constructionproject-production.up.railway.app/api/work-execution/upload-workExecution-file/${fieldName}`,
//       formDataWithFiles
//     );

//     console.log("File upload response:", response.data);

//     setFormData((prevData) => ({
//       ...prevData,
//       [fieldName]: response.data.filePaths, // expect multiple paths from backend
//     }));

//     handleTaskCompletion(`${fieldName}Completed`);
//   } catch (error) {
//     console.error("Error uploading files:", error);
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
      `https://constructionproject-production.up.railway.app/api/work-execution/upload-workExecution-file/${fieldName}`,
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
   // Fetch saved data on page load (useEffect will run when the page is loaded)
  //  useEffect(() => {
  //   axios
  //     .get(`https://constructionproject-production.up.railway.app/api/work-execution/get-work-execution/${workOrderId}`)
  //     .then((response) => {
  //       if (response.data) {
  //         // If there's data, set it in formData state
  //         setFormData({
  //           asphalt: response.data.asphalt || "", // Use saved asphalt file name
  //           asphalt_completed: response.data.asphalt_completed === 1, // Convert DB value to boolean
  //         });
  //       }
  //     })
  //     .catch((error) => {
  //       console.error("Error fetching work execution data:", error);
  //     });
  // }, [workOrderId]); // This useEffect runs only when workOrderId changes
  
  const handleSaveAsphalt = async (field, workOrderId) => {
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const uploadedFilesArray = formData.asphalt || [];
  
      const dataToSend = {
        asphalt: uploadedFilesArray.join(","), // ✅ save comma-separated paths
        asphalt_completed: formData.asphalt_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://constructionproject-production.up.railway.app/api/work-execution/save-asphalt", dataToSend);
  
      alert(`${field} saved successfully!`);
      await refreshWorkExeData();
  
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
  
      const uploadedFilesArray = formData.milling || [];
  
      const dataToSend = {
        milling: uploadedFilesArray.join(","), // ✅ save comma-separated paths
        milling_completed: formData.milling_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://constructionproject-production.up.railway.app/api/work-execution/save-milling", dataToSend);
  
      alert(`${field} saved successfully!`);
      await refreshWorkExeData();
  
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
  
      const uploadedFilesArray = formData.concrete || [];
  
      const dataToSend = {
        concrete: uploadedFilesArray.join(","), // ✅ save comma-separated paths
        concrete_completed: formData.concrete_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://constructionproject-production.up.railway.app/api/work-execution/save-concrete", dataToSend);
  
      alert(`${field} saved successfully!`);
      await refreshWorkExeData();
  
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
  
      await axios.post("https://constructionproject-production.up.railway.app/api/work-execution/save-deck3", dataToSend);
  
      alert(`${field} saved successfully!`);
      await refreshWorkExeData();

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
  
      await axios.post("https://constructionproject-production.up.railway.app/api/work-execution/save-deck2", dataToSend);
  
      alert(`${field} saved successfully!`);
      await refreshWorkExeData();

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
  
      await axios.post("https://constructionproject-production.up.railway.app/api/work-execution/save-deck1", dataToSend);
  
      alert(`${field} saved successfully!`);
      await refreshWorkExeData();

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
  
      const uploadedFilesArray = formData.sand || [];
  
      const dataToSend = {
        sand: uploadedFilesArray.join(","), // ✅ save comma-separated paths
        sand_completed: formData.sand_completed,
        work_order_id: workOrderId,
      };
  
      await axios.post("https://constructionproject-production.up.railway.app/api/work-execution/save-sand", dataToSend);
  
      alert(`${field} saved successfully!`);
      await refreshWorkExeData();
  
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
  
      await axios.post("https://constructionproject-production.up.railway.app/api/work-execution/save-backfilling", dataToSend);
  
      alert(`${field} saved successfully!`);
      await refreshWorkExeData();

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
  // const handleSaveCableLying = async (field, workOrderId) => {
  //   try {
  //     if (!workOrderId) {
  //       alert("Work Order ID is missing!");
  //       return;
  //     }
  
  //     const uploadedFilesArray = formData.cable_lying || [];
  
  //     const dataToSend = {
  //       cable_lying: uploadedFilesArray.join(","), // ✅ save comma-separated paths
  //       cable_lying_completed: formData.cable_lying_completed,
  //       work_order_id: workOrderId,
  //     };
  
  //     await axios.post("https://constructionproject-production.up.railway.app/api/work-execution/save-cable_lying", dataToSend);
  
  //     alert(`${field} saved successfully!`);
  //     await refreshWorkExeData();
  
  //     setFormData((prevData) => ({
  //       ...prevData,
  //       [`${field}Completed`]: true,
  //     }));
  
  //     setCompletedTasks((prev) => prev + 1);
  //     if (completedTasks + 1 === totalTasks) {
  //       setIsSendEnabled(true);
  //     }
  //   } catch (error) {
  //     console.error("Error saving field:", error);
  //   }
  // };
  const handleSaveCableLying = async (field, workOrderId) => { 
    try {
      if (!workOrderId) {
        alert("Work Order ID is missing!");
        return;
      }
  
      const dataToSend = {
        cable_lying: formData.cable_lying || null,
        cable_lying_completed: formData.cable_lying_completed,
        work_order_id: workOrderId,
      };
  
      const response = await axios.post(
        "https://constructionproject-production.up.railway.app/api/work-execution/save-cable_lying",
        dataToSend
      );
  
      alert(`${field} saved successfully!`);
      await refreshWorkExeData();
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
  
      await axios.post("https://constructionproject-production.up.railway.app/api/work-execution/save-trench", dataToSend);
  
      alert(`${field} saved successfully!`);
      await refreshWorkExeData();

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
          Welcome to the Work Execution Department
        </Typography>
      </Grid>

      {/* Upper Section: Incoming Work Execution Data */}
      <Grid item xs={12} md={5}>
  <Paper elevation={3} sx={{ padding: "20px", backgroundColor: "#f8f9fa",overflow: "auto", maxHeight: "500px" }}>
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
         
           {/* Combined File Column */}
           <TableCell sx={{ padding: "8px", verticalAlign: "top" }}>
             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
               {[
                 { label: "Work Receiving Files", key: "file_path", downloadId: "workexe1_download" },
                 { label: "Survey Files", key: "survey_file_path", downloadId: "workexe2_download" },
                 { label: "Permission Files", key: "Document", downloadId: "workexe3_download" },
                 { label: "Safety Signs", key: "safety_signs", downloadId: "workexe4_download" },
                 { label: "Safety Barriers", key: "safety_barriers", downloadId: "workexe5_download" },
                 { label: "Safety Lights", key: "safety_lights", downloadId: "workexe6_download" },
                 { label: "Safety Boards", key: "safety_boards", downloadId: "workexe7_download" },
                 { label: "Safety Permissions", key: "permissions", downloadId: "workexe8_download" },
                 { label: "Safety Documentation", key: "safety_documentation", downloadId: "workexe9_download" },
                 { label: "Safety Files",  downloadId: "safety_download" },
               ].map((item, i) => (
                 <Box key={i}>
                   <strong>{item.label}:</strong>{" "}
                   {record[item.key] ? (
                     <a
                       href={`https://constructionproject-production.up.railway.app/api/work-execution/${item.downloadId}/${record.work_order_id}`}
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
         
           <TableCell sx={{ padding: "8px", textAlign: "center" }}>
             <Button
               variant="contained"
               color="primary"
               sx={{ minWidth: "60px" }}
               onClick={() => handleAddData(record)}
             >
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
              <Card key={index} sx={{ marginBottom: "20px", backgroundColor: "#f0fff0" }}>
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
                  { label: "Asphalt", keys: ["asphalt", "asphalt_completed"] },
                  { label: "Milling", keys: ["milling", "milling_completed"] },
                  { label: "Concrete", keys: ["concrete", "concrete_completed"] },
                  // { label: "Deck3", keys: ["deck3", "deck3_completed"] },
                  // { label: "Deck2", keys: ["deck2", "deck2_completed"] },
                  // { label: "Deck1", keys: ["deck1", "deck1_completed"] },
                  { label: "Sand", keys: ["sand", "sand_completed"] },
                  // { label: "Backfilling", keys: ["backfilling", "backfilling_completed"] },
                  { label: "Cable Lying", keys: ["cable_lying", "cable_lying_completed"] },
                  // { label: "Trench", keys: ["trench", "trench_completed"] },
                ].map(({ label, keys }) => {
                  const dataKey = keys.find(k => record[k] !== undefined);
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
                  ...(record.asphalt_completed !==1 
                    ?[{ label: "Asphalt", handler: handleSaveAsphalt, key: "asphalt", disabled: record.asphalt_completed  || record.asphalt}]
                    :[]),
                 ...(record.milling_completed !==1
                  ?[{ label: "Milling", handler: handleSaveMilling, key: "milling" , disabled: record.milling_completed || record.milling}]
                  :[]),
                ...(record.concrete_completed !==1
                  ?[{ label: "Concrete", handler: handleSaveConcrete, key: "concrete",  disabled: record.concrete_completed || record.concrete}]
                  :[]),
                // ...(record.deck3_completed !==1
                //   ?[{ label: "Deck 3", handler: handleSaveDeck3, key: "deck3",  disabled: record.deck3_completed || record.deck3}]
                //   :[]),
                // ...(record.deck2_completed !==1
                //   ?[{ label: "Deck 2", handler: handleSaveDeck2, key: "deck2",  disabled: record.deck2_completed || record.deck2}]
                //   :[]),
                // ...(record.deck1_completed !==1
                //   ?[{ label: "Deck 1", handler: handleSaveDeck1, key: "deck1",  disabled: record.deck1_completed || record.deck1}]
                //   :[]),
                ...(record.sand_completed !==1
                  ?[{ label: "Sand", handler: handleSaveSand, key: "sand",  disabled: record.sand_completed || record.sand}]
                  :[]),
                // ...(record.backfilling_completed !==1
                //   ?[{ label: "Backfilling", handler: handleSaveBackFilling, key: "backfilling",  disabled: record.backfilling_completed || record.backfilling}]
                //   :[]),
                ...(record.cable_lying_completed !==1
                  ?[{ label: "Cable Lying", handler: handleSaveCableLying, key: "cable_lying",  disabled: record.cable_lying_completed || record.cable_lying}]
                  :[]),
                // ...(record.trench_completed !== 1
                //   ?[{ label: "Trench", handler: handleSaveTrench, key: "trench",  disabled: record.trench_completed || record.trench}]
                //   :[]),
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

              <Grid item xs={6}>
        <TextField
          fullWidth
          label="Remark"
          name="remark"
          onChange={handleChange}
          value={formData.remark}
          // disabled={isRemarkUploaded}  // Disable if remark is uploaded
        />
      </Grid>

      {/* Action Buttons */}
      <Grid container spacing={2} sx={{ marginTop: "10px" }}>
        <Grid item>
        <Button
            variant="contained"
            color="success"
            onClick={() => handleSaveRemainingData(record.work_order_id)}
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
