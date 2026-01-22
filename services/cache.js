const memoryCache = new Map();
let redis = null;

async function initRedis() {
    if (process.env.UPSTASH_REDIS_REST_URL) {
          try {
                  const { Redis } = await import('@upstash/redis');
                  redis = new Redis({
                            url: process.env.UPSTASH_REDIS_REST_URL,
                            token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
                  });
                  console.log('[Cache] Connected to Redis');
                  return true;
          } catch (error) {
                  console.log('[Cache] Redis not available, using memory cache');
                  return false;
          }
    }
    console.log('[Cache] Using in-memory cache');
    return false;
}

function getCacheKey(from, to, date, cabin) {
    return `award:${from}:${to}:${date}:${cabin}`;
}

async function getCache(from, to, date, cabin) {
    const key = getCacheKey(from, to, date, cabin);
    try {
          if (redis) {
                  const data = await redis.get(key);
                  if (data) {
                            console.log(`[Cache] HIT: ${key}`);
                            return typeof data === 'string' ? JSON.parse(data) : data;
                  }
          } else {
                  const cached = memoryCache.get(key);
                  if (cached && Date.now() < cached.expiresAt) {
                            console.log(`[Cache] HIT: ${key}`);
                            return cached.data;
                  }
          }
    } catch (error) {
          console.error('[Cache] Get error:', error.message);
    }
    console.log(`[Cache] MISS: ${key}`);
    return null;
}

async function setCache(from, to, date, cabin, data, ttlMinutes = 30) {
    const key = getCacheKey(from, to, date, cabin);
    const ttlSeconds = ttlMinutes * 60;
    try {
          if (redis) {
                  await redis.setex(key, ttlSeconds, JSON.stringify(data));
          } else {
                  memoryCache.set(key, { data, expiresAt: Date.now() + (ttlSeconds * 1000) });
          }
          console.log(`[Cache] SET: ${key}`);
          return true;
    } catch (error) {
          console.error('[Cache] Set error:', error.message);
          return false;
    }
}

async function deleteCache(from, to, date, cabin) {
    const key = getCacheKey(from, to, date, cabin);
    try {
          if (redis) await redis.del(key);
          else memoryCache.delete(key);
          return true;
    } catch (error) {
          return false;
    }
}

async function getCacheStats() {
    if (redis) {
          try {
                  return { type: 'redis', connected: true };
          } catch { return { type: 'redis', connected: false }; }
    }
    let validEntries = 0;
    const now = Date.now();
    memoryCache.forEach(entry => { if (entry.expiresAt > now) validEntries++; });
    return { type: 'memory', totalEntries: memoryCache.size, validEntries };
}

setInterval(() => {
    const now = Date.now();
    memoryCache.forEach((entry, key) => {
          if (entry.expiresAt <= now) memoryCache.delete(key);
    });
}, 5 * 60 * 1000);

module.exports = { initRedis, getCache, setCache, deleteCache, getCacheStats };
