// volverListado.js
// Añade un botón/enlace flotante para volver al listado general si hay hash de negocio activo

(function() {
  function crearBotonVolver() {
    if (document.getElementById('btn-volver-listado')) return;
    const btn = document.createElement('button');
    btn.id = 'btn-volver-listado';
    btn.innerHTML = `<i class="fa-solid fa-arrow-left"></i> Volver al listado`;
    btn.className = 'fixed z-50 bottom-6 left-6 px-4 py-2 rounded-full shadow-lg border border-gray-300 bg-white text-[#786698] hover:bg-[#ede7f6] font-semibold flex items-center gap-2 transition-all';
    btn.style.fontSize = '1.05rem';
    btn.onclick = function() {
      location.hash = '';
      btn.remove();
    };
    document.body.appendChild(btn);
  }

  function quitarBotonVolver() {
    const btn = document.getElementById('btn-volver-listado');
    if (btn) btn.remove();
  }

  function chequearHash() {
    if (/^#\d+$/.test(location.hash)) {
      crearBotonVolver();
    } else {
      quitarBotonVolver();
    }
  }

  window.addEventListener('hashchange', chequearHash);
  window.addEventListener('DOMContentLoaded', chequearHash);
})();
