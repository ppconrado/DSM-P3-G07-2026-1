import express, { json, urlencoded } from 'express'; // Importar o framework Express e middlewares para parsear JSON e dados de formulário
import cookieParser from 'cookie-parser'; // Middleware para parsear cookies
import logger from 'morgan'; // Middleware para log de requisições HTTP

import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';

import eventsRouter from './routes/events.js'; // Importar o roteador para eventos
import eventSessionsRouter from './routes/eventSessions.js';
import speakersRouter from './routes/speakers.js'; // Importar o roteador para palestrantes
import registrationsRouter from './routes/registrations.js'; // Importar o roteador para inscrições de participantes nos eventos
import attendanceRouter from './routes/attendance.js';
import certificatesRouter from './routes/certificates.js'; // Importar o roteador para certificados de participação dos eventos

const app = express(); // Criar a aplicação Express

app.use(logger('dev')); // Middleware para log de requisições
app.use(json()); // Middleware para parsear JSON
app.use(urlencoded({ extended: false })); // Middleware para parsear dados de formulário (application/x-www-form-urlencoded)
app.use(cookieParser()); // Middleware para parsear cookies

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use('/events', eventsRouter); // Rota para acessar os eventos
app.use('/events/:eventId/sessions', eventSessionsRouter);

app.use('/speakers', speakersRouter); // Rota para acessar os palestrantes dos eventos

app.use('/registrations', registrationsRouter); // Rota para acessar as inscrições dos participantes nos eventos
app.use('/registrations/:registrationId/attendance', attendanceRouter);

// Servir arquivos estáticos da pasta uploads (corrigido: __dirname definido antes do uso)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Rota para acessar arquivos de certificados

app.use('/certificates', certificatesRouter); // Rota para acessar certificados

export default app; // Exportar a aplicação para ser usada em outros arquivos (como o servidor)
