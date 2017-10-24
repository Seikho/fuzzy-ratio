export interface RatioError {
  diff: number
  percent: number
  mod: number
}

export type FuzzRatio = Ratio & {
  original: Ratio
  error: { width: RatioError; height: RatioError }
}

export type Result = {
  /** The real, un-fuzzed aspect ratio */
  ratio: Ratio

  /** The 'best' fuzzed aspect ratio candidate */
  fuzzed?: FuzzRatio

  /** The unused fuzzed ratio candidates also used during the process */
  alts?: FuzzRatio[]
}

export type Ratio = {
  width: number
  height: number
}

export type Options = Ratio & Fuzz

export type Fuzz = {
  type: 'percent' | 'range'
  tolerance: number

  /** If provided, will exclude all fuzzed ratios that do not match the list provided */
  allowedRatios?: Ratio[]
}

interface ErrorRatio {
  range: number
  percent: number
  ratio: number
  mod: number
}

export default function fuzzRatio(options: Options): Result {
  const divs = getDivisors(options.width, options.height)
  const { width, height } = options

  const ratios = divs.map(div => ({ width: width / div, height: height / div, div }))

  type AcceptableRatio = {
    width: number
    height: number
    div: number
    error?: {
      width: ErrorRatio
      height: ErrorRatio
    }
  }

  const acceptableRatios: AcceptableRatio[] = []
  for (const ratio of ratios) {
    const isExact =
      ratio.height === Math.round(ratio.height) && ratio.width === Math.round(ratio.width)

    if (isExact) {
      acceptableRatios.push(ratio)
    }

    const error = {
      width: getError(ratio.width, ratio.div),
      height: getError(ratio.height, ratio.div)
    }

    // The fuzzed ratios can possibly be further reduced due to rounding
    const nextGcd = getGcd(error.width.ratio, error.height.ratio)
    error.width.ratio = error.width.ratio / nextGcd
    error.height.ratio = error.height.ratio / nextGcd

    const tolerance = options.tolerance
    switch (options.type) {
      case 'percent':
        if (error.width.percent <= tolerance && error.height.percent <= tolerance) {
          acceptableRatios.push({ ...ratio, error })
        }
        break
      case 'range':
        if (error.width.range <= tolerance && error.height.range <= tolerance) {
          acceptableRatios.push({ ...ratio, error })
        }
        break
    }
  }

  const allowedRatios = acceptableRatios.filter(ratio => {
    if (!options.allowedRatios) {
      return true
    }

    const width = ratio.error ? ratio.error.width.ratio : ratio.width
    const height = ratio.error ? ratio.error.height.ratio : ratio.height

    // We allow the worst case scenario where there is no ratio
    // to ensure that we definitely have at least one ratio

    const isAllowed =
      ratio.div === 1 ||
      options.allowedRatios.some(allowed => allowed.width === width && allowed.height === height)
    return isAllowed
  })

  // We are going to assume that the smallest ratio is the best
  const sorted = allowedRatios.sort((left, right) => {
    const leftSum = left.error
      ? left.error.width.ratio + left.error.height.ratio
      : left.width + left.height
    const rightSum = right.error
      ? right.error.width.ratio + right.error.height.ratio
      : right.width + right.height

    return leftSum > rightSum ? 1 : leftSum === rightSum ? 0 : -1
  })

  const unfuzzedDiv = getGcd(options.width, options.height)
  const ratio = {
    width: options.width / unfuzzedDiv,
    height: options.height / unfuzzedDiv
  }

  const fuzzed = sorted[0]
  if (!fuzzed) {
    return { ratio }
  }
  const fuzzedRatio = fuzzed.error ? toFuzzed(fuzzed, fuzzed.error) : undefined

  const alts = new Map<string, FuzzRatio>()
  for (const ratio of sorted.slice(1)) {
    const error = ratio.error
    if (!error) {
      continue
    }

    const fuzzed = toFuzzed(ratio, error)
    const id = `${fuzzed.width}:${fuzzed.height}`
    const existing = alts.get(id)
    if (!existing) {
      alts.set(id, fuzzed)
      continue
    }

    const existingDiff = existing.error.width.percent + existing.error.height.percent
    const newDiff = error.width.percent + error.height.percent
    if (newDiff < existingDiff) {
      alts.set(id, fuzzed)
    }
  }

  return {
    ratio,
    fuzzed: fuzzedRatio,
    alts: Array.from(alts).map(alt => alt[1])
  }
}

function toFuzzed(
  ratio: { width: number; height: number },
  error: { width: ErrorRatio; height: ErrorRatio }
): FuzzRatio {
  return {
    width: error.width.ratio,
    height: error.height.ratio,
    error: {
      width: {
        diff: error.width.range,
        percent: error.width.percent,
        mod: error.width.mod,
        ratio: error.width.ratio
      },
      height: {
        diff: error.height.range,
        percent: error.height.percent,
        mod: error.height.mod,
        ratio: error.height.ratio
      }
    },
    original: {
      width: ratio.width,
      height: ratio.height
    }
  }
}

function getError(value: number, divisor: number): ErrorRatio {
  const original = value * divisor
  const mod = Math.floor(value) * divisor
  const ratio = mod / divisor

  const closest = Math.abs(mod - original) > Math.abs(mod - ratio - original) ? mod - ratio : mod

  const range = Math.abs(original - closest)
  const percent = round(range / original * 100)

  return { range, percent, ratio, mod }
}

function getDivisors(left: number, right: number): number[] {
  const value = left < right ? left : right
  const half = Math.floor(value / 2)
  const divs: number[] = []
  for (let i = 2; i <= half; i++) {
    divs.push(i)
  }
  return divs
}

function getGcd(left: number, right: number): number {
  return right === 0 ? left : getGcd(right, left % right)
}

function round(value: number) {
  const multiplier = Math.pow(10, 2)
  return Math.round(value * multiplier) / multiplier
}
