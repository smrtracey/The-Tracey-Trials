import React, { useEffect, useState } from 'react';

function formatChoice(choice, fallback) {
  if (!choice) {
    return fallback;
  }

  if (choice === 'no vote') {
    return 'No Vote';
  }

  return choice;
}

function formatRoundTimeLeft(endDate, nowTimestamp) {
  if (!endDate) {
    return null;
  }

  const targetDate = new Date(`${endDate}T23:59:59`);

  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  const remainingMs = Math.max(0, targetDate.getTime() - nowTimestamp);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export default function LongGameOverview({
  longGameRows,
  isLoading,
  longGameRounds,
  currentRoundNumber,
  selectedLongGameRound,
  setSelectedLongGameRound,
  navigate
}) {
  const [now, setNow] = useState(() => Date.now());
  const activeLongGameRound = selectedLongGameRound || currentRoundNumber;
  const isViewingPreviousRound = currentRoundNumber !== null && activeLongGameRound < currentRoundNumber;
  // Find the bye for the active round
  const activeRoundObj = longGameRounds.find(r => r.roundNumber === activeLongGameRound);
  const byeUsername = activeRoundObj?.byeUsername;
  const roundTimeLeft =
    activeLongGameRound === currentRoundNumber
      ? formatRoundTimeLeft(activeRoundObj?.endDate, now)
      : null;

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <article className="task-meta-card judge-dashboard-card long-game-overview-card">
      <div className="judge-section-header" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 16 }}>
        <h2 style={{ margin: 0, flex: 1 }}>Long Game Overview</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="long-game-round-select" style={{ fontWeight: 500 }}>Round:</label>
          <select
            id="long-game-round-select"
            value={activeLongGameRound ?? ''}
            onChange={e => {
              const val = Number(e.target.value);
              if (val === currentRoundNumber) setSelectedLongGameRound(null);
              else setSelectedLongGameRound(val);
            }}
            style={{ fontSize: '1em', padding: '4px 8px', borderRadius: 8, minWidth: 38, width: 'auto', textAlign: 'center' }}
          >
            <option value="" disabled>
              Select
            </option>
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
            <table className="judge-table judge-table--matchups">
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
                        {matchup.choiceA ? formatChoice(matchup.choiceA, matchup.isPreviousRound ? 'No Vote' : 'Pending') : <span style={{ color: '#888' }}>{matchup.isPreviousRound ? 'No Vote' : 'Pending'}</span>}
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
                        {matchup.choiceB ? formatChoice(matchup.choiceB, matchup.isPreviousRound ? 'No Vote' : 'Pending') : <span style={{ color: '#888' }}>{matchup.isPreviousRound ? 'No Vote' : 'Pending'}</span>}
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
        <div
          style={{
            marginTop: 12,
            fontSize: '1em',
            color: 'var(--text-h)',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <strong>Bye this round:</strong> {byeUsername.charAt(0).toUpperCase() + byeUsername.slice(1)}
          </div>
          {isViewingPreviousRound ? (
            <div style={{ color: '#dc2626', fontWeight: 700 }}>
              {`Round ${activeLongGameRound} is over`}
            </div>
          ) : roundTimeLeft ? (
            <div style={{ color: 'var(--text-soft)' }}>
              <strong style={{ color: 'var(--text-h)' }}>Round ends in:</strong> {` ${roundTimeLeft}`}
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}
