import React, { useState, useEffect } from "react";
import axios from "axios";
import { Switch } from "antd";
import * as XLSX from "xlsx";
import "../styles/management.css";

const departments = [
  "Work Receiving",
  "Survey",
  "Permission",
  "Safety",
  "Work Execution",
  "Permission Closing",
  "Work Closing"

];

const departmentColumns = {
  "Survey": [
    { header: "Work Order ID", accessor: "work_order_id" },
    { header: "Hand Over Date", accessor: "handover_date" },
    { header: "Return Date", accessor: "return_date" },
    { header: "Remarks", accessor: "remark" },
    { header: "Survey Created At", accessor: "survey_created_at" },
    // { header: "Survey Type", accessor: "survey_type" },
  ],
  "Permission": [
    { header: "Work Order ID", accessor: "work_order_id" },
    { header: "Permission Number", accessor: "permission_number" },
    { header: "Request Date", accessor: "request_date" },
    { header: "Document Complete", accessor: "Document_complete" },
    { header: "Start Date", accessor: "start_date" },
    { header: "End Date", accessor: "end_date" },
    { header: "Permission Created At", accessor: "permission_created_at" },
  ],
  "Safety": [
    { header: "Work Order ID", accessor: "work_order_id" },
    { header: "Permission Number", accessor: "permission_number" },
    { header: "Safety Signs Completed", accessor: "safety_signs_completed" },
    { header: "Safety Barriers Completed", accessor: "safety_barriers_completed" },
    { header: "Safety Lights Completed", accessor: "safety_lights_completed" },
    { header: "Safety Board Completed", accessor: "safety_board_completed" },
    { header: "Permissions Completed", accessor: "permissions_completed" },
    { header: "Safety Documentation Completed", accessor: "safety_documentation_completed" },
    { header: "Site Rechecking Date", accessor: "site_rechecking_date" },
    { header: "Remarks", accessor: "remarks" },
    { header: "Safety Penalties", accessor: "safety_penalties" },
    { header: "Safety Start Date", accessor: "safety_start_date" },
    { header: "Safety Created At", accessor: "safety_created_at" },
  ],
 
  "Work Execution": [
    { header: "Work Order ID", accessor: "work_order_id" },
    { header: "Permission Number", accessor: "permission_number" },
    { header: "Receiving Date", accessor: "receiving_date" },
    { header: "User Type", accessor: "user_type" },
    { header: "Contractor Name", accessor: "contractor_name" },
    // { header: "Asphalt", accessor: "asphalt" },
    { header: "Asphalt Completed", accessor: "asphalt_completed" },
    // { header: "Milling", accessor: "milling" },
    { header: "Milling Completed", accessor: "milling_completed" },
    // { header: "Concrete", accessor: "concrete" },
    { header: "Concrete Completed", accessor: "concrete_completed" },
    // { header: "Deck 3", accessor: "deck3" },
    { header: "Deck 3 Completed", accessor: "deck3_completed" },
    // { header: "Deck 2", accessor: "deck2" },
    { header: "Deck 2 Completed", accessor: "deck2_completed" },
    // { header: "Deck 1", accessor: "deck1" },
    { header: "Deck 1 Completed", accessor: "deck1_completed" },
    // { header: "Sand", accessor: "sand" },
    { header: "Sand Completed", accessor: "sand_completed" },
    // { header: "Backfilling", accessor: "backfilling" },
    { header: "Backfilling Completed", accessor: "backfilling_completed" },
    // { header: "Cable Lying", accessor: "cable_lying" },
    { header: "Cable Lying Completed", accessor: "cable_lying_completed" },
    { header: "Trench", accessor: "trench" },
    { header: "Trench Completed", accessor: "trench_completed" },
    { header: "Remark", accessor: "remark" },
    { header: "Created At", accessor: "workexe_created_at" },
  ],
  "Permission Closing": [
    { header: "Work Order ID", accessor: "work_order_id" },
    { header: "Permission Number", accessor: "permission_number" },
    { header: "Work Closing Certificate", accessor: "work_closing_certificate" },
    { header: "Work Closing Certificate Completed", accessor: "work_closing_certificate_completed" },
    { header: "Final Closing Certificate", accessor: "final_closing_certificate" },
    { header: "Final Closing Certificate Completed", accessor: "final_closing_certificate_completed" },
    { header: "Closing Date", accessor: "closing_date" },
    { header: "Penalty Reason", accessor: "penalty_reason" },
    { header: "Penalty Amount", accessor: "penalty_amount" },
    { header: "Created At", accessor: "pc_created_at" },
  ],

  "Work Closing": [
    { header: "Work Order ID", accessor: "work_order_id" },
    { header: "Submission Date", accessor: "submission_date" },
    { header: "Resubmission Date", accessor: "resubmission_date" },
    { header: "Approval Date", accessor: "approval_date" },
    { header: "Mubahisa", accessor: "mubahisa" },
    { header: "Created At", accessor: "wc_created_at" },
  ],

  "Drawing Department": [
    { header: "Work Order ID", accessor: "work_order_id" },
    { header: "Drawing", accessor: "drawing" },
    { header: "Created At", accessor: "d_created_at" },
  ],

  "GIS Department": [
    { header: "Work Order ID", accessor: "work_order_id" },
    { header: "GIS", accessor: "gis" },
    { header: "Created At", accessor: "g_created_at" },
  ],

  "Store": [
    { header: "Work Order ID", accessor: "work_order_id" },
    { header: "Material Return", accessor: "material_return" },
    { header: "Material Receiving", accessor: "material_receiving" },
    { header: "Material Pending", accessor: "material_pending" },
    { header: "Created At", accessor: "store_created_at" },
  ],  
 
  "Work Receiving": [
    { header: "Work Order ID", accessor: "work_order_id" },
    { header: "Sub Section", accessor: "sub_section" },
    { header: "Job Type", accessor: "job_type" },
    { header: "Previous Department", accessor: "previous_department" },
    { header: "Current Department", accessor: "current_department" },
    { header: "Delivery Status", accessor: "delivery_status" },
  ],
  // Add other departments as needed
};
const getColumns = (selectedDept) => {
  return Array.isArray(departmentColumns[selectedDept]) ? departmentColumns[selectedDept] : [];
};



const Management = () => {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    axios.get("https://constructionproject-production.up.railway.app/api/management/management-data")
      .then((response) => {
        setData(response.data);
        setSearchResult(response.data);
      })
      .catch((error) => {
        console.error("Error fetching management data:", error);
      });
  }, []);

  const handleSearch = () => {
    if (searchTerm.trim() === "") {
      setSearchResult(data);
    } else {
      axios
        .get(` https://constructionproject-production.up.railway.app/api/management/search-workorder/${searchTerm}`)
        .then((response) => setSearchResult(response.data))
        .catch((error) => console.error("Search error:", error));
    }
  };

  const handleDepartmentFilter = (dept) => {
    setSelectedDept(dept);
    axios
      .get(` https://constructionproject-production.up.railway.app/api/management/search-filter?type=current_department&value=${dept}`)
      .then((response) => setSearchResult(response.data))
      .catch((error) => console.error("Department filter error:", error));
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(searchResult);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Management Data");
    XLSX.writeFile(workbook, "management_data.xlsx");
  };

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  useEffect(() => {
    document.body.className = darkMode ? "dark-mode" : "";
  }, [darkMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-container")) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="management-container">

      {/* --- Header --- */}
      <header className="home-header">
        <div>
          <h1>🏗️ Mansour Al Mosaid Group</h1>
          <p>“Building the Future with Excellence”</p>
        </div>
        <div className="mode-switch">
          <span>{darkMode ? "🌙" : "☀️"}</span>
          <Switch checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
        </div>
      </header>

      <h1>Management Dashboard</h1>

      {/* --- Search Section --- */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Enter Work Order Number"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button className="search-button" onClick={handleSearch}>
          Search
        </button>
      </div>

      {/* --- Department Dropdown --- */}
      <div className="dropdown-container">
        <button className="dropdown-button" onClick={toggleDropdown}>
          Departments ▼
        </button>
        {isDropdownOpen && (
          <div className="dropdown-menu">
            {departments.map((dept, index) => (
              <button
                key={index}
                onClick={() => {
                  handleDepartmentFilter(dept);
                  setIsDropdownOpen(false);
                }}
                className={`dropdown-item ${selectedDept === dept ? "active" : ""}`}
              >
                {dept}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* --- Table --- */}
      {getColumns(selectedDept).length > 0 && (
  <table className="management-table">
    <thead>
      <tr>
        {getColumns(selectedDept).map((col) => (
          <th key={col.accessor}>{col.header}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {searchResult.map((row, index) => (
        <tr key={index}>
          {getColumns(selectedDept).map((col) => (
            <td key={col.accessor}>
              {(() => {
                const cellValue = row[col.accessor];
                if (cellValue === null || cellValue === undefined) return '';
                if (typeof cellValue === 'object') return JSON.stringify(cellValue);
                return cellValue;
              })()}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
)}

      {/* --- Download Button --- */}
      <button className="download-button" onClick={downloadExcel}>
        Download as Excel
      </button>
    </div>
  );
};

export default Management;
