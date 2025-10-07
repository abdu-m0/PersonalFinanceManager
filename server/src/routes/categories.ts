import { Router } from "express";
import { listCategories, createCategory } from "../services/categories";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res) => {
  try {
    const categories = await listCategories();
    res.json(categories);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch categories';
    res.status(500).json({ error: message });
  }
});

categoriesRouter.post("/", async (req, res) => {
  try {
    if (!req.body.name || typeof req.body.name !== 'string') {
      return res.status(400).json({ error: "Category name is required and must be a string" });
    }
    const category = await createCategory(req.body.name);
    res.status(201).json(category);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create category";
    if (message.toLowerCase().includes('unique')) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    res.status(400).json({ error: message });
  }
});
