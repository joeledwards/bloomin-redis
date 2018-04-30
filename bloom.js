require('log-a-log')()

// Modules
const durations = require('durations')
const Redis = require('ioredis')
const throttle = require('@buzuli/throttle')
const {emoji} = require('@buzuli/color')

// Tuning parameters
const key = 'filter'
const errorRate = 0.01
const startValue = 0
const cardinality = 100
const valueCount = 100

// Configuration
const host = process.env.BLOOMIN_HOST || 'localhost'
const port = process.env.BLOOMIN_PORT || 6379
const auth = process.env.BLOOMIN_AUTH

blimey()

async function blimey () {
  try {
    const redis = new Redis({
      host,
      port,
      password: auth,
      noDelay: false,
      lazyConnect: true
    })

    console.log('connecting...')
    await redis.connect()
    console.log('connected')

    const exists = redis.exists(key)

    if (exists) {
      console.log('deleting old filter...')
      await redis.del(key)
    }

    /* Setup the bloom filter
     *
     * BF.RESERVE <key> <error_rate> <cardinality>
     *
     * key - the redis key at which the bloom filter should be stored
     * error_rate - the desired accuracy (floating-point ratio)
     * cardinality - the maximum number of unique values expected before
     *               the bloom filter is retired
     */
    console.log('creating new filter...')
    await redis.call('BF.RESERVE', key, errorRate, cardinality)

    // Add values to the bloom filter
    console.log(`populating with ${valueCount} test values...`)
    for (let i = startValue; i < (startValue + 2 * valueCount); i += 2) {
      await redis.call('BF.ADD', key, `${i}`)
    }

    // Check non-overlapping values against the filter for collision
    let fp = 0
    console.log(`testing with ${valueCount} absent values ...`)
    for (let i = startValue + 1; i < (startValue + 2 * valueCount); i += 2) {
      if (await redis.call('BF.EXISTS', key, `${i}`)) {
        fp++
        console.log(`False positive on ${i}`)
      }
    }

    console.log(`Found ${fp} false positive(s) (${valueCount - fp}/${valueCount})`)

    for (;true;) {
      await sleep(1000)
    }
  } catch (error) {
    console.error(error)
    await sleep(1000)
    process.exit(1)
  }
}

function sleep (duration) {
  return new Promise(resolve => setTimeout(resolve, duration))
}
