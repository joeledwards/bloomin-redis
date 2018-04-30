require('log-a-log')()

// Tuning parameters
const key = 'filter'
const errorRate = 0.01
const startValue = 0
const cardinality = 100
const valueCount = 100

// Modules
const durations = require('durations')
const Redis = require('ioredis')
const throttle = require('@buzuli/throttle')
const {emoji} = require('@buzuli/color')

function sleep (duration) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

async function blimey () {
  const redis = new Redis({
    host: 'redis'
  })

  await redis.call('DEL', key)
    .catch(error => console.error)

  /* Setup the bloom filter
   *
   * BF.RESERVE <key> <error_rate> <cardinality>
   *
   * key - the redis key at which the bloom filter should be stored
   * error_rate - the desired accuracy (floating-point ratio)
   * cardinality - the maximum number of unique values expected before
   *               the bloom filter is retired
   */
  await redis.call('BF.RESERVE', key, errorRate, cardinality)
    .catch(error => console.error)

  // Add values to the bloom filter
  for (let i = startValue; i < (startValue + 2 * valueCount); i += 2) {
    await redis.call('BF.ADD', key, `${i}`)
  }

  // Check non-overlapping values against the filter for collision
  for (let i = startValue + 1; i < (startValue + 2 * valueCount); i += 2) {
    if (await redis.call('BF.EXISTS', key, `${i}`)) {
      console.log(`False positive on ${i}`)
    }
  }

  for (;true;) {
    await sleep(1000)
  }
}

blimey()
