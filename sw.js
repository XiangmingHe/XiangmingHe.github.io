/* 单词牌斗地主 Service Worker：预缓存应用外壳，运行时缓存同源资源，支持离线启动 */
const CACHE_NAME = 'word-ddz-v1'
const CORE_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/icons/apple-touch-icon-180.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // 只处理同源资源；在线真人发音（有道）等跨域请求直接走网络
  if (url.origin !== self.location.origin) return

  // 页面导航：网络优先，断网时回退缓存，保证离线可玩
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/'))),
    )
    return
  }

  // 静态资源：缓存优先（Vite 产物带 hash，可安全长期缓存）
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            }
            return response
          })
          .catch(() => cached),
    ),
  )
})
