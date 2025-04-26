import { createDatabase } from '@nebula-db/nebula-db';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { setTheme, toggleTheme, getTheme } from 'flex-theme';
import './styles.css';

// Polyfill for crypto.randomFillSync if needed
if (typeof window !== 'undefined' && !window.crypto) {
  window.crypto = {};
}

if (typeof window !== 'undefined' && window.crypto && !window.crypto.randomFillSync) {
  window.crypto.randomFillSync = function(buffer) {
    const bytes = new Uint8Array(buffer.length);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    buffer.set(bytes);
    return buffer;
  };
}

// Logging functions
function logInfo(message) {
  addLogEntry(message, 'info');
}

function logSuccess(message) {
  addLogEntry(message, 'success');
}

function logError(message) {
  addLogEntry(message, 'error');
}

function addLogEntry(message, type) {
  const logContainer = document.getElementById('log-container');
  const now = new Date();
  const timeString = now.toLocaleTimeString();

  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  logEntry.innerHTML = `
    <span class="log-time">[${timeString}]</span>
    <span class="log-${type}">${message}</span>
  `;

  logContainer.appendChild(logEntry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Theme configuration
const darkTheme = {
  name: 'dark',
  primaryColor: '#8b5cf6',    // Purple
  secondaryColor: '#34d399',  // Green
  accentColor: '#3b82f6',     // Blue
  textColor: '#f8fafc',       // Light slate
  backgroundColor: '#0f172a', // Dark blue
};

// Add theme toggle button to navbar
function addThemeToggle() {
  const navbar = document.querySelector('.navbar .container');
  if (navbar) {
    const themeToggle = document.createElement('button');
    themeToggle.className = 'btn btn-sm btn-outline-light ms-auto';
    themeToggle.innerHTML = '<i class="bi bi-moon"></i> Toggle Theme';
    themeToggle.addEventListener('click', () => {
      toggleTheme();
      updateThemeAttributes();
    });
    navbar.appendChild(themeToggle);
  }
}

// Update data-theme attribute based on current theme
function updateThemeAttributes() {
  const currentTheme = getTheme();
  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

// Initialize NebulaDB
document.addEventListener('DOMContentLoaded', function() {
  // Initialize theme
  setTheme('light');
  updateThemeAttributes();

  // Add theme toggle button
  addThemeToggle();
  logInfo('Initializing NebulaDB...');

  try {
    // Create database with memory adapter
    const db = createDatabase({
      adapter: new MemoryAdapter(),
      options: {}
    });

    logSuccess('Database created successfully');

    // Create tasks collection
    const tasks = db.collection('tasks', {
      schema: {
        id: { type: 'string', optional: true },
        title: { type: 'string' },
        description: { type: 'string', optional: true },
        status: { type: 'string' },
        priority: { type: 'string' },
        tags: { type: 'array', optional: true },
        createdAt: { type: 'date' }
      }
    });

    logSuccess('Tasks collection created');

    // Add sample tasks
    const sampleTasks = [
      {
        title: 'Learn NebulaDB',
        description: 'Study the documentation and examples',
        status: 'in-progress',
        priority: 'high',
        tags: ['learning', 'database'],
        createdAt: new Date()
      },
      {
        title: 'Build a demo app',
        description: 'Create a task manager to showcase NebulaDB features',
        status: 'completed',
        priority: 'high',
        tags: ['development', 'demo'],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        title: 'Write tests',
        description: 'Create unit tests for the application',
        status: 'pending',
        priority: 'medium',
        tags: ['testing', 'quality'],
        createdAt: new Date()
      },
      {
        title: 'Deploy application',
        description: 'Deploy the application to a hosting service',
        status: 'pending',
        priority: 'low',
        tags: ['deployment', 'devops'],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }
    ];

    // Insert sample tasks
    Promise.all(sampleTasks.map(task => tasks.insert(task)))
      .then(() => {
        logSuccess('Sample tasks added');
        refreshTasksList();
      })
      .catch(error => {
        logError('Error adding sample tasks: ' + error.message);
      });

    // Handle form submission
    document.getElementById('task-form').addEventListener('submit', function(e) {
      e.preventDefault();

      const title = document.getElementById('title').value;
      const description = document.getElementById('description').value;
      const priority = document.getElementById('priority').value;
      const status = document.getElementById('status').value;
      const tagsInput = document.getElementById('tags').value;
      const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];

      const newTask = {
        title,
        description,
        priority,
        status,
        tags,
        createdAt: new Date()
      };

      logInfo(`Adding new task: ${title}`);

      tasks.insert(newTask)
        .then(result => {
          logSuccess(`Task added with ID: ${result.id}`);
          refreshTasksList();

          // Reset form
          document.getElementById('task-form').reset();
        })
        .catch(error => {
          logError('Error adding task: ' + error.message);
        });
    });

    // Handle filters
    document.getElementById('filter-status').addEventListener('change', refreshTasksList);
    document.getElementById('filter-priority').addEventListener('change', refreshTasksList);
    document.getElementById('search').addEventListener('input', refreshTasksList);

    // Function to refresh tasks list
    function refreshTasksList() {
      const statusFilter = document.getElementById('filter-status').value;
      const priorityFilter = document.getElementById('filter-priority').value;
      const searchTerm = document.getElementById('search').value.toLowerCase();

      logInfo('Fetching tasks with filters...');

      // Build query
      let query = {};

      if (statusFilter !== 'all') {
        query.status = statusFilter;
      }

      if (priorityFilter !== 'all') {
        query.priority = priorityFilter;
      }

      tasks.find(query)
        .then(results => {
          // Apply search filter in memory (since we can't do text search in the query)
          if (searchTerm) {
            results = results.filter(task =>
              task.title.toLowerCase().includes(searchTerm) ||
              (task.description && task.description.toLowerCase().includes(searchTerm)) ||
              (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
            );
          }

          logSuccess(`Found ${results.length} tasks`);

          // Update stats
          updateStats();

          // Render tasks
          const tasksContainer = document.getElementById('tasks-container');

          if (results.length === 0) {
            tasksContainer.innerHTML = `
              <div class="text-center py-4 text-muted">
                No tasks found. Add a new task or adjust your filters.
              </div>
            `;
            return;
          }

          // Sort tasks by creation date (newest first)
          results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          let html = '';

          results.forEach(task => {
            const priorityBadgeClass = `badge-${task.priority}`;
            const isCompleted = task.status === 'completed';

            html += `
              <div class="task-item ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
                <div>
                  <div class="d-flex align-items-center">
                    <input type="checkbox" class="form-check-input me-2 task-checkbox"
                      ${isCompleted ? 'checked' : ''} data-id="${task.id}">
                    <span class="task-title">${task.title}</span>
                    <span class="badge ${priorityBadgeClass} ms-2">${task.priority}</span>
                  </div>
                  ${task.description ? `<div class="text-muted small mt-1">${task.description}</div>` : ''}
                  ${task.tags && task.tags.length > 0 ?
                    `<div class="mt-1">
                      ${task.tags.map(tag => `<span class="badge bg-secondary me-1">${tag}</span>`).join('')}
                    </div>` : ''
                  }
                </div>
                <div>
                  <button class="btn btn-sm btn-outline-danger delete-task" data-id="${task.id}">
                    <i class="bi bi-trash"></i> Delete
                  </button>
                </div>
              </div>
            `;
          });

          tasksContainer.innerHTML = html;

          // Add event listeners to checkboxes
          document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
              const taskId = this.getAttribute('data-id');
              const newStatus = this.checked ? 'completed' : 'pending';

              logInfo(`Updating task ${taskId} status to ${newStatus}`);

              tasks.update(
                { id: taskId },
                { $set: { status: newStatus } }
              ).then(() => {
                logSuccess(`Task ${taskId} updated`);
                refreshTasksList();
              }).catch(error => {
                logError('Error updating task: ' + error.message);
              });
            });
          });

          // Add event listeners to delete buttons
          document.querySelectorAll('.delete-task').forEach(button => {
            button.addEventListener('click', function() {
              const taskId = this.getAttribute('data-id');

              logInfo(`Deleting task ${taskId}`);

              tasks.delete({ id: taskId })
                .then(() => {
                  logSuccess(`Task ${taskId} deleted`);
                  refreshTasksList();
                })
                .catch(error => {
                  logError('Error deleting task: ' + error.message);
                });
            });
          });
        })
        .catch(error => {
          logError('Error fetching tasks: ' + error.message);
        });
    }

    // Function to update stats
    function updateStats() {
      Promise.all([
        tasks.find({}),
        tasks.find({ status: 'completed' })
      ]).then(([allTasks, completedTasks]) => {
        document.getElementById('total-tasks').textContent = allTasks.length;
        document.getElementById('completed-tasks').textContent = completedTasks.length;
      }).catch(error => {
        logError('Error updating stats: ' + error.message);
      });
    }

  } catch (error) {
    logError('Error initializing database: ' + error.message);
    console.error(error);
  }
});
