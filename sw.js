/* =====================================================================
   블랭크톡 문답 노트 — 오프라인 캐시 담당 일꾼 (서비스 워커)
   ---------------------------------------------------------------------
   note.html 옆에 두면 홈 화면 앱으로 설치했을 때
   카드 데이터와 그림을 미리 담아 두어 더 빠르게 열립니다.
   기록 저장·불러오기(구글시트)는 건드리지 않습니다.
===================================================================== */

var CACHE = 'blanktalk-note-v1';
var ASSETS = [
  'cards.json',
  'back-positive.jpg',
  'back-negative.jpg',
  'icon-192.png',
  'icon-512.png',
  'manifest.webmanifest'
];

// 설치할 때 기본 재료를 미리 담아두기 (없는 파일은 조용히 넘어감)
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(ASSETS.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    })
  );
  self.skipWaiting();
});

// 새 버전이 활성화되면 옛 캐시 정리
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE) return caches.delete(key);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  // GET만 다룬다 — 기록 저장(POST)은 절대 가로채지 않는다
  if (e.request.method !== 'GET') return;

  var url = new URL(e.request.url);

  // 구글(스크립트·폰트)로 가는 요청은 그대로 통과
  if (url.origin !== self.location.origin) return;

  // 페이지(note.html)는 항상 새 버전 먼저, 안 되면 캐시
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () {
        return caches.match(e.request);
      })
    );
    return;
  }

  // 나머지(카드 데이터·그림)는 캐시 먼저, 없으면 받아서 담아두기
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      });
    })
  );
});
