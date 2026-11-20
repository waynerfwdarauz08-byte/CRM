# Modelo de datos

```mermaid
erDiagram
    Sede ||--o{ Prospecto : sede
    Etapa ||--o{ Prospecto : etapa_actual
    Campania o|--o{ Prospecto : atribucion_manual
    Prospecto ||--|{ HistorialEtapa : recorrido
    Etapa o|--o{ HistorialEtapa : origen
    Etapa ||--o{ HistorialEtapa : destino
    Prospecto ||--o{ HistorialEstado : decisiones
    Prospecto ||--o{ MensajeIA : borradores
    Etapa ||--o{ MensajeIA : contexto
    Sede ||--o{ Evento : agenda
    Prospecto o|--o{ Evento : participante
    Evento ||--o| Entrevista : cita
    Prospecto ||--o{ Entrevista : entrevistas
    Sede ||--o{ Campania : contexto
    Campania ||--o{ Gasto : ejecucion
    Campania o|--o{ Imagen : creatividad
    Campania ||--o{ Publicacion : piezas
    Imagen o|--o{ Publicacion : visual
    Publicacion ||--|{ PublicacionEvento : auditoria
    Sede {
        int id PK
        string nombre UK
    }
    Etapa {
        int id PK
        string nombre
        int orden UK
        decimal metaConversion "nullable final"
    }
    Prospecto {
        int id PK
        string nombre
        string correo "opcional"
        string telefono "opcional"
        int sedeId FK
        int etapaActualId FK
        int campaniaOrigenId FK "opcional"
        string estadoProceso "activo espera excluido"
        string canalOrigen
        text observaciones
        datetime fechaIngreso
        datetime fechaUltimoAvance
    }
    HistorialEtapa {
        int id PK
        int prospectoId FK
        int etapaOrigenId FK "nullable inicial"
        int etapaDestinoId FK
        datetime fechaCambio
        string comentario
    }
    HistorialEstado {
        int id PK
        int prospectoId FK
        string estadoAnterior
        string estadoNuevo
        string motivo
        datetime fechaCambio
    }
    MensajeIA {
        int id PK
        int prospectoId FK
        int etapaId FK
        text contenido
        string proveedor
        string modelo
        string estado "borrador"
        datetime fechaGeneracion
    }
    Evento {
        int id PK
        int sedeId FK
        int prospectoId FK "opcional"
        string titulo
        string tipo
        datetime inicio
        datetime fin
        string responsable
        string lugar
        string estado
        text notas
    }
    Entrevista {
        int id PK
        int eventoId FK,UK
        int prospectoId FK
        string estado
        string resultado
        text notas
    }
    Campania {
        int id PK
        int sedeId FK
        string objetivo
        json textos "exactamente tres"
        string estado
        decimal presupuesto
        string moneda "CRC USD"
        string proveedor
        string modelo
    }
    Gasto {
        int id PK
        int campaniaId FK
        string concepto
        decimal monto
        date fecha
        boolean anulado
        string motivoAnulacion
    }
    Imagen {
        int id PK
        int campaniaId FK "opcional"
        string prompt
        string modelo
        string tamano
        string estado
        string archivo
        string error
    }
    Publicacion {
        int id PK
        int campaniaId FK
        int imagenId FK "opcional"
        string red
        string texto
        string estado
        int revision
        int revisionAprobada
        string cuentaDestino
        datetime fechaAprobacion
        datetime fechaPublicacion
        string externoId
        string contenedorId
        string url
        string error
    }
    PublicacionEvento {
        int id PK
        int publicacionId FK
        string tipo
        string detalle
        datetime fecha
    }
```

Las entidades de negocio, salvo los historiales inmutables, incluyen createdAt y updatedAt. Los historiales usan su fecha de evento. Claves foráneas RESTRICT en eliminación y CASCADE en actualización. No se elimina información histórica desde la API.

Índices: orden único de etapas; sede/canal/ingreso; etapa actual/último avance; estado/sede; historial único persona/etapa destino; sede/responsable/horario; persona/estado de entrevista; campaña/fecha/anulación de gasto; estado/creación de publicaciones.

Campania.textos es JSON de tres textos sin ciclo de vida independiente. Publicacion sí tiene entidad propia porque requiere revisión, aprobación, envío y auditoría por cada pieza.

El bloqueo de fila de Prospecto protege avances y estados. La fila Sede serializa reservas para detectar superposiciones; Campania serializa cambios de presupuesto y gastos; Publicacion serializa aprobaciones, revisiones e intentos de envío. La transacción de publicación se libera antes de llamar a Meta, manteniendo el estado publicando para bloquear otro envío.
