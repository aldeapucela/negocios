// modal-bluesky.js
// Modal sencillo para mostrar comentarios Bluesky en las tarjetas de negocios

(function() {
  // Crea el modal si no existe
  function ensureModal() {
    let modal = document.getElementById('bluesky-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bluesky-modal';
      modal.style = 'display:none;position:fixed;z-index:9999;top:0;left:0;width:100vw;height:100vh;background:rgba(60,50,90,0.17);backdrop-filter:blur(1.5px);align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div id="bluesky-modal-content" style="background:white;max-width:410px;width:92vw;max-height:95vh;overflow:auto;border-radius:15px;box-shadow:0 8px 32px rgba(80,60,120,0.18);padding:0;position:relative;">
          <button id="bluesky-modal-close" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:1.6rem;color:#786698;cursor:pointer;z-index:2;"><i class="fa-solid fa-xmark"></i></button>
          <div id="bluesky-modal-body" style="padding:22px 18px 18px 18px;"></div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('bluesky-modal-close').onclick = () => {
        modal.style.display = 'none';
        document.getElementById('bluesky-modal-body').innerHTML = '';
      };
      modal.onclick = function(e) {
        if (e.target === modal) {
          modal.style.display = 'none';
          document.getElementById('bluesky-modal-body').innerHTML = '';
        }
      };
    }
    return modal;
  }

  // Expone función global para abrir el modal y cargar comentarios
  window.showBlueskyCommentsModal = async function(postId, negocioNombre) {
    const modal = ensureModal();
    const body = document.getElementById('bluesky-modal-body');
    // Enlace destacado arriba
    const threadUrl = `https://bsky.app/profile/negocios.aldeapucela.org/post/${postId}`;
    const addCommentLink = `<a href="${threadUrl}" target="_blank" rel="noopener" class="bluesky-add-comment-link block w-full text-center mb-3 font-semibold text-[#786698] hover:text-[#5e507a] transition-all" style="background:none;border:none;padding:0;text-decoration:underline dotted transparent;cursor:pointer;"><i class='fa-regular fa-comment-dots mr-2'></i>Añadir un comentario</a>`;
    body.innerHTML = addCommentLink;
    modal.style.display = 'flex';
    // Carga comentarios
    body.innerHTML += `<div class='text-center text-gray-400 py-4'>Cargando comentarios...</div>`;
    try {
      const stats = await window.getBlueskyCommentsStats(postId);
      body.innerHTML = addCommentLink;
      if (stats.commentCount === 0) {
        body.innerHTML += `<div class='text-gray-500 text-center py-6'><i class='fa-regular fa-comment-dots text-3xl mb-2'></i><br>Se el primero en comentar...</div>`;
        // Enlace abajo aunque no haya comentarios
        body.innerHTML += addCommentLink;
        return;
      }
      const commentsList = document.createElement('ul');
      commentsList.className = 'mb-2';
      stats.comments.slice().sort((a,b) => new Date(a.post.indexedAt) - new Date(b.post.indexedAt)).forEach(reply => {
        if (!reply?.post?.record?.text) return;
        const author = reply.post.author;
        const li = document.createElement('li');
        li.className = 'mb-4 p-3 bg-[#f7f5fb] rounded shadow-sm';
        li.innerHTML = `
          <div class="flex items-center gap-3 mb-2">
            <img src="${author.avatar || ''}" alt="avatar" class="w-7 h-7 rounded-full border border-instagram-200 bg-white object-cover" loading="lazy" />
            <div>
              <a href="https://bsky.app/profile/${author.did}" target="_blank" class="font-bold text-[#786698] hover:text-[#5e507a] text-sm">${author.displayName || author.handle}</a>
              <span class="ml-2 text-xs text-gray-400">${window.timeAgo(reply.post.record.createdAt)}</span>
            </div>
          </div>
          <p class="text-[#786698] text-sm mb-2">${reply.post.record.text}</p>
          <div class="flex gap-2 text-xs text-gray-400">
            <span><i class="fa-regular fa-comment"></i> ${reply.post.replyCount || 0}</span>
            <span><i class="fa-solid fa-retweet"></i> ${reply.post.repostCount || 0}</span>
            <span><i class="fa-regular fa-heart"></i> ${reply.post.likeCount || 0}</span>
            <a href="https://bsky.app/profile/${author.did}/post/${reply.post.uri.split("/").pop()}" target="_blank" class="ml-auto text-[#786698] hover:text-[#5e507a]"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
          </div>
        `;
        commentsList.appendChild(li);
      });
      body.appendChild(commentsList);
      // Enlace destacado abajo
      body.innerHTML += addCommentLink;
    } catch (e) {
      body.innerHTML += `<div class='text-red-500 text-center py-6'>Error cargando comentarios</div>`;
      // Enlace abajo si hay error
      body.innerHTML += addCommentLink;
    }
  };
})();
