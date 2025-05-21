import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container, Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Modal, TextField, Snackbar, CircularProgress
} from "@mui/material";

const Invoice = () => {
  const [upperData, setUpperData] = useState([]);
  const [lowerData, setLowerData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    work_order_id: '',
    po_number: '',
    files: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [upperResponse, lowerResponse] = await Promise.all([
          axios.get("https://constructionproject-production.up.railway.app/api/invoice/invoice-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/invoice/invoice-data")
        ]);
        setUpperData(upperResponse.data || []);
        setLowerData(lowerResponse.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setSnackbarMessage("Error loading invoice data.");
        setOpenSnackbar(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleGenerateInvoice = (record) => {
    setFormData({ work_order_id: record.work_order_id, po_number: '', files: null });
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, files: e.target.files[0] }));
  };

  const handleSubmit = async () => {
    if (!formData.work_order_id || !formData.po_number || !formData.files) {
      setSnackbarMessage("Please fill all fields and attach the file.");
      setOpenSnackbar(true);
      return;
    }
    const uploadData = new FormData();
    uploadData.append("work_order_id", formData.work_order_id);
    uploadData.append("po_number", formData.po_number);
    uploadData.append("files", formData.files);

    try {
      await axios.post("https://constructionproject-production.up.railway.app/api/invoice/upload-and-save-invoice", uploadData);
      setSnackbarMessage("Invoice generated successfully.");
      setOpenSnackbar(true);
      setShowForm(false);

      setTimeout(async () => {
        const lowerResponse = await axios.get("https://constructionproject-production.up.railway.app/api/invoice/invoice-data");
        setLowerData(lowerResponse.data || []);

        const upperResponse = await axios.get("https://constructionproject-production.up.railway.app/api/invoice/invoice-coming");
        const filteredUpperData = upperResponse.data.filter(
          (item) => !lowerResponse.data.some(invoice => invoice.work_order_id === item.work_order_id)
        );
        setUpperData(filteredUpperData);


        const newInvoice = lowerResponse.data.find(item => item.work_order_id === formData.work_order_id);
        if (newInvoice && newInvoice.files) {
          setSelectedInvoice(newInvoice);
          setShowPreview(true);
        } else {
          setSnackbarMessage("Invoice saved but file not yet available.");
          setOpenSnackbar(true);
        }
      }, 1000);
    } catch (error) {
      console.error("Invoice submission error:", error);
      setSnackbarMessage("Error generating invoice.");
      setOpenSnackbar(true);
    }
  };

  const openInvoicePreview = (invoice) => {
    if (!invoice) {
      setSnackbarMessage("No invoice data available for preview.");
      setOpenSnackbar(true);
      return;
    }

    // Ensure it's a valid invoice object (not just a string path)
    const invoiceObj = lowerData.find(i => i.files === invoice || i.invoice_id === invoice.invoice_id);
    if (invoiceObj) {
      setSelectedInvoice(invoiceObj);
      setShowPreview(true);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Invoice Management</Typography>

      {/* Work Orders Awaiting Invoice */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">Work Orders Awaiting Invoice</Typography>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}><CircularProgress /></Box>
        ) : upperData.length === 0 ? (
          <Typography>No pending work orders found.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Work Order ID</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {upperData.map((record) => (
                  <TableRow key={record.work_order_id}>
                    <TableCell>{record.work_order_id}</TableCell>
                    <TableCell align="right">
                      <Button variant="contained" color="secondary" onClick={() => handleGenerateInvoice(record)}>Generate Invoice</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Generated Invoices */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6">Generated Invoices</Typography>
        {loading && !lowerData.length ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}><CircularProgress /></Box>
        ) : lowerData.length === 0 ? (
          <Typography>No invoices generated yet.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Invoice ID</TableCell>
                  <TableCell>Work Order ID</TableCell>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Download</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lowerData.map((invoice, index) => (
                  <TableRow key={invoice.invoice_id} hover>
                  <TableCell>{index + 1}</TableCell> {/* Serial Number */}                    <TableCell>{invoice.work_order_id}</TableCell>
                    <TableCell>{invoice.po_number}</TableCell>
                    <TableCell>
                      <Button variant="outlined" size="small" onClick={() => openInvoicePreview(invoice)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Invoice Upload Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <Box sx={{ p: 4, backgroundColor: "white", width: 400, margin: "auto", mt: 10, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Generate Invoice</Typography>
          <TextField fullWidth margin="normal" label="Work Order ID" value={formData.work_order_id} disabled />
          <TextField fullWidth margin="normal" label="PO Number" name="po_number" value={formData.po_number} onChange={handleChange} />
          <Button component="label" fullWidth variant="contained" color = "inherit" sx={{ my: 2 }}>
            <input type="file" hidden onChange={handleFileChange} />
            Upload Invoice File
          </Button>
          {formData.files && <Typography variant="body2">Selected: {formData.files.name}</Typography>}
          <Button variant="outlined" fullWidth onClick={handleSubmit}>Save</Button>
        </Box>
      </Modal>

      {/* Invoice Preview Modal */}
      <Modal open={showPreview} onClose={() => setShowPreview(false)}>
        <Box sx={{
          p: 4,
          backgroundColor: "white",
          width: "80%",
          maxHeight: "90vh",
          margin: "auto",
          mt: 5,
          borderRadius: 2,
          overflowY: "auto",
          boxShadow: 24,
        }}>
          {selectedInvoice && (
            <>
              <Typography variant="h5" align="center" gutterBottom sx={{ fontWeight: "bold" }}>
                MMC – Invoice
              </Typography>
              <Typography align="center" variant="subtitle1" color="text.secondary" gutterBottom sx={{ fontStyle: "italic" }}>
                "Building the Future, Restoring the Past"
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 2 }}>
                <Box>
                  <Typography variant="h6">MMC Construction</Typography>
                  <Typography>1234 Builder St.</Typography>
                  <Typography>City, Country</Typography>
                  <Typography>Phone: +123 456 7890</Typography>
                  <Typography>Email: info@mmcconstruction.com</Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="h6">Invoice</Typography>
                  <Typography>ID: {selectedInvoice.invoice_id}</Typography>
                  <Typography>Date: {new Date(selectedInvoice.createdAt || Date.now()).toLocaleDateString()}</Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography><strong>Work Order ID:</strong> {selectedInvoice.work_order_id}</Typography>
                <Typography><strong>PO Number:</strong> {selectedInvoice.po_number}</Typography>
              </Box>

              <Box sx={{ my: 2 }}>
                {selectedInvoice.files && (
                  <>
                    <iframe
                      src={selectedInvoice.files}
                      title="Invoice File"
                      width="100%"
                      height="600px"
                      style={{ border: "1px solid #ccc", marginBottom: 10 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => window.open(selectedInvoice.files, "_blank")}
                    >
                      Download Invoice
                    </Button>
                  </>
                )}
              </Box>
            </>
          )}
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
