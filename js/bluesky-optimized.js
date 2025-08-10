// bluesky-optimized.js
// Sistema optimizado para carga de comentarios y likes de Bluesky
// Con control de concurrencia, lazy loading y caché persistente

(function() {
  'use strict';

  // Configuración
  const CONFIG = {
    MAX_CONCURRENT_REQUESTS: 3,     // Máximo de peticiones simultáneas a Bluesky
    CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutos de caché
    RETRY_ATTEMPTS: 2,               // Reintentos en caso de fallo
    RETRY_DELAY_MS: 1000,            // Delay entre reintentos
    INTERSECTION_THRESHOLD: 0.1,     // 10% visible para activar carga
    BATCH_DELAY_MS: 200,             // Delay entre lotes de peticiones
    LOCAL_STORAGE_KEY: 'bluesky_stats_cache_negocios',
    CACHE_VERSION: 'v1'
  };

  // Estado global
  const state = {
    queue: [],                       // Cola de peticiones pendientes
    activeRequests: 0,               // Contador de peticiones activas
    cache: {},                       // Caché en memoria
    pending: {},                     // Peticiones en proceso
    observer: null,                  // IntersectionObserver
    initialized: false
  };

  // --- GESTIÓN DE CACHÉ ---
  
  /**
   * Carga el caché desde localStorage
   */
  function loadCacheFromStorage() {
    try {
      const stored = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.version === CONFIG.CACHE_VERSION) {
          // Filtrar entradas expiradas
          const now = Date.now();
          for (const [key, value] of Object.entries(parsed.data)) {
            if (value.expires > now) {
              state.cache[key] = value;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error loading Bluesky cache from storage:', e);
    }
  }

  /**
   * Guarda el caché en localStorage
   */
  function saveCacheToStorage() {
    try {
      const toStore = {
        version: CONFIG.CACHE_VERSION,
        data: state.cache
      };
      localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      // Si falla (cuota excedida), limpiar caché antiguo
      if (e.name === 'QuotaExceededError') {
        clearExpiredCache();
        try {
          localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify({
            version: CONFIG.CACHE_VERSION,
            data: state.cache
          }));
        } catch (e2) {
          console.warn('Error saving Bluesky cache:', e2);
        }
      }
    }
  }

  /**
   * Limpia entradas expiradas del caché
   */
  function clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of Object.entries(state.cache)) {
      if (value.expires <= now) {
        delete state.cache[key];
      }
    }
  }

  // --- GESTIÓN DE PETICIONES ---

  /**
   * Añade una petición a la cola
   */
  function queueRequest(postId, element, callback) {
    // Si ya está en caché y no ha expirado, devolver inmediatamente
    const cached = state.cache[postId];
    if (cached && cached.expires > Date.now()) {
      callback(cached.data);
      return;
    }

    // Si ya hay una petición pendiente para este post, añadir callback
    if (state.pending[postId]) {
      state.pending[postId].callbacks.push(callback);
      return;
    }

    // Crear nueva petición pendiente
    state.pending[postId] = {
      element,
      callbacks: [callback],
      attempts: 0
    };

    // Añadir a la cola
    state.queue.push(postId);
    
    // Procesar cola
    processQueue();
  }

  /**
   * Procesa la cola de peticiones respetando el límite de concurrencia
   */
  async function processQueue() {
    while (state.queue.length > 0 && state.activeRequests < CONFIG.MAX_CONCURRENT_REQUESTS) {
      const postId = state.queue.shift();
      if (!state.pending[postId]) continue; // Ya fue procesado
      
      state.activeRequests++;
      
      try {
        await fetchBlueskyStats(postId);
      } catch (error) {
        console.error(`Error fetching Bluesky stats for ${postId}:`, error);
      } finally {
        state.activeRequests--;
        // Pequeño delay entre peticiones para no saturar
        if (state.queue.length > 0) {
          await sleep(CONFIG.BATCH_DELAY_MS);
        }
        // Continuar procesando la cola
        processQueue();
      }
    }
  }

  /**
   * Realiza la petición a la API de Bluesky con reintentos
   */
  async function fetchBlueskyStats(postId) {
    const pendingRequest = state.pending[postId];
    if (!pendingRequest) return;

    const maxAttempts = CONFIG.RETRY_ATTEMPTS;
    let lastError = null;

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      if (attempt > 0) {
        await sleep(CONFIG.RETRY_DELAY_MS * attempt); // Backoff exponencial
      }

      try {
        const threadUrl = `https://bsky.app/profile/negocios.aldeapucela.org/post/${postId}`;
        const apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://negocios.aldeapucela.org/app.bsky.feed.post/${postId}`;
        
        const response = await fetch(apiUrl, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000) // 10 segundos timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const stats = {
          commentCount: (data.thread?.replies || []).length,
          likeCount: data.thread?.post?.likeCount || 0,
          threadUrl,
          comments: data.thread?.replies || []
        };

        // Guardar en caché
        state.cache[postId] = {
          data: stats,
          expires: Date.now() + CONFIG.CACHE_DURATION_MS
        };
        saveCacheToStorage();

        // Ejecutar callbacks
        pendingRequest.callbacks.forEach(cb => cb(stats));
        
        // Limpiar pendiente
        delete state.pending[postId];
        
        return stats;
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt + 1}/${maxAttempts + 1} failed for ${postId}:`, error.message);
      }
    }

    // Si todos los intentos fallaron
    console.error(`All attempts failed for ${postId}:`, lastError);
    
    // Devolver datos vacíos a los callbacks
    const emptyStats = {
      commentCount: 0,
      likeCount: 0,
      threadUrl: `https://bsky.app/profile/negocios.aldeapucela.org/post/${postId}`,
      comments: []
    };
    
    pendingRequest.callbacks.forEach(cb => cb(emptyStats));
    delete state.pending[postId];
    
    return emptyStats;
  }

  // --- INTERSECTION OBSERVER (LAZY LOADING) ---

  /**
   * Configura el IntersectionObserver para lazy loading
   */
  function setupIntersectionObserver() {
    if (state.observer) return;

    state.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const postId = element.getAttribute('data-bluesky-post');
          
          if (postId && !element.hasAttribute('data-bluesky-loaded')) {
            element.setAttribute('data-bluesky-loaded', 'true');
            loadStatsForElement(element, postId);
          }
        }
      });
    }, {
      root: null,
      rootMargin: '100px', // Pre-cargar 100px antes de ser visible
      threshold: CONFIG.INTERSECTION_THRESHOLD
    });
  }

  /**
   * Carga las estadísticas para un elemento específico
   */
  function loadStatsForElement(element, postId) {
    queueRequest(postId, element, (stats) => {
      updateElementWithStats(element, stats);
    });
  }

  /**
   * Actualiza un elemento con las estadísticas obtenidas
   */
  function updateElementWithStats(element, stats) {
    // Actualizar botón de comentarios
    const commentBtn = element.querySelector('.bluesky-comments-btn') || element;
    const commentCount = commentBtn.querySelector('.bluesky-comments-count');
    if (commentCount) {
      commentCount.textContent = stats.commentCount > 0 ? stats.commentCount : '';
    }

    // Configurar click handler para el modal
    if (commentBtn && !commentBtn.hasAttribute('data-click-configured')) {
      commentBtn.setAttribute('data-click-configured', 'true');
      const negocioNombre = commentBtn.getAttribute('data-negocio-nombre') || '';
      commentBtn.onclick = () => {
        window.showBlueskyCommentsModal(
          commentBtn.getAttribute('data-bluesky-post'), 
          negocioNombre, 
          stats
        );
      };
    }

    // Actualizar enlace de likes
    const likesLink = element.parentElement?.querySelector('.bluesky-likes-btn');
    if (likesLink) {
      const likesCount = likesLink.querySelector('.bluesky-likes-count');
      if (likesCount) {
        likesCount.textContent = stats.likeCount > 0 ? stats.likeCount : '';
      }
      if (stats.threadUrl) {
        likesLink.href = stats.threadUrl;
      }
    }
  }

  // --- FUNCIONES DE UTILIDAD ---

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- API PÚBLICA ---

  /**
   * Inicializa el sistema optimizado
   */
  window.initBlueskyOptimized = function() {
    if (state.initialized) return;
    state.initialized = true;

    // Cargar caché desde localStorage
    loadCacheFromStorage();

    // Configurar IntersectionObserver
    setupIntersectionObserver();

    // Observar elementos existentes
    observeExistingElements();

    // Observar cambios dinámicos en el DOM
    setupMutationObserver();

    console.log('Bluesky Optimized System initialized');
  };

  /**
   * Observa elementos existentes con data-bluesky-post
   */
  function observeExistingElements() {
    const elements = document.querySelectorAll('[data-bluesky-post]');
    elements.forEach(element => {
      if (!element.hasAttribute('data-bluesky-observed')) {
        element.setAttribute('data-bluesky-observed', 'true');
        state.observer.observe(element);
      }
    });
  }

  /**
   * Configura MutationObserver para elementos añadidos dinámicamente
   */
  function setupMutationObserver() {
    const container = document.getElementById('negocio-list');
    if (!container) return;

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            // Buscar elementos con data-bluesky-post
            const elements = node.querySelectorAll ? 
              node.querySelectorAll('[data-bluesky-post]') : [];
            
            elements.forEach(element => {
              if (!element.hasAttribute('data-bluesky-observed')) {
                element.setAttribute('data-bluesky-observed', 'true');
                state.observer.observe(element);
              }
            });

            // Si el propio nodo tiene data-bluesky-post
            if (node.hasAttribute && node.hasAttribute('data-bluesky-post')) {
              if (!node.hasAttribute('data-bluesky-observed')) {
                node.setAttribute('data-bluesky-observed', 'true');
                state.observer.observe(node);
              }
            }
          }
        });
      });
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Fuerza la recarga de estadísticas para un post específico
   */
  window.reloadBlueskyStats = function(postId) {
    // Eliminar del caché
    delete state.cache[postId];
    saveCacheToStorage();

    // Buscar elemento y recargar
    const element = document.querySelector(`[data-bluesky-post="${postId}"]`);
    if (element) {
      element.removeAttribute('data-bluesky-loaded');
      loadStatsForElement(element, postId);
    }
  };

  /**
   * Limpia todo el caché
   */
  window.clearBlueskyCache = function() {
    state.cache = {};
    localStorage.removeItem(CONFIG.LOCAL_STORAGE_KEY);
    console.log('Bluesky cache cleared');
  };

  /**
   * Obtiene estadísticas del sistema (para debugging)
   */
  window.getBlueskySystemStats = function() {
    return {
      cacheSize: Object.keys(state.cache).length,
      queueLength: state.queue.length,
      activeRequests: state.activeRequests,
      pendingRequests: Object.keys(state.pending).length,
      config: CONFIG
    };
  };

})();
