const HOSTS = new Set([
  'store.steampowered.com', 'api.steampowered.com',
  'shared.akamai.steamstatic.com', 'shared.cloudflare.steamstatic.com',
  'cdn.akamai.steamstatic.com', 'cdn.cloudflare.steamstatic.com'
]);
const MAX_BYTES = 4 * 1024 * 1024;
let tagDictionaryCache = null;
const CDN = 'https://shared.akamai.steamstatic.com/store_item_assets/';

async function upstream(url) {
  for (let redirects = 0; redirects < 4; redirects++) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !HOSTS.has(parsed.hostname) ||
        parsed.username || parsed.password || (parsed.port && parsed.port !== '443')) {
      throw new Error('Unsupported upstream address');
    }
    const response = await fetch(url, {
      redirect: 'manual', signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'SwitchTemplateStudio/1.0' }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new Error('Invalid redirect');
      url = new URL(location, url).href;
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Steam returned ${response.status}`);
    }
    if (Number(response.headers.get('content-length')) > MAX_BYTES) {
      await response.body?.cancel();
      throw new Error('Upstream response too large');
    }
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > MAX_BYTES) {
          await reader.cancel();
          throw new Error('Upstream response too large');
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  }
  throw new Error('Too many redirects');
}
async function jsonUpstream(url) {
  return JSON.parse(new TextDecoder().decode(await upstream(url)));
}
function decodeEntities(text) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
  return text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, key) => {
    if (key[0] !== '#') return named[key.toLowerCase()] ?? match;
    const n = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '�';
  });
}
function plain(text) {
  return decodeEntities(String(text || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function imageType(bytes) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return 'image/png';
  if (new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
      new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}
function base64(bytes) {
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 0x8000) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 0x8000)));
  return btoa(chunks.join(''));
}
async function imageData(urls) {
  // At most three candidates per asset to keep upstream requests bounded.
  for (const url of [...new Set(urls)].slice(0, 3)) {
    try {
      const bytes = await upstream(url);
      const type = imageType(bytes);
      if (!type) continue;
      return { data: `data:${type};base64,${base64(bytes)}`, source: url };
    } catch { /* Try the next candidate. */ }
  }
  return null;
}
async function storeTags(appid) {
  const page = new TextDecoder().decode(await upstream(`https://store.steampowered.com/app/${appid}/?l=english&cc=us`));
  const tags = [];
  for (const match of page.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const classes = match[1].match(/\bclass\s*=\s*(["'])(.*?)\1/i)?.[2] || '';
    if (!classes.split(/\s+/).includes('app_tag')) continue;
    const tag = plain(match[2]);
    if (tag && !tags.includes(tag)) tags.push(tag);
    if (tags.length === 6) break;
  }
  if (!tags.length) throw new Error('Store tags not available');
  return tags;
}

export async function importGame(appid) {
  const details = new URL('https://store.steampowered.com/api/appdetails');
  details.search = new URLSearchParams({ appids: appid, l: 'english', cc: 'us' });
  const result = await jsonUpstream(details.href);
  const game = result[appid];
  if (!game?.success || !game.data) {
    const error = new Error('App ID not found, unavailable in the US store, or has no public store page.');
    error.status = 404;
    throw error;
  }
  const data = game.data;
  let assets = {};
  let rankedTagIds = [];
  const warnings = [];
  try {
    const browse = new URL('https://api.steampowered.com/IStoreBrowseService/GetItems/v1/');
    browse.searchParams.set('input_json', JSON.stringify({ ids: [{ appid: Number(appid) }],
      context: { language: 'english', country_code: 'US' }, data_request: { include_assets: true, include_tag_count: 6 } }));
    const metadata = await jsonUpstream(browse.href);
    const item = metadata.response?.store_items?.[0] || {};
    assets = item.assets || {};
    rankedTagIds = (item.tags || []).slice(0, 6).map(tag => tag.tagid);
  } catch { warnings.push('Steam asset metadata unavailable; standard library artwork paths were tried.'); }
  function candidates(keys, defaults) {
    const urls = [];
    for (const key of keys) {
      if (assets[key] && assets.asset_url_format?.includes('${FILENAME}')) {
        const path = assets.asset_url_format.replace('${FILENAME}', assets[key]).replace(/^\/+/, '');
        urls.push(CDN + path);
      }
    }
    for (const file of defaults) urls.push(`${CDN}steam/apps/${appid}/${file}`);
    return urls;
  }
  const iconHash = assets.community_icon;
  const iconUrls = typeof iconHash === 'string' && /^[a-f0-9]{40}$/i.test(iconHash)
    ? ['cdn.akamai.steamstatic.com','cdn.cloudflare.steamstatic.com','shared.akamai.steamstatic.com'].map(host => `https://${host}/steamcommunity/public/images/apps/${appid}/${iconHash}.jpg`) : [];
  const tagsPromise = storeTags(appid).catch(() => null);
  const jobs = {
    client_icon: iconUrls,
    capsule: candidates(['library_capsule_2x', 'library_capsule'], ['library_600x900.jpg']),
    hero: candidates(['library_hero_2x', 'library_hero'], ['library_hero.jpg'])
  };
  for (const [index, shot] of (data.screenshots || []).slice(0, 4).entries()) {
    jobs[`screenshot_${index + 1}`] = [shot.path_full || shot.path_thumbnail];
  }
  const images = Object.fromEntries(await Promise.all(Object.entries(jobs).map(async ([key, urls]) => [key, await imageData(urls)])));
  if (images.client_icon) {
    images.sd_art = { ...images.client_icon, fit: 'cover', kind: 'client_icon' };
  } else {
    const logo = await imageData(candidates(['library_logo_2x', 'library_logo', 'logo_2x', 'logo'], ['logo_2x.png', 'logo.png']));
    if (logo) {
      images.sd_art = { ...logo, fit: 'contain', kind: 'logo' };
    } else if (images.capsule) {
      images.sd_art = { ...images.capsule, fit: 'cover', kind: 'front' };
    } else {
      images.sd_art = null;
    }
  }
  let tags = await tagsPromise;
  // Age-gated/SSR pages may omit visible tag anchors. Steam's ranked tag IDs
  // and localized tag dictionary provide the same store-tag names without
  // treating genres or content descriptors as user-defined tags.
  if (!tags && rankedTagIds.length) {
    try {
      if (!tagDictionaryCache || Date.now() - tagDictionaryCache.time > 3600000) {
        const list = await jsonUpstream('https://api.steampowered.com/IStoreService/GetTagList/v1/?language=english');
        tagDictionaryCache = { time: Date.now(), names: new Map((list.response?.tags || []).map(tag => [tag.tagid, plain(tag.name)])) };
      }
      const resolved = rankedTagIds.map(id => tagDictionaryCache.names.get(id));
      if (resolved.every(Boolean)) tags = resolved;
    } catch { /* Keep manual tags if Steam cannot supply the names. */ }
  }
  if (!tags) warnings.push('Steam store tags unavailable; existing tags were kept.');
  for (const key of ['capsule', 'hero', 'sd_art', 'screenshot_1', 'screenshot_2', 'screenshot_3', 'screenshot_4']) {
    if (!images[key]) warnings.push(`${key.replaceAll('_', ' ')} unavailable; existing artwork will be kept.`);
  }
  const description = plain(data.short_description);
  if (!description) warnings.push('Short description unavailable; existing description will be kept.');
  return { appid, name: plain(data.name), description, tags, images, warnings, language: 'english', country: 'US' };
}
function reply(data, status = 200, extra = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...extra } });
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.method !== 'GET') return reply({ error: 'Method not allowed.' }, 405, { Allow: 'GET' });
    // This is a same-origin editor API, not a general-purpose CORS proxy.
    const origin = request.headers.get('Origin');
    if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
      return reply({ error: 'Use this importer from its own editor page.' }, 403);
    }
    const match = url.pathname.match(/^\/api\/steam\/([1-9]\d{0,9})$/);
    if (!match) return reply({ error: 'Enter a positive numeric Steam App ID (up to 10 digits).' }, 400);
    // Optional Cloudflare rate-limit binding (see deployment notes).
    if (env.STEAM_RATE_LIMITER) {
      const limited = await env.STEAM_RATE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
      if (!limited.success) return reply({ error: 'Too many imports. Please wait a minute.' }, 429);
    }
    const cacheKey = new Request(`${url.origin}/__steam-cache-v4/${match[1]}`);
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return new Response(cached.body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    try {
      const data = await importGame(match[1]);
      const stored = Response.json(data, { headers: { 'Cache-Control': 'public, max-age=600' } });
      ctx.waitUntil(cache.put(cacheKey, stored.clone()));
      return reply(data);
    } catch (error) {
      console.error('Steam import failed:', error.message);
      return reply({ error: error.status === 404 ? error.message : 'Steam could not be reached or returned unexpected data. Try again later.' }, error.status || 502);
    }
  }
};
