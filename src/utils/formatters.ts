import { Vote, BoardMember, Resolution } from '../types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const formatted = new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
    return `${formatted} Uhr`;
  } catch {
    return dateString;
  }
}

export function formatExactTimestamp(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const formatted = new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
    return `${formatted} Uhr`;
  } catch {
    return dateString;
  }
}

export function getGermanMonthName(monthIndex: number): string {
  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  return months[monthIndex] || '';
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    return formatDate(dateString);
  } catch {
    return dateString;
  }
}

export function calculateVoteStats(resolution: Resolution, totalMembersCount: number) {
  // If resolution specifies eligible voters, use that count; otherwise use totalMembersCount
  const eligibleCount = resolution.eligibleVoterIds && resolution.eligibleVoterIds.length > 0 
    ? resolution.eligibleVoterIds.length 
    : totalMembersCount;

  const votesList = Object.values(resolution.votes);
  const yesCount = votesList.filter((v) => v.vote === 'yes').length;
  const noCount = votesList.filter((v) => v.vote === 'no').length;
  const abstainCount = votesList.filter((v) => v.vote === 'abstain').length;
  const totalVotesCast = votesList.length;
  const pendingCount = Math.max(0, eligibleCount - totalVotesCast);
  
  // Quorum reached?
  const quorum = resolution.requiredQuorum || Math.ceil(eligibleCount / 2);
  const isQuorumReached = totalVotesCast >= quorum;
  const isPassed = isQuorumReached && yesCount > noCount;

  return {
    yesCount,
    noCount,
    abstainCount,
    totalVotesCast,
    pendingCount,
    eligibleCount,
    quorum,
    isQuorumReached,
    isPassed,
    percentageYes: eligibleCount > 0 ? Math.round((yesCount / eligibleCount) * 100) : 0,
    percentageTotalVoted: eligibleCount > 0 ? Math.round((totalVotesCast / eligibleCount) * 100) : 0,
  };
}
