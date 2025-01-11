const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  dueDate: { 
    type: Date, 
    required: true,
    validate: {
      validator: function(value) {
        return value >= Date.now();
      },
      message: "Due date cannot be in the past"
    }
  },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed'], 
    default: 'Pending' 
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],  
    default: 'Medium',  
  },
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  assignedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin', 
    required: true 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware to update `updatedAt` on save
TaskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware to update `updatedAt` on findOneAndUpdate
TaskSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// Indexes for faster queries
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ assignedBy: 1 });

const TaskModel = mongoose.model('Task', TaskSchema);
module.exports = TaskModel;
