
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchJudgeSubmissions, fetchJudgeLongGameRounds, fetchJudgeLeaderboard, fetchJudgeTasks } from '../lib/api';
import '../App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export default function PlayerDetailsPage() {
  const [mediaModal, setMediaModal] = useState({ open: false, url: '', type: '', name: '' });
  const [expandedSubmissionId, setExpandedSubmissionId] = useState(null);
  const { username } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [longGameRounds, setLongGameRounds] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      setError('');
      try {
        const [subs, tasksData, longGameData, leaderboardData] = await Promise.all([
          fetchJudgeSubmissions(token),
          fetchJudgeTasks(token),
          fetchJudgeLongGameRounds(token),
          fetchJudgeLeaderboard(token),
        ]);
        if (!isMounted) return;
        let filteredSubs = (subs.submissions ?? []).filter(s => s.username === username);
        setSubmissions(filteredSubs);
        setTasks(tasksData.tasks ?? []);
        setLongGameRounds(longGameData.rounds ?? []);
        setLeaderboard(leaderboardData.leaderboard ?? []);
      } catch (e) {
        if (isMounted) setError(e.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    if (token) loadData();
    return () => { isMounted = false; };
  }, [username, token]);

  const player = leaderboard.find(e => e.username === username);
  
  const completedTaskNumbers = player?.completedTaskNumbers || [];
  const completedTasks = tasks.filter(t => completedTaskNumbers.includes(t.taskNumber));

  function getSubmissionMediaItems(submission) {
    if (!submission) return [];
    if (Array.isArray(submission.mediaItems)) return submission.mediaItems;
    if (submission.mediaType && submission.mediaUrl) {
      return [{ type: submission.mediaType, url: submission.mediaUrl, originalName: submission.originalName }];
    }

    return [];
  }

  function getMediaUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
    return `${API_BASE_URL}/${url}`;
  }

  // Flatten long game history for this player
  const longGameHistory = longGameRounds.flatMap(round => {
    if (round.byeUsername === username) {
      return [{
        roundNumber: round.roundNumber,
        opponent: 'BYE',
        choice: 'BYE',
        points: 'BYE',
        autoCooperate: false,
        isBye: true,
      }];
    }

    return (round.matchups ?? []).filter(m => m.players.includes(username)).map(m => ({
      roundNumber: round.roundNumber,
      opponent: m.players.find(p => p !== username),
      choice: m.choices[username],
      points: m.points[username],
      autoCooperate: m.autoCooperate?.[username] || false,
      isBye: false,
    }));
  });

  return (
    <main className="app-shell">
      <section className="player-details-layout">
        <button className="button-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>Back</button>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 32, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700 }}>
            Player Details: <span style={{ color: '#1976d2' }}>{player?.displayName || username}</span>
          </h1>
          {!isLoading && player && (
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 18, flexWrap: 'wrap' }}>
              {/** Shared style for equal height containers */}
              <span style={{ display: 'flex', alignItems: 'center', minHeight: 40, fontSize: 20, fontWeight: 600, color: '#1976d2', background: '#f3f7fa', borderRadius: 6, padding: '4px 18px' }}>
                Score: {player.longGamePoints ?? 0}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', minHeight: 40, fontSize: 18, fontWeight: 500, color: '#444', background: '#e8eaf6', borderRadius: 6, padding: '4px 18px' }}>
                Leaderboard Position: {leaderboard.findIndex(e => e.username === username) + 1} / {leaderboard.length}
              </span>
            </div>
          )}
        </div>
        {error && <div className="error-banner">{error}</div>}
        {isLoading ? <p>Loading…</p> : (
          <div className="player-details-grid">
            {/* Submissions Card */}
            <div className="task-meta-card">
              <h2 style={{ marginTop: 0 }}>
                Submissions <span style={{ color: '#888', fontWeight: 500 }}>({submissions.length})</span>
              </h2>
              {submissions.length === 0 ? (
                <p className="muted">No submissions yet.</p>
              ) : (
                <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
                  {submissions.map(s => {
                    const task = tasks.find(t => t.taskNumber === s.taskNumber);
                    const taskLabel = task ? task.title : `Task ${s.taskNumber}`;
                    const mediaItems = getSubmissionMediaItems(s);
                    const isExpanded = expandedSubmissionId === s.id;
                    return (
                      <li key={s.id} style={{ marginBottom: 8, borderBottom: '1px solid #eee', paddingBottom: 4 }}>
                        <button
                          className="button-ghost"
                          style={{ width: '100%', textAlign: 'left', fontWeight: 600, fontSize: 16, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={() => setExpandedSubmissionId(isExpanded ? null : s.id)}
                        >
                          {taskLabel}
                          <span style={{ float: 'right', fontSize: 18, color: '#888' }}>{isExpanded ? '▲' : '▼'}</span>
                        </button>
                        {isExpanded && (
                          <div style={{ marginTop: 6 }}>
                            <div
                              style={{
                                color: '#222',
                                fontSize: 15,
                                background: '#f5f7fa',
                                borderRadius: 6,
                                padding: '8px 12px',
                                margin: '6px 0',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                              }}
                            >
                              {s.textBody || <span className="muted">No text</span>}
                            </div>
                            {/* Media section */}
                            <div style={{ margin: '8px 0 0 0' }}>
                              <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>Media:</div>
                              {mediaItems.length === 0 ? (
                                <span className="muted">No media included.</span>
                              ) : (
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                  {mediaItems.map((m, idx) => (
                                    (() => {
                                      const mediaUrl = getMediaUrl(m.url);

                                      return (
                                    <div key={idx} style={{ cursor: 'pointer', display: 'inline-block' }}
                                      onClick={() => setMediaModal({ open: true, url: mediaUrl, type: m.type, name: m.originalName })}>
                                      {m.type === 'image' ? (
                                        <img src={mediaUrl} alt={m.originalName} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }} />
                                      ) : (
                                        <div style={{ width: 64, height: 64, background: '#222', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid #ddd' }}>
                                          <span style={{ fontSize: 28 }}>🎬</span>
                                        </div>
                                      )}
                                    </div>
                                      );
                                    })()
                                  ))}
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Submitted: {new Date(s.createdAt).toLocaleString()}</div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                      {/* Media Modal */}
                      {mediaModal.open && (
                        <div style={{
                          position: 'fixed',
                          top: 0, left: 0, right: 0, bottom: 0,
                          background: 'rgba(0,0,0,0.55)',
                          zIndex: 1000,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                          onClick={() => setMediaModal({ open: false, url: '', type: '', name: '' })}
                        >
                          <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 420, maxWidth: '98vw', maxHeight: '96vh', boxShadow: '0 4px 32px rgba(0,0,0,0.22)', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                            <button className="button-ghost" style={{ position: 'absolute', top: 18, right: 18, fontSize: 18 }} onClick={() => setMediaModal({ open: false, url: '', type: '', name: '' })}>Close</button>
                            <div style={{ textAlign: 'center', marginBottom: 18, fontWeight: 600, fontSize: 18 }}>{mediaModal.name}</div>
                            {mediaModal.type === 'image' ? (
                              <img src={mediaModal.url} alt={mediaModal.name} style={{ maxWidth: '90vw', maxHeight: '75vh', borderRadius: 10, marginBottom: 18 }} />
                            ) : (
                              <video src={mediaModal.url} controls style={{ maxWidth: '90vw', maxHeight: '75vh', borderRadius: 10, marginBottom: 18 }} />
                            )}
                            <a
                              href={mediaModal.url}
                              download={mediaModal.name}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="button"
                              style={{ marginTop: 8, minWidth: 120, textAlign: 'center' }}
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      )}
                </ul>
              )}
            </div>

            {/* Completed Tasks Card */}
            <div className="task-meta-card">
              <h2 style={{ marginTop: 0 }}>
                Completed Tasks <span style={{ color: '#888', fontWeight: 500 }}>({completedTasks.length})</span>
              </h2>
              {completedTasks.length === 0 ? (
                <p className="muted">No completed tasks yet.</p>
              ) : (
                <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
                  {completedTasks.map(t => (
                    <li key={t.taskNumber} style={{ marginBottom: 10, borderBottom: '1px solid #eee', paddingBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{t.title || `Task ${t.taskNumber}`}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Long Game History Card (with points at top) */}
            <div className="task-meta-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 0, marginBottom: 18 }}>
                <h2 style={{ margin: 0 }}>Long Game Votes</h2>
                <span style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#1976d2',
                  letterSpacing: 0.5,
                  background: '#f3f7fa',
                  borderRadius: 6,
                  padding: '4px 14px',
                  marginLeft: 12,
                }}>
                  {player?.longGamePoints ?? 0} pts
                </span>
              </div>
              {longGameHistory.length === 0 ? (
                <p className="muted">No long game history yet.</p>
              ) : (
                <table className="judge-table" style={{ width: '100%', fontSize: 15 }}>
                  <thead>
                    <tr>
                      <th>Round</th>
                      <th>Opponent</th>
                      <th>Choice</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {longGameHistory.map((lg, i) => (
                      <tr key={i}>
                        <td>{lg.roundNumber}</td>
                        <td>{lg.isBye ? <span style={{ color: '#dc2626', fontWeight: 600 }}>BYE</span> : lg.opponent}</td>
                        <td>{lg.isBye ? <span style={{ color: '#dc2626', fontWeight: 600 }}>BYE</span> : (lg.choice ? (lg.autoCooperate ? <span style={{ color: '#1976d2' }}>Cooperate (no vote)</span> : lg.choice.charAt(0).toUpperCase() + lg.choice.slice(1)) : <span className="muted">No vote</span>)}</td>
                        <td>{lg.isBye ? <span style={{ color: '#dc2626', fontWeight: 600 }}>BYE</span> : (typeof lg.points === 'number' ? <strong>{lg.points}</strong> : <span className="muted">Pending</span>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
