import ContactRepository from "../data/repositories/ContactRepository";

const SELF_CONTACT_ID = "self";

export async function ensureSelfContact(): Promise<void> {
  const repo = new ContactRepository();

  try {
    const existing = await repo.findById(SELF_CONTACT_ID);
    if (existing) {
      return;
    }

    // Create a minimal placeholder contact for the user
    await repo.create({
      id: SELF_CONTACT_ID,
      name: "You",
      label: "You",
      phone: null,
      email: null,
      avatarColor: null
    } as any);
    console.log("Created persistent self contact (id='self')");
  } catch (err) {
    // Don't crash server startup on DB errors; log and continue
    console.error("ensureSelfContact: failed to ensure self contact:", err);
  }
}

export default ensureSelfContact;
