# Configurar imágenes y redes

Los módulos están conectados al backend y a MySQL. Una integración implementada no equivale a una cuenta externa ya conectada: no hay credenciales de imágenes o Meta en esta entrega.

## Imágenes

Obtené una API de imágenes compatible con POST /images/generations y elegí un modelo habilitado en esa cuenta. Groq se conserva para textos.

En backend/.env:

```env
IMAGE_API_KEY=
IMAGE_BASE_URL=
IMAGE_MODEL=
IMAGE_RESPONSE_FORMAT=
```

IMAGE_BASE_URL es la base anterior a /images/generations. La respuesta debe tener data[0].b64_json. Algunos modelos devuelven base64 por defecto; otros requieren IMAGE_RESPONSE_FORMAT=b64_json. El modelo y los tamaños deben ser compatibles con el proveedor elegido.

No se usan datos personales. El proveedor recibe la descripción escrita por el usuario y la solicitud de una sola imagen. El servidor valida un máximo aproximado de 16 MB de respuesta y 20 millones de píxeles, normaliza el archivo a JPEG y no conserva metadatos EXIF. Los errores se muestran en la galería y se pueden reintentar. Una interrupción al reiniciar queda marcada como error.

Los archivos quedan en backend/uploads y los metadatos en MySQL. Deben respaldarse juntos. Los formatos solicitados son cuadrado, horizontal o vertical; para proporciones fuera de 0,8–1,91 se agregan márgenes blancos al archivo final destinado a redes.

## Facebook e Instagram

Se implementó Meta Graph API con Facebook Login:

- Facebook: publicación de texto o imagen en una Página, no un perfil personal.
- Instagram: cuenta profesional vinculada a la Página; publicación de una imagen JPEG con pie de foto.
- No se crean campañas de anuncios ni se gastan presupuestos publicitarios.

Configurá en backend/.env:

```env
SOCIAL_PUBLISH_ENABLED=false
META_GRAPH_VERSION=
META_PAGE_ID=
META_INSTAGRAM_ACCOUNT_ID=
META_PAGE_ACCESS_TOKEN=
MEDIA_PUBLIC_BASE_URL=
```

Usá una versión de Graph API compatible con tu aplicación y un token de Página autorizado. La Página necesita permisos de publicación como pages_manage_posts; Instagram con Facebook Login necesita los permisos de contenido correspondientes, incluida instagram_content_publish. La disponibilidad, revisión de la aplicación y permisos exactos dependen de la cuenta y del producto de Meta.

Seguí los flujos oficiales de Meta para obtener y renovar el token. No ingreses tokens en el chat, formularios del frontend ni el repositorio. Reiniciá la API después de modificar .env.

MEDIA_PUBLIC_BASE_URL debe servir públicamente por HTTPS los archivos generados de backend/uploads, con sus mismos nombres. Poner una URL arbitraria no sube los archivos: necesitás un servidor de medios o un proxy que exponga solamente /archivos. No expongas toda la API sin autenticación. Instagram no puede descargar imágenes desde localhost. No se implementó un cargador a un CDN concreto.

Cuando las cuentas estén preparadas, cambiá SOCIAL_PUBLISH_ENABLED=true y reiniciá. En Publicaciones, “Verificar conexión con Meta” consulta las cuentas sin publicar. Que una variable esté configurada no demuestra que el token sea válido; la interfaz diferencia ambos estados.

## Aprobación y control de duplicados

1. Crear la campaña y revisar sus textos.
2. Aprobar la campaña.
3. Crear un borrador para una red, con texto e imagen cuando corresponda.
4. Revisar la cuenta de destino y aprobar esa revisión.
5. Confirmar el envío real desde el diálogo de publicación.

El backend comprueba revisión y cuenta. Editar invalida la aprobación. Dos envíos simultáneos del mismo borrador no generan dos solicitudes externas.

Si Instagram todavía procesa la imagen, se conserva el contenedor y el botón permite continuar ese mismo intento. Si el resultado es incierto, se impide repetir: revisá la cuenta y conciliá el ID publicado. Se verifican cuenta y texto en Meta antes de registrarlo como publicado. Si no se puede confirmar, el registro sigue incierto; no hay un botón de reenvío ciego.

El historial conserva creación, edición, aprobación, solicitud de envío y resultado. Reiniciar durante un envío marca incierta la operación. Esta aplicación asume una única instancia local; una instalación distribuida requiere un sistema de trabajos y coordinación entre instancias.

## Verificaciones pendientes

No se conectaron cuentas reales de Meta ni un proveedor real de imágenes. Se probó el flujo completo con proveedores simulados y persistencia real. No se hicieron publicaciones externas.

Documentación oficial:

- https://developers.facebook.com/docs/pages-api/posts/
- https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/content-publishing/
- https://developers.openai.com/api/reference/resources/images/methods/generate
