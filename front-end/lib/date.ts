const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

const DATE_TIME_UTC_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

export function formatDateOnlyUTC(value: string) {
  return DATE_ONLY_FORMATTER.format(new Date(value));
}

export function formatDateTimeUTC(value: string) {
  return DATE_TIME_UTC_FORMATTER.format(new Date(value));
}
