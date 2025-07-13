// bluesky-ui.js
// Lógica para rellenar los contadores de likes y comentarios, y gestionar el modal en las tarjetas

const blueskyStatsCache = {};
const blueskyStatsPending = {};

// Debounce para evitar ejecuciones excesivas
let blueskyUpdateCountsTimeout = null;
function blueskyUpdateCountsDebounced() {
  if (blueskyUpdateCountsTimeout) clearTimeout(blueskyUpdateCountsTimeout);
  blueskyUpdateCountsTimeout = setTimeout(blueskyUpdateCounts, 500);
}

function blueskyUpdateCounts() {
  // Botón de comentarios
  document.querySelectorAll('.bluesky-comments-btn[data-bluesky-post]').forEach(btn => {
    const postId = btn.getAttribute('data-bluesky-post');
    const negocioNombre = btn.getAttribute('data-negocio-nombre') || '';
    const commentsCountSpan = btn.querySelector('.bluesky-comments-count');
    btn.onclick = async () => {
      // Asegura que el modal use los datos cacheados si existen
      if (blueskyStatsCache[postId]) {
        window.showBlueskyCommentsModal(postId, negocioNombre, blueskyStatsCache[postId]);
      } else {
        window.showBlueskyCommentsModal(postId, negocioNombre);
      }
    };
    if (blueskyStatsCache[postId]) {
      if (commentsCountSpan) commentsCountSpan.textContent = blueskyStatsCache[postId].commentCount > 0 ? blueskyStatsCache[postId].commentCount : '';
    } else if (!blueskyStatsPending[postId]) {
      blueskyStatsPending[postId] = true;
      window.getBlueskyCommentsStats(postId).then(stats => {
        blueskyStatsCache[postId] = stats;
        delete blueskyStatsPending[postId];
        if (commentsCountSpan) commentsCountSpan.textContent = stats.commentCount > 0 ? stats.commentCount : '';
      }).catch(() => { delete blueskyStatsPending[postId]; });
    }
  });
  // Botón/enlace de likes
  document.querySelectorAll('.bluesky-likes-btn').forEach(link => {
    let postId = link.getAttribute('data-bluesky-post');
    if (!postId) {
      const m = link.href.match(/post\/(\w+)$/);
      if (m) postId = m[1];
    }
    const likesCountSpan = link.querySelector('.bluesky-likes-count');
    if (!postId || !likesCountSpan) return;
    if (blueskyStatsCache[postId]) {
      likesCountSpan.textContent = blueskyStatsCache[postId].likeCount > 0 ? blueskyStatsCache[postId].likeCount : '';
      link.href = blueskyStatsCache[postId].threadUrl;
    } else if (!blueskyStatsPending[postId]) {
      blueskyStatsPending[postId] = true;
      window.getBlueskyCommentsStats(postId).then(stats => {
        blueskyStatsCache[postId] = stats;
        delete blueskyStatsPending[postId];
        likesCountSpan.textContent = stats.likeCount > 0 ? stats.likeCount : '';
        link.href = stats.threadUrl;
      }).catch(() => { delete blueskyStatsPending[postId]; });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  blueskyUpdateCounts();
  // Observa cambios en el contenedor de tarjetas para actualizar contadores dinámicamente (con debounce)
  const listCont = document.getElementById('negocio-list');
  if (listCont) {
    const observer = new MutationObserver(() => {
      blueskyUpdateCountsDebounced();
    });
    observer.observe(listCont, { childList: true, subtree: true });
  }
});
