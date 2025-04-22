import { Task } from '../hooks/useTasks';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClearCompleted: () => void;
}

export function TaskList({ tasks, onToggle, onDelete, onClearCompleted }: TaskListProps) {
  // Count completed tasks
  const completedCount = tasks.filter(task => task.completed).length;
  
  return (
    <div className="bg-white rounded-lg shadow">
      <ul className="divide-y divide-gray-200">
        {tasks.length === 0 ? (
          <li className="p-4 text-center text-gray-500">No tasks yet. Add one above!</li>
        ) : (
          tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))
        )}
      </ul>
      
      {tasks.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-b-lg">
          <span className="text-sm text-gray-600">
            {completedCount} of {tasks.length} tasks completed
          </span>
          
          {completedCount > 0 && (
            <button
              onClick={onClearCompleted}
              className="px-3 py-1 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
            >
              Clear completed
            </button>
          )}
        </div>
      )}
    </div>
  );
}
