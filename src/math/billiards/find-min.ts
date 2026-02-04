export type PeriodicFn = (x: number) => number;

export interface FindMinOptions {
  /** Starting point; minimum is returned in [x0, x0+1). */
  x0?: number;

  /** Number of coarse samples across the period. Larger = more robust, slower. */
  samples?: number;

  /** Terminate when bracket width <= tol. */
  tol?: number;

  /** Maximum refinement iterations (safety cap). */
  maxIter?: number;
}

function mod1(x: number): number {
  // map to [0,1)
  const r = x - Math.floor(x);
  // handle -0
  return r === 1 ? 0 : r;
}

function wrapToPeriod(x: number, x0: number): number {
  // Return value in [x0, x0+1)
  const t = x0 + mod1(x - x0);
  // ensure exactly x0+1 maps to x0
  return t >= x0 + 1 ? t - 1 : t;
}

export function findPeriodicMinimumX(
  f: PeriodicFn,
  opts: FindMinOptions = {}
): number {
  const x0 = opts.x0 ?? 0;
  const N = Math.max(16, Math.floor(opts.samples ?? 256));
  const tol = opts.tol ?? 1e-10;
  const maxIter = opts.maxIter ?? 200;

  // ---- 1) Coarse scan over one period ----
  // sample points in [x0, x0+1) at step h = 1/N
  const h = 1 / N;

  const xs: number[] = new Array(N);
  const ys: number[] = new Array(N);

  for (let i = 0; i < N; i++) {
    const x = x0 + i * h;
    xs[i] = x;
    ys[i] = f(x);
  }

  // Find the index of the smallest sample; for unimodal, this is near the true min.
  let k = 0;
  for (let i = 1; i < N; i++) {
    if (ys[i] < ys[k]) k = i;
  }

  // Bracket around k: use neighbors (with wrap) to form a 3-point bracket.
  // We will turn this into a continuous interval [a,b] that contains the min.
  const km1 = (k - 1 + N) % N;
  const kp1 = (k + 1) % N;

  // a,b chosen so that x_k is between them in the unwrapped sense.
  // Handle wrap at period boundary by "unwrapping" to a monotone interval.
  let a = xs[km1];
  let b = xs[kp1];
  let m = xs[k];

  // If neighbors wrap around, unwrap by adding 1 to the right side as needed.
  // Example: k=0 => km1=N-1 near x0+1-h, and m=x0. We want a < m < b in an unwrapped axis.
  if (a > m) a -= 1; // move left neighbor back one period
  if (b < m) b += 1; // move right neighbor forward one period

  // Expand bracket if needed: golden search requires a < b and min inside.
  // If the minimum is flat/noisy, neighbors might not properly "cup" it; expand to be safe.
  // Expand by h steps until we see f(a) > f(m) and f(b) > f(m), or we hit a full period.
  let fa = f(a);
  let fm = f(m);
  let fb = f(b);

  let expandSteps = 0;
  const maxExpand = N; // at most one full period worth of expansion
  while ((fa <= fm || fb <= fm) && expandSteps < maxExpand) {
    // expand symmetrically
    a -= h;
    b += h;
    fa = f(a);
    fb = f(b);
    fm = f(m);
    expandSteps++;
  }

  // Clamp expansion to within one period length around m (unwrapped).
  if (b - a > 1) {
    const mid = m;
    a = mid - 0.5;
    b = mid + 0.5;
    fa = f(a);
    fb = f(b);
  }

  // ---- 2) Golden-section search on [a,b] ----
  // Assumes unimodal on the interval (true around the unique minimum).
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;

  let left = a;
  let right = b;

  let c = right - (right - left) * invPhi;
  let d = left + (right - left) * invPhi;

  let fc = f(c);
  let fd = f(d);

  let iter = 0;
  while (right - left > tol && iter < maxIter) {
    if (fc < fd) {
      // minimum in [left, d]
      right = d;
      d = c;
      fd = fc;
      c = right - (right - left) * invPhi;
      fc = f(c);
    } else {
      // minimum in [c, right]
      left = c;
      c = d;
      fc = fd;
      d = left + (right - left) * invPhi;
      fd = f(d);
    }
    iter++;
  }

  const xMinUnwrapped = (left + right) / 2;

  // Wrap answer back to [x0, x0+1)
  return wrapToPeriod(xMinUnwrapped, x0);
}