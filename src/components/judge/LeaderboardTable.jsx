import React, { useEffect, useState } from 'react';

export default function LeaderboardTable({
  leaderboardRows,
  isLoading,
  navigate,
  onSavePoints,
  saveError,
  savingUsername,
}) {
  const [draftAdjustments, setDraftAdjustments] = useState({});

  useEffect(() => {
    setDraftAdjustments(
      Object.fromEntries(
        leaderboardRows.map((entry) => [entry.username, String(entry.judgeAdjustmentPoints ?? 0)]),
      ),
    );
  }, [leaderboardRows]);

  function setDraftValue(username, nextValue) {
    setDraftAdjustments((current) => ({
      ...current,
      [username]: nextValue,
    }));
  }

  function changeDraftBy(username, amount) {
    const currentValue = Number(draftAdjustments[username] ?? 0);
    const nextValue = Number.isFinite(currentValue) ? currentValue + amount : amount;
    setDraftValue(username, String(nextValue));
  }

  async function handleSave(username) {
    const parsedValue = Number(draftAdjustments[username] ?? 0);
    if (!Number.isInteger(parsedValue)) {
      return;
    }

    await onSavePoints(username, parsedValue);
  }

  return (
    <article className="task-meta-card judge-dashboard-card leaderboard-card">
      <div className="judge-section-header">
        <h2>Leaderboard</h2>
      </div>
      {isLoading ? <p className="muted">Loading leaderboard...</p> : null}
      {!isLoading && saveError ? <div className="error-banner">{saveError}</div> : null}
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
                  <th>Edit score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardRows.map((entry) => {
                  const draftValue = draftAdjustments[entry.username] ?? String(entry.judgeAdjustmentPoints ?? 0);
                  const parsedDraftValue = Number(draftValue);
                  const isDraftInteger = Number.isInteger(parsedDraftValue);
                  const hasChanged = isDraftInteger && parsedDraftValue !== (entry.judgeAdjustmentPoints ?? 0);
                  const isSaving = savingUsername === entry.username;

                  return (
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
                      <td>
                        <div className="leaderboard-points-cell">
                          <strong>{entry.longGamePoints}</strong>
                        </div>
                      </td>
                      <td>
                        <div className="leaderboard-editor">
                          <button
                            type="button"
                            className="leaderboard-adjust-button"
                            onClick={() => changeDraftBy(entry.username, -1)}
                            disabled={isSaving}
                            aria-label={`Decrease ${entry.displayName} score adjustment`}
                          >
                            -
                          </button>
                          <input
                            className="leaderboard-adjust-input"
                            type="number"
                            step="1"
                            value={draftValue}
                            onChange={(event) => setDraftValue(entry.username, event.target.value)}
                            disabled={isSaving}
                            aria-label={`${entry.displayName} score adjustment`}
                          />
                          <button
                            type="button"
                            className="leaderboard-adjust-button"
                            onClick={() => changeDraftBy(entry.username, 1)}
                            disabled={isSaving}
                            aria-label={`Increase ${entry.displayName} score adjustment`}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="leaderboard-save-button"
                            onClick={() => handleSave(entry.username)}
                            disabled={isSaving || !hasChanged}
                          >
                            {isSaving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </article>
  );
}
