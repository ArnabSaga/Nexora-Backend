import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';

const app: Application = express();

//* Better Auth

//* parsers
app.use(express.json());
app.use(cookieParser());

//* Middlewares
app.use(cors());

//* application routes
// app.use('/api/v1', router);

//* Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('Nexora server is running');
});

//! not found route (must come before globalErrorHandler)

//! global error handler

export default app;
