const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver'); // Ensure archiver is imported
const router = express.Router();

// MySQL Database Connection
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'shinkansen.proxy.rlwy.net',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'XjSGGFPPsszznJyxanyHBVzUeppoFkKn',
  database: process.env.MYSQL_DATABASE || 'railway',
  port: process.env.MYSQL_PORT || '44942'

});

db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to the database');
  }
});
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Create the upload object
const upload = multer({ storage: storage });


// Backend route for handling file uploads
router.post('/upload-workExecution-file/:fieldName', upload.single('file'), (req, res) => {
  const { file } = req;
  const fieldName = req.params.fieldName;
  
  if (!file) {
    console.log("No file uploaded!");
    return res.status(400).send('No file uploaded');
  }
  console.log('Uploaded file:', file);  // Log the uploaded file to check it

  // Return the file path after uploading
  const filePath = path.join('uploads', file.filename);
  res.json({ filePath });
});

// Fetch workExecution Coming Data
router.get('/workExecution-coming', (req, res) => {
  const query = `
      SELECT safety_department.work_order_id, 
      safety_department.permission_number,
      work_receiving.job_type, 
      work_receiving.sub_section,
      work_receiving.file_path,
      survey.survey_file_path
    FROM safety_department 
    LEFT JOIN work_receiving 
    ON safety_department.work_order_id = work_receiving.work_order_id
    LEFT JOIN survey 
    ON safety_department.work_order_id = survey.work_order_id
    WHERE safety_department.work_order_id NOT IN 
    (SELECT work_order_id FROM work_execution) 
    AND work_receiving.current_department = 'WorkExecution';

  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).send('Database query error');
    } else {
      console.log('Work Execution Fetching Data:', results);  // Log the results
      res.json(results);
    }
  });
});

router.get('/workExecution-data', (req, res) => {
  const query = `
    SELECT work_execution.work_order_id,
           work_execution.permission_number, 
           work_receiving.job_type, 
           work_receiving.sub_section,
           work_receiving.current_department,
           work_receiving.file_path,
           work_execution.receiving_date, 
           work_execution.user_type, 
           work_execution.Contractor_name, 
           work_execution.asphalt,
           work_execution.asphalt_completed,
           work_execution.milling,
           work_execution.milling_completed,
           work_execution.concrete,
           work_execution.Concrete_completed,
           work_execution.deck3,
           work_execution.deck3_completed,
           work_execution.deck2,
           work_execution.deck2_completed,
           work_execution.deck1,
           work_execution.deck1_completed,
           work_execution.sand,
           work_execution.sand_completed,
           work_execution.backfilling,
           work_execution.backfilling_completed,
           work_execution.cable_lying,
           work_execution.cable_lying_completed,
           work_execution.trench,
           work_execution.trench_completed,
           work_execution.remark,
           work_execution.workexe_created_at,
           safety_department.safety_created_at,
           survey.survey_file_path
          
    FROM work_execution
    LEFT JOIN work_receiving 
    ON work_execution.work_order_id = work_receiving.work_order_id
    LEFT JOIN safety_department 
    ON work_execution.work_order_id = safety_department.work_order_id
    LEFT JOIN survey 
    ON work_execution.work_order_id = survey.work_order_id
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).send('Database query error');
    } else {
      console.log('Work Execution Data:', results);  // Log the results
      res.json(results);
    }
  });
});

// Update work order department
router.post('/update-wedepartment', express.json(), (req, res) => {
  const { workOrderId } = req.body;
  const query = `
    UPDATE work_receiving 
    SET current_department = 'PermissionClosing', delivery_status = ?
    WHERE work_order_id = ?
  `;
  db.query(query, [workOrderId], (err, result) => {
    if (err) {
      console.error('Error updating department:', err);
      res.status(500).send('Error updating department');
    } else {
      res.status(200).send('Department updated');
    }
  });
});

// Save workexection Data
// Save Work Execution Work Order Data
router.post("/save-workexecution-workorder", (req, res) => {
  const { work_order_id, permission_number, receiving_date, user_type, contractorName } = req.body;

  if (!work_order_id || !permission_number || !receiving_date || !user_type) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  const query = `
    INSERT INTO work_execution (work_order_id, permission_number, receiving_date, user_type, contractor_name) 
    VALUES (?, ?, ?, ?, ?);
  `;

  db.query(query, [work_order_id, permission_number,  receiving_date, user_type, contractorName || "N/A"], (err) => {
    if (err) {
      console.error("Error saving work execution data:", err);
      return res.status(500).json({ success: false, message: "Database error. Failed to save data." });
    }

    res.status(200).json({ success: true, message: "Work execution data saved successfully!" });
  });
});

router.post('/save-asphalt', (req, res) => {
  const { asphalt, asphalt_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received asphalt:", asphalt); // Debug: log received file path

  const updateQuery = `
    UPDATE work_execution 
    SET asphalt = ?, asphalt_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO work_execution (work_order_id, asphalt, asphalt_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [asphalt, asphalt_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, asphalt, asphalt_completed], (err2, result2) => {
        if (err2) {
          console.error("Insert error:", err2);
          return res.status(500).send("Error during insert");
        }
        return res.status(200).send("Field inserted successfully");
      });
    } else {
      return res.status(200).send("Field updated successfully");
    }
  });
});
router.post('/save-milling', (req, res) => {
  const { milling, milling_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received milling:", milling); // Debug: log received file path

  const updateQuery = `
    UPDATE work_execution 
    SET milling = ?, milling_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO work_execution (work_order_id, milling, milling_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [milling, milling_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, milling, milling_completed], (err2, result2) => {
        if (err2) {
          console.error("Insert error:", err2);
          return res.status(500).send("Error during insert");
        }
        return res.status(200).send("Field inserted successfully");
      });
    } else {
      return res.status(200).send("Field updated successfully");
    }
  });
});
router.post('/save-concrete', (req, res) => {
  const { concrete, concrete_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received concrete:", concrete); // Debug: log received file path

  const updateQuery = `
    UPDATE work_execution 
    SET concrete = ?, concrete_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO work_execution (work_order_id, concrete, concrete_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [concrete, concrete_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, concrete, concrete_completed], (err2, result2) => {
        if (err2) {
          console.error("Insert error:", err2);
          return res.status(500).send("Error during insert");
        }
        return res.status(200).send("Field inserted successfully");
      });
    } else {
      return res.status(200).send("Field updated successfully");
    }
  });
});
router.post('/save-deck3', (req, res) => {
  const { deck3, deck3_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received deck3:", deck3); // Debug: log received file path

  const updateQuery = `
    UPDATE work_execution 
    SET deck3 = ?, deck3_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO work_execution (work_order_id, deck3, deck3_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [deck3, deck3_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, deck3, deck3_completed], (err2, result2) => {
        if (err2) {
          console.error("Insert error:", err2);
          return res.status(500).send("Error during insert");
        }
        return res.status(200).send("Field inserted successfully");
      });
    } else {
      return res.status(200).send("Field updated successfully");
    }
  });
});

router.post('/save-deck2', (req, res) => {
  const { deck2, deck2_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received deck2:", deck2); // Debug: log received file path

  const updateQuery = `
    UPDATE work_execution 
    SET deck2 = ?, deck2_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO work_execution (work_order_id, deck2, deck2_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [deck2, deck2_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, deck2, deck2_completed], (err2, result2) => {
        if (err2) {
          console.error("Insert error:", err2);
          return res.status(500).send("Error during insert");
        }
        return res.status(200).send("Field inserted successfully");
      });
    } else {
      return res.status(200).send("Field updated successfully");
    }
  });
});
router.post('/save-deck1', (req, res) => {
  const { deck1, deck1_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received deck1:", deck1); // Debug: log received file path

  const updateQuery = `
    UPDATE work_execution 
    SET deck1 = ?, deck1_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO work_execution (work_order_id, deck1, deck1_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [deck1, deck1_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, deck1, deck1_completed], (err2, result2) => {
        if (err2) {
          console.error("Insert error:", err2);
          return res.status(500).send("Error during insert");
        }
        return res.status(200).send("Field inserted successfully");
      });
    } else {
      return res.status(200).send("Field updated successfully");
    }
  });
});

router.post('/save-sand', (req, res) => {
  const { sand, sand_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received sand:", sand); // Debug: log received file path

  const updateQuery = `
    UPDATE work_execution 
    SET sand = ?, sand_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO work_execution (work_order_id, sand, sand_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [sand, sand_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, sand, sand_completed], (err2, result2) => {
        if (err2) {
          console.error("Insert error:", err2);
          return res.status(500).send("Error during insert");
        }
        return res.status(200).send("Field inserted successfully");
      });
    } else {
      return res.status(200).send("Field updated successfully");
    }
  });
});
router.post('/save-backfilling', (req, res) => {
  const { backfilling, backfilling_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received backfilling:", backfilling); // Debug: log received file path

  const updateQuery = `
    UPDATE work_execution 
    SET backfilling = ?, backfilling_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO work_execution (work_order_id, backfilling, backfilling_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [backfilling, backfilling_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, backfilling, backfilling_completed], (err2, result2) => {
        if (err2) {
          console.error("Insert error:", err2);
          return res.status(500).send("Error during insert");
        }
        return res.status(200).send("Field inserted successfully");
      });
    } else {
      return res.status(200).send("Field updated successfully");
    }
  });
});
router.post('/save-backfilling', (req, res) => {
  const { backfilling, backfilling_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received backfilling:", backfilling); // Debug: log received file path

  const updateQuery = `
    UPDATE work_execution 
    SET backfilling = ?, backfilling_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO work_execution (work_order_id, backfilling, backfilling_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [backfilling, backfilling_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, backfilling, backfilling_completed], (err2, result2) => {
        if (err2) {
          console.error("Insert error:", err2);
          return res.status(500).send("Error during insert");
        }
        return res.status(200).send("Field inserted successfully");
      });
    } else {
      return res.status(200).send("Field updated successfully");
    }
  });
});

router.post('/save-cable_lying', (req, res) => {
  const { cable_lying, cable_lying_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received cable_lying:", cable_lying); // Debug: log received file path

  const updateQuery = `
    UPDATE work_execution 
    SET cable_lying = ?, cable_lying_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO work_execution (work_order_id, cable_lying, cable_lying_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [cable_lying, cable_lying_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, cable_lying, cable_lying_completed], (err2, result2) => {
        if (err2) {
          console.error("Insert error:", err2);
          return res.status(500).send("Error during insert");
        }
        return res.status(200).send("Field inserted successfully");
      });
    } else {
      return res.status(200).send("Field updated successfully");
    }
  });
});

router.post('/save-trench', (req, res) => {
  const { trench, trench_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received trench:", trench); // Debug: log received file path

  const updateQuery = `
    UPDATE work_execution 
    SET trench = ?, trench_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO work_execution (work_order_id, trench, trench_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [trench, trench_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, trench, trench_completed], (err2, result2) => {
        if (err2) {
          console.error("Insert error:", err2);
          return res.status(500).send("Error during insert");
        }
        return res.status(200).send("Field inserted successfully");
      });
    } else {
      return res.status(200).send("Field updated successfully");
    }
  });
});



router.post('/save-remainingdata', (req, res) => {
  const { remark, work_order_id } = req.body;
  console.log("Received Remaining Data:", remark);

  const query1 = `UPDATE work_execution SET remark = ? WHERE work_order_id = ?`;

  db.query(query1, [remark, work_order_id], (err, result1) => {
    if (err) {
      console.error("Error updating work execution field:", err);
      return res.status(500).send("Error saving work execution field");
    }

    const query2 = `
      UPDATE work_receiving 
      SET current_department = 'PermissionClosing' 
      WHERE work_order_id = ?
    `;

    db.query(query2, [work_order_id], (err, result2) => {
      if (err) {
        console.error("Error updating department:", err);
        return res.status(500).send("Error updating department");
      }

      res.status(200).send("Field and department updated successfully");
    });
  });
});

router.put("/update-wedelivery-status", (req, res) => {
  const { work_order_id, delivery_status } = req.body;

  console.log("Received request to update:", req.body); // Debugging log

  if (!work_order_id || !delivery_status) {
    console.error("Missing required fields");
    return res.status(400).json({ error: "Missing required fields" });
  }

  const updateQuery = `
    UPDATE work_receiving 
    SET delivery_status = ?
    WHERE work_order_id = ?
  `;

  db.query(updateQuery, [delivery_status, work_order_id], (err, result) => {
    if (err) {
      console.error("Error updating delivery status:", err);
      return res.status(500).json({ error: "Database update failed" });
    }

    if (result.affectedRows === 0) {
      console.warn("No records updated. Check if work_order_id exists:", work_order_id);
      return res.status(404).json({ error: "Work order not found" });
    }

    console.log("Database updated successfully:", result);
    res.json({ message: "Delivery status updated successfully", affectedRows: result.affectedRows });
  });
});
router.get('/woekexe_download/:id', async (req, res) => {
  console.log('Work Execution download API triggered');

  const fileId = req.params.id;

  // Query the database for the file path
  db.query(
    `SELECT file_path FROM work_receiving WHERE work_order_id = ?
     UNION 
     SELECT survey_file_path FROM survey WHERE work_order_id = ?
     UNION 
     SELECT Document FROM permissions WHERE work_order_id = ?
     UNION 
     SELECT safety_signs FROM safety_department WHERE work_order_id = ?
     UNION 
     SELECT safety_barriers FROM safety_department WHERE work_order_id = ?
     UNION 
     SELECT safety_lights FROM safety_department WHERE work_order_id = ?
     UNION 
     SELECT safety_boards FROM safety_department WHERE work_order_id = ?
     UNION 
     SELECT permissions FROM safety_department WHERE work_order_id = ?
     UNION 
     SELECT safety_documentation FROM safety_department WHERE work_order_id = ?
    `,
    Array(9).fill(fileId), // Correctly mapping parameters
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Database error');
      }

      if (!results.length) {
        return res.status(404).send('File not found');
      }

      // Finding the first non-null file path
      let filePath = results.find(row => Object.values(row)[0])?.[Object.keys(results[0])[0]];

      if (!filePath) {
        return res.status(404).send('File not found');
      }

      // Convert Buffer to String if necessary
      if (Buffer.isBuffer(filePath)) {
        filePath = filePath.toString('utf8');
      }

      // Ensure the file path is correct
      const absolutePath = path.resolve(__dirname, '..', filePath);

      console.log(`Downloading file from: ${absolutePath}`);

      res.download(absolutePath, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          return res.status(500).send('Error downloading file');
        }
      });
    }
  );
});
router.get('/workexe_download/:id', (req, res) => {
  const fileId = req.params.id;

  const queries = [
    { sql: 'SELECT file_path FROM work_receiving WHERE work_order_id = ?', key: 'file_path' },
    { sql: 'SELECT survey_file_path FROM survey WHERE work_order_id = ?', key: 'survey_file_path' },
    { sql: 'SELECT Document FROM permissions WHERE work_order_id = ?', key: 'Document' },
    { sql: 'SELECT safety_signs FROM safety_department WHERE work_order_id = ?', key: 'safety_signs' },
    { sql: 'SELECT safety_barriers FROM safety_department WHERE work_order_id = ?', key: 'safety_barriers' },
    { sql: 'SELECT safety_lights FROM safety_department WHERE work_order_id = ?', key: 'safety_lights' },
    { sql: 'SELECT safety_boards FROM safety_department WHERE work_order_id = ?', key: 'safety_boards' },
    { sql: 'SELECT permissions FROM safety_department WHERE work_order_id = ?', key: 'permissions' },
    { sql: 'SELECT safety_documentation FROM safety_department WHERE work_order_id = ?', key: 'safety_documentation' }
  ];

  let files = [];
  let completed = 0;

  queries.forEach((q, index) => {
    db.query(q.sql, [fileId], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Database error');
      }

      if (results.length > 0 && results[0][q.key]) {
        let filePath = results[0][q.key];
        if (Buffer.isBuffer(filePath)) {
          filePath = filePath.toString('utf8');
        }
        const absolutePath = path.join(__dirname, '..', filePath);
        files.push({ path: absolutePath, name: path.basename(absolutePath) });
      }

      completed++;

      // After both queries finish
      if (completed === queries.length) {
        if (files.length === 0) {
          return res.status(404).send('No files found to download');
        }

        // Create zip archive
        res.setHeader('Content-Disposition', 'attachment; filename=documents.zip');
        res.setHeader('Content-Type', 'application/zip');

        const archive = archiver('zip');
        archive.pipe(res);

        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            archive.file(file.path, { name: file.name });
          }
        });

        archive.finalize();
      }
    });
  });
});




module.exports = router;

