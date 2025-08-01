import { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../firebase/firebase";
import { Timestamp } from "firebase-admin/firestore";
import moment from "moment";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    try {
      const snapshot = await db.collection("bookings").get();

      const grouped: Record<string, any[]> = {};

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const bookingDate = data.bookingDate;

        if (!bookingDate) return;

        const startTime = data.startTime.toDate().toISOString();
        const endTime = data.endTime.toDate().toISOString();

        const bookingData = {
          id: doc.id,
          clientId: data.clientId,
          type: data.type,
          startTime,
          endTime,
        };

        if (!grouped[bookingDate]) {
          grouped[bookingDate] = [];
        }

        grouped[bookingDate].push(bookingData);
      });

      const formatted = Object.entries(grouped).map(([date, bookings]) => ({
        bookingDate: date,
        bookingOnCurrentDate: bookings,
      }));

      return res.status(200).json({ bookings: formatted });
    } catch (error) {
      console.error("GET /bookings error:", error);
      return res.status(500).json({ error: "Failed to fetch bookings" });
    }
  }
  // -------- CREATE NEW BOOKING --------
  if (req.method === "POST") {
    try {
      const booking = req.body as {
        clientId: string;
        type: string;
        startTime: string;
        endTime: string;
      };

      const { clientId, type, startTime, endTime } = booking;

      if (!clientId || !type || !startTime || !endTime) {
        return res
          .status(400)
          .json({ error: "Missing required booking fields" });
      }

      const start = moment(startTime);
      const end = moment(endTime);

      if (!start.isValid() || !end.isValid()) {
        return res.status(400).json({ error: "Invalid date format" });
      }

      if (!start.isBefore(end)) {
        return res
          .status(400)
          .json({ error: "startTime must be before endTime" });
      }

      const bookingDate = start.format("YYYY-MM-DD");

      const existingClientSnap = await db
        .collection("bookings")
        .where("clientId", "==", clientId)
        .get();

      if (!existingClientSnap.empty) {
        return res
          .status(409)
          .json({ error: "Booking already exists for this clientId" });
      }

      const sameDayBookingsSnap = await db
        .collection("bookings")
        .where("bookingDate", "==", bookingDate)
        .get();

      const overlappingBooking = sameDayBookingsSnap.docs.find((doc) => {
        const data = doc.data();
        const existingStart = moment(
          data.startTime.toDate?.() || data.startTime
        );
        const existingEnd = moment(data.endTime.toDate?.() || data.endTime);

        return existingStart.isBefore(end) && existingEnd.isAfter(start);
      });

      if (overlappingBooking) {
        return res
          .status(409)
          .json({ error: "Booking time overlaps with an existing booking" });
      }

      const result = await db.collection("bookings").add({
        clientId,
        type,
        startTime: Timestamp.fromDate(start.toDate()),
        endTime: Timestamp.fromDate(end.toDate()),
        bookingDate,
      });

      return res.status(200).json({ id: result.id });
    } catch (error) {
      console.error("POST /bookings error:", error);
      return res.status(500).json({ error: "Failed to create booking" });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
