import dotenv from "dotenv";
dotenv.config();
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { ensureDatabaseSchema } from "./config/schema.ts";
import { registerRoutes } from "./routes.ts";
import { serveStatic } from "./static.ts";
import { log } from "./log.ts";

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middlewares
app.use(cors({ origin: true, credentials: true }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", globalLimiter);

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });
  next();
});

(async () => {
  await ensureDatabaseSchema();
  const server = registerRoutes(app);

  // -- INSTRUCTION 3: Start the Auto-Scheduler
  startElectionScheduler();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite.ts");
    await setupVite(server, app);
  } else {
    serveStatic(app);
  }

  const PORT = Number(process.env.PORT) || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();

// -- INSTRUCTION 3: Election Auto-Scheduler -------------------
async function startElectionScheduler() {
  const { default: pool } = await import('./config/db.ts');
  const { lockChoiceResults } = await import('./controllers/resultController.ts');
  const { expireCAV } = await import('./controllers/cavController.ts');
  
  const tick = async () => {
    try {
      // 1. Auto-Start
      const [toStart]: any = await pool.execute(
        `SELECT election_id FROM elections WHERE status='NOT_STARTED' AND scheduled_mode=TRUE AND window_start IS NOT NULL AND window_start <= NOW()`
      );
      for (const e of toStart) {
        await pool.execute("UPDATE elections SET status='ACTIVE', window_start=NOW(), is_paused=FALSE WHERE election_id=?", [e.election_id]);
        log(`[Scheduler] Election ${e.election_id} auto-started.`);
      }

      // 2. Auto-Stop
      const [toStop]: any = await pool.execute(
        `SELECT election_id FROM elections WHERE status='ACTIVE' AND scheduled_mode=TRUE AND window_end IS NOT NULL AND window_end <= NOW()`
      );
      for (const e of toStop) {
        await pool.execute("UPDATE elections SET status='STOPPED', window_end=NOW(), is_paused=FALSE WHERE election_id=?", [e.election_id]);
        expireCAV(e.election_id).catch(() => {});
        lockChoiceResults(e.election_id).catch(() => {});
        log(`[Scheduler] Election ${e.election_id} auto-stopped.`);
      }
    } catch (err) {
      console.error('[Scheduler Error]', err);
    }
  };

  tick();
  setInterval(tick, 30000); // Run every 30 seconds
}
