import React, { useState, useEffect } from "react";
import axios from "axios";
import { Table, Button, Input, Modal, Form, message, Select, Spin } from "antd";
import { FiUserPlus, FiEdit, FiTrash } from "react-icons/fi";
import { Switch } from "antd";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false); // Loading state for the modal
  const [form] = Form.useForm();
  const [departments, setDepartments] = useState([
    "Work Receiving",
    "Survey",
    "Permission",
    "Safety",
    "Work Execution",
    "Permission Closing",
    "Work Closing",
    "Drawing",
    "GIS",
    "Store",
  ]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get("https://constructionproject-production.up.railway.app/api/users");
      console.log(response.data); // Check the response
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users", error);
    }
    setLoading(false);
  };

  const handleAddUser = () => {
    form.resetFields();
    setCurrentUser(null);
    setIsModalVisible(true);
  };

  const handleEditUser = (user) => {
    setCurrentUser(user);
    form.setFieldsValue(user);
    setIsModalVisible(true);
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`https://constructionproject-production.up.railway.app/api/delete-users/${userId}`);
      message.success("User deleted successfully");
      setUsers(users.filter((user) => user.id !== userId));
    } catch (error) {
      console.error("Error deleting user", error);
      message.error("Error deleting user");
    }
  };

  const handleSaveUser = async (values) => {
    setLoading(true);
    try {
      let response;
      if (currentUser) {
        response = await axios.put(`https://constructionproject-production.up.railway.app/api/users/${currentUser.id}`, values);
        message.success("User updated successfully");
      } else {
        response = await axios.post("https://constructionproject-production.up.railway.app/api/usermanagement/save_users", values);
        message.success("User added successfully");
  
        // Send email after adding user
        const subject = 'User Registration Confirmation';
        const text = `Hello ${values.name},\n\nYour registration was successful!\n\nYour username is: ${values.username}`;
        sendEmail(values.email, subject, text); // Send email after adding user
      }
  
      setUsers(response.data); // Set the updated users list
      setIsModalVisible(false);
      setCurrentUser(null);
    } catch (error) {
      console.error("Error saving user", error);
      message.error("Error saving user");
    }
    setLoading(false);
  };
  const sendEmail = (to, subject, text) => {
    axios.post("https://constructionproject-production.up.railway.app/api/send-email", { to, subject, text })
      .then(() => {
        console.log("Email sent successfully");
      })
      .catch((error) => {
        console.error("Error sending email:", error);
      });
  };

  return (
    <div style={{ padding: 24 }}>
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
      <Button
        icon={<FiUserPlus />}
        type="primary"
        onClick={handleAddUser}
        style={{ marginBottom: 16 }}
      >
        Add User
      </Button>

      <Table dataSource={users} rowKey="id">
        <Table.Column title="Name" dataIndex="name" />
        <Table.Column title="Email" dataIndex="email" />
        <Table.Column
          title="Actions"
          render={(text, record) => (
            <>
              <Button
                icon={<FiEdit />}
                style={{ marginRight: 8 }}
                onClick={() => handleEditUser(record)}
              />
              <Button
                icon={<FiTrash />}
                danger
                onClick={() => handleDeleteUser(record.id)}
              />
            </>
          )}
        />
      </Table>

      <Modal
        title={currentUser ? "Edit User" : "Add User"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveUser}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Please enter a name" }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Please enter an email" }, { type: "email", message: "Enter a valid email address" }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please enter a password" }, { min: 4, message: "Password must be at least 4 characters" }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item
            label="UserName"
            name="username"
            rules={[{ required: true, message: "Please select a department" }]}
          >
            <Select>
              {departments.map((dept) => (
                <Select.Option key={dept} value={dept}>
                  {dept}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Save
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;