import { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../firebase/firebase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const snapshot = await db.collection("clients").get();
      const clients = snapshot.docs.map((doc) => ({
        id: doc.data().id,
        name: doc.data().name,
        phone: doc.data().phone,
        docId: doc.id,
      }));
      return res.status(200).json(clients);
    } catch (error) {
      console.error("GET /clients error:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch clients", reason: { error } });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, phone } = req.body;
      if (!name || !phone) {
        return res.status(400).json({ error: "Missing name or phone" });
      }

      const snapshot = await db.collection("clients").get();
      const existingIds = snapshot.docs
        .map((doc) => doc.data().id)
        .filter((id) => typeof id === "number");

      let newId = 1;
      const used = new Set(existingIds);
      while (used.has(newId)) newId++;

      const newClient = { id: newId, name, phone };
      const docRef = await db.collection("clients").add(newClient);

      return res.status(201).json({ ...newClient, docId: docRef.id });
    } catch (error) {
      console.error("POST /clients error:", error);
      return res.status(500).json({ error: "Failed to create client" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
