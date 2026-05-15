
import SubmissionSidePanel from '../components/judge/SubmissionSidePanel';
import LeaderboardTable from '../components/judge/LeaderboardTable';
import LongGameOverview from '../components/judge/LongGameOverview';
import FundsRequestsPanel from '../components/judge/FundsRequestsPanel';
import SubmissionsTable from '../components/SubmissionsTable';
import { useEffect, useMemo, useState, useCallback } from 'react';
import NotificationPanel from '../components/judge/NotificationPanel';
import FilterBar from '../components/judge/FilterBar';
import { useNavigate } from 'react-router-dom';
import '../custom-checkbox.css';
import { useAuth } from '../hooks/useAuth';

import {
  fetchJudgeLeaderboard,
  fetchJudgeLongGameRounds,
  fetchJudgeSubmissions,
  fetchJudgeTasks,
  markSubmissionDone as apiMarkSubmissionDone,
  updateJudgeLeaderboardPoints,
} from '../lib/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const TEST_LONG_GAME_REFERENCE_DATE = new Date('2026-05-22T12:00:00.000Z');

function normalizeChoiceForScoring(choice) {
  return choice === 'no vote' ? 'cooperate' : choice;
}

function sortLeaderboardEntries(entries) {
  return [...entries]
    .sort((first, second) => {
      if (second.longGamePoints !== first.longGamePoints) {
        return second.longGamePoints - first.longGamePoints;
      }

      return first.contestantNumber - second.contestantNumber;
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function JudgeDashboardPage() {
  const { token, signOut } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [longGameRounds, setLongGameRounds] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContestant, setSelectedContestant] = useState('all');
  const [taskFilter, setTaskFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [activeSubmissionId, setActiveSubmissionId] = useState('');
  const [selectedLongGameRound, setSelectedLongGameRound] = useState(null);
  const [leaderboardSaveError, setLeaderboardSaveError] = useState('');
  const [savingLeaderboardUsername, setSavingLeaderboardUsername] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadJudgeDashboardData() {
      setError('');
      setIsLoading(true);
      try {
        const [submissionsData, tasksData, longGameData, leaderboardData] = await Promise.all([
          fetchJudgeSubmissions(token),
          fetchJudgeTasks(token),
          fetchJudgeLongGameRounds(token),
          fetchJudgeLeaderboard(token),
        ]);
        if (!isMounted) return;
        setSubmissions(submissionsData.submissions ?? []);
        setTasks(tasksData.tasks ?? []);
        setLongGameRounds(longGameData.rounds ?? []);
        setLeaderboard(leaderboardData.leaderboard ?? []);
      } catch (loadError) {
        if (isMounted) setError(loadError.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadJudgeDashboardData();
    return () => { isMounted = false; };
  }, [token]);

  const flattenedMatchups = useMemo(
    () =>
      longGameRounds.flatMap((round) =>
        (round.matchups ?? []).map((matchup, matchupIndex) => {
          const [playerA = '', playerB = ''] = matchup.players ?? [];
          const choiceA = matchup.choices?.[playerA] ?? null;
          const choiceB = matchup.choices?.[playerB] ?? null;
          const pointsA = matchup.points?.[playerA] ?? null;
          const pointsB = matchup.points?.[playerB] ?? null;
          const unresolved = choiceA === null || choiceB === null || pointsA === null || pointsB === null;
          return {
            id: `${round.roundNumber}-${playerA}-${playerB}-${matchupIndex}`,
            roundNumber: round.roundNumber,
            startDate: round.startDate,
            endDate: round.endDate,
            playerA,
            playerB,
            choiceA,
            choiceB,
            pointsA,
            pointsB,
            unresolved,
            matchupLabel: `${playerA} vs ${playerB}`,
          };
        })
      ),
    [longGameRounds]
  );

  const contestants = useMemo(() => {
    const allUsernames = new Set([
      ...submissions.map((submission) => submission.username),
      ...leaderboard.map((entry) => entry.username),
    ]);
    return [...allUsernames].sort((first, second) => first.localeCompare(second));
  }, [leaderboard, submissions]);

  const availableTaskNumbers = useMemo(() => {
    const values = [...new Set(submissions.map((submission) => submission.taskNumber))];
    return values.sort((first, second) => first - second);
  }, [submissions]);

  const taskNameByNumber = useMemo(() => {
    const lookup = new Map();
    for (const task of tasks) {
      lookup.set(task.taskNumber, task.title);
    }
    return lookup;
  }, [tasks]);

  const getTaskLabel = useCallback(
    (taskNumber) => taskNameByNumber.get(taskNumber) ?? `Task ${taskNumber}`,
    [taskNameByNumber]
  );

  const availableTasks = useMemo(
    () =>
      availableTaskNumbers.map((taskNumber) => ({
        taskNumber,
        label: getTaskLabel(taskNumber),
      })),
    [availableTaskNumbers, getTaskLabel],
  );

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

  const searchValue = searchFilter.trim().toLowerCase();

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      if (selectedContestant !== 'all' && submission.username !== selectedContestant) return false;
      if (taskFilter !== 'all' && submission.taskNumber !== Number(taskFilter)) return false;
      if (!searchValue) return true;
      const haystack = [
        submission.displayName,
        submission.username,
        getTaskLabel(submission.taskNumber),
        submission.textBody,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(searchValue);
    });
  }, [searchValue, selectedContestant, submissions, taskFilter, getTaskLabel]);

  const filteredMatchups = useMemo(() => {
    return flattenedMatchups.filter((matchup) => {
      if (selectedContestant !== 'all' && matchup.playerA !== selectedContestant && matchup.playerB !== selectedContestant) return false;
      if (!searchValue) return true;
      const haystack = `${matchup.roundNumber} ${matchup.matchupLabel} ${matchup.choiceA ?? ''} ${matchup.choiceB ?? ''}`.toLowerCase();
      return haystack.includes(searchValue);
    });
  }, [flattenedMatchups, searchValue, selectedContestant]);

  const filteredLeaderboard = useMemo(() => {
    return leaderboard.filter((entry) => {
      if (selectedContestant !== 'all' && entry.username !== selectedContestant) return false;
      if (!searchValue) return true;
      const haystack = `${entry.displayName} ${entry.username} ${entry.longGamePoints}`.toLowerCase();
      return haystack.includes(searchValue);
    });
  }, [leaderboard, searchValue, selectedContestant]);


  const submissionRows = useMemo(
    () =>
      filteredSubmissions.map((submission) => ({
        ...submission,
        mediaItems: getSubmissionMediaItems(submission),
        createdAt: new Date(submission.createdAt).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).replace(',', ''),
        createdAtTimestamp: new Date(submission.createdAt).getTime() || 0,
        contestantLabel: `${submission.displayName} (@${submission.username})`,
        hasMedia: (submission.mediaItems?.length ?? 0) > 0 || submission.mediaType ? 'Yes' : 'No',
        taskLabel: getTaskLabel(submission.taskNumber),
      })),
    [filteredSubmissions, getTaskLabel],
  );

  const currentRoundNumber = useMemo(() => {
    if (!longGameRounds.length) return null;
    const today = TEST_LONG_GAME_REFERENCE_DATE;
    let current = longGameRounds[0];
    for (const round of longGameRounds) {
      if (new Date(round.startDate) <= today && new Date(round.startDate) > new Date(current.startDate)) {
        current = round;
      }
    }
    return current.roundNumber;
  }, [longGameRounds]);

  const activeLongGameRound = selectedLongGameRound || currentRoundNumber;

  const longGameRows = useMemo(
    () =>
      filteredMatchups
        .filter((matchup) => matchup.roundNumber === activeLongGameRound)
        .map((matchup) => {
          const isPreviousRound = currentRoundNumber !== null && matchup.roundNumber < currentRoundNumber;
          // Compute result string and color for display
          let result = '';
          let resultColor = '';
          const scoredChoiceA = normalizeChoiceForScoring(matchup.choiceA);
          const scoredChoiceB = normalizeChoiceForScoring(matchup.choiceB);
          const betrayA = scoredChoiceA === 'betray';
          const betrayB = scoredChoiceB === 'betray';
          const coopA = scoredChoiceA === 'cooperate';
          const coopB = scoredChoiceB === 'cooperate';
          if (matchup.unresolved) {
            result = isPreviousRound ? 'No Vote' : 'Pending';
            resultColor = '';
          } else if (betrayA && betrayB) {
            result = 'Loss';
            resultColor = 'red';
          } else if (betrayA && coopB) {
            const winnerA = matchup.playerA.charAt(0).toUpperCase() + matchup.playerA.slice(1);
            result = `Winner (${winnerA})`;
            resultColor = 'green';
          } else if (coopA && betrayB) {
            const winnerB = matchup.playerB.charAt(0).toUpperCase() + matchup.playerB.slice(1);
            result = `Winner (${winnerB})`;
            resultColor = 'green';
          } else if (coopA && coopB) {
            result = 'Cooperate';
            resultColor = 'blue';
          } else {
            result = 'Pending';
            resultColor = '';
          }
          return {
            ...matchup,
            isPreviousRound,
            unresolvedLabel: matchup.unresolved ? 'Unresolved' : 'Resolved',
            totalPoints: (matchup.pointsA ?? 0) + (matchup.pointsB ?? 0),
            result,
            resultColor,
          };
        }),
    [filteredMatchups, activeLongGameRound, currentRoundNumber],
  );

  const leaderboardRows = useMemo(
    () =>
      filteredLeaderboard.map((entry) => ({
        ...entry,
        contestantLabel: `${entry.displayName} (@${entry.username})`,
      })),
    [filteredLeaderboard],
  );

  async function markSubmissionDone(token, submissionId, done) {
    await apiMarkSubmissionDone(token, submissionId, done);
  }

  async function handleLeaderboardPointsSave(username, judgeAdjustmentPoints) {
    setLeaderboardSaveError('');
    setSavingLeaderboardUsername(username);

    try {
      await updateJudgeLeaderboardPoints(token, username, judgeAdjustmentPoints);
      setLeaderboard((current) =>
        sortLeaderboardEntries(
          current.map((entry) => {
            if (entry.username !== username) {
              return entry;
            }

            const previousAdjustment = entry.judgeAdjustmentPoints ?? 0;
            const adjustmentDelta = judgeAdjustmentPoints - previousAdjustment;

            return {
              ...entry,
              judgeAdjustmentPoints,
              longGamePoints: (entry.longGamePoints ?? 0) + adjustmentDelta,
            };
          }),
        ),
      );
    } catch (saveError) {
      setLeaderboardSaveError(saveError.message);
    } finally {
      setSavingLeaderboardUsername('');
    }
  }

  return (
    <main className="app-shell">
      <section className="judge-dashboard-layout">
        <div style={{ position: 'relative', minHeight: 56 }}>
          <div className="title-block" style={{ marginRight: 60 }}>
            <h1>Mikaela's Dashboard</h1>
            <p>
              New submissions: <strong>{submissionRows.filter(s => !s.done).length}</strong>
            </p>
          </div>
          <button
            className="button-ghost"
            type="button"
            onClick={signOut}
            style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, minWidth: 90 }}
          >
            Sign out
          </button>
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        <NotificationPanel
          contestants={contestants}
          token={token}
        />
        <FilterBar
          contestants={contestants}
          selectedContestant={selectedContestant}
          setSelectedContestant={setSelectedContestant}
          availableTasks={availableTasks}
          taskFilter={taskFilter}
          setTaskFilter={setTaskFilter}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
        />
        <div className="judge-dashboard-grid">
          <SubmissionsTable
            submissionRows={submissionRows}
            isLoading={isLoading}
            navigate={navigate}
            setActiveSubmissionId={setActiveSubmissionId}
          />
          <LongGameOverview
            longGameRows={longGameRows}
            isLoading={isLoading}
            longGameRounds={longGameRounds}
            currentRoundNumber={currentRoundNumber}
            selectedLongGameRound={selectedLongGameRound}
            setSelectedLongGameRound={setSelectedLongGameRound}
            navigate={navigate}
          />
          <LeaderboardTable
            leaderboardRows={leaderboardRows}
            isLoading={isLoading}
            navigate={navigate}
            onSavePoints={handleLeaderboardPointsSave}
            saveError={leaderboardSaveError}
            savingUsername={savingLeaderboardUsername}
          />
          <FundsRequestsPanel
            leaderboardRows={leaderboardRows}
            isLoading={isLoading}
            token={token}
          />
        </div>

        <SubmissionSidePanel
          activeSubmissionId={activeSubmissionId}
          setActiveSubmissionId={setActiveSubmissionId}
          submissionRows={submissionRows}
          submissions={submissions}
          getTaskLabel={getTaskLabel}
          getSubmissionMediaItems={getSubmissionMediaItems}
          getMediaUrl={getMediaUrl}
          markSubmissionDone={markSubmissionDone}
          token={token}
          setSubmissions={setSubmissions}
        />
      </section>
    </main>
  );
}

export default JudgeDashboardPage;