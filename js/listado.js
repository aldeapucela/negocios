// listado.js - Lógica de la página de negocios locales de Valladolid
// Aldea Pucela - https://aldeapucela.org
// Última actualización: 2025-07-12

// --- Variables globales ---
let negociosData = []; // Array con todos los negocios cargados
let tipoFiltro = null; // Categoría seleccionada para filtrar
let mapInstance = null; // Instancia de Leaflet para el mapa

/**
 * Lee el parámetro 'categoria' de la URL y lo valida contra las categorías existentes.
 * @returns {string|null} Nombre de la categoría válida o null si no hay filtro válido.
 */
function getCategoriaFromUrl() {
    const params = new URLSearchParams(window.location.search);
    let cat = params.get('categoria');
    if (!cat) return null;
    // Normaliza y valida contra las categorías existentes
    cat = cat.trim().toLowerCase();
    const match = window.categorias.find(c => c.nombre.toLowerCase() === cat);
    return match ? match.nombre : null;
}

/**
 * Carga los negocios desde la API, inicializa el filtro y renderiza todo.
 */
async function cargarNegocios() {
    const url = 'https://tasks.nukeador.com/webhook/negocios-json';
    const resp = await fetch(url);
    const negocios = await resp.json();
    negociosData = negocios;
    renderTipoDropdown(negocios);
    // Filtro automático por categoría desde la URL
    const urlCategoria = getCategoriaFromUrl();
    if (urlCategoria) {
        tipoFiltro = urlCategoria;
        document.getElementById('filterTypeLabel').textContent = tipoFiltro;
    }
    mostrarMapa(negociosData.filter(n => !tipoFiltro || n.Categoría === tipoFiltro));
    mostrarTarjetas(negociosData.filter(n => !tipoFiltro || n.Categoría === tipoFiltro));
    mostrarTabla(negociosData.filter(n => !tipoFiltro || n.Categoría === tipoFiltro));
}

/**
 * Renderiza el desplegable de categorías y gestiona el filtro y la URL.
 * @param {Array} negocios - Lista de negocios para extraer categorías.
 */
function renderTipoDropdown(negocios) {
    const dropdown = document.getElementById('filterTypeDropdown');
    const tipos = Array.from(new Set(negocios.map(n => n.Categoría).filter(Boolean))).sort();
    let html = `<button class='w-full text-left px-4 py-2 text-[#786698]' data-tipo=''>Todos los tipos</button>`;
    tipos.forEach(tipo => {
        html += `<button class='w-full text-left px-4 py-2 text-[#786698]' data-tipo="${tipo}">${tipo}</button>`;
    });
    dropdown.innerHTML = html;
    dropdown.querySelectorAll('button').forEach(btn => {
        btn.onclick = function() {
            tipoFiltro = this.getAttribute('data-tipo') || null;
            document.getElementById('filterTypeLabel').textContent = tipoFiltro || 'Filtrar tipo';
            dropdown.classList.add('hidden');
            // --- Actualiza la URL para compartir el filtro ---
            const url = new URL(window.location);
            if (tipoFiltro) {
                url.searchParams.set('categoria', tipoFiltro);
            } else {
                url.searchParams.delete('categoria');
            }
            window.history.replaceState({}, '', url);
            filtrarYMostrar();
        };
    });
}

// --- Gestión de apertura/cierre del desplegable de filtro ---
document.getElementById('filterTypeBtn').onclick = function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('filterTypeDropdown');
    dropdown.classList.toggle('hidden');
};
document.addEventListener('click', function(e) {
    document.getElementById('filterTypeDropdown').classList.add('hidden');
});

/**
 * Aplica el filtro seleccionado y renderiza mapa, tarjetas y tabla.
 */
function filtrarYMostrar() {
    let negocios = negociosData;
    if (tipoFiltro) {
        negocios = negocios.filter(n => n.Categoría === tipoFiltro);
    }
    mostrarMapa(negocios);
    mostrarTarjetas(negocios);
    mostrarTabla(negocios);
}

/**
 * Muestra el mapa con los negocios (Leaflet), usando iconos personalizados y popups bonitos.
 * @param {Array} negocios - Lista de negocios a mostrar en el mapa.
 */
function mostrarMapa(negocios) {
    const negociosConCoords = negocios.filter(n => n.latitud && n.longitud);
    if (mapInstance) {
        mapInstance.remove();
    }
    mapInstance = L.map('map', {
        zoomControl: false
    }).setView([41.6526576, -4.728556], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd'
    }).addTo(mapInstance);
    L.control.zoom({ position: 'bottomleft' }).addTo(mapInstance);

    // --- Agrupación de marcadores con clusters personalizados ---
    const markerClusterGroup = L.markerClusterGroup({
        disableClusteringAtZoom: 15,
        maxClusterRadius: 20,
        spiderfyOnMaxZoom: false,
        chunkedLoading: true,
        zoomToBoundsOnClick: true,
        removeOutsideVisibleBounds: false,
        iconCreateFunction: function(cluster) {
            const childCount = cluster.getChildCount();
            let c = ' marker-cluster-';
            if (childCount < 5) {
              c += 'small';
            } else if (childCount < 20) {
              c += 'medium';
            } else {
              c += 'large';
            }
            return L.divIcon({ 
              html: '<div><span>' + childCount + '</span></div>', 
              className: 'marker-cluster' + c, 
              iconSize: new L.Point(40, 40) 
            });
        }
    });

    negociosConCoords.forEach(n => {
        // Icono tipo pin con FontAwesome y fondo rgb(120,102,152), tamaño reducido
        const iconHtml = `
        <div style="position:relative;width:32px;height:40px;display:flex;align-items:center;justify-content:center;">
            <div style="background:rgb(120,102,152);color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.15rem;box-shadow:0 2px 8px rgba(0,0,0,0.10);z-index:1;">
                <span style='filter:drop-shadow(0 1px 1px rgba(0,0,0,0.10));'>${window.getCategoriaIcon(n.Categoría).replace("mr-1", "")}</span>
            </div>
            <div style="position:absolute;left:50%;top:32px;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid rgb(120,102,152);"></div>
        </div>`;
        const markerIcon = L.divIcon({
            html: iconHtml,
            className: '',
            iconSize: [32, 40],
            iconAnchor: [16, 40],
            popupAnchor: [0, -40]
        });
        const marker = L.marker([parseFloat(n.latitud), parseFloat(n.longitud)], { icon: markerIcon });
        markerClusterGroup.addLayer(marker);
        // Popup bonito y organizado
        let direccionHtml = '';
        const direccionTxt = `${n.Vía || ''} ${n["Número"] || ''} ${n["Código postal"] || ''} (${n.Municipio || ''})`;
        if (n.latitud && n.longitud) {
            direccionHtml = `<a href='geo:${n.latitud},${n.longitud}' style='color:#786698;text-decoration:none;display:inline-flex;align-items:center;font-size:0.95rem;margin-bottom:7px;' target='_blank'><i class='fa-solid fa-location-dot mr-1' style='color:#786698;font-size:0.95em;'></i>${direccionTxt}</a>`;
        } else {
            direccionHtml = `<span class='flex items-center text-gray-700' style='font-size:0.95rem;margin-bottom:7px;'><i class='fa-solid fa-location-dot mr-1' style='color:#786698;font-size:0.95em;'></i>${direccionTxt}</span>`;
        }
        // Teléfono para el popup
        let telefonoHtml = '';
        if (n["Teléfono"]) {
            telefonoHtml = `<div style='margin-bottom:7px;'><a href='tel:${n["Teléfono"]}' style='color:#786698;font-size:0.92rem;text-decoration:none;display:inline-flex;align-items:center;gap:4px;'><i class='fa-solid fa-phone' style='font-size:0.95em;color:#786698;'></i><span>${n["Teléfono"]}</span></a></div>`;
        }
        let fotoHtml = '';
        if (n.Foto && Array.isArray(n.Foto) && n.Foto[0]?.thumbnails?.card_cover?.signedPath) {
            fotoHtml = `<a href='#${n.Id}'><img src='https://proyectos.aldeapucela.org/${n.Foto[0].thumbnails.card_cover.signedPath}' alt='${n.Foto[0].title}' style='width:60px;height:60px;object-fit:cover;border-radius:0.5rem;border:2px solid #eee;box-shadow:0 1px 4px rgba(0,0,0,0.07);margin-left:12px;' loading='lazy' /></a>`;
        }
        let popupHtml = `
    <div class="min-w-[220px] max-w-[340px] font-sans relative pb-9">
        <div class="flex flex-row items-start">
            <div class="flex-1 min-w-0">
                <a href="#${n.Id}" class="text-[#786698] font-bold no-underline hover:underline text-xl leading-tight mb-4 block">${n.Nombre}</a>
<div class="text-[0.95rem] text-[#786698] mb-2 flex items-center gap-1">
    <span class="text-[#786698]">${window.getCategoriaIcon(n.Categoría)}</span>
    <span class="bg-[#ede7f6] text-[#786698] rounded-[6px] px-2 py-0.5 text-[0.85rem]">${n.Categoría}</span>
</div>
                <div class="text-[0.95rem] text-gray-700 mb-1.5">${n.Descripción || ''}</div>
                ${n["Ventaja para comunidad"] ? `<div class="text-[0.85rem] text-emerald-600 mb-1.5 flex items-center"><i class='fa-solid fa-gift mr-1'></i>${n["Ventaja para comunidad"]}</div>` : ''}
                ${direccionHtml}
                ${n["Horarios"] ? `<div class='negocio-horarios'><i class='fa-regular fa-clock'></i><span>${n["Horarios"]}</span></div>` : ''}
                <div class="absolute bottom-2 right-2 flex items-center gap-3 z-10 text-[#786698]">
    ${n["Teléfono"] ? `<a href='tel:${n["Teléfono"]}' title='Llamar' class="no-underline inline-flex items-center justify-center w-8 h-8 hover:text-[#5e507a]" style="color:inherit;"><i class='fa-solid fa-phone fa-lg'></i></a>` : ''}
    ${n.Web ? (() => { try { const urlObj = new URL(n.Web); return `<a href='${n.Web}' target='_blank' rel='noopener noreferrer nofollow' title='Web' class="no-underline inline-flex items-center justify-center w-8 h-8 hover:text-[#5e507a]" style="color:inherit;"><i class='fa fa-globe fa-lg'></i></a>`; } catch { return ''; } })() : ''}
    <button class="hover:text-[#5e507a] focus:outline-none bg-none border-none cursor-pointer inline-flex items-center justify-center w-8 h-8" style="color:inherit;" title="Compartir" onclick='compartirNegocio(event, "${n.Id}", "${n.Nombre}")'><i class="fa-solid fa-share-nodes fa-lg"></i></button>
</div>
            </div>
            ${fotoHtml}
        </div>
    </div>
`;

        marker.bindPopup(popupHtml);
    });
    mapInstance.addLayer(markerClusterGroup);
    if (negociosConCoords.length) {
        const bounds = L.latLngBounds(negociosConCoords.map(n => [parseFloat(n.latitud), parseFloat(n.longitud)]));
        mapInstance.fitBounds(bounds, { padding: [30, 30] });
    }
}

/**
 * Devuelve una copia ordenada de los negocios por fecha descendente (más reciente primero).
 * Usa el campo 'Fecha' (formato: 'YYYY-MM-DD HH:mm:ss+00:00').
 * @param {Array} arr - Array de negocios.
 * @returns {Array} Array ordenado.
 */
function ordenarPorFechaDesc(arr) {
    return arr.slice().sort((a, b) => {
        // Si el campo Fecha no existe, lo ponemos al final
        if (!a.Fecha && !b.Fecha) return 0;
        if (!a.Fecha) return 1;
        if (!b.Fecha) return -1;
        // Convierte a Date para comparar correctamente
        return new Date(b.Fecha) - new Date(a.Fecha);
    });
}

/**
 * Renderiza las tarjetas de negocios, ordenadas por fecha descendente.
 * @param {Array} negocios - Lista de negocios a mostrar.
 */
function mostrarTarjetas(negocios) {
    const cont = document.getElementById('negocio-list');
    cont.innerHTML = '';
    ordenarPorFechaDesc(negocios).forEach(n => {
        let imgHtml = '';
        if (n.Foto && Array.isArray(n.Foto) && n.Foto[0]?.thumbnails?.card_cover?.signedPath) {
            imgHtml = `<img class='w-full h-56 object-contain bg-gray-200' src='https://proyectos.aldeapucela.org/${n.Foto[0].thumbnails.card_cover.signedPath}' alt='${n.Foto[0].title}' loading='lazy' />`;
        } else {
            imgHtml = `<div class='w-full h-56 bg-gray-200 flex items-center justify-center text-gray-400'>${getCategoriaIcon(n.Categoría).replace('mr-1', 'text-5xl')}</div>`;
        }
        // Dirección con icono y enlace geo
        let direccionHtml = '';
        if (n.latitud && n.longitud) {
            const direccionTxt = `${n.Vía || ''} ${n["Número"] || ''} - ${n.Municipio || ''}`;
            direccionHtml = `<a href='geo:${n.latitud},${n.longitud}' style='color:#786698;text-decoration:none;display:flex;align-items:center;font-size:0.95rem;' target='_blank'><i class='fa-solid fa-location-dot mr-1' style='color:#786698;font-size:0.95em;'></i>${direccionTxt}</a>`;
        } else {
            direccionHtml = `<span class='flex items-center text-gray-700' style='font-size:0.95rem;'><i class='fa-solid fa-location-dot mr-1' style='color:#786698;font-size:0.95em;'></i> ${n.Vía || ''} ${n["Número"] || ''} - ${n.Municipio || ''}</span>`;
        }
        // Teléfono con icono y enlace tel: (color base #786698, tamaño pequeño, justo encima de la web)
        let telefonoHtml = '';
        if (n["Teléfono"]) {
            telefonoHtml = `<div style='margin-top:2px;margin-bottom:2px;'><a href='tel:${n["Teléfono"]}' class='flex items-center' style='color:#786698;font-size:0.92rem;text-decoration:none;gap:4px;'><i class='fa-solid fa-phone' style='font-size:0.95em;color:#786698;'></i><span>${n["Teléfono"]}</span></a></div>`;
        }
        // Web solo dominio
        let webHtml = '';
        if (n.Web) {
            try {
                const urlObj = new URL(n.Web);
                webHtml = `<a class='flex items-center font-medium' style='color:#786698;text-decoration:none;font-size:1rem;' href='${n.Web}' target='_blank' rel='noopener noreferrer nofollow'><i class='fa fa-globe mr-1' style='color:#786698;'></i>${urlObj.hostname.replace('www.', '')}</a>`;
            } catch { /* fallback */ }
        }
        cont.innerHTML += `
            <div class='rounded-xl shadow bg-white flex flex-col overflow-hidden mb-4 w-full sm:w-[340px]'>
                ${imgHtml}
                <div class='flex-1 flex flex-col gap-1 p-4'>
                    <div class='flex items-center gap-2 mb-1'>
    <a href='#${n.Id}' class='text-lg font-bold hover:text-[#5e507a]' style='color:#786698;text-decoration:none;'>${n.Nombre}</a>
    <span class='flex items-center gap-1 bg-[#ede7f6] text-[#786698] rounded px-2 py-0.5' style='font-size:0.85rem;'>
        ${getCategoriaIcon(n.Categoría)}
        <span style='font-size:0.85rem;'>${n.Categoría}</span>
    </span>
</div>
<div class='text-gray-700 text-sm mb-1'>${n.Descripción || ''}</div>
${n["Horarios"] ? `<div class='text-xs text-gray-500 flex items-center gap-1 mb-1'><i class='fa-regular fa-clock' style='font-size:0.93em;'></i><span>${n["Horarios"]}</span></div>` : ''}
${n["Ventaja para comunidad"] ? `<div class='text-green-700 text-xs mb-1'><i class='fa-solid fa-gift mr-1'></i>${n["Ventaja para comunidad"]}</div>` : ''}
<div class="mt-2">
  <div class="flex items-center gap-2 mb-2">
    <span class='truncate text-[0.97rem] text-[#786698] flex items-center'>${direccionHtml}</span>
  </div>
  <div class="border-t flex items-center w-full justify-between gap-2 pt-3 mt-2">
  <div class="flex gap-2">
    ${n.bluesky_post ? `<button class="bluesky-comments-btn hover:text-[#5e507a] bg-none border-none cursor-pointer inline-flex items-center justify-center w-8 h-8 text-[#786698]" title="Ver comentarios de Bluesky" data-bluesky-post="${n.bluesky_post}" data-negocio-nombre="${n.Nombre}"><i class="fa-regular fa-comment-dots fa-lg"></i><span class="bluesky-comments-count ml-1 text-s"></span></button>` : ''}
    ${n.bluesky_post ? `<a class="hover:text-[#5e507a] inline-flex items-center justify-center w-8 h-8 text-[#786698] bluesky-likes-btn" title="Ver post en Bluesky" target="_blank" href="https://bsky.app/profile/negocios.aldeapucela.org/post/${n.bluesky_post}"><i class="fa-regular fa-heart fa-lg"></i><span class="bluesky-likes-count ml-1 text-s"></span></a>` : ''}
  </div>
  <div class="flex gap-2">
    ${n["Teléfono"] ? `<a href='tel:${n["Teléfono"]}' title='Llamar' class="no-underline inline-flex items-center justify-center w-8 h-8 hover:text-[#5e507a] text-[#786698]"><i class='fa-solid fa-phone fa-lg' style='color:inherit;'></i></a>` : ''}
    ${n.Web ? (() => { try { const urlObj = new URL(n.Web); return `<a href='${n.Web}' target='_blank' rel='noopener noreferrer nofollow' title='Web' class="no-underline inline-flex items-center justify-center w-8 h-8 hover:text-[#5e507a] text-[#786698]"><i class='fa fa-globe fa-lg' style='color:inherit;'></i></a>`; } catch { return ''; } })() : ''}
    <button class="hover:text-[#5e507a] focus:outline-none bg-none border-none cursor-pointer inline-flex items-center justify-center w-8 h-8 text-[#786698]" title="Compartir" onclick='compartirNegocio(event, "${n.Id}", "${n.Nombre}")'><i class="fa-solid fa-share-nodes fa-lg" style='color:inherit;'></i></button>
  </div>
</div>
</div>
                </div>
            </div>
        `;
    });
}

/**
 * Renderiza la tabla de negocios (modo listado), ordenada por fecha descendente.
 * @param {Array} negocios - Lista de negocios a mostrar.
 */
function mostrarTabla(negocios) {
    const cont = document.getElementById('negocio-table-container');
    let html = `<div class='overflow-x-auto'><table class='min-w-full bg-white rounded-xl shadow text-sm'>
        <thead class='bg-gray-100'>
            <tr>
                <th class='px-4 py-3 text-left font-semibold text-gray-700'>Nombre</th>
                <th class='px-4 py-3 text-left font-semibold text-gray-700'>Categoría</th>
                <th class='px-4 py-3 text-left font-semibold text-gray-700'>Descripción</th>
                <th class='px-4 py-3 text-left font-semibold text-gray-700'>Ventaja</th>
                <th class='px-4 py-3 text-left font-semibold text-gray-700'>Web</th>
                <th class='px-4 py-3 text-left font-semibold text-gray-700'>Teléfono</th>
                <th class='px-4 py-3 text-left font-semibold text-gray-700'>Dirección</th>
                <th class='px-4 py-3 text-left font-semibold text-gray-700'>Horarios</th>
            </tr>
        </thead><tbody>`;
    ordenarPorFechaDesc(negocios).forEach(n => {
        const direccionTxt = `${n.Vía || ''} ${n["Número"] || ''} ${n["Código postal"] || ''} (${n.Municipio || ''})`;
        let direccionHtml = '';
        if (n.latitud && n.longitud) {
            direccionHtml = `<a href='geo:${n.latitud},${n.longitud}' style='color:#786698;text-decoration:none;display:flex;align-items:center;font-size:0.85rem;' target='_blank'><i class='fa-solid fa-location-dot mr-1'></i>${direccionTxt}</a>`;
        } else {
            direccionHtml = `<span class='flex items-center text-gray-700' style='font-size:0.85rem;'><i class='fa-solid fa-location-dot mr-1'></i>${direccionTxt}</span>`;
        }
        let webHtml = '';
        if (n.Web) {
            try {
                const urlObj = new URL(n.Web);
                webHtml = `<a href='${n.Web}' target='_blank' rel='noopener noreferrer nofollow' class='flex items-center font-medium' style='color:#786698;text-decoration:none;'><i class='fa fa-globe mr-1' style='color:#786698;'></i>${urlObj.hostname.replace('www.', '')}</a>`;
            } catch {}
        }
        let telefonoHtml = '';
        if (n["Teléfono"]) {
            telefonoHtml = `<a href='tel:${n["Teléfono"]}' class='flex items-center font-medium' style='color:#786698;text-decoration:none;font-size:0.92rem;'><i class='fa-solid fa-phone mr-1' style='color:#786698;font-size:0.95em;'></i>${n["Teléfono"]}</a>`;
        }
        html += `<tr class='border-b last:border-b-0'>
            <td class='px-4 py-2 font-semibold' style='color:#786698;'>${n.Id ? `<a href='#${n.Id}' style='color:#786698;text-decoration:none;'>${n.Nombre}</a>` : n.Nombre}</td>
            <td class='px-4 py-2'><span class='bg-[#ede7f6] text-[#786698] rounded px-2 py-0.5 text-xs flex items-center'>${getCategoriaIcon(n.Categoría)}${n.Categoría}</span></td>
            <td class='px-4 py-2'>${n.Descripción || ''}</td>
            <td class='px-4 py-2 text-green-700 text-xs'>${n["Ventaja para comunidad"] || ''}</td>
            <td class='px-4 py-2'>${webHtml}</td>
            <td class='px-4 py-2'>${telefonoHtml}</td>
            <td class='px-4 py-2'>${direccionHtml}</td>
            <td class='px-4 py-2'>${n["Horarios"] ? `<div class='negocio-horarios'><i class='fa-regular fa-clock'></i><span>${n["Horarios"]}</span></div>` : ''}</td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    cont.innerHTML = html;
}

// --- Botones de cambio de vista (tarjetas/listado) ---
document.getElementById('cardViewBtn').onclick = function() {
    this.classList.add('active');
    document.getElementById('listViewBtn').classList.remove('active');
    document.getElementById('negocio-list').style.display = '';
    document.getElementById('negocio-table-container').style.display = 'none';
};
document.getElementById('listViewBtn').onclick = function() {
    this.classList.add('active');
    document.getElementById('cardViewBtn').classList.remove('active');
    document.getElementById('negocio-list').style.display = 'none';
    document.getElementById('negocio-table-container').style.display = '';
};

// --- Navegación por hash para mostrar/enfocar negocio individual ---
function handleNegocioHash() {
    const hash = window.location.hash;
    const match = hash.match(/^#(\d+)$/);
    if (match) {
        const id = match[1];
        const negocio = negociosData.find(n => String(n.Id) === id);
        if (negocio) {
            mostrarMapa([negocio]);
            mostrarTarjetas([negocio]);
            // Forzar modo tarjeta visualmente
            document.getElementById('cardViewBtn').classList.add('active');
            document.getElementById('listViewBtn').classList.remove('active');
            document.getElementById('negocio-list').style.display = '';
            document.getElementById('negocio-table-container').style.display = 'none';
            return;
        }
    }
    // Si no hay hash válido, muestra todo
    mostrarMapa(negociosData);
    mostrarTarjetas(negociosData);
    mostrarTabla(negociosData);
    // Restaurar visualización según el último botón
    // (No se fuerza nada aquí, se mantiene el comportamiento actual)
}
window.addEventListener('hashchange', handleNegocioHash);

// --- Inicialización principal ---
cargarNegocios().then(() => {
    handleNegocioHash();
});
