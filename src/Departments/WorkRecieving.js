import React, { useState, useEffect } from 'react';
import { 
  Container, Grid, Paper, TextField, MenuItem, Button, Typography, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, Snackbar 
} from '@mui/material';
import { Download, Save } from '@mui/icons-material';

const WorkReceiving = () => {
  const [formData, setFormData] = useState({
    jobType: '',
    subSection: '',
    workOrderList: '',
    receivingDate: '',
    endDate: '',
    estimatedValue: '',
  });

  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [alertData, setAlertData] = useState([]);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('https://mmcmadina.com/api/work_receiving');
      const results = await response.json();
      
      const today = new Date();
      const updatedData = results.map((item) => {
        if (item.created_at) {
          const createdAt = new Date(item.created_at);
          const deadline = new Date(createdAt);
          deadline.setDate(deadline.getDate() + 2); // Add 2 days to created_at

          let statusColor = '';
          let deliveryStatus = 'on time'; // Default status

          if (item.current_department === 'Work Receiving') {
            if (today > deadline) {
              statusColor = 'red'; // Deadline Passed
              deliveryStatus = 'delayed'; // Update status to delayed
            } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
              statusColor = 'yellow'; // Near Deadline
            }
          }

          return { 
            ...item, 
            deadline, 
            statusColor, 
            delivery_status: deliveryStatus // Add delivery status to the item
          };
        }
        return item;
      });

      setData(updatedData);

      // Filter alerts for work orders nearing or past deadlines
      const urgentOrders = updatedData.filter((item) => item.statusColor !== '');
      setAlertData(urgentOrders);

      if (urgentOrders.length > 0) {
        showSnackbar('Warning: Some work orders are close to or past their deadline.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.jobType || !formData.subSection || !formData.workOrderList || !formData.receivingDate || !formData.endDate || !formData.estimatedValue) {
        showSnackbar('Please fill out all fields', 'error');
        return;
    }

    if (!formData.file_path || !(formData.file_path instanceof File)) {
        alert("Please select a valid file.");
        return;
    }

    // Create FormData for new or edit
    const formDataWithFile = new FormData();
    formDataWithFile.append('file_path', formData.file_path);  // Append file
    formDataWithFile.append('jobType', formData.jobType);
    formDataWithFile.append('subSection', formData.subSection);
    formDataWithFile.append('workOrderList', formData.workOrderList);  // Work order ID
    formDataWithFile.append('receivingDate', formData.receivingDate);
    formDataWithFile.append('endDate', formData.endDate);
    formDataWithFile.append('estimatedValue', formData.estimatedValue);
    formDataWithFile.append('current_department', 'Work Receiving');
    
    const today = new Date();
    const deadline = new Date(formData.receivingDate);
    deadline.setDate(deadline.getDate() + 2);

    let deliveryStatus = 'on time';
    if (today > deadline) {
        deliveryStatus = 'delayed';
    } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
        deliveryStatus = 'nearing deadline';
    }

    formDataWithFile.append('delivery_status', deliveryStatus);

    try {
        const url = formData.workOrderId 
            ? `https://mmcmadina.com/api/edit-work-receiving/${formData.workOrderId}` 
            : 'https://mmcmadina.com/api/save-work_receiving';

        const method = formData.workOrderId ? 'PUT' : 'POST';  // If updating, use PUT, else POST

        const response = await fetch(url, {
            method: method,
            body: formDataWithFile,  // Send form data with file
        });

        const message = await response.text();
        if (message.includes('Duplicate entry')) {
            showSnackbar('Work Order already exists!', 'warning');
        } else if (message.includes('Successfully created') || message.includes('updated successfully')) {
            showSnackbar('Work Order saved successfully!', 'success');
            setFormData({
                jobType: '',
                subSection: '',
                workOrderList: '',
                receivingDate: '',
                endDate: '',
                estimatedValue: '',
                file_path: null,
                workOrderId: null,  // Reset the ID after save
            });
            fetchData();  // Refresh data
        } else {
            showSnackbar(message, 'info');
        }
    } catch (error) {
        console.error('Error saving data:', error);
        showSnackbar('Error saving data. Try again!', 'error');
    }
};

const handleDownload = async (workOrderId) => {
  if (!workOrderId) {
    console.error("No Work Order ID provided");
    return;
  }

  try {
    const response = await fetch(`https://mmcmadina.com/api/download/${encodeURIComponent(workOrderId)}`);

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
    await fetch(`https://mmcmadina.com/api/delete-work-receiving/${id}`, {
      method: 'DELETE',
    });
    setSnackbarMessage('Work Receiving deleted successfully!');
    setOpenSnackbar(true);
    fetchData(); // Refresh data
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
              {[
                { label: 'Job Type', name: 'jobType', options: ['Extension', 'Emergency', 'Meters', 'Projects'] },
                { label: 'Sub Section', name: 'subSection', options: ['Overhead', 'Underground'] }
              ].map(({ label, name, options }) => (
                <Grid item xs={12} key={name}>
                  <TextField
                    fullWidth
                    select
                    label={label}
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    variant="outlined"
                  >
                    {options.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ))}

              {[
                { label: 'Work Order', name: 'workOrderList', type: 'text' },
                { label: 'Receiving Date', name: 'receivingDate', type: 'date' },
                { label: 'End Date', name: 'endDate', type: 'date' },
                { label: 'Estimated Value', name: 'estimatedValue', type: 'number' }
              ].map(({ label, name, type }) => (
                <Grid item xs={12} key={name}>
                  <TextField
                    fullWidth
                    type={type}
                    label={label}
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    variant="outlined"
                    InputLabelProps={type === 'date' ? { shrink: true } : {}}
                  />
                </Grid>
              ))}
            </Grid>
            <input
                  type="file"
                  name="file_path"
                  onChange={(e) => setFormData({ ...formData, file_path: e.target.files[0] })}
                  accept="image/*,application/pdf"
                />
            

            <Button fullWidth variant="contained" color="primary" startIcon={<Save />} onClick={handleSave} sx={{ mt: 3 }}>
              Save
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={4} sx={{ padding: 3 }}>
            <Typography variant="h6">Existing Work Orders</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {['Work Order', 'Job Type', 'Sub Section', 'Receiving Date', 'End Date', 'Value', 'Created At', 'Deadline',  'File', 'Action'].map(header => (
                      <TableCell key={header} sx={{ fontWeight: 'bold' }}>{header}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.work_order_id} sx={{ backgroundColor: item.statusColor }}>
                      <TableCell>{item.work_order_id}</TableCell>
                      <TableCell>{item.job_type}</TableCell>
                      <TableCell>{item.sub_section}</TableCell>
                      <TableCell>{new Date(item.receiving_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(item.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>{item.estimated_value}</TableCell>
                      <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                      <TableCell>{item.deadline.toLocaleDateString()}</TableCell>
                      {/* <TableCell> {item.file_path ? "✅" : "❌"}</TableCell> */}
                      <TableCell>
                          {item.file_path ? (
                            <a href={`https://mmcmadina.com/api/download/${item.work_order_id}`} download>
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
