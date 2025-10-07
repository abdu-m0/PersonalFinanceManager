import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const FILE_PATH = path.join(DATA_DIR, 'contact_favorites.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

type FavoritesData = {
  counts: Record<string, number>;
  favs: Record<string, boolean>;
};

function readData(): FavoritesData {
  try {
    ensureDataDir();
    if (!fs.existsSync(FILE_PATH)) return { counts: {}, favs: {} };
    const raw = fs.readFileSync(FILE_PATH, 'utf8');
    return JSON.parse(raw) as FavoritesData;
  } catch (e) {
    return { counts: {}, favs: {} };
  }
}

function writeData(data: FavoritesData) {
  try {
    ensureDataDir();
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

export function readFavorites(): Record<string, number> {
  return readData().counts;
}

export function readFavourites(): Record<string, boolean> {
  return readData().favs;
}

export function writeFavorites(counts: Record<string, number>) {
  const data = readData();
  writeData({ ...data, counts });
}

export function writeFavourites(favs: Record<string, boolean>) {
  const data = readData();
  writeData({ ...data, favs });
}

export function incrementFavorites(ids: string[]) {
  if (!ids || !ids.length) return;
  const data = readData();
  ids.forEach((id) => {
    if (!id) return;
    data.counts[id] = (data.counts[id] || 0) + 1;
  });
  writeData(data);
}

export function setFavourite(id: string, value: boolean) {
  if (!id) return;
  const data = readData();
  data.favs[id] = !!value;
  writeData(data);
}
