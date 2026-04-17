import type { Express } from "express";
import { createServer, type Server } from "http";
import routes from "./routes/index.ts";

  export function registerRoutes(app: Express): Server {
    // Mount the API routes
    app.use('/api', routes);

    const httpServer = createServer(app);
    return httpServer;
  }
  