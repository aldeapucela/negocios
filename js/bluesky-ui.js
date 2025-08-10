// bluesky-ui.js
// Adaptador para el sistema optimizado de Bluesky con lazy loading

// DEPRECADO: Este sistema ha sido reemplazado por bluesky-optimized.js
// Se mantiene por compatibilidad pero delegará al nuevo sistema

// Función de compatibilidad que inicializa el nuevo sistema
function initBlueskyUICompat() {
  if (typeof window.initBlueskyOptimized === 'function') {
    // Usar el nuevo sistema optimizado
    window.initBlueskyOptimized();
    console.log('Using optimized Bluesky system with lazy loading');
  } else {
    // Fallback al sistema anterior si el optimizado no está disponible
    console.warn('Bluesky optimized system not available, using fallback');
    initFallbackSystem();
  }
}

// Sistema de fallback (versión simplificada del original)
function initFallbackSystem() {
  const cache = {};
  const pending = {};
  let requestCount = 0;
  const MAX_CONCURRENT = 3;

  async function updateElement(element, postId) {
    if (cache[postId] || pending[postId] || requestCount >= MAX_CONCURRENT) {
      return;
    }

    pending[postId] = true;
    requestCount++;

    try {
      const stats = await window.getBlueskyCommentsStats(postId);
      cache[postId] = stats;
      
      // Actualizar contador de comentarios
      const commentCount = element.querySelector('.bluesky-comments-count');
      if (commentCount) {
        commentCount.textContent = stats.commentCount > 0 ? stats.commentCount : '';
      }
      
      // Actualizar enlace de likes
      const likesBtn = element.parentElement?.querySelector('.bluesky-likes-btn');
      if (likesBtn) {
        const likesCount = likesBtn.querySelector('.bluesky-likes-count');
        if (likesCount) {
          likesCount.textContent = stats.likeCount > 0 ? stats.likeCount : '';
        }
        if (stats.threadUrl) {
          likesBtn.href = stats.threadUrl;
        }
      }
    } catch (error) {
      console.warn(`Failed to load stats for ${postId}:`, error);
    } finally {
      delete pending[postId];
      requestCount--;
    }
  }

  // Configurar elementos existentes con throttling
  const elements = document.querySelectorAll('.bluesky-comments-btn[data-bluesky-post]');
  elements.forEach((btn, index) => {
    const postId = btn.getAttribute('data-bluesky-post');
    const negocioNombre = btn.getAttribute('data-negocio-nombre') || '';
    
    // Configurar click handler
    btn.onclick = () => {
      if (cache[postId]) {
        window.showBlueskyCommentsModal(postId, negocioNombre, cache[postId]);
      } else {
        window.showBlueskyCommentsModal(postId, negocioNombre);
      }
    };

    // Cargar con delay escalonado
    setTimeout(() => {
      updateElement(btn, postId);
    }, index * 500); // 500ms entre cada elemento
  });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initBlueskyUICompat();
});
