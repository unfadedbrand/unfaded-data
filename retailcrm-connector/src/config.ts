/**
 * Вся конфигурация коннектора — через переменные окружения хостинга.
 * Ничего секретного в коде не хранится и не логируется.
 */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Не задана обязательная переменная окружения ${name}. Установите её в панели хостинга и перезапустите сервис.`
    );
  }
  return v;
}

function boolEnv(name: string): boolean {
  return (process.env[name] ?? "").trim().toLowerCase() === "true";
}

export const config = {
  // Базовый URL вашего аккаунта RetailCRM, например https://unfaded.retailcrm.ru
  retailcrmUrl: requireEnv("RETAILCRM_URL").replace(/\/+$/, ""),
  // API-ключ технического пользователя с ограниченными правами (см. README).
  retailcrmApiKey: requireEnv("RETAILCRM_API_KEY"),
  // Секретный токен, который вы сами придумываете. Используется как часть URL
  // подключения ("замок" коннектора) — без него сервер не отвечает.
  connectorToken: requireEnv("CONNECTOR_TOKEN"),
  // Порт, который выдаёт хостинг (Render/Railway подставляют сами).
  port: Number(process.env.PORT ?? 3000),
};

/**
 * Флаги точечных прав на запись. По умолчанию ВСЕ выключены (false).
 * Включаются/выключаются в панели хостинга, без изменения кода и без
 * участия Claude — см. README, раздел "Как включать/выключать флаги".
 */
export const flags = {
  ALLOW_TASKS_AND_COMMENTS: boolEnv("ALLOW_TASKS_AND_COMMENTS"),
  ALLOW_PRODUCT_CONTENT: boolEnv("ALLOW_PRODUCT_CONTENT"),
  ALLOW_DICTIONARY_DRAFTS: boolEnv("ALLOW_DICTIONARY_DRAFTS"),
  ALLOW_RETURNS_ASSIST: boolEnv("ALLOW_RETURNS_ASSIST"),
  ALLOW_MANUAL_ORDER_DRAFT: boolEnv("ALLOW_MANUAL_ORDER_DRAFT"),
  ALLOW_TRIGGERS: boolEnv("ALLOW_TRIGGERS"),
  ALLOW_MAILINGS: boolEnv("ALLOW_MAILINGS"),
  ALLOW_LOYALTY: boolEnv("ALLOW_LOYALTY"),
  ALLOW_SEGMENTS: boolEnv("ALLOW_SEGMENTS"),
} as const;

export type FlagName = keyof typeof flags;
