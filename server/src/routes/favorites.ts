import { Router } from 'express';
import { readFavorites, incrementFavorites, readFavourites, setFavourite } from '../data/favoritesStore';

export const favoritesRouter = Router();

// GET returns both counts and favourites
favoritesRouter.get('/', (_req, res) => {
  try {
    const counts = readFavorites();
    const favs = readFavourites();
    res.json({ counts, favs });
  } catch (e) {
    res.status(500).json({ error: 'Unable to read favorites' });
  }
});

// POST /api/favorites  { ids: [...] } increments counts
favoritesRouter.post('/', (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
    incrementFavorites(ids);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Unable to update favorites' });
  }
});

// PUT /api/favorites/fav  { id: string, value: boolean } to set favourite flag
favoritesRouter.put('/fav', (req, res) => {
  try {
    const id = req.body.id ? String(req.body.id) : '';
    const value = !!req.body.value;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    setFavourite(id, value);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Unable to set favourite' });
  }
});
