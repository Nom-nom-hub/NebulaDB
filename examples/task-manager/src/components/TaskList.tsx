import { useState } from 'react';
import { Task } from '../db';

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
}

const TaskList = ({ tasks, onUpdateTask, onDeleteTask, onStatusChange }: TaskListProps) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Task>>({});

  const handleEdit = (task: Task) => {
    setEditingTaskId(task.id || null);
    setEditForm({ ...task });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditForm({});
  };

  const handleSaveEdit = (taskId: string) => {
    if (taskId && editForm) {
      onUpdateTask({ ...editForm, id: taskId } as Task);
      setEditingTaskId(null);
      setEditForm({});
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim());
    setEditForm(prev => ({ ...prev, tags }));
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'in-progress': return 'status-in-progress';
      case 'pending': return 'status-pending';
      default: return '';
    }
  };

  if (tasks.length === 0) {
    return <div className="empty-state">No tasks found. Add a new task or adjust your filters.</div>;
  }

  return (
    <div className="task-list">
      <h2>Tasks ({tasks.length})</h2>
      
      {tasks.map(task => (
        <div key={task.id} className={`task-card ${getStatusClass(task.status)}`}>
          {editingTaskId === task.id ? (
            <div className="task-edit-form">
              <div className="form-group">
                <label>Title</label>
                <input 
                  type="text" 
                  name="title" 
                  value={editForm.title || ''} 
                  onChange={handleInputChange} 
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  name="description" 
                  value={editForm.description || ''} 
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    name="status" 
                    value={editForm.status || 'pending'} 
                    onChange={handleInputChange}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Priority</label>
                  <select 
                    name="priority" 
                    value={editForm.priority || 'medium'} 
                    onChange={handleInputChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <input 
                  type="text" 
                  name="tags" 
                  value={editForm.tags?.join(', ') || ''} 
                  onChange={handleTagsChange} 
                />
              </div>
              
              <div className="form-actions">
                <button onClick={() => handleSaveEdit(task.id!)}>Save</button>
                <button onClick={handleCancelEdit} className="button-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="task-header">
                <h3>{task.title}</h3>
                <div className={`task-priority ${getPriorityClass(task.priority)}`}>
                  {task.priority}
                </div>
              </div>
              
              <p className="task-description">{task.description}</p>
              
              <div className="task-meta">
                <div className="task-status">
                  <span>Status: </span>
                  <select 
                    value={task.status} 
                    onChange={(e) => onStatusChange(task.id!, e.target.value as Task['status'])}
                    className={getStatusClass(task.status)}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                
                <div className="task-dates">
                  <div>Created: {new Date(task.createdAt).toLocaleDateString()}</div>
                  {task.dueDate && (
                    <div>Due: {new Date(task.dueDate).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
              
              {task.tags && task.tags.length > 0 && (
                <div className="task-tags">
                  {task.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              
              <div className="task-actions">
                <button onClick={() => handleEdit(task)}>Edit</button>
                <button 
                  onClick={() => onDeleteTask(task.id!)} 
                  className="button-danger"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default TaskList;
