import { useState } from "react";
import { Link } from "react-router-dom";
import { Resource, useResource, Notice } from "../components/Resource";
import {
  Heading,
  AsyncForm,
  Pager,
  useAllPages,
} from "../components/OperationsUI";
import Modal from "../components/Modal";
import { api, query, assetUrl, date } from "../services/api";
function PostForm({ initial, campaigns, images, onSaved }) {
  const [form, f] = useState({
    campaniaId: String(initial?.campaniaId || ""),
    red: initial?.red || "facebook",
    imagenId: String(initial?.imagenId || ""),
    texto: initial?.texto || "",
  });
  const selected = campaigns.find((c) => String(c.id) === form.campaniaId);
  return (
    <AsyncForm
      label={
        initial ? "Guardar y solicitar nueva aprobación" : "Guardar borrador"
      }
      submit={() =>
        api("/publicaciones" + (initial ? "/" + initial.id : ""), {
          method: initial ? "PATCH" : "POST",
          body: {
            ...form,
            campaniaId: Number(form.campaniaId),
            imagenId: form.imagenId ? Number(form.imagenId) : null,
            ...(initial ? { revision: initial.revision } : {}),
          },
        })
      }
      onSuccess={onSaved}
    >
      <label>
        Campaña
        <select
          required
          value={form.campaniaId}
          onChange={(e) => {
            const c = campaigns.find((c) => String(c.id) === e.target.value);
            f({
              ...form,
              campaniaId: e.target.value,
              texto: c?.textos[0] || "",
              imagenId: "",
            });
          }}
        >
          <option value="">Seleccionar campaña</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.id} · {c.objetivo}
            </option>
          ))}
        </select>
      </label>
      <label>
        Red
        <select
          value={form.red}
          onChange={(e) => f({ ...form, red: e.target.value })}
        >
          <option value="facebook">Facebook (Página)</option>
          <option value="instagram">Instagram (cuenta profesional)</option>
        </select>
      </label>
      {selected && (
        <label>
          Usar propuesta generada
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value !== "")
                f({ ...form, texto: selected.textos[Number(e.target.value)] });
            }}
          >
            <option value="">Seleccionar propuesta</option>
            {selected.textos.map((_, i) => (
              <option key={i} value={i}>
                Propuesta {i + 1}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Texto a publicar
        <textarea
          required
          rows="6"
          maxLength="2200"
          value={form.texto}
          onChange={(e) => f({ ...form, texto: e.target.value })}
        />
      </label>
      <label>
        Imagen {form.red === "instagram" ? "obligatoria" : "opcional"}
        <select
          required={form.red === "instagram"}
          value={form.imagenId}
          onChange={(e) => f({ ...form, imagenId: e.target.value })}
        >
          <option value="">Sin imagen</option>
          {images
            .filter(
              (i) =>
                i.estado === "lista" &&
                (!i.campaniaId || String(i.campaniaId) === form.campaniaId),
            )
            .map((i) => (
              <option key={i.id} value={i.id}>
                #{i.id} · {i.prompt.slice(0, 80)}
              </option>
            ))}
        </select>
      </label>
      <p className="hint">
        Guardar un borrador no publica nada. Editar invalida la aprobación
        anterior.
      </p>
    </AsyncForm>
  );
}
function History({ post }) {
  const r = useResource("/publicaciones/" + post.id + "/historial");
  return (
    <Resource resource={r}>
      {r.data?.map((h) => (
        <article className="message" key={h.id}>
          <strong>{h.tipo}</strong>
          <small>{date(h.fecha)}</small>
          <p>{h.detalle}</p>
        </article>
      ))}
    </Resource>
  );
}
export default function Publications() {
  const [version, v] = useState(0),
    [page, p] = useState(1),
    [filters, f] = useState({}),
    [editing, e] = useState(null),
    [action, a] = useState(null),
    [notice, n] = useState(""),
    [externalId, x] = useState(""),
    [verified, vs] = useState(null);
  const r = useResource(
      "/publicaciones" + query({ ...filters, page }),
      version,
    ),
    config = useResource("/integraciones", version),
    campaigns = useAllPages("/campanias", version),
    images = useAllPages("/imagenes", version);
  const changed = () => {
    v((i) => i + 1);
    e(null);
    a(null);
    n("Publicación actualizada.");
  };
  return (
    <>
      <Heading
        title="Publicación en redes"
        description="Borradores revisables, aprobación del contenido y confirmación del envío a Facebook o Instagram."
      >
        <button onClick={() => e({})}>Nuevo borrador</button>
      </Heading>
      <Notice>{notice}</Notice>
      <section className="panel">
        <Resource resource={config}>
          <div className="integrations-grid">
            {["facebook", "instagram"].map((red) => (
              <article key={red}>
                <h2>{red === "facebook" ? "Facebook" : "Instagram"}</h2>
                <p>
                  {config.data?.[red].configurada
                    ? "Configuración local presente · Cuenta " +
                      config.data[red].cuenta
                    : config.data?.[red].mensaje}
                </p>
                {verified?.[red] && (
                  <p className={verified[red].conectada ? "notice" : "error"}>
                    {verified[red].conectada
                      ? "Conexión verificada: " + verified[red].nombre
                      : verified[red].mensaje}
                  </p>
                )}
              </article>
            ))}
          </div>
          <AsyncForm
            label="Verificar conexión con Meta"
            submit={() =>
              api("/integraciones/verificar", { method: "POST", body: {} })
            }
            onSuccess={(r) => vs(r.data)}
          />
          <p className="hint">
            Necesitás token de Página y cuentas autorizadas. Instagram requiere
            una imagen y una URL HTTPS pública accesible por Meta.{" "}
            <Link to="/imagenes">Ir a imágenes</Link>. Los secretos se
            configuran únicamente en el backend.
          </p>
        </Resource>
      </section>
      <section className="panel">
        <div className="filters">
          <label>
            Red
            <select
              value={filters.red || ""}
              onChange={(ev) => {
                f({ ...filters, red: ev.target.value });
                p(1);
              }}
            >
              <option value="">Todas</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>
          </label>
          <label>
            Estado
            <select
              value={filters.estado || ""}
              onChange={(ev) => {
                f({ ...filters, estado: ev.target.value });
                p(1);
              }}
            >
              <option value="">Todos</option>
              {[
                "borrador",
                "aprobada",
                "procesando",
                "publicada",
                "error",
                "incierta",
                "publicando",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <Resource resource={r}>
          {!r.data?.length && <p className="empty">No hay publicaciones.</p>}
          {r.data?.map((post) => (
            <article className="publication-card" key={post.id}>
              <div className="panel-head">
                <h2>
                  #{post.id} · {post.red}
                </h2>
                <span
                  className={
                    "badge " +
                    (post.estado === "publicada" ? "green" : "purple")
                  }
                >
                  {post.estado} · revisión {post.revision}
                </span>
              </div>
              <p className="hint">
                Campaña #{post.campaniaId} · {post.campania.objetivo}
              </p>
              {post.imagen?.archivo && (
                <img
                  className="publication-image"
                  src={assetUrl("/archivos/" + post.imagen.archivo)}
                  alt={post.imagen.prompt}
                />
              )}
              <p className="pre">{post.texto}</p>
              {post.cuentaDestino && (
                <p>Cuenta aprobada: {post.cuentaDestino}</p>
              )}
              {post.error && (
                <p className="error" role="alert">
                  {post.error}
                </p>
              )}
              <div className="inline-actions">
                {["borrador", "aprobada", "error"].includes(post.estado) && (
                  <button className="secondary" onClick={() => e(post)}>
                    Editar
                  </button>
                )}
                {["borrador", "error"].includes(post.estado) && (
                  <button onClick={() => a({ type: "aprobar", post })}>
                    Revisar y aprobar
                  </button>
                )}
                {["aprobada", "procesando"].includes(post.estado) && (
                  <button onClick={() => a({ type: "publicar", post })}>
                    {post.estado === "procesando"
                      ? "Finalizar publicación"
                      : "Publicar en " + post.red}
                  </button>
                )}
                {post.estado === "incierta" && (
                  <button
                    className="secondary"
                    onClick={() => {
                      x("");
                      a({ type: "conciliar", post });
                    }}
                  >
                    Conciliar publicación
                  </button>
                )}
                {post.url && (
                  <a
                    className="button secondary"
                    target="_blank"
                    rel="noreferrer"
                    href={post.url}
                  >
                    Ver publicación
                  </a>
                )}
                <button
                  className="secondary"
                  onClick={() => a({ type: "historial", post })}
                >
                  Historial
                </button>
              </div>
            </article>
          ))}
          <Pager meta={r.meta} page={page} onChange={p} />
        </Resource>
      </section>
      {editing && (
        <Modal
          title={editing.id ? "Editar borrador" : "Nuevo borrador"}
          onClose={() => e(null)}
        >
          <Resource resource={campaigns}>
            <Resource resource={images}>
              {!campaigns.data.length ? (
                <p>
                  Primero <Link to="/campanias">creá una campaña</Link>.
                </p>
              ) : (
                <PostForm
                  initial={editing.id ? editing : null}
                  campaigns={campaigns.data}
                  images={images.data}
                  onSaved={changed}
                />
              )}
            </Resource>
          </Resource>
        </Modal>
      )}
      {action && (
        <Modal
          title={
            action.type === "historial"
              ? "Historial de publicación"
              : action.type === "conciliar"
                ? "Verificar resultado incierto"
                : action.type === "aprobar"
                  ? "Revisar y aprobar contenido"
                  : "Confirmar publicación real"
          }
          onClose={() => a(null)}
        >
          {action.type === "historial" ? (
            <History post={action.post} />
          ) : (
            <AsyncForm
              label={
                action.type === "aprobar"
                  ? "Aprobar esta revisión"
                  : action.type === "conciliar"
                    ? "Verificar ID en Meta"
                    : "Confirmar publicación en " + action.post.red
              }
              submit={() =>
                api("/publicaciones/" + action.post.id + "/" + action.type, {
                  method: "POST",
                  body:
                    action.type === "conciliar"
                      ? { externoId: externalId }
                      : {
                          revision: action.post.revision,
                          ...(action.type === "aprobar"
                            ? {
                                cuentaDestino:
                                  config.data?.[action.post.red].cuenta || "",
                              }
                            : {}),
                        },
                })
              }
              onSuccess={changed}
            >
              <p>
                <strong>Red:</strong> {action.post.red}
              </p>
              <p>
                <strong>Cuenta:</strong>{" "}
                {action.type === "aprobar"
                  ? config.data?.[action.post.red].cuenta ||
                    "Pendiente de configurar"
                  : action.post.cuentaDestino}
              </p>
              <p className="pre">{action.post.texto}</p>
              {action.post.imagen?.archivo && (
                <img
                  className="publication-image"
                  alt={action.post.imagen.prompt}
                  src={assetUrl("/archivos/" + action.post.imagen.archivo)}
                />
              )}
              {action.type === "conciliar" ? (
                <>
                  <p>
                    Revisá la cuenta. Si la pieza ya se publicó, indicá su ID.
                    No se volverá a enviar automáticamente.
                  </p>
                  <label>
                    ID de publicación en Meta
                    <input
                      required
                      pattern="[0-9]+(_[0-9]+)?"
                      maxLength="200"
                      value={externalId}
                      onChange={(e) => x(e.target.value)}
                    />
                  </label>
                </>
              ) : action.type === "aprobar" ? (
                <p>
                  Aprobás el texto y la imagen de esta revisión para la cuenta
                  indicada. La campaña también debe estar aprobada.
                </p>
              ) : (
                <p className="notice">
                  Esta acción enviará el contenido aprobado a la cuenta real.
                  Confirmá que el texto y la imagen son correctos.
                </p>
              )}
            </AsyncForm>
          )}
        </Modal>
      )}
    </>
  );
}
