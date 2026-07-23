/**
 * Tipos de la base de datos de JM Control Center.
 *
 * Escritos a mano para que coincidan con `supabase/migrations/001_schema.sql`.
 * Cuando tengas el Supabase CLI conectado, puedes regenerarlos con:
 *
 *   npx supabase gen types typescript --project-id ljhvpsyqdobcbcrhbwdd \
 *     > src/lib/database.types.ts
 *
 * Convenciones: uuid/text -> string · numeric -> number · timestamptz/date ->
 * string · jsonb -> Json · boolean -> boolean. `Insert`/`Update` son parciales
 * (los defaults y triggers rellenan el resto).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Moneda = "DOP" | "USD";

type Timestamps = { created_at: string; updated_at: string };

export interface Tables {
  brands: {
    id: string;
    nombre: string;
    activo: boolean;
    rnc: string | null;
    telefono: string | null;
    direccion: string | null;
    logo_url: string | null;
  } & Timestamps;

  clients: {
    id: string;
    nombre: string;
    apellido: string | null;
    cedula: string | null;
    factura_fiscal: boolean;
    rnc: string | null;
    telefono: string | null;
    whatsapp: string | null;
    correo: string | null;
    instagram: string | null;
    facebook: string | null;
    direccion: string | null;
    info_nota: string | null;
    categoria_servicio: "web" | "software" | "app" | "distribution" | null;
    industria: string | null;
    es_lead: boolean;
    etapa_venta:
      | "nuevo"
      | "contactado"
      | "cotizado"
      | "contrato_enviado"
      | "ganado"
      | "perdido";
    lo_que_quiere: string | null;
    fuente: string | null;
    valor_estimado: number | null;
    valor_estimado_moneda: Moneda;
    brand_id: string | null;
    created_by: string | null;
  } & Timestamps;

  users_profiles: {
    id: string;
    rol: "owner" | "colaborador" | "cliente" | "equipo";
    nombre: string | null;
    correo: string | null;
    username: string | null;
    client_id: string | null;
    team_member_id: string | null;
  } & Timestamps;

  orders: {
    id: string;
    client_id: string;
    rama: "designs" | "distribution";
    detalle_json: Json;
    total: number;
    moneda: Moneda;
    estado:
      | "borrador"
      | "confirmado"
      | "en_proceso"
      | "completado"
      | "cancelado";
    fecha: string;
    subtotal: number;
    descuento: number;
    itbis: number;
    aplica_itbis: boolean;
    industria: string | null;
    tipo_solucion: string | null;
    plan_pago: Json;
    fecha_entrega: string | null;
    brand_id: string | null;
    created_by: string | null;
  } & Timestamps;

  order_notes: {
    id: string;
    order_id: string;
    texto: string;
    created_by: string | null;
  } & Timestamps;

  order_print_items: {
    id: string;
    order_id: string;
    producto: string | null;
    categoria: string | null;
    personalizacion: string | null;
    metodo: "unidad" | "tamano" | null;
    cantidad: number;
    ancho: number | null;
    alto: number | null;
    precio_unitario: number;
    subtotal: number;
    arte_url: string | null;
    diseno_por_jm: boolean;
  } & Timestamps;

  contracts: {
    id: string;
    order_id: string | null;
    client_id: string;
    contenido: string | null;
    estado: "borrador" | "enviado" | "aprobado_firmado";
    pdf_url: string | null;
    fecha_aprobacion: string | null;
    firma_cliente: string | null;
    fecha_envio: string | null;
    snapshot_json: Json | null;
    brand_id: string | null;
    created_by: string | null;
  } & Timestamps;

  invoices: {
    id: string;
    contract_id: string | null;
    order_id: string | null;
    client_id: string;
    es_fiscal: boolean;
    ncf: string | null;
    rnc: string | null;
    items_json: Json;
    subtotal: number;
    itbis: number;
    total: number;
    moneda: Moneda;
    pdf_url: string | null;
    estado_pago: "pendiente" | "parcial" | "pagado";
    fecha: string;
    brand_id: string | null;
    created_by: string | null;
  } & Timestamps;

  projects: {
    id: string;
    client_id: string;
    order_id: string | null;
    nombre: string | null;
    tipo: string | null;
    contrato_url: string | null;
    precio_total: number;
    moneda: Moneda;
    fecha_inicio: string | null;
    fecha_entrega: string | null;
    contenido_hablado: string | null;
    estado:
      | "pendiente"
      | "en_progreso"
      | "entregado"
      | "pagado"
      | "cancelado";
    brand_id: string | null;
    created_by: string | null;
  } & Timestamps;

  project_payments: {
    id: string;
    project_id: string | null;
    invoice_id: string | null;
    monto: number;
    moneda: Moneda;
    fecha: string;
    metodo: string | null;
    created_by: string | null;
  } & Timestamps;

  project_milestones: {
    id: string;
    project_id: string;
    nombre: string | null;
    fecha: string | null;
    porcentaje: number | null;
    visible_cliente: boolean;
    completado: boolean;
    completado_en: string | null;
    orden: number;
    descripcion: string | null;
    icono: string | null;
    created_by: string | null;
  } & Timestamps;

  project_updates: {
    id: string;
    project_id: string | null;
    client_id: string;
    titulo: string;
    contenido: string | null;
    visible_cliente: boolean;
    created_by: string | null;
  } & Timestamps;

  project_files: {
    id: string;
    project_id: string | null;
    client_id: string | null;
    file_url: string | null;
    tipo: string | null;
    version: number;
    visible_cliente: boolean;
    created_by: string | null;
  } & Timestamps;

  recurring_plans: {
    id: string;
    client_id: string;
    tipo: "mantenimiento" | "hosting" | "retainer" | null;
    monto: number;
    moneda: Moneda;
    frecuencia: "mensual" | "trimestral" | "anual" | null;
    proxima_factura: string | null;
    activo: boolean;
    brand_id: string | null;
    created_by: string | null;
  } & Timestamps;

  quotes: {
    id: string;
    client_id: string | null;
    rama: "designs" | "distribution" | null;
    tipo_solucion: string | null;
    industria: string | null;
    modulos_json: Json;
    items_json: Json;
    notas: string | null;
    precio_manual: number | null;
    ai_generado: boolean;
    pdf_url: string | null;
    fecha: string;
    brand_id: string | null;
    created_by: string | null;
  } & Timestamps;

  print_products: {
    id: string;
    nombre: string;
    categoria: string | null;
    tipo_personalizacion: string | null;
    metodo_cobro: "unidad" | "tamano" | null;
    precio_base: number;
    moneda: Moneda;
    activo: boolean;
    created_by: string | null;
  } & Timestamps;

  influencers: {
    id: string;
    nombre: string;
    ig_url: string | null;
    ig_handle: string | null;
    facebook_url: string | null;
    tiene_whatsapp: boolean;
    whatsapp: string | null;
    tiene_correo: boolean;
    correo: string | null;
    tiene_manager: boolean;
    empresa: string | null;
    manager_nombre: string | null;
    empresa_whatsapp: string | null;
    empresa_correo: string | null;
    estado:
      | "nuevo"
      | "escrito"
      | "respondio"
      | "negociando"
      | "acuerdo"
      | "descartado";
    fecha_escrito: string | null;
    fecha_respondio: string | null;
    notas: string | null;
    fecha_acuerdo: string | null;
    nicho: string | null;
    plataformas: Json;
    estado_trato: "propuesto" | "acordado" | "activo" | "completado" | "no_concreto";
    doy_tipo: string | null;
    doy_desc: string | null;
    doy_valor: number | null;
    doy_moneda: Moneda;
    doy_fecha_entrega: string | null;
    promos: Json;
    brand_id: string | null;
    created_by: string | null;
  } & Timestamps;

  influencer_tasks: {
    id: string;
    influencer_id: string;
    texto: string | null;
    hecha: boolean;
    fecha_limite: string | null;
    created_by: string | null;
  } & Timestamps;

  collaborations: {
    id: string;
    influencer_id: string;
    brand_id: string | null;
    estado: "acordado" | "activo" | "completado";
    doy_tipo: string | null;
    doy_desc: string | null;
    promos: Json;
    notas: string | null;
    created_by: string | null;
  } & Timestamps;

  email_campaigns: {
    id: string;
    asunto: string | null;
    mensaje: string | null;
    destinatarios_json: Json;
    fecha: string;
    created_by: string | null;
  } & Timestamps;

  incomes: {
    id: string;
    monto: number;
    moneda: Moneda;
    fecha: string;
    categoria: string | null;
    client_id: string | null;
    project_id: string | null;
    descripcion: string | null;
    comprobante_url: string | null;
    brand_id: string | null;
    es_personal: boolean;
    /** Si viene de un pago de cliente (order_payments): ingreso automático, no editable a mano. */
    order_payment_id: string | null;
    created_by: string | null;
  } & Timestamps;

  expenses: {
    id: string;
    monto: number;
    moneda: Moneda;
    fecha: string;
    categoria: string | null;
    descripcion: string | null;
    factura_url: string | null;
    project_id: string | null;
    brand_id: string | null;
    comercio: string | null;
    itbis: number | null;
    metodo_pago: string | null;
    es_personal: boolean;
    created_by: string | null;
  } & Timestamps;

  daily_expense_log: {
    id: string;
    fecha: string;
    sin_gasto: boolean;
    nota: string | null;
    created_by: string | null;
  } & Timestamps;

  calendar_events: {
    id: string;
    titulo: string | null;
    tipo: "inicio" | "entrega" | "cobro" | "acuerdo" | "personal" | null;
    fecha: string;
    client_id: string | null;
    project_id: string | null;
    influencer_id: string | null;
    color: string | null;
    brand_id: string | null;
    auto_generado: boolean;
    completado: boolean;
    monto: number | null;
    moneda: Moneda | null;
    hora: string | null;
    meeting_url: string | null;
    ubicacion: string | null;
    descripcion: string | null;
    recordatorio_min: number | null;
    recurrence: "semanal" | "quincenal" | "mensual" | "anual" | null;
    recurrence_until: string | null;
    recurrence_parent_id: string | null;
    recurrence_skip: boolean;
    created_by: string | null;
  } & Timestamps;

  app_settings: {
    id: string;
    resumen_hora: string;
    dias_aviso_entrega: number;
    dias_aviso_cobro: number;
    modulos_ocultos: Json;
    notif_eventos_push: boolean;
    notif_eventos_email: boolean;
    notif_cobros_push: boolean;
    notif_cobros_email: boolean;
    notif_entregas_push: boolean;
    notif_entregas_email: boolean;
    notif_tareas_push: boolean;
    notif_tareas_email: boolean;
    notif_influencers_push: boolean;
    notif_influencers_email: boolean;
    notif_resumen_push: boolean;
    notif_resumen_email: boolean;
    resumen_ultimo_envio: string | null;
    updated_at: string;
  };

  personal_todos: {
    id: string;
    texto: string;
    hecho: boolean;
    created_by: string;
  } & Timestamps;

  message_templates: {
    id: string;
    tipo: "contrato" | "dm" | "whatsapp";
    nombre: string;
    contenido: string | null;
    created_by: string | null;
  } & Timestamps;

  categories: {
    id: string;
    nombre: string;
    tipo: "ingreso" | "gasto";
    es_personal: boolean;
    created_by: string | null;
  } & Timestamps;

  push_subscriptions: {
    id: string;
    user_id: string;
    subscription_json: Json;
  } & Timestamps;

  followups: {
    id: string;
    entidad: "lead" | "proyecto" | "cobro" | null;
    entidad_id: string | null;
    motivo: string | null;
    fecha_sugerida: string | null;
    atendido: boolean;
    created_by: string | null;
  } & Timestamps;

  team_members: {
    id: string;
    nombre: string;
    telefono: string | null;
    whatsapp: string | null;
    correo: string | null;
    rol_especialidad: string | null;
    notas: string | null;
    activo: boolean;
    brand_id: string | null;
    created_by: string | null;
  } & Timestamps;

  tasks: {
    id: string;
    descripcion: string;
    team_member_id: string | null;
    project_id: string | null;
    order_id: string | null;
    monto: number;
    moneda: Moneda;
    fecha_limite: string | null;
    estado: "pendiente" | "en_progreso" | "hecha";
    brand_id: string | null;
    created_by: string | null;
  } & Timestamps;

  team_payments: {
    id: string;
    team_member_id: string;
    task_id: string | null;
    monto: number;
    moneda: Moneda;
    fecha: string;
    metodo: string | null;
    nota: string | null;
    brand_id: string | null;
    created_by: string | null;
  } & Timestamps;

  catalog_items: {
    id: string;
    brand_id: string | null;
    nombre: string;
    categoria: string | null;
    precio_base: number;
    moneda: Moneda;
    unidad: string | null;
    descripcion: string | null;
    activo: boolean;
    orden: number;
    created_by: string | null;
  } & Timestamps;

  order_payments: {
    id: string;
    order_id: string;
    client_id: string;
    monto: number;
    moneda: Moneda;
    fecha: string;
    metodo: string | null;
    tipo: "inicial" | "entrega" | "abono";
    nota: string | null;
    comprobante_url: string | null;
    created_by: string | null;
  } & Timestamps;

  audit_log: {
    id: string;
    accion: string;
    tabla: string;
    registro_id: string | null;
    contenido_json: Json | null;
    usuario_id: string | null;
    fecha: string;
  };
}

type TableName = keyof Tables;

export type Database = {
  public: {
    Tables: {
      [K in TableName]: {
        Row: Tables[K];
        Insert: Partial<Tables[K]>;
        Update: Partial<Tables[K]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      worker_update_task_estado: {
        Args: { p_task: string; p_estado: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Atajos útiles: `Row<"clients">`, etc. */
export type Row<T extends TableName> = Tables[T];
export type Insert<T extends TableName> = Partial<Tables[T]>;
export type Update<T extends TableName> = Partial<Tables[T]>;
