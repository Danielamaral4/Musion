import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export const TRENDING_DATA_CACHE_KEY = '@musion_trending_data';
export const TRENDING_RECOMMENDATIONS_CACHE_KEY = '@musion_trending_recommendations_v4';
export const TRENDING_NEW_RELEASES_CACHE_KEY = '@musion_trending_new_releases_v1';

let preloadPromise = null;

const readJSON = async (key) => {
  const value = await AsyncStorage.getItem(key);
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
};

export const getCachedTrendingPayload = async () => {
  const [dashboard, recommendations, newReleases] = await Promise.all([
    readJSON(TRENDING_DATA_CACHE_KEY),
    readJSON(TRENDING_RECOMMENDATIONS_CACHE_KEY),
    readJSON(TRENDING_NEW_RELEASES_CACHE_KEY),
  ]);

  return { dashboard, recommendations, newReleases };
};

export const preloadTrendingData = async ({ force = false } = {}) => {
  if (preloadPromise && !force) return preloadPromise;

  preloadPromise = (async () => {
    const token = await AsyncStorage.getItem('musion_token');
    if (!token) return null;

    const headers = { Authorization: `Bearer ${token}` };
    const cached = await getCachedTrendingPayload();
    const shouldFetchDashboard = force || !cached.dashboard;
    const shouldFetchRecommendations = force || !cached.recommendations;
    const shouldFetchNewReleases = force || !cached.newReleases;

    const [dashboardResult, recommendationsResult, newReleasesResult] = await Promise.allSettled([
      shouldFetchDashboard ? api.get('/dashboard', { headers }) : Promise.resolve(null),
      shouldFetchRecommendations
        ? api.get('/dashboard/recommend/recent', { headers })
        : Promise.resolve(null),
      shouldFetchNewReleases
        ? api.get('/spotify/new-releases', { headers })
        : Promise.resolve(null),
    ]);

    const dashboard =
      dashboardResult.status === 'fulfilled' && dashboardResult.value
        ? dashboardResult.value.data
        : cached.dashboard;

    const recommendations =
      recommendationsResult.status === 'fulfilled' && recommendationsResult.value
        ? recommendationsResult.value.data
        : cached.recommendations;

    const newReleases =
      newReleasesResult.status === 'fulfilled' && newReleasesResult.value
        ? newReleasesResult.value.data
        : cached.newReleases;

    const writes = [];

    if (dashboardResult.status === 'fulfilled' && dashboardResult.value) {
      writes.push(
        AsyncStorage.setItem(TRENDING_DATA_CACHE_KEY, JSON.stringify(dashboard))
      );
    }

    if (recommendationsResult.status === 'fulfilled' && recommendationsResult.value) {
      writes.push(
        AsyncStorage.setItem(
          TRENDING_RECOMMENDATIONS_CACHE_KEY,
          JSON.stringify(recommendations)
        )
      );
    }

    if (newReleasesResult.status === 'fulfilled' && newReleasesResult.value) {
      writes.push(
        AsyncStorage.setItem(
          TRENDING_NEW_RELEASES_CACHE_KEY,
          JSON.stringify(newReleases)
        )
      );
    }

    await Promise.all(writes);

    return { dashboard, recommendations, newReleases };
  })().finally(() => {
    preloadPromise = null;
  });

  return preloadPromise;
};
