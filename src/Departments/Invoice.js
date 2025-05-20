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
  const [formData, setFormData] = useState({
    work_order_id: '',
    po_number: '',
    files: null,
  });

  useEffect(() => {
    const fetchUpperData = async () => {
      try {
        const response = await axios.get("https://constructionproject-production.up.railway.app/api/invoice/invoice-coming");
        setUpperData(response.data);
      } catch (error) {
        console.error("Error fetching upper data:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchLowerData = async () => {
      try {
        const response = await axios.get("https://constructionproject-production.up.railway.app/api/invoice/invoice-data");
        setLowerData(response.data);
      } catch (error) {
        console.error("Error fetching invoice data:", error);
      }
    };

    fetchUpperData();
    fetchLowerData();
  }, []);

  const handleGenerateInvoice = (record) => {
    setFormData({ ...formData, work_order_id: record.work_order_id });
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, files: e.target.files[0] });
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
      const response = await axios.post(
        "https://constructionproject-production.up.railway.app/api/invoice/upload-and-save-invoice",
        uploadData
      );
  
      setSnackbarMessage("Invoice generated successfully.");
      setOpenSnackbar(true);
      setShowForm(false);
  
      // Refresh the lower table
      const refresh = await axios.get("https://constructionproject-production.up.railway.app/api/invoice/invoice-data");
      setLowerData(refresh.data);
  
      // Auto-display the newly uploaded invoice
      const newInvoice = refresh.data.find(item => item.work_order_id === formData.work_order_id);
      if (newInvoice && newInvoice.files) {
        openInvoiceInNewTab(newInvoice.files);
      }
    } catch (error) {
      console.error("Invoice submission error:", error);
      setSnackbarMessage("Error generating invoice.");
      setOpenSnackbar(true);
    }
  };
  

  const downloadInvoice = (fileData) => {
    if (!fileData) {
      console.error("No file data provided.");
      return;
    }

    if (typeof fileData === "string") {
      const a = document.createElement("a");
      a.href = fileData;
      a.download = fileData.split("/").pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    if (fileData.type === 'Buffer' && Array.isArray(fileData.data)) {
      const byteArray = new Uint8Array(fileData.data);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = 'invoice.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    console.error("Invalid file URL", fileData);
  };

  const openInvoiceInNewTab = (fileData) => {
    if (!fileData) {
      console.error("No file data provided.");
      return;
    }

    if (typeof fileData === "string") {
      window.open(fileData, "_blank");
      return;
    }

    if (fileData.type === 'Buffer' && Array.isArray(fileData.data)) {
      const byteArray = new Uint8Array(fileData.data);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      return;
    }

    console.error("Invalid file format:", fileData);
  };

  return (
    <Container>
      <Typography variant="h4" sx={{ mt: 3, mb: 2 }}>Invoice Management</Typography>

      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Received Data from Previous Department</Typography>
        {loading ? <CircularProgress /> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Work Order ID</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {upperData.map((record) => (
                  <TableRow key={record.work_order_id}>
                    <TableCell>{record.work_order_id}</TableCell>
                    <TableCell>
                      <Button variant="contained" onClick={() => handleGenerateInvoice(record)}>
                        Generate Invoice
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h6">Generated Invoices</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice ID</TableCell>
                <TableCell>Work Order ID</TableCell>
                <TableCell>PO Number</TableCell>
                <TableCell>Download</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lowerData.map((invoice) => (
                <TableRow
                  key={invoice.invoice_id}
                  onDoubleClick={() => openInvoiceInNewTab(invoice.files)}
                  style={{ cursor: "pointer" }}
                >
                  <TableCell>{invoice.invoice_id}</TableCell>
                  <TableCell>{invoice.work_order_id}</TableCell>
                  <TableCell>{invoice.po_number}</TableCell>
                  <TableCell>
                    <Button variant="outlined" onClick={() => downloadInvoice(invoice.files)}>
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <Box sx={{ p: 4, backgroundColor: 'white', width: 400, margin: 'auto', mt: 10, borderRadius: 2 }}>
          <Typography variant="h6">Generate Invoice</Typography>
          <TextField fullWidth margin="normal" label="Work Order ID" value={formData.work_order_id} disabled />
          <TextField fullWidth margin="normal" label="PO Number" name="po_number" value={formData.po_number} onChange={handleChange} />
          <Button component="label" fullWidth variant="contained" sx={{ my: 2 }}>
            Upload Invoice File
            <input type="file" hidden onChange={handleFileChange} />
          </Button>
          <Button variant="outlined" fullWidth onClick={handleSubmit}>Save</Button>
        </Box>
      </Modal>

      <Snackbar open={openSnackbar} autoHideDuration={4000} onClose={() => setOpenSnackbar(false)} message={snackbarMessage} />
    </Container>
  );
};

export default Invoice;
