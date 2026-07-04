import cookie from 'cookie-parse';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './app/lib/auth';
import globalErrorHandler from './app/middleware/globalErrorHandler';
import notFound from './app/middleware/notFound';

const app: Application = express();
const authHandler = toNodeHandler(auth);

//* Better Auth
app.use(cors());
app.all(['/api/auth', '/api/auth/{*authPath}'], (req: Request, res: Response) => {
  void authHandler(req, res);
});

//* parsers
app.use(express.json());
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.cookies = cookie.parse(req.headers.cookie ?? '');
  next();
});

//* Middlewares

//* application routes
// app.use('/api/v1', router);

//* Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('Nexora server is running');
});

//! not found route (must come before globalErrorHandler)
app.use(notFound);

//! global error handler
app.use(globalErrorHandler);

export default app;
