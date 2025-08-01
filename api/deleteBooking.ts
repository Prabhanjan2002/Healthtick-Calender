import { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../firebase/firebase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "DELETE") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing booking ID" });
    }

    try {
      const docRef = db.collection("bookings").doc(id as string);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return res.status(404).json({ error: "Booking not found" });
      }

      await docRef.delete();
      return res.status(200).json({ message: "Booking deleted successfully" });
    } catch (error) {
      console.error("Error deleting booking:", error);
      return res.status(500).json({ error: "Failed to delete booking" });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
