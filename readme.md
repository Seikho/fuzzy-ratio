# Fuzzy Ratio
Dealing with off-by-N problems when dealing with aspect ratios.  

## Installation

```sh
> npm install fuzzy-ratio --save
```

## Example Usage

```ts
import fuzzRatio from 'fuzzy-ratio'

// 2% tolerance in dimension fuzzing
fuzzRatio({ width: 317, height: 376, type: 'percent', tolerance: 2 }) // --> Result

// 2 'pixel' tolerance in dimension fuzzing
fuzzRatio({ width: 317, height: 376, type: 'range', tolerance: 2 }) // --> Result
```

### Function: fuzzRatio

```ts
function fuzzRatio(options: Options): Result
```

### Interface: Ratio
```ts
interface Ratio {
  width: number
  height: number
}
```

### Interface: RatioError
This is used for posterity/debugging

```ts
interface RatioError {
  diff: number
  percent: number
  mod: number
}
```

### Interface: Result

```ts
interface FuzzRatio extends Ratio {
  original: Ratio
  error: { width: RatioError, height: RatioError }
}

interface Result {
  /** The real aspect ratio with no fuzzing */
  ratio: Ratio 

  /** If provided, the 'best' fuzzed ratio */
  fuzzed?: FuzzRatio

  /** All of the alternative fuzzed ratio candidates used in the fuzzing process */
  alts?: FuzzRatio[]
}
```

### Options

```ts
interface Options {
  width: number
  height: number
  type: 'percent' | 'range'
  tolerance: number
  allowedRatios?: Ratio[]
}
```