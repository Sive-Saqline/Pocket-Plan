import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  it('allows the limit, refuses the next, and frees up after the window', () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1000, () => now);
    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(false);
    expect(limiter.take('b')).toBe(true); // per key
    now = 1001;
    expect(limiter.take('a')).toBe(true);
  });
});
