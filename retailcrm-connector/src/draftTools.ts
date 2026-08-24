/**
 * Триггеры и рассылки RetailCRM НЕ управляются через публичный REST API v5 —
 * это подтверждено отсутствием соответствующих сущностей в официальном PHP-клиенте
 * RetailCRM (retailcrm/api-client-php): там есть Orders, Customers, Tasks, Store,
 * Loyalty — но нет Trigger, Mailing, Rule, Campaign, Sms, Email, Automation.
 * То есть создать триггер или рассылку кодом технически нельзя — только руками
 * в интерфейсе RetailCRM.
 *
 * Эти функции ничего не отправляют в RetailCRM. Они готовят точный, готовый
 * к вставке текст/конфигурацию, которую вы сами за минуту вводите в интерфейс.
 * Это не заглушка "на будущее" — это осознанное соответствие реальным
 * возможностям API.
 */

export function formatTriggerDraft(input: {
  name: string;
  eventDescription: string;
  conditionDescription: string;
  actionDescription: string;
}): string {
  return [
    `## Черновик триггера: ${input.name}`,
    ``,
    `Внести в RetailCRM: Автоматизация → Триггеры → Создать триггер.`,
    ``,
    `**Событие:** ${input.eventDescription}`,
    `**Условие:** ${input.conditionDescription}`,
    `**Действие:** ${input.actionDescription}`,
    ``,
    `Создайте триггер в ВЫКЛЮЧЕННОМ состоянии, проверьте на 1-2 тестовых заказах,`,
    `и включайте только после того, как убедитесь, что условие срабатывает верно.`,
  ].join("\n");
}

export function formatMailingDraft(input: {
  channel: "email" | "sms" | "whatsapp";
  subject?: string;
  segmentDescription: string;
  body: string;
}): string {
  const lines = [
    `## Черновик рассылки (${input.channel})`,
    ``,
    `Внести в RetailCRM: Маркетинг → Рассылки → Создать рассылку.`,
    ``,
    `**Сегмент-получатель:** ${input.segmentDescription}`,
  ];
  if (input.subject) lines.push(`**Тема:** ${input.subject}`);
  lines.push(``, `**Текст:**`, input.body, ``);
  lines.push(
    `Перед боевым запуском обязательно отправьте тестовое сообщение себе —`,
    `запуск на реальных клиентов остаётся вашим ручным действием.`
  );
  return lines.join("\n");
}
