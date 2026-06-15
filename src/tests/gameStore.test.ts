import { beforeEach, describe, expect, it } from 'vitest';
import { useGame } from '@/store/gameStore';
import type { GameConfig } from '@/types';

const config: GameConfig = {
  operations: ['addition'],
  difficulty: 'easy',
  durationSeconds: 60,
};

const answerCurrent = (correct: boolean) => {
  const p = useGame.getState().problem!;
  useGame.getState().setInput(String(correct ? p.answer : p.answer + 1));
  return useGame.getState().submit();
};

describe('gameStore', () => {
  beforeEach(() => {
    useGame.getState().reset();
  });

  it('starts a running session with a problem and a future end time', () => {
    const before = Date.now();
    useGame.getState().start(config);
    const s = useGame.getState();
    expect(s.phase).toBe('running');
    expect(s.problem).not.toBeNull();
    expect(s.endTimeMs).toBeGreaterThanOrEqual(before + 60_000 - 50);
  });

  it('correct answer increments score and advances to a new problem', () => {
    useGame.getState().start(config);
    const first = useGame.getState().problem;
    const outcome = answerCurrent(true);
    const s = useGame.getState();
    expect(outcome).toBe('correct');
    expect(s.score.score).toBe(1);
    expect(s.score.streak).toBe(1);
    expect(s.input).toBe('');
    expect(s.problem).not.toBe(first); // advanced
  });

  it('incorrect answer keeps the problem and resets streak', () => {
    useGame.getState().start(config);
    answerCurrent(true); // streak 1
    const current = useGame.getState().problem;
    const outcome = answerCurrent(false);
    const s = useGame.getState();
    expect(outcome).toBe('incorrect');
    expect(s.score.incorrect).toBe(1);
    expect(s.score.streak).toBe(0);
    expect(s.problem).toBe(current); // unchanged
    expect(s.input).toBe('');
  });

  it('empty submission is a no-op', () => {
    useGame.getState().start(config);
    useGame.getState().setInput('   ');
    expect(useGame.getState().submit()).toBe('empty');
    expect(useGame.getState().score.correct).toBe(0);
    expect(useGame.getState().score.incorrect).toBe(0);
  });

  it('finish produces a result and flips phase; second finish returns null', () => {
    useGame.getState().start(config);
    answerCurrent(true);
    answerCurrent(true);
    const result = useGame.getState().finish();
    expect(result).not.toBeNull();
    expect(result!.score).toBe(2);
    expect(result!.correct).toBe(2);
    expect(useGame.getState().phase).toBe('finished');
    expect(useGame.getState().finish()).toBeNull();
  });

  it('daily flag is recorded on the result', () => {
    useGame.getState().start(config, true);
    const result = useGame.getState().finish();
    expect(result!.daily).toBe(true);
  });
});
