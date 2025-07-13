// Definición de categorías y sus iconos FontAwesome
// Puedes modificar, añadir o quitar categorías fácilmente aquí

window.categorias = [
  {
    nombre: 'Alimentacion',
    icono: "<i class='fa-solid fa-apple-whole mr-1'></i>"
  },
  {
    nombre: 'Artesania y produccion local',
    icono: "<i class='fa-solid fa-paint-brush mr-1'></i>"
  },
  {
    nombre: 'Tiendas y comercio',
    icono: "<i class='fa-solid fa-store mr-1'></i>"
  },
  {
    nombre: 'Mascotas',
    icono: "<i class='fa-solid fa-paw mr-1'></i>"
  },
  {
    nombre: 'Restauración/cafetería',
    icono: "<i class='fa-solid fa-mug-hot mr-1'></i>"
  },
  {
    nombre: 'Salud y bienestar',
    icono: "<i class='fa-solid fa-heart-pulse mr-1'></i>"
  },
  {
    nombre: 'Servicios para el hogar y reparaciones',
    icono: "<i class='fa-solid fa-screwdriver-wrench mr-1'></i>"
  },
  {
    nombre: 'Servicios profesionales y formacion',
    icono: "<i class='fa-solid fa-user-graduate mr-1'></i>"
  },
  {
    nombre: 'Ocio, cultura y eventos',
    icono: "<i class='fa-solid fa-masks-theater mr-1'></i>"
  },
  {
    nombre: 'Otros',
    icono: "<i class='fa-solid fa-ellipsis mr-1'></i>"
  }
];

window.getCategoriaIcon = function(categoria) {
  const cat = window.categorias.find(c => c.nombre.toLowerCase() === (categoria || '').toLowerCase());
  return cat ? cat.icono : "<i class='fa-solid fa-tag mr-1'></i>";
};
