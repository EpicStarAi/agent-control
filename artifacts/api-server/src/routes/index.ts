import { Router, type IRouter } from "express";
import healthRouter from "./health";
import epicgramProxyRouter from "./epicgram-proxy";
import terminalRouter from "./terminal";

const router: IRouter = Router();

router.use(healthRouter);
router.use(terminalRouter);
router.use(epicgramProxyRouter);

export default router;
