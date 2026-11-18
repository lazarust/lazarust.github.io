export type PostDateFormat = 'long' | 'short' | 'year';

const dateFormats: Record<PostDateFormat, Intl.DateTimeFormat> = {
  long: new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }),
  short: new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  }),
  year: new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' }),
};

export function postDateToUTC(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function formatPostDate(date: string, style: PostDateFormat): string {
  return dateFormats[style].format(postDateToUTC(date));
}
