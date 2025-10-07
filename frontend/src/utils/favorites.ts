import type { Contact } from '../types';

const STORAGE_KEY = 'pfm_contact_counts_v1';

async function fetchCountsFromServer(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch('/api/favorites');
    if (!res.ok) return null;
    const body = await res.json();
    return body.counts || null;
  } catch (e) {
    return null;
  }
}

async function fetchFavouritesFromServer(): Promise<Record<string, boolean> | null> {
  try {
    const res = await fetch('/api/favorites');
    if (!res.ok) return null;
    const body = await res.json();
    return body.favs || null;
  } catch (e) {
    return null;
  }
}

function readCountsLocal(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch (e) {
    return {};
  }
}

function writeCountsLocal(counts: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch (e) {
    // ignore
  }
}

export async function incrementContactCounts(ids: string[]) {
  if (!ids || !ids.length) return;
  try {
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
  } catch (e) {
    // fallback to local
    const counts = readCountsLocal();
    ids.forEach((id) => { if (!id) return; counts[id] = (counts[id] || 0) + 1; });
    writeCountsLocal(counts);
  }
}

export async function getTopContacts(contacts: Contact[], n = 5): Promise<Contact[]> {
  if (!contacts || contacts.length === 0) return [];
  const serverCounts = await fetchCountsFromServer();
  const counts = serverCounts || readCountsLocal();
  return contacts
    .slice()
    .sort((a, b) => {
      const ca = counts[a.id] || 0;
      const cb = counts[b.id] || 0;
      if (cb !== ca) return cb - ca;
      return a.name.localeCompare(b.name);
    })
    .slice(0, n);
}

export async function getFavourites(): Promise<Record<string, boolean>> {
  try {
    const server = await fetchFavouritesFromServer();
    if (server) return server;
    return {};
  } catch (e) {
    return {};
  }
}

export async function setFavourite(id: string, value: boolean) {
  try {
    await fetch('/api/favorites/fav', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, value })
    });
  } catch (e) {
    // ignore fallback for now
  }
}

