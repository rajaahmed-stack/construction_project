import React, { useState, useEffect } from 'react';
import { 
  Container, Grid, Paper, TextField, MenuItem, Button, Typography, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, Snackbar 
} from '@mui/material';
import { Download, Save } from '@mui/icons-material';
import axios from "axios";

const processWorkReceivingData = (data) => {
  const today = new Date();
  return data.map((item) => {
    if (item.created_at) {
      const createdAt = new Date(item.created_at);
      const deadline = new Date(createdAt);
      deadline.setDate(deadline.getDate() + 1);

      let statusColor = '';
      let deliveryStatus = 'on time';

      if (item.current_department === 'Work Receiving') {
        if (today > deadline) {
          // statusColor = 'red';
          deliveryStatus = 'delayed';
        } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
          // statusColor = 'yellow';
        }
      }

      return { ...item, deadline, statusColor, delivery_status: deliveryStatus };
    }
    return item;
  });
};

const WorkReceiving = () => {
  const [formData, setFormData] = useState({
    jobType: '',
    subSection: '',
    workOrderList: '',
    receivingDate: '',
    endDate: '',
    estimatedValue: '',
    remarks: '',
    delivery_status: '',                 // Optional: if you want to display it in form

  });

  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [alertData, setAlertData] = useState([]);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [files, setFiles] = useState([]);

 
  
  useEffect(() => {
    fetchWorkReceivingData();

    // Set up auto-refresh interval
    const interval = setInterval(() => {
      fetchWorkReceivingData();
    }, 5000); // Refresh every 10 seconds

    // Clean up the interval when the component is unmounted
    return () => clearInterval(interval);
  }, []);

  const fetchWorkReceivingData = async () => {
    try {
      const response = await axios.get("https://constructionproject-production.up.railway.app/api/work_receiving");
      const updatedData = processWorkReceivingData(response.data);
      setData(updatedData);
  
      const urgentOrders = updatedData.filter((item) => item.statusColor !== '');
      setAlertData(urgentOrders);
  
      if (urgentOrders.length > 0) {
        // showSnackbar('Warning: Some work orders are close to or past their deadline.', 'warning');
      }
    } catch (error) {
      console.error("Error fetching work receiving data:", error);
    }
  };
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const refreshWorkReceivingData = async () => {
    try {
      const response = await axios.get("https://constructionproject-production.up.railway.app/api/work_receiving");
      const updatedData = processWorkReceivingData(response.data);
      setData(updatedData);
    } catch (error) {
      console.error("Error refreshing work receiving data:", error);
    }
  };

  
  const handleSave = async () => {
    const { jobType, subSection, workOrderList, receivingDate, endDate, estimatedValue, file_path, remarks, workOrderId } = formData;

     // Conditional check for subSection only if jobType is NOT 'Meters' or 'Emergency'
    const isSubSectionRequired = !(jobType === 'New Meters' || jobType === 'Emergency UG');

    if (
      !jobType ||
      (!subSection && isSubSectionRequired) ||
      !workOrderList ||
      !receivingDate ||
      !endDate ||
      !estimatedValue ||
      !remarks
    ) {
      showSnackbar('Please fill out all required fields', 'error');
      return;
    }
    if (files.length === 0) {
      alert("Please select at least one file.");
      return;
    }
    
    const formDataWithFile = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formDataWithFile.append('file_path', files[i]);
    }
    const today = new Date();
    const deadline = new Date(receivingDate);
    deadline.setDate(deadline.getDate() + 2);

    let deliveryStatus = 'on time';
    const daysDiff = (deadline - today) / (1000 * 60 * 60 * 24);

    if (daysDiff < 0) {
      deliveryStatus = 'delayed';
    } else if (daysDiff <= 1) {
      deliveryStatus = 'nearing deadline';
    }

    formDataWithFile.append('delivery_status', deliveryStatus);
    formDataWithFile.append('jobType', jobType);
    formDataWithFile.append('subSection', subSection);
    formDataWithFile.append('workOrderList', workOrderList);
    formDataWithFile.append('receivingDate', receivingDate);
    formDataWithFile.append('endDate', endDate);
    formDataWithFile.append('estimatedValue', estimatedValue);
    formDataWithFile.append('remarks', remarks);
    formDataWithFile.append('current_department', formData.current_department);


   

    try {
      const url = workOrderId
        ? `https://constructionproject-production.up.railway.app/api/edit-work-receiving/${workOrderId}`
        : 'https://constructionproject-production.up.railway.app/api/save-work_receiving';

      const method = workOrderId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataWithFile,
      });

      const message = await response.text();
      if (message.includes('Duplicate entry')) {
        showSnackbar('Work Order already exists!', 'warning');
      } else if (message.includes('Successfully created') || message.includes('updated successfully')) {
        showSnackbar('Work Order saved successfully!', 'success');
        fetchWorkReceivingData();

        setFormData({
          jobType: '',
          subSection: '',
          workOrderList: '',
          receivingDate: '',
          endDate: '',
          estimatedValue: '',
          file_path: null,
          remarks: '',
          delivery_status: '',                 // Optional: if you want to display it in form
          workOrderId: null,
        });
        setFiles([]); // ✅ Clear selected files after successful save
        
        console.log('Success! Reloading after 5 seconds...');
        // setTimeout(() => {
        //   window.location.reload();
        // }, 5000); // 10 seconds
      } else {
        showSnackbar(message, 'info');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      showSnackbar('Error saving data. Try again!', 'error');
    }
  };
  const handleRemoveFile = (indexToRemove) => {
    setFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove));
  };
  
const handleDownload = async (workOrderId) => {
  if (!workOrderId) {
    console.error("No Work Order ID provided");
    return;
  }

  try {
    const response = await fetch(`https://constructionproject-production.up.railway.app/api/download/${encodeURIComponent(workOrderId)}`);

    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    // Extract filename dynamically if required
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = `WorkOrder-${workOrderId}.pdf`;

    if (contentDisposition) {
      const matches = contentDisposition.match(/filename="(.+)"/);
      if (matches.length > 1) {
        fileName = matches[1];
      }
    }

    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Download error:", error);
  }
};
const handleDelete = async (id) => {
  const confirmDelete = window.confirm('Are you sure you want to delete this work receiving record?');
  if (!confirmDelete) return;

  try {
    await fetch(`https://constructionproject-production.up.railway.app/api/delete-work-receiving/${id}`, {
      method: 'DELETE',
    });
    setSnackbarMessage('Work Receiving deleted successfully!');
    setOpenSnackbar(true);
    fetchWorkReceivingData(); // Refresh data
  } catch (error) {
    setSnackbarMessage('Failed to delete Work Receiving.');
    setOpenSnackbar(true);
  }
};

const handleEdit = (item) => {
  setFormData({
      workOrderList: item.work_order_id,
      jobType: item.job_type,
      subSection: item.sub_section,
      receivingDate: item.receiving_date,
      endDate: item.end_date,
      estimatedValue: item.estimated_value,
      remarks: item.remarks,
      current_department: item.current_department,
      delivery_status: item.delivery_status || '',
      workOrderId: item.work_order_id,  // Set the Work Order ID
  });
};


  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setOpenSnackbar(true);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Work Receiving Department
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={4} sx={{ padding: 3 }}>
            <Grid container spacing={2}>
            <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Job Type"
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleChange}
                  variant="outlined"
                >
                  {['Extension', 'Emergency UG', 'New Meters', 'Projects'].map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {formData.jobType !== 'New Meters' && formData.jobType !== 'Emergency UG' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    select
                    label="Sub Section"
                    name="subSection"
                    value={formData.subSection}
                    onChange={handleChange}
                    variant="outlined"
                  >
                    {['Overhead', 'Underground'].map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}

              {[
                { label: 'Work Order', name: 'workOrderList', type: 'text' },
                { label: 'Receiving Date', name: 'receivingDate', type: 'date' },
                { label: 'End Date', name: 'endDate', type: 'date' },
                { label: 'Estimated Value', name: 'estimatedValue', type: 'number' },
                { label: 'Remarks', name: 'remarks', type: 'text' }
              ].map((field) => (
                <Grid item xs={12} key={field.name}>
                  <TextField
                    fullWidth
                    label={field.label}
                    name={field.name}
                    type={field.type}
                    value={formData[field.name]}
                    onChange={handleChange}
                    variant="outlined"
                    InputLabelProps={field.type === 'date' ? { shrink: true } : {}}
                  />
                </Grid>
              ))}

              <Grid item xs={12}>
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
            </Grid>


              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Save />}
                  onClick={handleSave}
                >
                  Save
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={4} sx={{ padding: 3 }}>
            <Typography variant="h6">Existing Work Orders</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {['Sr.No','Work Order', 'Job Type', 'Sub Section', 'Receiving Date', 'End Date', 'Value','Remarks','File', 'Action'].map(header => (
                      <TableCell key={header} sx={{ fontWeight: 'bold' }}>{header}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((item, index) => (
                    <TableRow key={item.work_order_id} sx={{ backgroundColor: item.statusColor }}>
                      <TableCell>{index + 1}</TableCell> {/* Serial number */}
                      <TableCell>{item.work_order_id}</TableCell>
                      <TableCell>{item.job_type}</TableCell>
                      <TableCell>{item.sub_section}</TableCell>
                      <TableCell>{new Date(item.receiving_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(item.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>{item.estimated_value}</TableCell>
                      <TableCell>{item.remarks}</TableCell>
                      {/* <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell> */}
                      {/* <TableCell>{item.deadline.toLocaleDateString()}</TableCell> */}
                      {/* <TableCell> {item.file_path ? "✅" : "❌"}</TableCell> */}
                      <TableCell>
                          {item.file_path ? (
                            <a href={`https://constructionproject-production.up.railway.app/api/download/${item.work_order_id}`} download>
                              ✅ 📂 Download
                            </a>
                          ) : (
                            "❌ No File"
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleEdit(item)}
                            sx={{ backgroundColor: 'green', color: 'white', '&:hover': { backgroundColor: 'darkgreen' } }}
                          >
                            Edit
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleDelete(item.work_order_id)}
                            sx={{ backgroundColor: 'red', color: 'white', '&:hover': { backgroundColor: 'darkred' } }}
                          >
                            Delete
                          </Button>
                        </TableCell>









                      {/* <TableCell>{item.delivery_status}</TableCell> Display delivery status */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={openSnackbar} autoHideDuration={3000} onClose={() => setOpenSnackbar(false)} message={snackbarMessage} />
    </Container>
  );
};

export default WorkReceiving;
