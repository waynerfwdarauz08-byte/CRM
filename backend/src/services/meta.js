const { AppError } = require("../middlewares/errors");
const images = require("./images");
function settings(red, { enabled = true } = {}) {
  const token = process.env.META_PAGE_ACCESS_TOKEN,
    version = process.env.META_GRAPH_VERSION,
    account =
      red === "facebook"
        ? process.env.META_PAGE_ID
        : process.env.META_INSTAGRAM_ACCOUNT_ID;
  if (enabled && process.env.SOCIAL_PUBLISH_ENABLED !== "true")
    throw new AppError(
      503,
      "La publicación está desactivada. Configurá SOCIAL_PUBLISH_ENABLED cuando tengas tus cuentas listas.",
      "REDES_DESACTIVADAS",
    );
  if (
    !token ||
    !/^v\d+\.\d+$/.test(version || "") ||
    !/^\d+$/.test(account || "")
  )
    throw new AppError(
      503,
      "Falta configurar la versión de Meta, el token de página o la cuenta de destino.",
      "REDES_SIN_CONFIGURAR",
    );
  return { token, version, account };
}
async function graph(config, path, body, fetcher = fetch) {
  let response;
  try {
    response = await fetcher(
      "https://graph.facebook.com/" + config.version + "/" + path,
      {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: "Bearer " + config.token,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(25000),
      },
    );
  } catch {
    throw new AppError(
      504,
      "Meta no confirmó el resultado. Verificá la cuenta antes de volver a publicar.",
      "REDES_INCIERTA",
    );
  }
  if (!response.ok)
    throw new AppError(
      response.status >= 500 ? 502 : response.status === 429 ? 429 : 400,
      response.status >= 500
        ? "Meta no confirmó el resultado. Revisá la cuenta de destino."
        : response.status === 429
          ? "Meta alcanzó su límite. Intentá más tarde."
          : "Meta rechazó la solicitud. Revisá permisos, cuenta y formato de imagen.",
      response.status >= 500 ? "REDES_INCIERTA" : "REDES_PROVEEDOR",
    );
  try {
    return await response.json();
  } catch {
    throw new AppError(
      502,
      "Meta no confirmó un resultado válido.",
      "REDES_INCIERTA",
    );
  }
}
async function publish(post, config, onContainer, fetcher = fetch) {
  if (post.red === "facebook") {
    const result = await graph(
      config,
      config.account + (post.imagen ? "/photos" : "/feed"),
      post.imagen
        ? {
            url: images.publicUrl(post.imagen),
            caption: post.texto,
            published: true,
          }
        : { message: post.texto },
      fetcher,
    );
    const id = result.post_id || result.id;
    if (!id)
      throw new AppError(
        502,
        "Meta no devolvió el identificador de la publicación.",
        "REDES_INCIERTA",
      );
    return { id: String(id), url: "https://www.facebook.com/" + String(id) };
  }
  let container = post.contenedorId;
  if (!container) {
    const result = await graph(
      config,
      config.account + "/media",
      { image_url: images.publicUrl(post.imagen), caption: post.texto },
      fetcher,
    );
    if (!result.id)
      throw new AppError(
        502,
        "Meta no devolvió el contenedor de Instagram.",
        "REDES_INCIERTA",
      );
    container = String(result.id);
    await onContainer(container);
  }
  const state = await graph(
    config,
    container + "?fields=status_code",
    undefined,
    fetcher,
  );
  if (state.status_code === "IN_PROGRESS") return { pending: true };
  if (state.status_code !== "FINISHED")
    throw new AppError(
      400,
      "Instagram no pudo preparar la imagen. Revisá el formato o generá otra.",
      "REDES_PROVEEDOR",
    );
  const result = await graph(
    config,
    config.account + "/media_publish",
    { creation_id: container },
    fetcher,
  );
  if (!result.id)
    throw new AppError(
      502,
      "Instagram no confirmó el identificador publicado.",
      "REDES_INCIERTA",
    );
  const id = String(result.id);
  let url = null;
  try {
    const info = await graph(
      config,
      id + "?fields=permalink",
      undefined,
      fetcher,
    );
    if (
      typeof info.permalink === "string" &&
      /^https:\/\/www\.instagram\.com\//.test(info.permalink)
    )
      url = info.permalink;
  } catch {}
  return { id, url };
}
async function reconcile(post, id, config, fetcher = fetch) {
  const data = await graph(
    config,
    id +
      (post.red === "facebook"
        ? "?fields=id,from,message,permalink_url"
        : "?fields=id,owner,caption,permalink"),
    undefined,
    fetcher,
  );
  const owner = post.red === "facebook" ? data.from?.id : data.owner?.id;
  const text = post.red === "facebook" ? data.message : data.caption;
  if (String(owner) !== config.account || text !== post.texto)
    throw new AppError(
      409,
      "La publicación no coincide con la cuenta y el texto aprobados.",
    );
  const link = post.red === "facebook" ? data.permalink_url : data.permalink;
  return {
    id: String(data.id),
    url:
      typeof link === "string" &&
      /^https:\/\/(www\.)?(facebook|instagram)\.com\//.test(link)
        ? link
        : null,
  };
}
module.exports = { settings, graph, publish, reconcile };
