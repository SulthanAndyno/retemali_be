import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import bookRoutes from "../modules/book/book.routes";
import bookmarkRoutes from "../modules/bookmark/bookmark.routes";
import circulationRoutes from "../modules/circulation/circulation.routes";
import eventRoutes from "../modules/event/event.routes";
import volunteerRoutes from "../modules/volunteer/volunteer.routes";
import handoverNoteRoutes from "../modules/handover-note/handover-note.routes";
import donationRoutes from "../modules/donation/donation.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import auditRoutes from "../modules/audit/audit.routes";

const router: Router = Router();

router.use("/auth", authRoutes);
router.use("/books", bookRoutes);
router.use("/bookmarks", bookmarkRoutes);
router.use("/circulation", circulationRoutes);
router.use("/events", eventRoutes);
router.use("/volunteers", volunteerRoutes);
router.use("/handover-notes", handoverNoteRoutes);
router.use("/donations", donationRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/audit-logs", auditRoutes);

console.log(
  "Routes registered: auth, books, bookmarks, circulation, events, volunteers, handover-notes, donations, dashboard, audit-logs",
);

export default router;
