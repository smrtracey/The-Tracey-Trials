import React, { useState } from 'react';

export default function LeaderboardTable({
  leaderboardRows,
  isLoading,
  navigate
}) {
  // Removed sorting state and logic
  return (
    <article className="task-meta-card judge-dashboard-card">
      <div className="judge-section-header">
        <h2>Leaderboard</h2>
      </div>
      {isLoading ? <p className="muted">Loading leaderboard...</p> : null}
      {!isLoading ? (
        <div className="judge-table-wrap">
          {leaderboardRows.length === 0 ? (
            <p className="muted">No leaderboard entries found.</p>
          ) : (
            <table className="judge-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Contestant</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardRows.map((entry) => (
                  <tr key={entry.username}>
                    <td>{entry.rank}</td>
                    <td>
                      <button
                        type="button"
                        className="judge-link-button"
                        onClick={() => navigate(`/judge/player/${entry.username}`)}
                      >
                        {entry.displayName}
                      </button>
                    </td>
                    <td>{entry.longGamePoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </article>
  );
}
