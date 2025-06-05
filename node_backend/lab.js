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
router.post('/upload-Laboratory-file/:fieldName', upload.array('file'), (req, res) => {
  const files = req.files;
  const fieldName = req.params.fieldName;

  if (!files || files.length === 0) {
    console.log("No files uploaded!");
    return res.status(400).send('No files uploaded');
  }

  const filePaths = files.map(file => path.join('uploads', file.filename));

  console.log(`Uploaded files for ${fieldName}:`, filePaths);

  res.json({ filePaths });
});


// Fetch workExecution Coming Data
router.get('/Laboratory-coming', (req, res) => {
  const query = `
   SELECT 
    work_execution.work_order_id, 
    work_execution.permission_number,
    work_execution.asphalt,
    work_execution.milling,
    work_execution.concrete,
    work_execution.sand,
    work_execution.cable_lying,
    work_execution.trench,
    safety_department.safety_signs,
      safety_department.safety_barriers,
      safety_department.safety_lights,
      safety_department.safety_boards,
      safety_department.permissions,
      safety_department.safety_documentation,
    permissions.Document,
    work_receiving.job_type, 
    work_receiving.sub_section,
    work_receiving.file_path,
    survey.survey_file_path
    FROM work_execution 
    LEFT JOIN work_receiving 
    ON work_execution.work_order_id = work_receiving.work_order_id
    LEFT JOIN permissions 
    ON work_execution.work_order_id = permissions.work_order_id
    LEFT JOIN safety_department 
    ON work_execution.work_order_id = safety_department.work_order_id
    LEFT JOIN survey 
    ON work_execution.work_order_id = survey.work_order_id
    WHERE work_execution.work_order_id NOT IN (
    SELECT work_order_id FROM lab
    )
    AND work_receiving.current_department = 'Laboratory'
    AND work_receiving.job_type != 'New Meters';


  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      res.status(500).send('Database query error');
    } else {
      console.log('Lab Fetching Data:', results);  // Log the results
      res.json(results);
    }
  });
});

router.get('/Laboratory-data', (req, res) => {
  const query = `
    SELECT lab.work_order_id,
           lab.permission_number, 
           work_receiving.job_type, 
           work_receiving.sub_section,
           work_receiving.current_department,
           work_receiving.file_path,
           lab.asphalt,
           lab.asphalt_completed,
           lab.milling,
           lab.milling_completed,
           lab.concrete,
           lab.concrete_completed,
           lab.deck3,
           lab.deck3_completed,
           lab.deck2,
           lab.deck2_completed,
           lab.deck1,
           lab.deck1_completed,
           lab.sand,
           lab.sand_completed,
           lab.backfilling,
           lab.backfilling_completed,
           lab.cable_lying,
           lab.cable_lying_completed,
           lab.trench,
           lab.trench_completed,
           lab.remark,
           permissions.Document,
           safety_department.safety_created_at,
           safety_department.safety_signs,
           work_execution.asphalt,
           survey.survey_file_path
          
    FROM lab
    LEFT JOIN work_receiving 
    ON lab.work_order_id = work_receiving.work_order_id
    LEFT JOIN safety_department 
    ON lab.work_order_id = safety_department.work_order_id
    LEFT JOIN survey 
    ON lab.work_order_id = survey.work_order_id
    LEFT JOIN permissions 
    ON lab.work_order_id = permissions.work_order_id
    LEFT JOIN work_execution 
    ON lab.work_order_id = work_execution.work_order_id
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
router.post("/save-Laboratory-workorder", (req, res) => {
  const { work_order_id, permission_number } = req.body;

  if (!work_order_id || !permission_number ) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  const query = `
    INSERT INTO lab (work_order_id, permission_number) 
    VALUES (?, ?);
  `;

  db.query(query, [work_order_id, permission_number || "N/A"], (err) => {
    if (err) {
      console.error("Error saving work execution data:", err);
      return res.status(500).json({ success: false, message: "Database error. Failed to save data." });
    }

    res.status(200).json({ success: true, message: "Work execution data saved successfully!" });
  });
});

router.post('/save-labasphalt', (req, res) => {
  const { asphalt, asphalt_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received asphalt:", asphalt); // Debug: log received file path

  const updateQuery = `
    UPDATE lab 
    SET asphalt = ?, asphalt_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO lab (work_order_id, asphalt, asphalt_completed) 
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
router.post('/save-labmilling', (req, res) => {
  const { milling, milling_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received milling:", milling); // Debug: log received file path

  const updateQuery = `
    UPDATE lab 
    SET milling = ?, milling_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO lab (work_order_id, milling, milling_completed) 
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
router.post('/save-labconcrete', (req, res) => {
  const { concrete, concrete_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received concrete:", concrete); // Debug: log received file path

  const updateQuery = `
    UPDATE lab 
    SET concrete = ?, concrete_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO lab (work_order_id, concrete, concrete_completed) 
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
router.post('/save-labdeck3', (req, res) => {
  const { deck3, deck3_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received deck3:", deck3); // Debug: log received file path

  const updateQuery = `
    UPDATE lab 
    SET deck3 = ?, deck3_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO lab (work_order_id, deck3, deck3_completed) 
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

router.post('/save-labdeck2', (req, res) => {
  const { deck2, deck2_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received deck2:", deck2); // Debug: log received file path

  const updateQuery = `
    UPDATE lab 
    SET deck2 = ?, deck2_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO lab (work_order_id, deck2, deck2_completed) 
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
router.post('/save-labdeck1', (req, res) => {
  const { deck1, deck1_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received deck1:", deck1); // Debug: log received file path

  const updateQuery = `
    UPDATE lab 
    SET deck1 = ?, deck1_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO lab (work_order_id, deck1, deck1_completed) 
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

router.post('/save-labsand', (req, res) => {
  const { sand, sand_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received sand:", sand); // Debug: log received file path

  const updateQuery = `
    UPDATE lab 
    SET sand = ?, sand_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO lab (work_order_id, sand, sand_completed) 
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
router.post('/save-labbackfilling', (req, res) => {
  const { backfilling, backfilling_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received backfilling:", backfilling); // Debug: log received file path

  const updateQuery = `
    UPDATE lab 
    SET backfilling = ?, backfilling_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO lab (work_order_id, backfilling, backfilling_completed) 
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
    UPDATE lab 
    SET backfilling = ?, backfilling_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO lab (work_order_id, backfilling, backfilling_completed) 
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

router.post('/save-labcable_lying', (req, res) => {
  const { cable_lying, cable_lying_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received cable_lying:", cable_lying); // Debug: log received file path

  const updateQuery = `
    UPDATE lab 
    SET cable_lying = ?, cable_lying_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO lab (work_order_id, cable_lying, cable_lying_completed) 
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

router.post('/save-labtrench', (req, res) => {
  const { trench, trench_completed,  work_order_id } = req.body; // Extract field and value
  console.log("Received trench:", trench); // Debug: log received file path

  const updateQuery = `
    UPDATE lab 
    SET trench = ?, trench_completed = ? 
    WHERE work_order_id = ?
  `;

  const insertQuery = `
    INSERT INTO lab (work_order_id, trench, trench_completed) 
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



router.post('/save-labremainingdata', (req, res) => {
  const { remark, work_order_id } = req.body;
  console.log("Received Remaining Data:", remark);

  const query1 = `UPDATE lab SET remark = ? WHERE work_order_id = ?`;

  db.query(query1, [remark, work_order_id], (err, result1) => {
    if (err) {
      console.error("Error updating work execution field:", err);
      return res.status(500).send("Error saving work execution field");
    }

    const query2 = `
      UPDATE work_receiving 
      SET current_department = 'PermissionClosing', previous_department = 'Laboratory' 
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
// router.get('/lab1_download/:id', (req, res) => {
//   const fileId = req.params.id;

//   db.query('SELECT file_path FROM work_receiving WHERE work_order_id = ?', [fileId], (err, results) => {
//     if (err) {
//       console.error('Database error:', err);
//       return res.status(500).send('Database error');
//     }

//     if (results.length === 0) {
//       return res.status(404).send('File not found');
//     }

//     let filePath = results[0].file_path;

//     // Convert Buffer to string if necessary
//     if (Buffer.isBuffer(filePath)) {
//       filePath = filePath.toString('utf8');
//     }

//     if (!filePath || filePath === 'undefined') {
//       return res.status(404).send('Invalid or missing file path');
//     }

//     const filePaths = filePath.split(',');

//     if (filePaths.length === 1) {
//       const absolutePath = path.join(__dirname, '..', 'uploads', path.basename(filePaths[0].trim()));

//       console.log('✅ Final resolved path:', absolutePath);

//       if (!fs.existsSync(absolutePath)) {
//         return res.status(404).send('File not found on server at path: ' + absolutePath);
//       }

//       return res.download(absolutePath);
//     } else {
//       const archive = archiver('zip', { zlib: { level: 9 } });

//       res.attachment(`files_${fileId}.zip`);
//       archive.pipe(res);

//       filePaths.forEach(p => {
//         let cleanedPath = Buffer.isBuffer(p) ? p.toString('utf8') : p;
//         const absPath = path.join(__dirname, '..', 'uploads', path.basename(cleanedPath.trim()));

//         if (fs.existsSync(absPath)) {
//           archive.file(absPath, { name: path.basename(absPath) });
//         } else {
//           console.warn('⚠️ Skipped missing file:', absPath);
//         }
//       });

//       archive.finalize();
//     }
//   });
// });
router.get('/workexe_download/:id', (req, res) => {
  const fileId = req.params.id;
  console.log(`Received download request for work_order_id = ${fileId}`);

  db.query('SELECT asphalt, milling, concrete, sand, cable_lying FROM work_execution WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('❌ Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      console.warn('⚠️ No records found for the given ID');
      return res.status(404).send('No record found for this ID');
    }

    console.log('✅ Database record found');

    const fields = ['asphalt', 'milling', 'concrete', 'sand', 'cable_lying'];
    const allFiles = [];

    fields.forEach(field => {
      let value = results[0][field];
      console.log(`📁 Field ${field}:`, value);

      if (Buffer.isBuffer(value)) {
        value = value.toString('utf8');
        console.log(`🔄 Converted buffer to string for ${field}:`, value);
      }

      if (value) {
        const paths = value.split(',');
        paths.forEach(p => {
          const absPath = path.resolve(p.trim());
          if (fs.existsSync(absPath)) {
            console.log(`✅ File exists: ${absPath}`);
            allFiles.push(absPath);
          } else {
            console.warn(`❌ File does NOT exist: ${absPath}`);
          }
        });
      } else {
        console.log(`⚠️ Field ${field} is empty`);
      }
    });

    if (allFiles.length === 0) {
      console.warn('⚠️ No valid files found to send');
      return res.status(404).send('No valid files found on server');
    }

    if (allFiles.length === 1) {
      console.log('📤 Sending single file download:', allFiles[0]);
      return res.download(allFiles[0]);
    }

    console.log('📦 Creating ZIP archive with files:', allFiles);

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment(`Work_Exe_Files_${fileId}.zip`);

    archive.pipe(res);

    allFiles.forEach(file => {
      console.log(`➕ Adding to zip: ${file}`);
      archive.file(file, { name: path.basename(file) });
    });

    archive.finalize();

    archive.on('end', () => {
      console.log('✅ ZIP archive successfully created and sent');
    });

    archive.on('error', err => {
      console.error('❌ Archive error:', err);
      res.status(500).send('Error creating ZIP archive');
    });
  });
});
router.get('/lab1_download/:id', (req, res) => {
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
router.get('/lab2_download/:id', (req, res) => {
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
router.get('/lab3_download/:id', (req, res) => {
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
router.get('/lab4_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT safety_signs FROM safety_department WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].safety_signs;

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

      res.attachment(`safetySignsfiles_${fileId}.zip`);
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
router.get('/lab5_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT safety_barriers FROM safety_department WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].safety_barriers;

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

      res.attachment(`SafetyBarriers_files_${fileId}.zip`);
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
router.get('/lab6_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT safety_lights FROM safety_department WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].safety_lights;

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

      res.attachment(`safetyLights_files_${fileId}.zip`);
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
router.get('/lab7_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT safety_boards FROM safety_department WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].safety_boards;

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

      res.attachment(`safetyBoards_files_${fileId}.zip`);
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
router.get('/lab8_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT permissions FROM safety_department WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].permissions;

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

      res.attachment(`safetyPermission_files_${fileId}.zip`);
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
router.get('/lab9_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT safety_documentation FROM safety_department WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].safety_documentation;

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

      res.attachment(`safetyDocumentation_files_${fileId}.zip`);
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
router.get('/lab10_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT asphalt FROM work_execution WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].asphalt;

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

      res.attachment(`Asphalt_files_${fileId}.zip`);
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
router.get('/lab11_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT milling FROM work_execution WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].milling;

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

      res.attachment(`Milling_files_${fileId}.zip`);
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
router.get('/lab12_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT concrete FROM work_execution WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].concrete;

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

      res.attachment(`concrete_files_${fileId}.zip`);
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
router.get('/lab13_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT sand FROM work_execution WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].sand;

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

      res.attachment(`sand_files_${fileId}.zip`);
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


router.get('/lab14_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT cable_lying FROM work_execution WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].cable_lying;

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

      res.attachment(`cable_lying_files_${fileId}.zip`);
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


router.get('/lab15_download/:id', (req, res) => {
  const fileId = req.params.id;

  db.query('SELECT trench FROM work_execution WHERE work_order_id = ?', [fileId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('File not found');
    }

    let filePath = results[0].trench;

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

      res.attachment(`trench_files_${fileId}.zip`);
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


function setupDownloadRoute(router, routePath, dbQuery, columnName, zipPrefix) {
  router.get(routePath, (req, res) => {
    const fileId = req.params.id;

    db.query(dbQuery, [fileId], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Database error');
      }

      if (results.length === 0) {
        return res.status(404).send('File not found');
      }

      let filePath = results[0][columnName];

      if (Buffer.isBuffer(filePath)) {
        filePath = filePath.toString('utf8');
      }

      const filePaths = filePath.split(',');

      if (filePaths.length === 1) {
        const absolutePath = path.resolve(filePaths[0]);
        if (!fs.existsSync(absolutePath)) {
          return res.status(404).send('File not found on server');
        }
        return res.download(absolutePath);
      } else {
        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment(`${zipPrefix}_${fileId}.zip`);
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
}


module.exports = router;

