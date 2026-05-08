import React, { useState } from 'react';

export default function LongGameOverview({
  longGameRows,
  isLoading,
  longGameRounds,
  currentRoundNumber,
  selectedLongGameRound,
  setSelectedLongGameRound,
  navigate
}) {
  const activeLongGameRound = selectedLongGameRound || currentRoundNumber;
  // Find the bye for the active round
  const activeRoundObj = longGameRounds.find(r => r.roundNumber === activeLongGameRound);
  const byeUsername = activeRoundObj?.byeUsername;
  return (
    <article className="task-meta-card judge-dashboard-card">
      <div className="judge-section-header" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 16 }}>
        <h2 style={{ margin: 0, flex: 1 }}>Long Game Overview</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="long-game-round-select" style={{ fontWeight: 500 }}>Round:</label>
          <select
            id="long-game-round-select"
            value={activeLongGameRound}
            onChange={e => {
              const val = Number(e.target.value);
              if (val === currentRoundNumber) setSelectedLongGameRound(null);
              else setSelectedLongGameRound(val);
            }}
            style={{ fontSize: '1em', padding: '4px 8px', borderRadius: 8, minWidth: 38, width: 'auto', textAlign: 'center' }}
          >
            {longGameRounds
              .filter(r => r.roundNumber <= currentRoundNumber)
              .map(r => (
                <option key={r.roundNumber} value={r.roundNumber}>
                  {r.roundNumber}
                </option>
              ))}
          </select>
        </div>
      </div>
      {isLoading ? <p className="muted">Loading long game rounds...</p> : null}
      {!isLoading ? (
        <div className="judge-table-wrap">
          {longGameRows.length === 0 ? (
            <p className="muted">No long game choices found.</p>
          ) : (
            <table className="judge-table">
              <thead>
                <tr>
                  <th>Round</th>
                  <th>Player A</th>
                  <th>Player B</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {longGameRows.map((matchup) => (
                  <tr key={matchup.id} className={matchup.unresolved ? 'judge-row-unresolved' : ''}>
                    <td>{matchup.roundNumber}</td>
                    <td>
                      <button
                        type="button"
                        className="judge-link-button"
                        onClick={() => navigate(`/judge/player/${matchup.playerA}`)}
                      >
                        {matchup.playerA.charAt(0).toUpperCase() + matchup.playerA.slice(1)}
                      </button>
                      <div>
                        {matchup.choiceA ? matchup.choiceA : <span style={{ color: '#888' }}>Pending</span>}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="judge-link-button"
                        onClick={() => navigate(`/judge/player/${matchup.playerB}`)}
                      >
                        {matchup.playerB.charAt(0).toUpperCase() + matchup.playerB.slice(1)}
                      </button>
                      <div>
                        {matchup.choiceB ? matchup.choiceB : <span style={{ color: '#888' }}>Pending</span>}
                      </div>
                    </td>
                    <td style={matchup.resultColor ? { color: matchup.resultColor, fontWeight: 600 } : {}}>{matchup.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
      {/* Bye display */}
      {byeUsername && (
        <div style={{ marginTop: 12, fontSize: '1em', color: '#fff', textAlign: 'left' }}>
          <strong>Bye this round:</strong> {byeUsername.charAt(0).toUpperCase() + byeUsername.slice(1)}
        </div>
      )}
    </article>
  );
}
