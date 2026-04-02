export const REVIEW_COUNT_KEY = 'notes_created_count_v1';
export const REVIEW_PROMPTED_KEY = 'has_prompted_review_v1';

export const sanitizePdfFileName = (title) => {
  const safeTitle = (title || '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80);

  return `${safeTitle || 'Untitled Note'}.pdf`;
};

export const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const getReminderLabel = (reminderAt) => {
  if (!reminderAt) return null;

  const reminderDate = new Date(reminderAt);
  if (Number.isNaN(reminderDate.getTime())) return null;

  return reminderDate.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const getReminderOptions = () => {
  const now = new Date();
  const tonight = new Date(now);
  tonight.setHours(20, 0, 0, 0);
  if (tonight <= now) {
    tonight.setDate(tonight.getDate() + 1);
  }

  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(9, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(9, 0, 0, 0);

  return [
    { key: 'hour', label: 'In 1 hour', date: new Date(now.getTime() + 60 * 60 * 1000) },
    { key: 'tonight', label: 'Tonight 8 PM', date: tonight },
    { key: 'tomorrow', label: 'Tomorrow 9 AM', date: tomorrowMorning },
    { key: 'week', label: 'Next week', date: nextWeek },
  ];
};
