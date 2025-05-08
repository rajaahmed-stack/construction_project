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
    file_path: null,
    workOrderId: null
  });

  const [data, setData] = useState([]);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('https://constructionproject-production.up.railway.app/api/work_receiving');
      const results = await response.json();

      const today = new Date();
      const updatedData = results.map((item) => {
        if (item.created_at) {
          const createdAt = new Date(item.created_at);
          const deadline = new Date(createdAt);
          deadline.setDate(deadline.getDate() + 2);

          let statusColor = '';
          let deliveryStatus = 'on time';

          if (item.current_department === 'Work Receiving') {
            if (today > deadline) {
              statusColor = 'red';
              deliveryStatus = 'delayed';
            } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
              statusColor = 'yellow';
              deliveryStatus = 'nearing deadline';
            }
          }

          return {
            ...item,
            deadline,
            statusColor,
            delivery_status: deliveryStatus
          };
        }
        return item;
      });

      setData(updatedData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const { jobType, subSection, workOrderList, receivingDate, endDate, estimatedValue, file_path } = formData;

    if (!jobType || !subSection || !workOrderList || !receivingDate || !endDate || !estimatedValue || !(file_path instanceof File)) {
      showSnackbar('Please fill all fields and attach a valid file.');
      return;
    }

    const formDataWithFile = new FormData();
    formDataWithFile.append('file_path', file_path);
    formDataWithFile.append('jobType', jobType);
    formDataWithFile.append('subSection', subSection);
    formDataWithFile.append('workOrderList', workOrderList);
    formDataWithFile.append('receivingDate', receivingDate);
    formDataWithFile.append('endDate', endDate);
    formDataWithFile.append('estimatedValue', estimatedValue);
    formDataWithFile.append('current_department', 'Work Receiving');

    const today = new Date();
    const deadline = new Date(receivingDate);
    deadline.setDate(deadline.getDate() + 2);

    let deliveryStatus = 'on time';
    if (today > deadline) deliveryStatus = 'delayed';
    else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) deliveryStatus = 'nearing deadline';

    formDataWithFile.append('delivery_status', deliveryStatus);

    try {
      const url = formData.workOrderId
        ? `https://constructionproject-production.up.railway.app/api/edit-work-receiving/${formData.workOrderId}`
        : 'https://constructionproject-production.up.railway.app/api/save-work_receiving';

      const method = formData.workOrderId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataWithFile
      });

      const message = await response.text();
      if (message.includes('Duplicate entry')) {
        showSnackbar('Work Order already exists!');
      } else {
        showSnackbar('Work Order saved successfully!');
        setFormData({
          jobType: '',
          subSection: '',
          workOrderList: '',
          receivingDate: '',
          endDate: '',
          estimatedValue: '',
          file_path: null,
          workOrderId: null
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error saving data:', error);
      showSnackbar('Error saving data.');
    }
  };

  const handleEdit = (item) => {
    setFormData({
      jobType: item.job_type,
      subSection: item.sub_section,
      workOrderList: item.work_order_id,
      receivingDate: item.receiving_date,
      endDate: item.end_date,
      estimatedValue: item.estimated_value,
      file_path: null,
      workOrderId: item.work_order_id
    });
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Are you sure you want to delete?");
    if (!confirm) return;

    try {
      await fetch(`https://constructionproject-production.up.railway.app/api/delete-work-receiving/${id}`, {
        method: 'DELETE'
      });
      showSnackbar('Deleted successfully.');
      fetchData();
    } catch (error) {
      showSnackbar('Delete failed.');
    }
  };

  const handleDownload = async (id) => {
    try {
      const response = await fetch(`https://constructionproject-production.up.railway.app/api/download/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `WorkOrder-${id}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match?.length > 1) filename = match[1];
      }

      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  const showSnackbar = (msg) => {
    setSnackbarMessage(msg);
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
                    select
                    fullWidth
                    label={label}
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    variant="outlined"
                  >
                    {options.map(option => (
                      <MenuItem key={option} value={option}>{option}</MenuItem>
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
                    InputLabelProps={type === 'date' ? { shrink: true } : {}}
                    variant="outlined"
                  />
                </Grid>
              ))}
              <Grid item xs={12}>
                <input
                  type="file"
                  name="file_path"
                  onChange={(e) => setFormData({ ...formData, file_path: e.target.files[0] })}
                  accept="image/*,application/pdf"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                  startIcon={<Save />}
                >
                  Save
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={4} sx={{ padding: 2 }}>
            <Typography variant="h6" gutterBottom>Saved Work Orders</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Job</TableCell>
                    <TableCell>Sub</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.work_order_id}>
                      <TableCell>{item.work_order_id}</TableCell>
                      <TableCell>{item.job_type}</TableCell>
                      <TableCell>{item.sub_section}</TableCell>
                      <TableCell style={{ color: item.statusColor || 'inherit' }}>
                        {item.delivery_status}
                      </TableCell>
                      <TableCell>
                        <Button onClick={() => handleEdit(item)}>Edit</Button>
                        <Button onClick={() => handleDelete(item.id)} color="error">Delete</Button>
                        <Button onClick={() => handleDownload(item.work_order_id)} startIcon={<Download />}>Download</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default WorkReceiving;
