// compartir.js - Lógica para compartir negocios con Web Share API o fallback

function compartirNegocio(event, id, nombre) {
    event.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    if (navigator.share) {
        navigator.share({
            title: nombre,
            text: nombre,
            url: url
        }).catch(() => {});
    } else {
        // Fallback: copiar al portapapeles
        copiarAlPortapapeles(`${nombre}\n${url}`);
        alert('Enlace copiado al portapapeles');
    }
}

function copiarAlPortapapeles(texto) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texto);
    } else {
        // Fallback manual
        const tempInput = document.createElement('input');
        tempInput.value = texto;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
    }
}

// Export global para inline onclick
window.compartirNegocio = compartirNegocio;
