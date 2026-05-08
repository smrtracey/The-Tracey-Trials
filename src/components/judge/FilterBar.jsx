import React from 'react';

export default function FilterBar({
  contestants,
  selectedContestant,
  setSelectedContestant,
  availableTaskNumbers,
  taskFilter,
  setTaskFilter,
  searchFilter,
  setSearchFilter
}) {
  return (
    <div className="task-meta-card judge-filter-bar" style={{ gap: 8, padding: '12px 20px' }}>
      <div className="field" style={{ gap: 4 }}>
        <label htmlFor="judge-filter-contestant">Contestant</label>
        <select
          id="judge-filter-contestant"
          value={selectedContestant}
          onChange={(event) => setSelectedContestant(event.target.value)}
        >
          <option value="all">All contestants</option>
          {contestants.map((username) => {
            const displayName = username.charAt(0).toUpperCase() + username.slice(1)
            return (
              <option key={username} value={username}>
                {displayName}
              </option>
            )
          })}
        </select>
      </div>
      <div className="field" style={{ gap: 4 }}>
        <label htmlFor="judge-filter-task">Task</label>
        <select id="judge-filter-task" value={taskFilter} onChange={(event) => setTaskFilter(event.target.value)}>
          <option value="all">All tasks</option>
          {availableTaskNumbers.map((taskNumber) => (
            <option key={taskNumber} value={String(taskNumber)}>
              {taskNumber}
            </option>
          ))}
        </select>
      </div>
      <div className="field" style={{ gap: 4 }}>
        <label htmlFor="judge-filter-search">Search</label>
        <input
          id="judge-filter-search"
          value={searchFilter}
          onChange={(event) => setSearchFilter(event.target.value)}
          placeholder="Search names, text, round, task"
        />
      </div>
    </div>
  );
}
