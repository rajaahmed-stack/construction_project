import React, { useState, useEffect } from "react";
import axios from "axios";
import { Form, Button, Modal } from "react-bootstrap";
import "../styles/permissionclosing.css";

const StoreDepartment = () => {
  const [upperData, setUpperData] = useState([]);
  const [lowerData, setLowerData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [alertData, setAlertData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    work_order_id: "",
    material_return: "",
    material_recieving: "",
    material_pending: "",
   
  });

  // Fetch data from the backend
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const [comingResponse, permissionResponse] = await Promise.all([
  //         axios.get("https://constructionproject-production.up.railway.app/api/store/gisdepstore-coming"),
  //         axios.get("https://constructionproject-production.up.railway.app/api/store/store-data"),
  //       ]);
  //       setUpperData(comingResponse.data || []);
  //       setLowerData(permissionResponse.data || []);
  //     } catch (error) {
  //       console.error("Error fetching data:", error);
  //     }
  //   };
  //   fetchData();
  // }, []);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [comingResponse, permissionResponse] = await Promise.all([
          axios.get("https://constructionproject-production.up.railway.app/api/store/gisdepstore-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/store/store-data"),
        ]);
  
        console.log("Coming Response:", comingResponse.data);
        console.log("Permission Response:", permissionResponse.data);
  
        setUpperData(comingResponse.data || []);
        setLowerData(permissionResponse.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
  
    fetchData();
  }, []);
//  eep dependency array empty to prevent infinite loops

  const handleAddData = (record) => {
    console.log("Add Data Clicked:", record);
    setFormData({ ...formData, work_order_id: record.work_order_id});
    setShowForm(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      alert('Please select a file.');
      return;
    }
  
    // Set only the specific file in formData
    setFormData((prevData) => ({
      ...prevData,
      [e.target.name]: file, // Dynamically updating the field
    }));
  };
  
  const handleSave = async (e) => {
    e.preventDefault();
  
    // Ensure all required files are selected
    if (!formData.material_return || !formData.material_recieving || !formData.material_pending) {
      alert('Please select all required files before uploading.');
      return;
    }
  
    try {
      const formDataWithFile = new FormData();
      formDataWithFile.append('material_return', formData.material_return);
      formDataWithFile.append('material_recieving', formData.material_recieving);
      formDataWithFile.append('material_pending', formData.material_pending);
      formDataWithFile.append('work_order_id', formData.work_order_id);
  
      const response = await axios.post(
        'https://constructionproject-production.up.railway.app/api/store/upload-and-save-storedocument',
        formDataWithFile,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
  
      if (response.data.success) {
        alert('File uploaded and data saved successfully');
        setShowForm(false);
  
        // Reset formData correctly
        setFormData({
          work_order_id: "",
          material_return: null,
          material_recieving: null,
          material_pending: null,
        });
  
        // Refresh data
        const [comingResponse, permissionResponse] = await Promise.all([
          axios.get("https://constructionproject-production.up.railway.app/api/store/gisdepstore-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/store/store-data"),
        ]);
        setUpperData(comingResponse.data || []);
        setLowerData(permissionResponse.data || []);
      } else {
        alert('Failed to upload the file');
      }
    } catch (error) {
      console.error('Error uploading file and saving data:', error);
      alert('Failed to upload file and save data. Please try again.');
    }
  };
  
  
  
  
  
  // Update Remaining Days Automatically
  useEffect(() => {
    const updateRemainingDays = () => {
      const today = new Date();
      const updatedData = lowerData.map((record) => {
        const endDate = new Date(record.end_date);
        const remainingDays = Math.max(
          Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)),
          0
        );
        return { ...record, remaining_days: remainingDays };
      });
      setLowerData(updatedData);
    };

    const interval = setInterval(updateRemainingDays, 24 * 60 * 60 * 1000); // Update every day
    updateRemainingDays(); // Initial calculation

    return () => clearInterval(interval); // Cleanup interval
  }, [lowerData]);



  
  

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      const updatedData = { ...prevData, [name]: value };
      if (name === "end_date" && updatedData.start_date) {
        const startDate = new Date(updatedData.start_date);
        const endDate = new Date(value);
        const remainingDays = Math.ceil(
          (endDate - startDate) / (1000 * 60 * 60 * 24)
        );
        updatedData.remaining_days = remainingDays > 0 ? remainingDays : 0;
      }
      return updatedData;
    });
  };
  
  const handleSendToNext = async (workOrderId) => {
    try {
      await axios.post("https://constructionproject-production.up.railway.app/api/store/update-gisdepartment", {
        workOrderId,
      });
      alert("Work Order moved to Store");
    } catch (error) {
      console.error("Error updating department:", error);
    }
  };

  return (
    <div className="department-container">
      <h1>Welcome To Store</h1>
      <div className="permission-sections">
        <div className="upper-section">
          <h4>Incoming Store</h4>
          {upperData.length === 0 ? (
            <p>No incoming Store data available.</p>
          ) : (
            upperData.map((record) => (
              <div key={record.work_order_id} className="permission-record">
                <div>
                  <strong>Work Order:</strong> {record.work_order_id}
                </div>
                <div>
                  <strong>Job Type:</strong> {record.job_type}
                </div>
                <div>
                  <strong>Sub Section:</strong> {record.sub_section}
                </div>
                <div>
                      {( record.gis) ? (
                        <a href={`https://constructionproject-production.up.railway.app/api/store/store_download/${record.work_order_id}`} download>
                          ✅ 📂 Download
                        </a>
                      ) : (
                        "❌ No File"
                      )}
                    </div>
                <Button onClick={() => handleAddData(record)} variant="primary">
                  Add Data
                </Button>
              </div>
            ))
          )}
        </div>
        <div className="lower-section">
          <h4>Store Data</h4>
          {lowerData.length === 0 ? (
            <p>No Store data available.</p>
          ) : (
            lowerData.map((record) => (
              <div key={record.work_order_id} className="permission-record">
                 <div>
                  <strong>Work Order:</strong> {record.work_order_id}
                </div>
               
                <div>
                  <strong>Material Return Uploaded:</strong>{" "}
                  {record.material_return ? "✅" : "❌"}
                </div>
                <div>
                  <strong>Material Receiving Uploaded:</strong>{" "}
                  {record.material_recieving ? "✅" : "❌"}
                </div>
                <div>
                  <strong>Material Pending Uploaded:</strong>{" "}
                  {record.material_pending ? "✅" : "❌"}
                </div>
                
                
                {/* <Button
                  variant="success"
                  className="send-button"
                  onClick={() => handleSendToNext(record.work_order_id)}
                >
                  Send to Next
                </Button> */}
              </div>
            ))
          )}
        </div>
      </div>
      <Modal show={showForm} onHide={() => setShowForm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Store Data</Modal.Title>
        </Modal.Header>
        <Modal.Body>
        <Form onSubmit={handleSave}>
            <Form.Group controlId="workOrderId">
              <Form.Label>Work Order ID</Form.Label>
              <Form.Control
                type="text"
                name="work_order_id"
                value={formData.work_order_id}
                readOnly
              />
            </Form.Group>
            <Form.Group controlId="formFile">
              <Form.Label>Material Return</Form.Label>
              <Form.Control
                type="file"
                name="material_return"
                onChange={handleFileUpload}
                // value={formData.Work_closing_certificate}
                required
              />
            </Form.Group>
            <Form.Group controlId="formFile">
              <Form.Label>Material Receiving</Form.Label>
              <Form.Control
                type="file"
                name="material_recieving"
                onChange={handleFileUpload}
                // value={formData.Work_closing_certificate}
                required
              />
            </Form.Group>
            <Form.Group controlId="formFile">
              <Form.Label>Material Pending</Form.Label>
              <Form.Control
                type="file"
                name="material_pending"
                onChange={handleFileUpload}
                // value={formData.Work_closing_certificate}
                required
              />
            </Form.Group>
            
            <Button variant="primary" type="submit" onClick={handleSave}>
              Save Data
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

    </div>
  );
};

export default StoreDepartment;
