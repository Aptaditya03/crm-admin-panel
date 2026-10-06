export function matchesEmailFilter(client, filter) {
  if (!filter) return true;
  const details = client.ContactPersonDetails || {};
  const contactKey = Object.keys(details).find(key => key !== 'comment');
  const email = String(details[contactKey]?.emailId || '').trim();
  const isMissing = !email || email.toLowerCase() === 'n/a';
  return filter === 'na' ? isMissing : !isMissing;
}

export function buildSelectedClientDeletes(ids) {
  if (!ids.length || ids.some(id => typeof id !== 'string' || !id || /[.#$\[\]\/]/.test(id))) {
    throw new Error('Select valid client records before deleting.');
  }
  return Object.fromEntries(ids.map(id => [id, null]));
}
