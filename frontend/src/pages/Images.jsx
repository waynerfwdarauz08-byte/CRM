import { useState } from "react";
import { Resource, useResource, Notice } from "../components/Resource";
import {
  Heading,
  AsyncForm,
  Pager,
  useAllPages,
} from "../components/OperationsUI";
import { api, query, assetUrl, date } from "../services/api";
export default function Images() {
  const [version, v] = useState(0),
    [page, p] = useState(1),
    [prompt, s] = useState(""),
    [campaign, c] = useState(""),
    [size, t] = useState("1024x1024"),
    [notice, n] = useState("");
  const r = useResource("/imagenes" + query({ page, limit: 12 }), version),
    config = useResource("/integraciones"),
    campaigns = useAllPages("/campanias");
  const changed = () => {
    v((x) => x + 1);
    n("Imagen guardada. Revisala antes de usarla.");
  };
  return (
    <>
      <Heading
        title="Imágenes con IA"
        description="Generación bajo demanda, galería persistente y revisión humana antes de publicar."
      />
      <Notice>{notice}</Notice>
      <div className="detail-grid">
        <section className="panel">
          <h2>Crear una imagen</h2>
          <Resource resource={config}>
            {config.data && !config.data.imagenes.configurada && (
              <p className="notice">
                {config.data.imagenes.mensaje} Groq continúa generando los
                textos. No se simularán imágenes.
              </p>
            )}
            <Resource resource={campaigns}>
              <AsyncForm
                disabled={!config.data?.imagenes.configurada}
                label="Generar imagen"
                submit={() =>
                  api("/imagenes", {
                    method: "POST",
                    body: {
                      prompt,
                      campaniaId: campaign ? Number(campaign) : null,
                      tamano: size,
                    },
                  })
                }
                onSuccess={changed}
              >
                <label>
                  Descripción de la imagen
                  <textarea
                    required
                    rows="5"
                    maxLength="3000"
                    value={prompt}
                    onChange={(e) => s(e.target.value)}
                    placeholder="Un aula luminosa con materiales de aprendizaje, ilustración moderna en azul y morado, sin texto ni logotipos."
                  />
                </label>
                <label>
                  Campaña opcional
                  <select value={campaign} onChange={(e) => c(e.target.value)}>
                    <option value="">Sin campaña</option>
                    {campaigns.data.map((x) => (
                      <option key={x.id} value={x.id}>
                        #{x.id} · {x.objetivo}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Formato solicitado
                  <select value={size} onChange={(e) => t(e.target.value)}>
                    <option value="1024x1024">Cuadrado</option>
                    <option value="1536x1024">Horizontal</option>
                    <option value="1024x1536">Vertical</option>
                  </select>
                </label>
                <p className="hint">
                  Puede consumir créditos del proveedor de imágenes. La salida
                  se guarda como JPEG, sin metadatos. No ingréses datos
                  personales.
                </p>
              </AsyncForm>
            </Resource>
          </Resource>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Galería</h2>
            <button
              className="secondary"
              onClick={() => {
                r.retry();
                config.retry();
              }}
            >
              Actualizar
            </button>
          </div>
          <Resource resource={r}>
            {!r.data?.length && (
              <p className="empty">
                No hay imágenes. Configurá el proveedor para empezar.
              </p>
            )}
            <div className="image-gallery">
              {r.data?.map((x) => (
                <article className="image-card" key={x.id}>
                  {x.url && (
                    <a href={assetUrl(x.url)} target="_blank" rel="noreferrer">
                      <img
                        src={assetUrl(x.url)}
                        alt={x.prompt}
                        loading="lazy"
                      />
                    </a>
                  )}
                  <div>
                    <span className="badge">{x.estado}</span>
                    <p>{x.prompt}</p>
                    <small>
                      {date(x.createdAt)} · {x.modelo}
                    </small>
                    {x.error && (
                      <p role="alert" className="error">
                        {x.error}
                      </p>
                    )}
                    {x.estado === "error" && (
                      <AsyncForm
                        disabled={!config.data?.imagenes.configurada}
                        label="Reintentar generación"
                        submit={() =>
                          api("/imagenes/" + x.id + "/reintentar", {
                            method: "POST",
                            body: {},
                          })
                        }
                        onSuccess={changed}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
            <Pager page={page} meta={r.meta} onChange={p} />
          </Resource>
        </section>
      </div>
    </>
  );
}
