# Fuzzy Ratio
Dealing with off-by-N problems when dealing with aspect ratios.  
Written in TypeScript

## Installation

```sh
> npm install fuzzy-ratio --save
```

## Example Usage

```ts
import fuzzRatio from 'fuzzy-ratio'

// 2% tolerance in dimension fuzzing
fuzzRatio({ width: 317, height: 376, type: 'percent', tolerance: 2 })

// 2 'pixel' tolerance in dimension fuzzing
fuzzRatio({ width: 317, height: 376, type: 'range', tolerance: 2 })
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

### Interface: Result

```ts
interface Result {
  ratio: { width: number, height: number }
  fuzzed?: {
    width: number
    height: number
    error: {
      width: { diff: number, percent: number },
      height: { diff: number, percent: number }
    },
    original: { width: number, height: number }
  }
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