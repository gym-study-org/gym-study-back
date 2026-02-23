import { getCache, setCache, deleteCache, getCacheOrFetch } from '../../../../src/shared/utils/cache.util';
import { redis } from '../../../../src/config/redis';

beforeAll(async () => {
  await redis.connect();
});

afterAll(async () => {
  await redis.quit();
});

beforeEach(async () => {
  // Clean test keys
  const keys = await redis.keys('test:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
});

describe('cache.util', () => {
  describe('setCache / getCache', () => {
    it('should set and get a cached value', async () => {
      await setCache('test:key1', { name: 'hello' }, 60);
      const result = await getCache<{ name: string }>('test:key1');
      expect(result).toEqual({ name: 'hello' });
    });

    it('should return null for non-existent key', async () => {
      const result = await getCache('test:nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('deleteCache', () => {
    it('should delete a cached value', async () => {
      await setCache('test:key2', 'value', 60);
      await deleteCache('test:key2');
      const result = await getCache('test:key2');
      expect(result).toBeNull();
    });
  });

  describe('getCacheOrFetch', () => {
    it('should fetch and cache when key does not exist', async () => {
      const fetcher = jest.fn().mockResolvedValue({ data: 'fresh' });

      const result = await getCacheOrFetch('test:key3', fetcher, 60);
      expect(result).toEqual({ data: 'fresh' });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should return cached value without calling fetcher', async () => {
      await setCache('test:key4', { data: 'cached' }, 60);
      const fetcher = jest.fn().mockResolvedValue({ data: 'fresh' });

      const result = await getCacheOrFetch('test:key4', fetcher, 60);
      expect(result).toEqual({ data: 'cached' });
      expect(fetcher).not.toHaveBeenCalled();
    });
  });
});
