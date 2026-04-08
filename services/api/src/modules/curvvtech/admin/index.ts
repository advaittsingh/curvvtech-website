import { Router } from "express";
import blogsRouter from "./blogs.js";
import leadsRouter from "./leads.js";
import clientsRouter from "./clients.js";
import projectsRouter from "./projects.js";
import invoicesRouter from "./invoices.js";
import teamRouter from "./team.js";
import analyticsRouter from "./analytics.js";
import chatsRouter from "./chats.js";
import demoRequestsRouter from "./demo-requests.js";

const router = Router();

router.use("/blogs", blogsRouter);
router.use("/leads", leadsRouter);
router.use("/clients", clientsRouter);
router.use("/projects", projectsRouter);
router.use("/invoices", invoicesRouter);
router.use("/team", teamRouter);
router.use("/analytics", analyticsRouter);
router.use("/chats", chatsRouter);
router.use("/demo-requests", demoRequestsRouter);

export default router;
