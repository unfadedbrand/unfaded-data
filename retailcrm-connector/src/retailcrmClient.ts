import { config } from "./config.js";

export class RetailCrmApiError extends Error {
  constructor(
    public status: number,
    public path: string,
    public body: unknown
  ) {
    super(`RetailCRM API ${status} на ${path}: ${JSON.stringify(body)}`);
  }
}

type Query = Record<string, string | number | boolean | undefined>;

function buildQuery(params: Query = {}): string {
  const usp = new URLSearchParams();
  usp.set("apiKey", config.retailcrmApiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) usp.set(k, String(v));
  }
  return usp.toString();
}

async function request(
  method: "GET" | "POST",
  path: string,
  query: Query = {},
  form?: Record<string, string>
): Promise<any> {
  const url = `${config.retailcrmUrl}${path}?${buildQuery(query)}`;
  const init: RequestInit = { method };
  if (form) {
    const body = new URLSearchParams(form);
    init.body = body;
    init.headers = { "Content-Type": "application/x-www-form-urlencoded" };
  }
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new RetailCrmApiError(res.status, path, json);
  }
  return json;
}

/**
 * Тонкая обёртка над REST API v5 RetailCRM. Пути ниже — те, что
 * подтверждены официальной документацией и официальным PHP-клиентом
 * (orders, customers, tasks, store/products, store/inventories, reference,
 * integration-modules). Пути, помеченные BEST-EFFORT, не были подтверждены
 * вживую (нет доступа к рабочему аккаунту на момент написания) — если такой
 * метод вернёт 404/400, сервер вернёт понятную ошибку, и путь нужно будет
 * поправить вместе с Claude по факту первого реального ответа API.
 */
export const retailcrm = {
  // ---- Заказы (подтверждено) ----
  listOrders: (query: Query = {}) => request("GET", "/api/v5/orders", query),
  getOrder: (idOrExternalId: string, by: "id" | "externalId" = "externalId") =>
    request("GET", `/api/v5/orders/${idOrExternalId}`, { by }),
  ordersHistory: (query: Query = {}) => request("GET", "/api/v5/orders/history", query),
  createOrder: (order: Record<string, unknown>, site?: string) =>
    request("POST", "/api/v5/orders/create", {}, {
      order: JSON.stringify(order),
      ...(site ? { site } : {}),
    }),
  editOrder: (idOrExternalId: string, order: Record<string, unknown>, by: "id" | "externalId" = "externalId") =>
    request("POST", `/api/v5/orders/${idOrExternalId}/edit`, { by }, {
      order: JSON.stringify(order),
    }),

  // ---- Клиенты (подтверждено) ----
  listCustomers: (query: Query = {}) => request("GET", "/api/v5/customers", query),
  getCustomer: (idOrExternalId: string, by: "id" | "externalId" = "externalId") =>
    request("GET", `/api/v5/customers/${idOrExternalId}`, { by }),

  // ---- Задачи (подтверждено) ----
  listTasks: (query: Query = {}) => request("GET", "/api/v5/tasks", query),
  createTask: (task: Record<string, unknown>) =>
    request("POST", "/api/v5/tasks/create", {}, { task: JSON.stringify(task) }),

  // ---- Товары и склад (подтверждено на уровне механики, пути — стандартные v5) ----
  listProducts: (query: Query = {}) => request("GET", "/api/v5/store/products", query),
  getInventories: (query: Query = {}) => request("GET", "/api/v5/store/inventories", query),
  editProduct: (id: number, product: Record<string, unknown>) =>
    request("POST", `/api/v5/store/products/${id}/edit`, {}, {
      product: JSON.stringify(product),
    }),

  // ---- Справочники (подтверждено, что существуют — конкретные под-пути сверяются по факту) ----
  reference: (dictionary: string, query: Query = {}) =>
    request("GET", `/api/v5/reference/${dictionary}`, query),

  // ---- Пользователи и группы (подтверждено, что раздел есть) ----
  listUsers: (query: Query = {}) => request("GET", "/api/v5/users", query),
  listUserGroups: (query: Query = {}) => request("GET", "/api/v5/user-groups", query),

  // ---- Интеграции/модули (подтверждено) ----
  listIntegrationModules: (query: Query = {}) => request("GET", "/api/v5/integration-modules", query),

  // ---- Расходы/финансы, только чтение (подтверждено, что раздел есть) ----
  listCosts: (query: Query = {}) => request("GET", "/api/v5/orders/payments", query), // best-effort: скорректируем по факту

  // ---- BEST-EFFORT: сегменты клиентов (модель есть в API, write-метод не подтверждён) ----
  listSegments: (query: Query = {}) => request("GET", "/api/v5/customers/segments", query),

  // ---- BEST-EFFORT: программа лояльности (модель есть в API, write-метод не подтверждён) ----
  getLoyaltyPrograms: (query: Query = {}) => request("GET", "/api/v5/loyalty/loyalty-programs", query),
  editLoyaltyLevel: (levelId: number, level: Record<string, unknown>) =>
    request("POST", `/api/v5/loyalty/levels/${levelId}/edit`, {}, {
      level: JSON.stringify(level),
    }),
};
