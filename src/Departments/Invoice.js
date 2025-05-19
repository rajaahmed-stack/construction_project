import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container, Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Modal, TextField, Snackbar, CircularProgress
} from "@mui/material";

const BACKEND_BASE_URL = "https://constructionproject-production.up.railway.app";

const Invoice = () => {
  const [upperData, setUpperData] = useState([]);
  const [lowerData, setLowerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [formData, setFormData] = useState({
    work_order_id: '',
    po_number: '',
    files: null,
  });

  // Fetch both datasets
  const fetchUpperData = async () => {
    try {
      const response = await axios.get(`${BACKEND_BASE_URL}/api/invoice/invoice-coming`);
      setUpperData(response.data);
    } catch (error) {
      console.error("Error fetching upper data:", error);
    }
  };

  const fetchLowerData = async () => {
    try {
      const response = await axios.get(`${BACKEND_BASE_URL}/api/invoice/invoice-data`);
      setLowerData(response.data);
    } catch (error) {
      console.error("Error fetching invoice data:", error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchUpperData(), fetchLowerData()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleGenerateInvoice = (record) => {
    setFormData({ work_order_id: record.work_order_id, po_number: '', files: null });
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, files: e.target.files[0] }));
  };

  const handleSubmit = async () => {
    if (!formData.work_order_id || !formData.po_number || !formData.files) {
      setSnackbarMessage("Please fill all fields and attach the invoice file.");
      setOpenSnackbar(true);
      return;
    }

    const uploadData = new FormData();
    uploadData.append("work_order_id", formData.work_order_id);
    uploadData.append("po_number", formData.po_number);
    uploadData.append("files", formData.files);

    try {
      await axios.post(`${BACKEND_BASE_URL}/api/invoice/upload-and-save-invoice`, uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSnackbarMessage("Invoice generated successfully.");
      setOpenSnackbar(true);
      setShowForm(false);

      // Refresh both sections after save
      fetchAllData();
    } catch (error) {
      console.error("Invoice submission error:", error);
      setSnackbarMessage("Error generating invoice.");
      setOpenSnackbar(true);
    }
  };

  const downloadInvoice = (filename) => {
    if (!filename) {
      setSnackbarMessage("File URL not available.");
      setOpenSnackbar(true);
      return;
    }
    const fileUrl = `${BACKEND_BASE_URL}/uploads/${filename}`;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = filename.split('/').pop() || "invoice.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Container sx={{ mb: 5 }}>
      <Typography variant="h4" sx={{ mt: 3, mb: 2, fontWeight: 'bold' }}>Invoice Management</Typography>

      <Paper elevation={3} sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Received Data from Previous Department</Typography>
        {loading ? (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="received-data-table">
              <TableHead>
                <TableRow>
                  <TableCell>Work Order ID</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {upperData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center">No data available</TableCell>
                  </TableRow>
                ) : (
                  upperData.map((record) => (
                    <TableRow key={record.work_order_id}>
                      <TableCell>{record.work_order_id}</TableCell>
                      <TableCell align="center">
                        <Button variant="contained" size="small" onClick={() => handleGenerateInvoice(record)}>
                          Generate Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Generated Invoices</Typography>
        <TableContainer>
          <Table size="small" aria-label="generated-invoices-table">
            <TableHead>
              <TableRow>
                <TableCell>Invoice ID</TableCell>
                <TableCell>Work Order ID</TableCell>
                <TableCell>PO Number</TableCell>
                <TableCell align="center">Download</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lowerData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">No invoices generated yet</TableCell>
                </TableRow>
              ) : (
                lowerData.map((invoice) => (
                  <TableRow key={invoice.invoice_id}>
                    <TableCell>{invoice.invoice_id}</TableCell>
                    <TableCell>{invoice.work_order_id}</TableCell>
                    <TableCell>{invoice.po_number}</TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => downloadInvoice(invoice.files || invoice.file_url)}
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        aria-labelledby="generate-invoice-modal-title"
        aria-describedby="generate-invoice-modal-description"
      >
        <Box
          sx={{
            p: 4,
            backgroundColor: 'background.paper',
            width: 400,
            maxWidth: '90%',
            margin: 'auto',
            mt: 10,
            borderRadius: 2,
            boxShadow: 24,
          }}
        >
          <Typography id="generate-invoice-modal-title" variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
            Generate Invoice
          </Typography>

          <TextField
            fullWidth
            margin="normal"
            label="Work Order ID"
            value={formData.work_order_id}
            disabled
          />

          <TextField
            fullWidth
            margin="normal"
            label="PO Number"
            name="po_number"
            value={formData.po_number}
            onChange={handleChange}
          />

          <Button
            component="label"
            fullWidth
            variant="contained"
            sx={{ my: 2 }}
          >
            Upload Invoice File
            <input
              type="file"
              accept="application/pdf"
              hidden
              onChange={handleFileChange}
            />
          </Button>

          {formData.files && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Selected file: {formData.files.name}
            </Typography>
          )}

          <Button variant="outlined" fullWidth onClick={handleSubmit}>
            Save Invoice
          </Button>
        </Box>
      </Modal>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={() => setOpenSnackbar(false)}
        message={snackbarMessage}
      />
    </Container>
  );
};

export default Invoice;
