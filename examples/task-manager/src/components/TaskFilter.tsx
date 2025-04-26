import React from 'react';

interface FilterState {
  status: string;
  priority: string;
  searchTerm: string;
}

interface TaskFilterProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
}

const TaskFilter = ({ filter, setFilter }: TaskFilterProps) => {
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilter({
      status: 'all',
      priority: 'all',
      searchTerm: ''
    });
  };

  return (
    <div className="task-filter">
      <h3>Filter Tasks</h3>
      
      <div className="filter-group">
        <label htmlFor="searchTerm">Search</label>
        <input
          type="text"
          id="searchTerm"
          name="searchTerm"
          placeholder="Search in title, description, or tags"
          value={filter.searchTerm}
          onChange={handleFilterChange}
        />
      </div>
      
      <div className="filter-row">
        <div className="filter-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={filter.status}
            onChange={handleFilterChange}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            name="priority"
            value={filter.priority}
            onChange={handleFilterChange}
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      
      {(filter.status !== 'all' || filter.priority !== 'all' || filter.searchTerm) && (
        <button 
          onClick={handleClearFilters}
          className="clear-filters-button"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
};

export default TaskFilter;
