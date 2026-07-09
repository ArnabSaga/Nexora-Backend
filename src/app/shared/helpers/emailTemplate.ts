import fs from 'fs';
import status from 'http-status';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import { envVars } from '../../config/env';
import AppError from '../errors/AppError';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getTemplatesDir = () => {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'templates'),
    path.resolve(process.cwd(), 'src', 'app', 'templates'),
    path.resolve(process.cwd(), 'dist', 'app', 'templates'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
};

const TEMPLATES_DIR = getTemplatesDir();

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  templateName: string;
  templateData: Record<string, unknown>;
  attachments?: EmailAttachment[];
  from?: string;
  text?: string;
}

let cachedTransporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (!envVars.MAIL) {
    throw new AppError(status.SERVICE_UNAVAILABLE, 'Email delivery is not configured');
  }

  const smtpPort = envVars.MAIL.SMTP_PORT;

  if (!Number.isInteger(smtpPort) || smtpPort <= 0) {
    throw new AppError(status.INTERNAL_SERVER_ERROR, 'Invalid SMTP port');
  }

  cachedTransporter = nodemailer.createTransport({
    host: envVars.MAIL.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: envVars.MAIL.SMTP_USER,
      pass: envVars.MAIL.SMTP_PASS,
    },
  });

  return cachedTransporter;
};

const renderTemplate = async (templatePath: string, templateData: Record<string, unknown>) => {
  try {
    const ejs = await import('ejs');

    return await ejs.renderFile(templatePath, { ...templateData, locals: templateData }, {
      async: true,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(status.INTERNAL_SERVER_ERROR, 'Email template renderer is not available');
  }
};

export const sendEmail = async ({
  to,
  subject,
  templateName,
  templateData,
  attachments,
  from,
  text,
}: SendEmailOptions): Promise<void> => {
  try {
    const templatePath = path.join(TEMPLATES_DIR, `${templateName}.ejs`);

    if (!fs.existsSync(templatePath)) {
      throw new AppError(status.INTERNAL_SERVER_ERROR, `Email template ${templateName} not found`);
    }

    const html = await renderTemplate(templatePath, templateData);

    if (!envVars.MAIL) {
      throw new AppError(status.SERVICE_UNAVAILABLE, 'Email delivery is not configured');
    }

    await getTransporter().sendMail({
      from: from ?? envVars.MAIL.SMTP_FROM,
      to,
      subject,
      html,
      text,
      attachments: attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(status.INTERNAL_SERVER_ERROR, 'Failed to send email');
  }
};
