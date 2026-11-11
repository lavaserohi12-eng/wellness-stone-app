import { Router, type IRouter } from "express";
import dataRouter from "./data";
import healthRouter from "./health";
import wellnessRouter from "./wellness";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wellnessRouter);
router.use(dataRouter);

export default router;
