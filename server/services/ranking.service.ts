import { AppError } from "../middleware/error-handler.js";
import * as eventRepository from "../repositories/event.repository.js";
import * as candidateRepository from "../repositories/candidate.repository.js";
import * as judgeTokenRepository from "../repositories/judge-token.repository.js";
import * as voteRepository from "../repositories/vote.repository.js";

type RankingSettings = {
  enableTrimmedMean: boolean;
  trimmedMeanPercentage: number;
  weightQualificata: number;
  weightPopolare: number;
  popularVoteMode: "NUMERIC" | "SINGLE";
};

function computeTrimmedMean(rawValues: number[], settings: RankingSettings) {
  if (rawValues.length === 0) return 0;
  if (!settings.enableTrimmedMean) {
    return rawValues.reduce((sum, value) => sum + value, 0) / rawValues.length;
  }

  const sorted = [...rawValues].sort((a, b) => a - b);
  const trimEachSide = Math.floor(sorted.length * (settings.trimmedMeanPercentage / 100));
  if (trimEachSide <= 0 || trimEachSide * 2 >= sorted.length) {
    return sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  }
  const trimmed = sorted.slice(trimEachSide, sorted.length - trimEachSide);
  if (trimmed.length === 0) return 0;
  return trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;
}

function computePopularVoteShare(candidateVoteCount: number, totalVotesCast: number): number {
  return totalVotesCast > 0 ? (candidateVoteCount / totalVotesCast) * 10 : 0;
}

async function loadRankingInputs(eventId: string) {
  const [event, candidates, qualifiedTokenIds] = await Promise.all([
    eventRepository.findEventRankingSettings(eventId),
    candidateRepository.findCandidatesForRanking(eventId),
    judgeTokenRepository.findQualifiedNonRevokedTokenIds(eventId),
  ]);

  if (!event) {
    throw new AppError(404, "Evento non trovato");
  }

  const eligibleQualifiedJudgeCount = qualifiedTokenIds.length;
  const votes = await voteRepository.findVotesForRanking(eventId);

  const votesByCandidate = new Map<string, { qualifiedScores: number[]; popularScores: number[] }>();
  for (const candidate of candidates) {
    votesByCandidate.set(candidate.id, { qualifiedScores: [], popularScores: [] });
  }

  for (const vote of votes) {
    if (typeof vote.score !== "number") continue;
    const bucket = votesByCandidate.get(vote.candidateId);
    if (!bucket || !vote.judgeToken) continue;
    if (vote.judgeToken.type === "QUALIFICATA") {
      bucket.qualifiedScores.push(vote.score);
    } else {
      bucket.popularScores.push(vote.score);
    }
  }

  const totalPopularVotesCast = [...votesByCandidate.values()].reduce(
    (sum, bucket) => sum + bucket.popularScores.length,
    0,
  );

  return { event, candidates, eligibleQualifiedJudgeCount, votesByCandidate, totalPopularVotesCast };
}

export async function getRankings(eventId: string) {
  const { event, candidates, eligibleQualifiedJudgeCount, votesByCandidate, totalPopularVotesCast } =
    await loadRankingInputs(eventId);

  if (!event.votingClosed) {
    throw new AppError(409, "La Classifica è disponibile solo dopo la chiusura del televoto");
  }

  return candidates
    .map((candidate) => {
      const candidateVotes = votesByCandidate.get(candidate.id) ?? { qualifiedScores: [], popularScores: [] };
      const qualifiedSum = candidateVotes.qualifiedScores.reduce((sum, score) => sum + score, 0);
      const avgQualificata = eligibleQualifiedJudgeCount > 0 ? qualifiedSum / eligibleQualifiedJudgeCount : 0;
      const avgPopolare =
        event.popularVoteMode === "SINGLE"
          ? computePopularVoteShare(candidateVotes.popularScores.length, totalPopularVotesCast)
          : computeTrimmedMean(candidateVotes.popularScores, event);
      const finalScore = avgQualificata * (event.weightQualificata / 100) + avgPopolare * (event.weightPopolare / 100);
      const totalValidVotes = candidateVotes.qualifiedScores.length + candidateVotes.popularScores.length;

      return {
        id: candidate.id,
        number: candidate.number,
        name: candidate.name,
        color: candidate.color,
        totalScore: finalScore,
        finalScore,
        voteCount: totalValidVotes,
        avgScore:
          totalValidVotes > 0
            ? (qualifiedSum + candidateVotes.popularScores.reduce((sum, score) => sum + score, 0)) / totalValidVotes
            : 0,
        avgQualificata,
        avgPopolare,
        qualifiedVoteCount: candidateVotes.qualifiedScores.length,
        popularVoteCount: candidateVotes.popularScores.length,
      };
    })
    .sort((a, b) => {
      const scoreDiff = b.finalScore - a.finalScore;
      if (Math.abs(scoreDiff) <= 0.001) {
        const qualifiedDiff = b.avgQualificata - a.avgQualificata;
        if (Math.abs(qualifiedDiff) > 0.001) return qualifiedDiff;
        return a.number - b.number;
      }
      return scoreDiff;
    });
}

export async function getPartialRankings(eventId: string) {
  const { event, candidates, eligibleQualifiedJudgeCount, votesByCandidate, totalPopularVotesCast } =
    await loadRankingInputs(eventId);

  const baseEntries = candidates.map((candidate) => {
    const candidateVotes = votesByCandidate.get(candidate.id) ?? { qualifiedScores: [], popularScores: [] };
    const qualifiedSum = candidateVotes.qualifiedScores.reduce((sum, score) => sum + score, 0);
    const avgQualificata = eligibleQualifiedJudgeCount > 0 ? qualifiedSum / eligibleQualifiedJudgeCount : 0;
    const avgPopolare =
      event.popularVoteMode === "SINGLE"
        ? computePopularVoteShare(candidateVotes.popularScores.length, totalPopularVotesCast)
        : computeTrimmedMean(candidateVotes.popularScores, event);
    const finalScore = avgQualificata * (event.weightQualificata / 100) + avgPopolare * (event.weightPopolare / 100);

    return {
      id: candidate.id,
      number: candidate.number,
      name: candidate.name,
      color: candidate.color,
      avgQualificata,
      avgPopolare,
      finalScore,
      qualifiedVoteCount: candidateVotes.qualifiedScores.length,
      popularVoteCount: candidateVotes.popularScores.length,
      totalVoteCount: candidateVotes.qualifiedScores.length + candidateVotes.popularScores.length,
    };
  });

  const weightedRankings = [...baseEntries]
    .sort((a, b) => {
      const diff = b.finalScore - a.finalScore;
      if (Math.abs(diff) <= 0.001) {
        const qualifiedDiff = b.avgQualificata - a.avgQualificata;
        if (Math.abs(qualifiedDiff) > 0.001) return qualifiedDiff;
        return a.number - b.number;
      }
      return diff;
    })
    .map((entry, index) => ({ ...entry, position: index + 1 }));

  const qualifiedRankings = [...baseEntries]
    .sort((a, b) => {
      const diff = b.avgQualificata - a.avgQualificata;
      if (Math.abs(diff) <= 0.001) return a.number - b.number;
      return diff;
    })
    .map((entry, index) => ({ ...entry, position: index + 1 }));

  const popularRankings = [...baseEntries]
    .sort((a, b) => {
      const diff = b.avgPopolare - a.avgPopolare;
      if (Math.abs(diff) <= 0.001) return a.number - b.number;
      return diff;
    })
    .map((entry, index) => ({ ...entry, position: index + 1 }));

  return {
    qualified: qualifiedRankings,
    popular: popularRankings,
    weighted: weightedRankings,
    weights: { qualificata: event.weightQualificata, popolare: event.weightPopolare },
    eligibleQualifiedJudges: eligibleQualifiedJudgeCount,
    event: {
      enableTrimmedMean: event.enableTrimmedMean,
      trimmedMeanPercentage: event.trimmedMeanPercentage,
      popularVoteMode: event.popularVoteMode,
    },
  };
}
