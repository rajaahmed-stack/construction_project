const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const bodyParser = require('body-parser');
const archiver = require('archiver');


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
router.use(express.json());
// Ensure uploads directory exists
const uploadDir = path.resolve('uploads'); // resolves relative to project root
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });



// Backend route for handling file uploads
router.post('/upload-safety-files/:fieldName', upload.array('file'), (req, res) => {
  const files = req.files;
  const fieldName = req.params.fieldName;

  if (!files) {
    console.log("No file uploaded!");
    return res.status(400).send('No file uploaded');
  }

  console.log('Uploaded file:', files); // Debugging log

  // Return the file path after uploading
  const filePaths = files.map(file => `uploads/${file.filename}`);
  res.json({ fieldName, filePaths });
});

// Fetch Safety Coming Data
router.get('/safety-coming', (req, res) => {
  const query = `
    SELECT 
    permissions.work_order_id, 
    permissions.permission_number,
    permissions.start_date,
    permissions.Document,
    work_receiving.job_type, 
    work_receiving.file_path, 
    work_receiving.sub_section,
    survey.survey_file_path
FROM permissions 
LEFT JOIN work_receiving 
    ON permissions.work_order_id = work_receiving.work_order_id
LEFT JOIN survey 
    ON permissions.work_order_id = survey.work_order_id
WHERE permissions.work_order_id NOT IN (
    SELECT work_order_id FROM safety_department
)
AND current_department = 'Safety'
AND work_receiving.job_type != 'New Meters';
 
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).send('Database query error');
    } else {
      console.log('Safety Coming Data:', results);  // Log the results
      res.json(results);
    }
  });
});


// Fetch Safety Data
router.get('/safety-data', (req, res) => {
  const query = `
    SELECT 
      s.work_order_id,
      s.permission_number,
      w.job_type, 
      w.sub_section,
      w.current_department,
      w.file_path,
      s.safety_created_at,
      p.permission_created_at,
      p.Document,
      s.safety_signs_completed, 
      s.safety_barriers_completed, 
      s.safety_lights_completed, 
      s.safety_board_completed,
      s.safety_documentation_completed, 
      s.permissions_completed, 
      s.site_rechecking_date, 
      s.remarks, 
      s.safety_penalties, 
      survey.survey_file_path 
    FROM safety_department s
    LEFT JOIN work_receiving w ON s.work_order_id = w.work_order_id
    LEFT JOIN permissions p ON s.work_order_id = p.work_order_id
    LEFT JOIN survey ON s.work_order_id = survey.work_order_id;
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).send('Database query error');
    } else {
      console.log('Safety Fetching Data:', results);
      res.json(results);
    }
  });
});

router.post('/save-safety', (req, res) => {
  const { site_rechecking_date, remarks, safety_penalties, work_order_id } = req.body;
  console.log("Received safety remaining data:", site_rechecking_date, remarks, safety_penalties, work_order_id);

  // Step 1: Update safety_department
  const query1 = `
    UPDATE safety_department 
    SET site_rechecking_date = ?, remarks = ?, safety_penalties = ? 
    WHERE work_order_id = ?
  `;
  
  db.query(query1, [site_rechecking_date, remarks, safety_penalties, work_order_id], (err, result1) => {
    if (err) {
      console.error("Error updating safety field:", err);
      return res.status(500).send("Error saving safety field");
    }

    console.log('Rows affected in safety_department:', result1.affectedRows);

    // Check if no rows were affected by the first query
    if (result1.affectedRows === 0) {
      console.error("No rows were updated in safety_department for work_order_id:", work_order_id);
      return res.status(404).send("No matching safety data found for this work order ID");
    }

    // Step 2: Update work_receiving department status
    const query2 = `
      UPDATE work_receiving 
      SET current_department = 'WorkExecution', previous_department = 'Safety' 
      WHERE work_order_id = ?
    `;
    
    db.query(query2, [work_order_id], (err, result2) => {
      if (err) {
        console.error('Error updating department:', err);
        return res.status(500).send('Error updating department');
      }

      console.log('Rows affected in work_receiving:', result2.affectedRows);

      // Check if no rows were affected in work_receiving
      if (result2.affectedRows === 0) {
        console.error("No rows were updated in work_receiving for work_order_id:", work_order_id);
        return res.status(404).send("No matching work order found for department update");
      }

      // Step 3: Send success response
      res.status(200).send('Field and department updated successfully');
    });
  });
});


// Update work order department
router.post('/update-nextdepartment', express.json(), (req, res) => {
  const { workOrderId } = req.body;
  const query = `
    UPDATE work_receiving 
    SET current_department = 'WorkExecution' ,previous_department = 'Safety'
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

// Save Safety Data
router.post('/save-safety-workorder', (req, res) => {
  const { work_order_id, permission_number } = req.body;

  console.log("Received data:", req.body); // Log the incoming request data to check what’s coming in

  if (!work_order_id || !permission_number) {
    return res.status(400).send('Missing required fields: work_order_id or permission_number');
  }

  const query = `
    INSERT INTO safety_department (work_order_id, permission_number) 
    VALUES (?, ?);
  `;
  
  // Execute the query to save data in the database
  db.query(query, [work_order_id, permission_number], (err, result) => {
    if (err) {
      console.error('Error saving safety data:', err);
      return res.status(500).send('Error saving safety data');
    }
    console.log("Data inserted:", result);
    res.send('Safety data saved successfully');
  });
});



// Save individual safety field data
router.post('/save-safety-signs', (req, res) => {
  const { safety_signs, safety_signs_completed, work_order_id } = req.body;

  console.log("Received data:", req.body);  // Debug line

  if (!work_order_id) {
    return res.status(400).send("Missing work_order_id");
  }
  let safetySignsStr = safety_signs;

  if (Array.isArray(safety_signs)) {
    safetySignsStr = safety_signs.join(','); // ✅ store as plain comma-separated
  }
  const updateQuery = `
    UPDATE safety_department 
    SET safety_signs = ?, safety_signs_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO safety_department (work_order_id, safety_signs, safety_signs_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [safetySignsStr, safety_signs_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      db.query(insertQuery, [work_order_id, safetySignsStr, safety_signs_completed], (err2, result2) => {
        if (err2) {
          console.error("Insert error:", err2);
          return res.status(500).send("Error during insert");
        }
        console.log("Insert result:", result2);
        return res.status(200).send("Field inserted successfully");
      });
    } else {
      console.log("Update result:", result);
      return res.status(200).send("Field updated successfully");
    }
  });
});

router.post('/save-safety-barriers', (req, res) => {
  const { safety_barriers, safety_barriers_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received safety_barriers:", safety_barriers); // Debug: log received file path

  let safetyBarriers = safety_barriers;
  if (Array.isArray(safety_barriers)) {
    safetyBarriers = safety_barriers.join(','); // ✅ store as plain comma-separated
  }
  const updateQuery = `
    UPDATE safety_department 
    SET safety_barriers = ?, safety_barriers_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO safety_department (work_order_id, safety_barriers, safety_barriers_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [safetyBarriers, safety_barriers_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, safetyBarriers, safety_barriers_completed], (err2, result2) => {
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
router.post('/save-safety-lights', (req, res) => {
  const { safety_lights, safety_lights_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received safety_lights:", safety_lights); // Debug: log received file path
  let safetylights = safety_lights;
  if (Array.isArray(safety_lights)) {
    safetylights = safety_lights.join(','); // ✅ store as plain comma-separated
  }
  const updateQuery = `
    UPDATE safety_department 
    SET safety_lights = ?, safety_lights_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO safety_department (work_order_id, safety_lights, safety_lights_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [safetylights, safety_lights_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, safetylights, safety_lights_completed], (err2, result2) => {
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
router.post('/save-safety-boards', (req, res) => {
  const { safety_boards, safety_board_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received safety_boards:", safety_boards); // Debug: log received file path

  let safetyBoards = safety_boards;

  if (Array.isArray(safety_boards)) {
    safetyBoards = safety_boards.join(','); // ✅ store as plain comma-separated
  }
  const updateQuery = `
    UPDATE safety_department 
    SET safety_boards = ?, safety_board_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO safety_department (work_order_id, safety_boards, safety_board_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [safetyBoards, safety_board_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, safetyBoards, safety_board_completed], (err2, result2) => {
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
router.post('/save-safety-document', (req, res) => {
  const { safety_documentation, safety_documentation_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received safety_documentation:", safety_documentation); // Debug: log received file path

  let safetyDocument = safety_documentation;

  if (Array.isArray(safety_documentation)) {
    safetyDocument = safety_documentation.join(','); // ✅ store as plain comma-separated
  }
  const updateQuery = `
    UPDATE safety_department 
    SET safety_documentation = ?, safety_documentation_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO safety_department (work_order_id, safety_documentation, safety_documentation_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [safetyDocument, safety_documentation_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, safetyDocument, safety_documentation_completed], (err2, result2) => {
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
router.post('/save-safety-permission', (req, res) => {
  const { permissions, permissions_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received permissions:", permissions); // Debug: log received file path

  let permis = permissions;
  if (Array.isArray(permissions)) {
    permis = permissions.join(','); // ✅ store as plain comma-separated
  }
  const updateQuery = `
    UPDATE safety_department 
    SET permissions = ?, permissions_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO safety_department (work_order_id, permissions, permissions_completed) 
    VALUES (?, ?, ?)
  `;

  db.query(updateQuery, [permis, permissions_completed, work_order_id], (err, result) => {
    if (err) {
      console.error("Update error:", err);
      return res.status(500).send("Error during update");
    }

    if (result.affectedRows === 0) {
      // No row updated – insert instead
      db.query(insertQuery, [work_order_id, permis, permissions_completed], (err2, result2) => {
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

router.put("/update-sdelivery-status", (req, res) => {
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
// router.get('/Safety_download/:id', async (req, res) => {
//   console.log('Safety download API triggered');

//   const fileId = req.params.id;

//   // Query the database for the file path
//   db.query(
//     `SELECT file_path FROM work_receiving WHERE work_order_id = ?
//      UNION 
//      SELECT survey_file_path FROM survey WHERE work_order_id = ?
//      UNION 
//      SELECT Document FROM permissions WHERE work_order_id = ?`,
//     [fileId, fileId, fileId], // Ensure correct parameter mapping
//     (err, results) => {
//       if (err) {
//         console.error('Database error:', err);
//         return res.status(500).send('Database error');
//       }

//       if (!results.length) {
//         return res.status(404).send('File not found');
//       }

//       let filePath = results[0].file_path || results[0].survey_file_path || results[0].Document;

//       if (!filePath) {
//         return res.status(404).send('File not found');
//       }

//       // Convert Buffer to String if necessary
//       if (Buffer.isBuffer(filePath)) {
//         filePath = filePath.toString('utf8');
//       }

//       // Ensure the file path is correct
//       const absolutePath = path.resolve(__dirname, '..', filePath);

//       console.log(`Downloading file from: ${absolutePath}`);

//       res.download(absolutePath, (err) => {
//         if (err) {
//           console.error('Error sending file:', err);
//           return res.status(500).send('Error downloading file');
//         }
//       });
//     }
//   );
// });

router.get('/Safety1_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT file_path FROM work_receiving WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].file_path;

    // Convert buffer to string if needed
    if (Buffer.isBuffer(filePath)) {
      filePath = filePath.toString('utf8');
    }

    const filePaths = filePath.split(',');

    if (filePaths.length === 1) {
      // Single file
      const absolutePath = path.resolve(filePaths[0]);
      if (!fs.existsSync(absolutePath)) {
        return res.status(404).send('File not found on server');
      }

      return res.download(absolutePath);
    } else {
      // Multiple files — create a zip
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      res.attachment(`files_${fileId}.zip`);
      archive.pipe(res);

      filePaths.forEach(p => {
        const absPath = path.resolve(p);
        if (fs.existsSync(absPath)) {
          archive.file(absPath, { name: path.basename(p) });
        }
      });

      archive.finalize();
    }
  });
});
router.get('/Safety2_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT survey_file_path FROM survey WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].survey_file_path;

    // Convert buffer to string if needed
    if (Buffer.isBuffer(filePath)) {
      filePath = filePath.toString('utf8');
    }

    const filePaths = filePath.split(',');

    if (filePaths.length === 1) {
      // Single file
      const absolutePath = path.resolve(filePaths[0]);
      if (!fs.existsSync(absolutePath)) {
        return res.status(404).send('File not found on server');
      }

      return res.download(absolutePath);
    } else {
      // Multiple files — create a zip
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      res.attachment(`Survey_files_${fileId}.zip`);
      archive.pipe(res);

      filePaths.forEach(p => {
        const absPath = path.resolve(p);
        if (fs.existsSync(absPath)) {
          archive.file(absPath, { name: path.basename(p) });
        }
      });

      archive.finalize();
    }
  });
});
router.get('/Safety3_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT Document FROM permissions WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].Document;

    // Convert buffer to string if needed
    if (Buffer.isBuffer(filePath)) {
      filePath = filePath.toString('utf8');
    }

    const filePaths = filePath.split(',');

    if (filePaths.length === 1) {
      // Single file
      const absolutePath = path.resolve(filePaths[0]);
      if (!fs.existsSync(absolutePath)) {
        return res.status(404).send('File not found on server');
      }

      return res.download(absolutePath);
    } else {
      // Multiple files — create a zip
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      res.attachment(`Permission_files_${fileId}.zip`);
      archive.pipe(res);

      filePaths.forEach(p => {
        const absPath = path.resolve(p);
        if (fs.existsSync(absPath)) {
          archive.file(absPath, { name: path.basename(p) });
        }
      });

      archive.finalize();
    }
  });
});

module.exports = router;
