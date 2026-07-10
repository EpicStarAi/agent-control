import { Router, type IRouter } from "express";
import healthRouter from "./health";
import epicgramProxyRouter from "./epicgram-proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(epicgramProxyRouter);

export default router;
