// --- CÓDIGO PARA POSTGRESQL (NÃO USAR COM MONGODB) ---
// import "dotenv/config";
// import { PrismaPg } from "@prisma/adapter-pg";
// import { PrismaClient } from "@prisma/client";
//
// const connectionString = `${process.env.DATABASE_URL}`;
// const adapter = new PrismaPg({ connectionString });
// const prisma = new PrismaClient({
//   adapter,
//   log: [
//     { emit: 'event', level: 'query' },
//     { emit: 'stdout', level: 'error' },
//     { emit: 'stdout', level: 'info' },
//     { emit: 'stdout', level: 'warn' },
//   ],
// });
// prisma.$on('query', (e) => {
//   console.log('---');
//   console.log('Query: ' + e.query);
//   console.log('Params: ' + e.params);
//   console.log('Duration: ' + e.duration + 'ms');
// });
// export { prisma };

// --- CÓDIGO ATUAL PARA MONGODB ---
import 'dotenv/config'; // Importa as variáveis de ambiente do arquivo .env
import { PrismaClient } from '@prisma/client'; // Importa o Prisma Client para interagir com o banco de dados

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
}); // Configura o Prisma Client para logar consultas, erros, informações e avisos

prisma.$on('query', (e) => {
  console.log('---');
  console.log('Query: ' + e.query);
  console.log('Params: ' + e.params);
  console.log('Duration: ' + e.duration + 'ms');
}); // Evento para logar detalhes das consultas, incluindo a consulta em si, os parâmetros e a duração

export { prisma }; // Exporta a instância do Prisma Client para ser usada em outras partes da aplicação
