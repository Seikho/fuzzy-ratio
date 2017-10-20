type ErrorResult = {
  diff: number
  percent: number
}

export type Result = {
  ratio: Ratio
  fuzzed?: Ratio & { original: Ratio; error: { width: ErrorResult; height: ErrorResult } }
}

export type Ratio = {
  width: number
  height: number
}

export type Options = Ratio & Fuzz

export type Fuzz = {
  type: 'percent' | 'range'
  tolerance: number
  allowedRatios?: Ratio[]
}

type ErrorRatio = {
  range: number
  percent: number
  ratio: number
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

  const fuzzed = sorted[0]
  const fuzzedRatio = fuzzed.error
    ? {
        width: fuzzed.error.width.ratio,
        height: fuzzed.error.height.ratio,
        error: {
          width: { diff: fuzzed.error.width.range, percent: fuzzed.error.width.percent },
          height: { diff: fuzzed.error.height.range, percent: fuzzed.error.height.percent }
        },
        original: {
          width: fuzzed.width,
          height: fuzzed.height
        }
      }
    : undefined

  const unfuzzedDiv = getGcd(options.width, options.height)
  const ratio = {
    width: options.width / unfuzzedDiv,
    height: options.height / unfuzzedDiv
  }

  return {
    ratio,
    fuzzed: fuzzedRatio
  }
}

function getError(value: number, divisor: number): ErrorRatio {
  const original = value * divisor
  const modified = Math.floor(value) * divisor
  const newRatio = modified / divisor

  const closest =
    Math.abs(modified - original) > Math.abs(modified - newRatio - original)
      ? modified - newRatio
      : modified

  const range = Math.abs(original - closest)
  const percent = round(range / original * 100)

  return { range, percent, ratio: newRatio }
}

function getDivisors(left: number, right: number, divs: number[] = []): number[] {
  const div = left % right
  if (div !== 0) {
    divs.push(div)
  }

  return div === 0 ? divs : getDivisors(right, div, divs)
}

function getGcd(left: number, right: number): number {
  return right === 0 ? left : getGcd(right, left % right)
}

function round(value: number) {
  const multiplier = Math.pow(10, 2)
  return Math.round(value * multiplier) / multiplier
}

const fixtures = [[5516, 3677], [3619, 2715], [5451, 3091], [796, 1134]]

//   [650, 366], [316, 237], [317, 237], [149, 86], [1987, 1119]

for (const [width, height] of fixtures) {
  console.log('\n')
  console.log('------------------------')
  console.log(`Original: ${width}w, ${height}h`)
  console.log(
    'Range: 2',
    JSON.stringify(fuzzRatio({ width, height, type: 'range', tolerance: 2 }).fuzzed, null, 2)
  )
  console.log(
    'Percent: 1',
    JSON.stringify(fuzzRatio({ width, height, type: 'percent', tolerance: 3 }).fuzzed, null, 2)
  )
  console.log('------------------------')
}
