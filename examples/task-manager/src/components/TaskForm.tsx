import { useState } from 'react';
import { Task } from '../db';

interface TaskFormProps {
  onAddTask: (task: Omit<Task, 'id'>) => void;
}

const TaskForm = ({ onAddTask }: TaskFormProps) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Omit<Task, 'id'>>>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    tags: []
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a new task with the form data
    const newTask: Omit<Task, 'id'> = {
      title: formData.title || '',
      description: formData.description || '',
      status: (formData.status as Task['status']) || 'pending',
      priority: (formData.priority as Task['priority']) || 'medium',
      createdAt: new Date(),
      tags: formData.tags || []
    };
    
    // Add due date if provided
    if (formData.dueDate) {
      newTask.dueDate = new Date(formData.dueDate);
    }
    
    // Add the task
    onAddTask(newTask);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      tags: []
    });
    
    // Close form
    setIsFormOpen(false);
  };

  return (
    <div className="task-form-container">
      {!isFormOpen ? (
        <button 
          className="add-task-button"
          onClick={() => setIsFormOpen(true)}
        >
          + Add New Task
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="task-form">
          <h3>Add New Task</h3>
          
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title || ''}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status || 'pending'}
                onChange={handleInputChange}
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority || 'medium'}
                onChange={handleInputChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="dueDate">Due Date (optional)</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate?.toString() || ''}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              placeholder="e.g. work, urgent, feature"
              value={formData.tags?.join(', ') || ''}
              onChange={handleTagsChange}
            />
          </div>
          
          <div className="form-actions">
            <button type="submit">Add Task</button>
            <button 
              type="button" 
              onClick={() => setIsFormOpen(false)}
              className="button-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TaskForm;
