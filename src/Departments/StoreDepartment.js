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
    material_return: [],
    material_receiving: [],
    material_pending: [],
   
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

  const handleFileUpload = (e, category, index) => {
    const files = Array.from(e.target.files);
    setFormData((prevData) => {
      const updatedCategoryFiles = [...prevData[category]];
      updatedCategoryFiles[index] = files[0]; // store one file per field
      return {
        ...prevData,
        [category]: updatedCategoryFiles,
      };
    });
  };
  const handleAddFileField = (category) => {
    setFormData((prevData) => ({
      ...prevData,
      [category]: [...prevData[category], ""],
    }));
  };
    
  
  const handleSave = async (e) => {
    e.preventDefault();
  
    const { material_return, material_receiving, material_pending, work_order_id } = formData;
  
    if (!material_return?.length || !material_receiving?.length || !material_pending?.length) {
      alert('Please select all required files.');
      return;
    }
  
    try {
      const formDataWithFile = new FormData();
      formDataWithFile.append('work_order_id', work_order_id);
  
      material_return.filter(Boolean).forEach(file => {
        formDataWithFile.append('material_return', file);
      });
      material_receiving.filter(Boolean).forEach(file => {
        formDataWithFile.append('material_receiving', file);
      });
      material_pending.filter(Boolean).forEach(file => {
        formDataWithFile.append('material_pending', file);
      });
      
  
      const response = await axios.post(
        'https://constructionproject-production.up.railway.app/api/store/upload-and-save-storedocument',
        formDataWithFile,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
  
      if (response.data.success) {
        alert('Files uploaded and data saved successfully');
        setShowForm(false);
        setFormData({
          work_order_id: "",
          material_return: [],
          material_receiving: [],
          material_pending: [],
        });
  
        // Refresh data
        const [comingResponse, permissionResponse] = await Promise.all([
          axios.get("https://constructionproject-production.up.railway.app/api/store/gisdepstore-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/store/store-data"),
        ]);
        setUpperData(comingResponse.data || []);
        setLowerData(permissionResponse.data || []);
      } else {
        alert('Failed to upload files');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload. Please try again.');
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
  const handleRemoveFileField = (category, index) => {
    setFormData((prevData) => {
      const updatedFiles = [...prevData[category]];
      updatedFiles.splice(index, 1); // Remove file at index
      return {
        ...prevData,
        [category]: updatedFiles,
      };
    });
  };
  


  
  

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
                      {( record.file_path) ? (
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
                  {record.material_receiving ? "✅" : "❌"}
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
    <Form.Group controlId="workOrderId" className="mb-3">
      <Form.Label>Work Order ID</Form.Label>
      <Form.Control
        type="text"
        name="work_order_id"
        value={formData.work_order_id}
        readOnly
      />
    </Form.Group>

    {/* Render File Inputs with label and buttons */}
    {["material_return", "material_receiving", "material_pending"].map((category) => (
      <Form.Group controlId={`formFile${category}`} className="mb-4" key={category}>
        <Form.Label className="text-capitalize">{category.replace('_', ' ')}</Form.Label>
        {formData[category].map((_, index) => (
          <div key={index} className="d-flex align-items-center gap-2 mb-2">
            <Form.Control
              type="file"
              onChange={(e) => handleFileUpload(e, category, index)}
              required
            />
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => handleRemoveFileField(category, index)}
              disabled={formData[category].length === 1} // Don't allow removing the last file input
            >
              ❌
            </Button>
          </div>
        ))}
        <Button
          variant="outline-success"
          size="sm"
          onClick={() => handleAddFileField(category)}
        >
          + Add file
        </Button>
      </Form.Group>
    ))}

    <Button variant="primary" type="submit" className="w-100">
      Save Data
    </Button>
  </Form>
</Modal.Body>
      </Modal>

    </div>
  );
};

export default StoreDepartment;
