// Usuario propietario de los hilos de comentarios
const BLUESKY_THREAD_HANDLE = 'negocios.aldeapucela.org'; // Cambia aquí el handle si quieres otro usuario

// Devuelve texto como "24m", "1h", "3d"...
function timeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? 'año' : 'años'}`;
}


window.getBlueskyThreadStats = async function(input) {
  // Use the same logic as loadBlueskyComments to get the post_id from the DB
  // Solo permitir pasar directamente el postID desde el objeto negocio o como string
  let postId = null;
  if (typeof input === 'object' && input.bluesky_post) {
    postId = input.bluesky_post;
  } else if (typeof input === 'string') {
    postId = input;
  }

  try {
    if (!postId) {
      return { likeCount: 0, threadUrl: null };
    }
    const threadUrl = `https://bsky.app/profile/${BLUESKY_THREAD_HANDLE}/post/${postId}`;
    const threadApiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://${BLUESKY_THREAD_HANDLE}/app.bsky.feed.post/${postId}`;
    const threadResponse = await fetch(threadApiUrl, { headers: { Accept: "application/json" } });
    let likeCount = 0;
    if (threadResponse.ok) {
      const threadData = await threadResponse.json();
      likeCount = threadData.thread?.post?.likeCount || 0;
    }
    return { likeCount, threadUrl };
  } catch (error) {
    return { likeCount: 0, threadUrl: null };
  }
}

// Nueva función para cargar comentarios usando directamente el postID
// Devuelve los datos de comentarios y likes de un post de Bluesky
window.getBlueskyCommentsStats = async function(postId) {
  if (!postId) return { commentCount: 0, likeCount: 0, threadUrl: null, comments: [] };
  const threadUrl = `https://bsky.app/profile/${BLUESKY_THREAD_HANDLE}/post/${postId}`;
  const threadApiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://${BLUESKY_THREAD_HANDLE}/app.bsky.feed.post/${postId}`;
  try {
    const threadResponse = await fetch(threadApiUrl, { headers: { Accept: "application/json" } });
    let comments = [];
    let likeCount = 0;
    if (threadResponse.ok) {
      const threadData = await threadResponse.json();
      if (threadData.thread) {
        likeCount = threadData.thread.post?.likeCount || 0;
        comments = threadData.thread.replies || [];
      }
    }
    return {
      commentCount: comments.length,
      likeCount,
      threadUrl,
      comments
    };
  } catch (error) {
    return { commentCount: 0, likeCount: 0, threadUrl, comments: [] };
  }
};

// Renderiza los comentarios de un post de Bluesky o devuelve solo los contadores si se pide
window.loadBlueskyCommentsByPostId = async function(postId, returnCountOnly = false) {
  const commentsDiv = document.getElementById("bluesky-comments");
  try {
    const stats = await window.getBlueskyCommentsStats(postId);
    if (returnCountOnly) {
      // Para compatibilidad, solo devuelve los contadores y url
      return { commentCount: stats.commentCount, likeCount: stats.likeCount, threadUrl: stats.threadUrl };
    }
    if (commentsDiv) commentsDiv.innerHTML = '';
    if (stats.commentCount === 0) {
      commentsDiv.innerHTML = `<div class="flex flex-col items-center text-instagram-500 py-6">
        <i class='fa-regular fa-comment-dots text-3xl mb-2'></i>
        <span class='text-base'>Sé el primero en comentar</span>
      </div>`;
      const addBtn = document.createElement('button');
      addBtn.className = 'mt-4 flex items-center gap-2 text-instagram-500 hover:text-instagram-700 font-medium';
      addBtn.innerHTML = `<i class='fa-regular fa-comment-dots'></i> Añadir comentario`;
      addBtn.onclick = () => window.open(threadUrl, '_blank');
      commentsDiv.appendChild(addBtn);
      return;
    }
    const addBtnTop = document.createElement('button');
    addBtnTop.className = 'mb-4 flex items-center gap-2 text-instagram-500 hover:text-instagram-700 font-medium';
    addBtnTop.innerHTML = `<i class='fa-regular fa-comment-dots'></i> Añadir comentario`;
    addBtnTop.onclick = () => window.open(threadUrl, '_blank');
    commentsDiv.appendChild(addBtnTop);
    const commentsList = document.createElement("ul");
    const sortedComments = allComments.sort((a, b) => new Date(a.post.indexedAt) - new Date(b.post.indexedAt));
    sortedComments.forEach((reply) => {
      if (!reply?.post?.record?.text) return;
      const author = reply.post.author;
      const li = document.createElement("li");
      li.className = "mb-4 p-3 bg-white dark:bg-instagram-800 rounded shadow-sm";
      li.innerHTML = `
        <div class="flex items-center gap-3 mb-2">
          <img src="${author.avatar || ''}" alt="avatar" class="w-7 h-7 rounded-full border border-instagram-200 dark:border-instagram-700 bg-white object-cover" loading="lazy" />
          <div>
            <a href="https://bsky.app/profile/${author.did}" target="_blank" class="font-bold text-instagram-600 hover:text-instagram-700 text-sm">${author.displayName || author.handle}</a>
            <span class="ml-2 text-xs text-instagram-400">${timeAgo(reply.post.record.createdAt)}</span>
          </div>
        </div>
        <p class="text-instagram-500 text-sm mb-2">${reply.post.record.text}</p>
        <div class="flex gap-2 text-xs text-instagram-400">
          <span><i class="fa-regular fa-comment"></i> ${reply.post.replyCount || 0}</span>
          <span><i class="fa-solid fa-retweet"></i> ${reply.post.repostCount || 0}</span>
          <span><i class="fa-regular fa-heart"></i> ${reply.post.likeCount || 0}</span>
          <a href="https://bsky.app/profile/${author.did}/post/${reply.post.uri.split("/").pop()}" target="_blank" class="ml-auto text-instagram-500 hover:text-instagram-700"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
        </div>
      `;
      commentsList.appendChild(li);
    });
    commentsDiv.appendChild(commentsList);
    const addBtn = document.createElement('button');
    addBtn.className = 'mt-6 flex items-center gap-2 text-instagram-500 hover:text-instagram-700 font-medium';
    addBtn.innerHTML = `<i class='fa-regular fa-comment-dots'></i> Añadir comentario`;
    addBtn.onclick = () => window.open(stats.threadUrl, '_blank');
    commentsDiv.appendChild(addBtn);
  } catch (error) {
    if (commentsDiv) commentsDiv.innerHTML = `<div class='text-instagram-500 py-6'>Error cargando comentarios Bluesky</div>`;
    if (returnCountOnly) return { commentCount: 0, likeCount: 0, threadUrl: null };
  }
}
