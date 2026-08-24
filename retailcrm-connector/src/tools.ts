import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { retailcrm, RetailCrmApiError } from "./retailcrmClient.js";
import { flags, FlagName } from "./config.js";
import { formatMailingDraft, formatTriggerDraft } from "./draftTools.js";

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}

function refused(flag: FlagName) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text:
          `Действие требует флага ${flag}=true, а сейчас он выключен. ` +
          `Включите его в переменных окружения хостинга на время задачи, ` +
          `и повторите запрос — я не могу выполнить это самостоятельно.`,
      },
    ],
  };
}

/** Оборачивает запись в защиту флагом + понятную ошибку вместо падения сервера. */
function guarded<A>(flag: FlagName, fn: (args: A) => Promise<any>) {
  return async (args: A) => {
    if (!flags[flag]) return refused(flag);
    try {
      return await fn(args);
    } catch (e) {
      if (e instanceof RetailCrmApiError) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text:
                `RetailCRM отклонил запрос (HTTP ${e.status}) на ${e.path}. ` +
                `Это может значить, что метод в этой версии API называется иначе ` +
                `или недоступен для вашего тарифа. Ответ сервера: ${JSON.stringify(e.body)}. ` +
                `Расскажите об этом Claude в чате — путь метода легко поправить.`,
            },
          ],
        };
      }
      throw e;
    }
  };
}

export function registerTools(server: McpServer) {
  // ============================= ЧТЕНИЕ (без флагов) =============================

  server.tool(
    "rc_list_orders",
    "Список заказов RetailCRM с фильтрами (статус, период, клиент и т.д.) — для анализа воронки, статусов, объёмов.",
    { filter: z.record(z.any()).optional(), page: z.number().optional(), limit: z.number().optional() },
    async ({ filter, page, limit }) =>
      ok(await retailcrm.listOrders({ ...(filter ?? {}), page, limit })),
  );

  server.tool(
    "rc_get_order",
    "Полная карточка одного заказа по номеру (externalId) или внутреннему id.",
    { id: z.string(), by: z.enum(["id", "externalId"]).optional() },
    async ({ id, by }) => ok(await retailcrm.getOrder(id, by ?? "externalId")),
  );

  server.tool(
    "rc_orders_history",
    "История изменений заказов (History API) — для отслеживания того, что реально менялось и когда.",
    { sinceId: z.number().optional() },
    async ({ sinceId }) => ok(await retailcrm.ordersHistory({ sinceId })),
  );

  server.tool(
    "rc_list_customers",
    "Список клиентов с фильтрами — для анализа базы, сегментов, LTV.",
    { filter: z.record(z.any()).optional(), page: z.number().optional() },
    async ({ filter, page }) => ok(await retailcrm.listCustomers({ ...(filter ?? {}), page })),
  );

  server.tool(
    "rc_get_customer",
    "Карточка клиента (заказы, LTV, теги, лояльность) по id или externalId.",
    { id: z.string(), by: z.enum(["id", "externalId"]).optional() },
    async ({ id, by }) => ok(await retailcrm.getCustomer(id, by ?? "externalId")),
  );

  server.tool(
    "rc_list_tasks",
    "Список задач (открытых/просроченных/по менеджеру).",
    { filter: z.record(z.any()).optional() },
    async ({ filter }) => ok(await retailcrm.listTasks(filter ?? {})),
  );

  server.tool(
    "rc_list_products",
    "Каталог товаров и торговых предложений (размеры/цвета как варианты одного товара).",
    { filter: z.record(z.any()).optional(), page: z.number().optional() },
    async ({ filter, page }) => ok(await retailcrm.listProducts({ ...(filter ?? {}), page })),
  );

  server.tool(
    "rc_get_inventories",
    "Остатки товаров по складам (для проверки логики 'остаток по размеру' на сайте).",
    { filter: z.record(z.any()).optional() },
    async ({ filter }) => ok(await retailcrm.getInventories(filter ?? {})),
  );

  server.tool(
    "rc_reference",
    "Справочник RetailCRM: статусы заказов, группы статусов, типы оплат/доставки и т.п. " +
      "dictionary — код справочника, например 'statuses', 'status-groups', 'payment-types', 'delivery-types'.",
    { dictionary: z.string() },
    async ({ dictionary }) => ok(await retailcrm.reference(dictionary)),
  );

  server.tool(
    "rc_list_users",
    "Список пользователей аккаунта (для аудита, кто есть кто).",
    {},
    async () => ok(await retailcrm.listUsers()),
  );

  server.tool(
    "rc_list_user_groups",
    "Список групп пользователей и их прав — ключевой инструмент для аудита доступа.",
    {},
    async () => ok(await retailcrm.listUserGroups()),
  );

  server.tool(
    "rc_list_integration_modules",
    "Список подключённых интеграций/модулей (маркетплейсы, доставка, сайт, оплата).",
    {},
    async () => ok(await retailcrm.listIntegrationModules()),
  );

  server.tool(
    "rc_list_segments",
    "Список сегментов клиентов (только чтение — создание сегментов через API не подтверждено, см. rc_prepare_mailing_draft).",
    {},
    async () => ok(await retailcrm.listSegments()),
  );

  server.tool(
    "rc_get_loyalty_programs",
    "Текущая конфигурация программы(программ) лояльности — уровни, пороги, вознаграждения.",
    {},
    async () => ok(await retailcrm.getLoyaltyPrograms()),
  );

  // ============================= ЗАПИСЬ (за флагами) =============================

  server.tool(
    "rc_create_task",
    "[ALLOW_TASKS_AND_COMMENTS] Создать задачу, привязанную к заказу или клиенту.",
    {
      text: z.string(),
      performerId: z.number().optional(),
      orderId: z.number().optional(),
      customerId: z.number().optional(),
      datetime: z.string().optional().describe("Формат YYYY-MM-DD HH:MM:SS"),
    },
    guarded("ALLOW_TASKS_AND_COMMENTS", async (args: any) => {
      const res = await retailcrm.createTask({
        text: args.text,
        performerId: args.performerId,
        orderId: args.orderId,
        customerId: args.customerId,
        datetime: args.datetime,
      });
      return ok(res);
    }),
  );

  server.tool(
    "rc_add_order_comment",
    "[ALLOW_TASKS_AND_COMMENTS] Добавить внутренний комментарий менеджера к заказу (не меняет статус).",
    { orderId: z.string(), by: z.enum(["id", "externalId"]).optional(), comment: z.string() },
    guarded("ALLOW_TASKS_AND_COMMENTS", async (args: any) => {
      const res = await retailcrm.editOrder(
        args.orderId,
        { managerComment: args.comment },
        args.by ?? "externalId",
      );
      return ok(res);
    }),
  );

  server.tool(
    "rc_update_product_content",
    "[ALLOW_PRODUCT_CONTENT] Правка ТЕКСТОВЫХ полей товара (описание/характеристики). Цену и остатки этот инструмент никогда не трогает.",
    {
      productId: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
    },
    guarded("ALLOW_PRODUCT_CONTENT", async (args: any) => {
      const payload: Record<string, unknown> = {};
      if (args.name !== undefined) payload.name = args.name;
      if (args.description !== undefined) payload.description = args.description;
      const res = await retailcrm.editProduct(args.productId, payload);
      return ok(res);
    }),
  );

  server.tool(
    "rc_prepare_status_draft",
    "[ALLOW_DICTIONARY_DRAFTS] Создание нового статуса заказа через API не подтверждено RetailCRM " +
      "(похоже, это управляется только в интерфейсе). Инструмент готовит точные значения полей " +
      "(название, код, группа, порядок) для ручного ввода в Настройки → Заказы → Статусы.",
    { name: z.string(), group: z.string(), orderHint: z.string().optional() },
    guarded("ALLOW_DICTIONARY_DRAFTS", async (args: any) => {
      const code = args.name
        .toLowerCase()
        .replace(/[^a-zа-я0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "");
      return text(
        [
          `## Черновик статуса заказа`,
          ``,
          `Внести в RetailCRM: Настройки → Заказы → Статусы заказов → Добавить.`,
          ``,
          `**Название:** ${args.name}`,
          `**Символьный код:** ${code}`,
          `**Группа статусов:** ${args.group}`,
          args.orderHint ? `**Куда поставить по порядку:** ${args.orderHint}` : "",
          ``,
          `После создания не забудьте добавить этот статус в матрицу переходов —`,
          `иначе он не появится в выпадающем меню у менеджера.`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }),
  );

  server.tool(
    "rc_mark_order_item_return",
    "[ALLOW_RETURNS_ASSIST] Перевести конкретную позицию в конкретном заказе в статус возврата. " +
      "Только по одному явно названному заказу за раз, никогда массово.",
    {
      orderId: z.string(),
      by: z.enum(["id", "externalId"]).optional(),
      itemId: z.number(),
      returnStatusCode: z.string().describe("Код статуса товара 'Возврат', настроенный у вас в справочнике"),
    },
    guarded("ALLOW_RETURNS_ASSIST", async (args: any) => {
      const res = await retailcrm.editOrder(
        args.orderId,
        { items: [{ id: args.itemId, status: args.returnStatusCode }] },
        args.by ?? "externalId",
      );
      return ok(res);
    }),
  );

  server.tool(
    "rc_create_draft_order",
    "[ALLOW_MANUAL_ORDER_DRAFT] Создать заказ в черновом статусе (например, надиктованный по телефону). " +
      "Не уходит в автораспределение, пока вы сами не переведёте его дальше.",
    {
      firstName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      items: z.array(z.object({ productId: z.number(), quantity: z.number() })),
      status: z.string().describe("Код чернового/нового статуса"),
      customerComment: z.string().optional(),
    },
    guarded("ALLOW_MANUAL_ORDER_DRAFT", async (args: any) => {
      const res = await retailcrm.createOrder({
        firstName: args.firstName,
        phone: args.phone,
        email: args.email,
        items: args.items,
        status: args.status,
        customerComment: args.customerComment,
      });
      return ok(res);
    }),
  );

  server.tool(
    "rc_prepare_trigger_draft",
    "[ALLOW_TRIGGERS] Триггеры не управляются через API RetailCRM — инструмент готовит точный текст " +
      "(событие/условие/действие) для ручного создания в Автоматизация → Триггеры.",
    {
      name: z.string(),
      eventDescription: z.string(),
      conditionDescription: z.string(),
      actionDescription: z.string(),
    },
    guarded("ALLOW_TRIGGERS", async (args: any) => text(formatTriggerDraft(args))),
  );

  server.tool(
    "rc_prepare_mailing_draft",
    "[ALLOW_MAILINGS] Рассылки не управляются через API RetailCRM — инструмент готовит текст и параметры " +
      "для ручного создания в Маркетинг → Рассылки. Запуск на реальных клиентов остаётся вашим действием.",
    {
      channel: z.enum(["email", "sms", "whatsapp"]),
      subject: z.string().optional(),
      segmentDescription: z.string(),
      body: z.string(),
    },
    guarded("ALLOW_MAILINGS", async (args: any) => text(formatMailingDraft(args))),
  );

  server.tool(
    "rc_prepare_segment_draft",
    "[ALLOW_SEGMENTS] Создание сегмента через API не подтверждено (условия сегментов строятся деревом в " +
      "интерфейсе). Инструмент готовит точное описание условий для ручного создания в Маркетинг → Сегменты.",
    {
      name: z.string(),
      conditionsDescription: z.string().describe("Условия по-русски: 'заказы > 3 И сумма > 10000' и т.п."),
      type: z.enum(["static", "dynamic"]).default("dynamic"),
    },
    guarded("ALLOW_SEGMENTS", async (args: any) =>
      text(
        [
          `## Черновик сегмента: ${args.name}`,
          ``,
          `Внести в RetailCRM: Маркетинг → Сегменты → Создать сегмент.`,
          `Тип: ${args.type === "static" ? "статический (разовая проверка)" : "динамический (пересчёт каждые 2 часа)"}`,
          ``,
          `**Условия:** ${args.conditionsDescription}`,
        ].join("\n"),
      ),
    ),
  );

  server.tool(
    "rc_update_loyalty_level",
    "[ALLOW_LOYALTY] Попытка обновить порог/вознаграждение уровня программы лояльности через API. " +
      "Метод API не подтверждён официальной документацией — если RetailCRM отклонит запрос, вы получите " +
      "понятную ошибку и точные значения для ручного ввода вместо падения.",
    {
      levelId: z.number(),
      threshold: z.number().optional(),
      discountPercent: z.number().optional(),
      bonusPercent: z.number().optional(),
    },
    guarded("ALLOW_LOYALTY", async (args: any) => {
      const payload: Record<string, unknown> = {};
      if (args.threshold !== undefined) payload.minPriceOrders = args.threshold;
      if (args.discountPercent !== undefined) payload.privilegeSize = args.discountPercent;
      if (args.bonusPercent !== undefined) payload.privilegeSize = args.bonusPercent;
      const res = await retailcrm.editLoyaltyLevel(args.levelId, payload);
      return ok(res);
    }),
  );
}
