import { Router } from "express";
import ContactRepository from "../data/repositories/ContactRepository";

export const contactsRouter = Router();
const contactRepository = new ContactRepository();

contactsRouter.get("/", async (_req, res) => {
  try {
    const contacts = await contactRepository.findAll();
    res.json(contacts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch contacts";
    res.status(500).json({ error: message });
  }
});

contactsRouter.post("/", async (req, res) => {
  try {
    const contact = await contactRepository.create(req.body);
    res.status(201).json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create contact";
    res.status(400).json({ error: message });
  }
});

contactsRouter.patch("/:id", async (req, res) => {
  try {
    const contact = await contactRepository.update(req.params.id, req.body);
    res.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update contact";
    res.status(400).json({ error: message });
  }
});

contactsRouter.get("/:id", async (req, res) => {
  try {
    const contact = await contactRepository.findById(req.params.id);
    if (!contact) return res.status(404).json({ error: "Not found" });
    res.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch contact";
    res.status(500).json({ error: message });
  }
});

contactsRouter.delete("/:id", async (req, res) => {
  try {
    const contact = await contactRepository.findById(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Not found' });
    // Prevent deletion if loans exist for this contact to avoid accidental cascade deletes.
    const anyContact = contact as any;
    if (anyContact.loans && anyContact.loans.length > 0) {
      return res.status(400).json({ error: 'Cannot delete contact with existing loans. Remove or reassign loans first.' });
    }
    await contactRepository.delete(req.params.id);
    res.status(204).end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete contact";
    const statusCode = message.includes("Not found") ? 404 : 400;
    res.status(statusCode).json({ error: message });
  }
});
