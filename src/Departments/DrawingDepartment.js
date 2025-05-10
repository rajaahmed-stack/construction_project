import React, { useState, useEffect } from "react";
import axios from "axios";
import { Form, Button, Modal } from "react-bootstrap";
import "../styles/permissionclosing.css";

const processDrawingsData = (data) => {
  const today = new Date();
  return data.map((record) => {
    if (record.d_created_at && record.workexe_created_at) {
      const workCreatedAt = new Date(record.workexe_created_at);
      const surveyCreatedAt = new Date(record.d_created_at);
      const deadline = new Date(workCreatedAt);
      deadline.setDate(deadline.getDate() + 2);

      let statusColor = '';
      let deliveryStatus = 'On Time';

      if (surveyCreatedAt > deadline) {
        statusColor = 'red';
        deliveryStatus = 'Delayed';
      } else if (surveyCreatedAt < deadline) {
        statusColor = 'green';
        deliveryStatus = 'On Time';
      } else if ((deadline - today) / (1000 * 60 * 60 * 24) <= 1) {
        statusColor = 'yellow';
        deliveryStatus = 'Near Deadline';
      }

      return { ...record, deadline, statusColor, delivery_status: deliveryStatus };
    }
    return record;
  });
};

const DrawingDepartment = () => {
  const [upperData, setUpperData] = useState([]);
  const [lowerData, setLowerData] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [alertData, setAlertData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    work_order_id: "",
    drawing: "",
   
  });

  // // Fetch data from the backend
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const [comingResponse, permissionResponse] = await Promise.all([
  //         axios.get("https://constructionproject-production.up.railway.app/api/drawing-department/drawingdep-coming"),
  //         axios.get("https://constructionproject-production.up.railway.app/api/drawing-department/drawing-data"),
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
          axios.get("https://constructionproject-production.up.railway.app/api/drawing-department/drawingdep-coming"),
          axios.get("https://constructionproject-production.up.railway.app/api/drawing-department/drawing-data"),
        ]);
  
        
        const updatedData = processDrawingsData(permissionResponse.data);

        setLowerData(updatedData);
        setUpperData(comingResponse.data || []);
  
        // ✅ Ensure `updatedData` is not empty before updating backend
        if (updatedData.length > 0) {
          console.log("Updating delivery statuses in backend...");
  
          await Promise.all(updatedData.map(async (record) => {
            if (record.work_order_id && record.delivery_status) {
              try {
                const response = await axios.put("https://constructionproject-production.up.railway.app/api/drawing-department/update-ddelivery-status", {
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
  
          // alert(`Warning: Some work orders are close to or past their deadline.\n\n${alertMessage}`);
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
    
    // Ensure both certificates are set separately
    if (e.target.name === 'drawing') {
      setFormData((prevData) => ({
        ...prevData,
        drawing: file,
      }));
    } 
  };
   const refreshDrawingData = async () => {
        try {
          const [comingResponse, permissionResponse] = await Promise.all([
            axios.get("https://constructionproject-production.up.railway.app/api/drawing-department/drawingdep-coming"),
            axios.get("https://constructionproject-production.up.railway.app/api/drawing-department/drawing-data"),
          ]);
      
          const updatedData = processDrawingsData(permissionResponse.data);
      
          setUpperData(comingResponse.data || []);
          setLowerData(updatedData);
        } catch (error) {
          console.error("Error refreshing survey data:", error);
        }
      };
  
  const handleSave = async (e) => {
    e.preventDefault();
  
    // Validate required fields
    if (!formData.drawing) {
      alert('Please upload the drawing document.');
      return;
    }
  
    try {
      // Prepare form data for submission
      const formDataWithFile = new FormData();
      formDataWithFile.append('drawing', formData.drawing);
      formDataWithFile.append('work_order_id', formData.work_order_id);
  
      const response = await axios.post(
        'https://constructionproject-production.up.railway.app/api/drawing-department/upload-and-save-drawingdocument',
        formDataWithFile,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
  
      if (response.data.success) {
        alert('File uploaded and data saved successfully');
  
        // Update the lowerData state with the new record
       await refreshDrawingData();
        // Reset the form and close the modal
        setFormData({
          work_order_id: "",
          drawing: "",
        });
        setShowForm(false);
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
      await axios.post("https://constructionproject-production.up.railway.app/api/drawing-department/update-Ddepartment", {
        workOrderId,
      });
      alert("Work Order moved to GIS Department.");
    } catch (error) {
      console.error("Error updating department:", error);
    }
  };

  return (
    <div className="department-container">
      <h1>Welcome To Drawing Department</h1>
      <div className="permission-sections">
        <div className="upper-section">
          <h4>Incoming Drawing Data</h4>
          {upperData.length === 0 ? (
            <p>No incoming Drawing data available.</p>
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
                  <strong>Permission No.:</strong> {record. permission_number}
                </div>
                <div>
                      {(record.file_path || record.survey_file_path) ? (
                        <a href={`https://constructionproject-production.up.railway.app/api/drawing-department/drawing_download/${record.work_order_id}`} download>
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
          <h4>Drawing Data</h4>
          {lowerData.length === 0 ? (
            <p>No Drawing data available.</p>
          ) : (
            lowerData.map((record) => (
              <div key={record.work_order_id} className="permission-record">
                 <div>
                  <strong>Work Order:</strong> {record.work_order_id}
                </div>
               
                <div>
                  <strong>Drawing Documment Uploaded:</strong>{" "}
                  {record.drawing ? "✅" : "❌"}
                </div>
                
                
                {/* {record.current_department !== "GIS" && (
                  <Button
                    variant="success"
                    className="send-button"
                    onClick={() => handleSendToNext(record.work_order_id)}
                  >
                    Send to GIS
                  </Button>
                )} */}
              </div>
            ))
          )}
        </div>
      </div>
      <Modal show={showForm} onHide={() => setShowForm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Drawing Data</Modal.Title>
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
              <Form.Label>Drawing</Form.Label>
              <Form.Control
                type="file"
                name="drawing"
                onChange={handleFileUpload}
                // value={formData.Work_closing_certificate}
                required
              />
            </Form.Group>
            
            <Button variant="secondary" type="submit" onClick={handleSave}>
              Save Data
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

    </div>
  );
};

export default DrawingDepartment;
