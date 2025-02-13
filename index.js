const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { authenticate } = require("./middleware/authenticate");

const AdminModel = require("./models/Admin");
const UserModel = require("./models/Users");
const TaskModel = require("./models/Task");

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};
connectDB();

// Admin Signup
app.post("/admin/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingAdmin = await AdminModel.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new AdminModel({
      name,
      email,
      password: hashedPassword,
    });

    await newAdmin.save();
    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
    console.error(error);
  }
});

// Admin Login
app.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "365d",
    });

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
    console.error(error);
  }
});

// User Signup
app.post("/user/signup", async (req, res) => {
  const { name, email, password, designation } = req.body;

  try {
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new UserModel({
      name,
      email,
      password: hashedPassword,
      designation,
    });

    await newUser.save();

    res.status(201).json({ message: "User signed up successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
    console.error(error);
  }
});

// User Login
app.post("/user/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, role: "user" }, process.env.JWT_SECRET, {
      expiresIn: "365d",
    });

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
    console.error(error);
  }
});

// Fetch tasks for logged-in user
app.get("/tasks/user", authenticate, async (req, res) => {
  try {
    const tasks = await TaskModel.find({ assignedTo: req.user.id })
      .populate("assignedBy", "name email");
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Fetch all tasks (admin only)
app.get("/tasks", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can fetch all tasks" });
    }

    const tasks = await TaskModel.find()
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email");
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update task status (authentication required)
app.patch("/tasks/:taskId/status", authenticate, async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  try {
    const task = await TaskModel.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.status = status;
    await task.save();

    res.status(200).json({ message: "Task status updated successfully" });
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ message: "Failed to update task status" });
  }
});

// Delete task (authentication required)
app.delete("/tasks/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const deletedTask = await TaskModel.findByIdAndDelete(id);

    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error: error.message });
  }
});

// Fetch all users (authentication required)
app.get("/users", authenticate, async (req, res) => {
  try {
    const users = await UserModel.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post("/tasks/assign", authenticate, async (req, res) => {
    try {
      const { title, description, dueDate, priority, assignedTo } = req.body;
      const adminId = req.headers["admin-id"]; // Read adminId from headers
  
      if (!adminId) {
        return res.status(400).json({ message: "Admin ID is missing in headers" });
      }
  
      const admin = await AdminModel.findById(adminId);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
  
      const assignedUser = await UserModel.findById(assignedTo);
      if (!assignedUser) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const newTask = new TaskModel({
        title,
        description,
        dueDate,
        priority,
        assignedTo: assignedUser._id,
        assignedBy: admin._id,
      });
  
      await newTask.save();
      res.status(201).json(newTask);
    } catch (error) {
      console.error("Error creating task:", error.message);
      res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  });
  
  

// Fetch the admin data (authentication required)
app.get("/admin", authenticate, async (req, res) => {
  try {
    const admin = await AdminModel.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.json(admin);
  } catch (error) {
    console.error("Error fetching admin data:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Check user role
app.get("/api/user/role", authenticate, async (req, res) => {
  try {
    if (req.user.role) {
      res.json({ role: req.user.role });
    } else {
      res.status(403).json({ message: "Role not found" });
    }
  } catch (error) {
    console.error("Error fetching role:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update task details (authentication required)
app.patch("/tasks/:taskId", authenticate, async (req, res) => {
    const { taskId } = req.params;
    const { title, description, dueDate, priority, assignedTo } = req.body;
  
    try {
      // Find the task by ID
      const task = await TaskModel.findById(taskId);
  
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
  
      // Update task fields with the new data
      task.title = title || task.title;
      task.description = description || task.description;
      task.dueDate = dueDate || task.dueDate;
      task.priority = priority || task.priority;
      task.assignedTo = assignedTo || task.assignedTo;
  
      // Save the updated task to the database
      await task.save();
  
      // Return the updated task
      res.status(200).json({ message: "Task updated successfully", task });
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.get('/users/me', authenticate, async (req, res) => {
    try {
      console.log('Decoded User:', req.user);  // Log user information
      const userId = req.user.id;
      const user = await UserModel.findById(userId).select('-password');
      console.log('Fetched User:', user); 
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error fetching user details:', error);  // More detailed error logging
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  
  
  

// Start the server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});