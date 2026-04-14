export const REVIEW_COUNT_KEY = 'notes_created_count_v1';
export const REVIEW_PROMPTED_KEY = 'has_prompted_review_v1';
export const NOTES_STORAGE_KEY = 'notes_v1';
export const TRASH_STORAGE_KEY = 'trash_v1';
export const TRASH_RETENTION_DAYS = 7;
export const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';
export const LEGACY_ONBOARDING_KEY = 'has_onboarded';

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

export const removeReminderFields = (note) => {
  if (!note) return note;

  const { reminderAt, notificationId, ...noteWithoutReminder } = note;
  return noteWithoutReminder;
};

export const ensureHtmlContent = (value = '') => {
  if (!value) return '';

  const trimmedValue = value.trim();
  if (!trimmedValue) return '';

  if (/<\/?[a-z][\s\S]*>/i.test(trimmedValue)) {
    return trimmedValue;
  }

  return trimmedValue
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br/>')}</p>`)
    .join('');
};

export const stripHtml = (value = '') =>
  value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

export const isHtmlContentEmpty = (value = '') => stripHtml(value).trim().length === 0;

export const getBodyPreview = (value = '') =>
  stripHtml(ensureHtmlContent(value)).replace(/\s+/g, ' ').trim();

export const getNoteContent = (note) => ensureHtmlContent(note?.content ?? note?.body ?? '');

export const getSearchableText = (note) =>
  `${note?.title || ''} ${getBodyPreview(getNoteContent(note))}`.toLowerCase();

export const normalizeNote = (note) => {
  const cleanedNote = removeReminderFields(note) || {};
  const timestamp = cleanedNote.updatedAt || cleanedNote.createdAt || new Date().toISOString();
  const normalizedContent = ensureHtmlContent(cleanedNote.content ?? cleanedNote.body ?? '');

  return {
    ...cleanedNote,
    id: cleanedNote.id,
    title: cleanedNote.title || '',
    body: normalizedContent,
    content: normalizedContent,
    createdAt: cleanedNote.createdAt || timestamp,
    updatedAt: cleanedNote.updatedAt || timestamp,
    isPinned: Boolean(cleanedNote.isPinned),
  };
};

export const normalizeTrashNote = (note) => ({
  ...normalizeNote(note),
  deletedAt: note?.deletedAt || new Date().toISOString(),
});

export const formatNoteDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
};

export const getNoteDateLabel = (note) => {
  if (note?.updatedAt && note.updatedAt !== note.createdAt) {
    return `Edited ${formatNoteDate(note.updatedAt)}`;
  }

  return `Created ${formatNoteDate(note.createdAt)}`;
};

export const buildNoteDocumentHtml = (note) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: 'Georgia', serif; padding: 48px; color: #1a1a1a; background: #fff; }
      h1 { font-size: 28px; font-weight: bold; border-bottom: 2px solid #0D0D0D; padding-bottom: 12px; margin-bottom: 6px; }
      .meta { font-size: 12px; color: #999; margin-bottom: 24px; }
      .content { font-size: 16px; line-height: 1.9; }
      .content ul { padding-left: 20px; }
      .content ol { padding-left: 20px; }
      .footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid #E0E0E0; text-align: center; color: #888; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(note.title || 'Untitled Note')}</h1>
    <div class="meta">${formatNoteDate(note.updatedAt || note.createdAt)}</div>
    <div class="content">${getNoteContent(note)}</div>
    <div class="footer">Exported securely via <strong>Penote</strong></div>
  </body>
</html>`;

export const orderNotesWithFavoritesFirst = (notes) => {
  const favorites = [];
  const regularNotes = [];

  notes.forEach((note) => {
    if (note.isPinned) {
      favorites.push(note);
      return;
    }

    regularNotes.push(note);
  });

  return [...favorites, ...regularNotes];
};

export const isTrashExpired = (note, now = Date.now()) => {
  if (!note?.deletedAt) return false;
  return now - new Date(note.deletedAt).getTime() >= TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
};

const parseStoredArray = (value) => {
  if (!value) return [];

  try {
    const parsedValue = JSON.parse(value);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    return [];
  }
};

export const parseStoredNotes = (value) => parseStoredArray(value).map(normalizeNote);
export const parseStoredTrash = (value) => parseStoredArray(value).map(normalizeTrashNote);
