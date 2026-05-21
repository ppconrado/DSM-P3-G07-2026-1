import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FIXTURES = {
  admin: {
    name: 'Admin Seed',
    email: 'admin@example.com',
    passwordHash: 'seed-admin-password',
  },
  speakers: [
    {
      name: 'Seed Speaker One',
      email: 'speaker@example.com',
      bio: 'Palestrante principal do ambiente de testes.',
      institution: 'FATEC',
      phone: '(11) 90000-0001',
    },
    {
      name: 'Seed Speaker Two',
      email: 'guest.speaker@example.com',
      bio: 'Convidado para compor o fluxo de múltiplos palestrantes.',
      institution: 'IFSP',
      phone: '(11) 90000-0002',
    },
  ],
  participants: [
    {
      name: 'Seed Participant One',
      email: 'participant1@example.com',
      passwordHash: 'seed-participant-1',
      phone: '(11) 98888-0001',
    },
    {
      name: 'Seed Participant Two',
      email: 'participant2@example.com',
      passwordHash: 'seed-participant-2',
      phone: '(11) 98888-0002',
    },
    {
      name: 'Seed Participant Three',
      email: 'participant3@example.com',
      passwordHash: 'seed-participant-3',
      phone: '(11) 98888-0003',
    },
  ],
  events: [
    {
      title: 'Seed Event - Palestra Principal',
      description:
        'Evento principal para validar listas, inscrições, presença e certificado.',
      startDate: new Date('2026-06-01T09:00:00Z'),
      endDate: new Date('2026-06-01T18:00:00Z'),
      location: 'Auditório Seed',
      type: 'Palestra',
      capacity: 100,
      certificateRequiredPercent: 75,
      status: 'ATIVA',
      sessionDates: [
        {
          sessionDate: new Date('2026-06-01T00:00:00Z'),
          startTime: '09:00',
          endTime: '12:00',
          room: 'Sala Seed 1',
        },
        {
          sessionDate: new Date('2026-06-01T00:00:00Z'),
          startTime: '14:00',
          endTime: '18:00',
          room: 'Sala Seed 2',
        },
      ],
      speakerIndexes: [0, 1],
    },
    {
      title: 'Seed Event - Workshop Prático',
      description:
        'Segundo evento para mostrar múltiplas entradas nos endpoints.',
      startDate: new Date('2026-06-10T13:00:00Z'),
      endDate: new Date('2026-06-10T17:00:00Z'),
      location: 'Laboratório Seed',
      type: 'Workshop',
      capacity: 30,
      certificateRequiredPercent: 80,
      status: 'ATIVA',
      sessionDates: [
        {
          sessionDate: new Date('2026-06-10T00:00:00Z'),
          startTime: '13:00',
          endTime: '17:00',
          room: 'Lab 01',
        },
      ],
      speakerIndexes: [1],
    },
  ],
};

async function clearSeedData() {
  await prisma.certificate.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.eventSession.deleteMany();
  await prisma.event.deleteMany();
  await prisma.speaker.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log('Running seed...');

  await clearSeedData();

  const admin = await prisma.user.create({
    data: {
      ...FIXTURES.admin,
      role: 'ADMIN',
    },
  });

  const speakers = [];
  for (const speakerData of FIXTURES.speakers) {
    const speaker = await prisma.speaker.create({ data: speakerData });
    speakers.push(speaker);
  }

  const participants = [];
  for (const participantData of FIXTURES.participants) {
    const participant = await prisma.user.create({
      data: {
        ...participantData,
        role: 'PARTICIPANTE',
      },
    });
    participants.push(participant);
  }

  const createdEvents = [];
  for (const eventData of FIXTURES.events) {
    const event = await prisma.event.create({
      data: {
        title: eventData.title,
        description: eventData.description,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        location: eventData.location,
        type: eventData.type,
        capacity: eventData.capacity,
        certificateRequiredPercent: eventData.certificateRequiredPercent,
        status: eventData.status,
        createdByAdminId: admin.id,
        speakerIds: eventData.speakerIndexes.map((index) => speakers[index].id),
      },
    });

    await prisma.speaker.updateMany({
      where: {
        id: { in: eventData.speakerIndexes.map((index) => speakers[index].id) },
      },
      data: { eventIds: { set: [event.id] } },
    });

    const sessions = [];
    for (const sessionData of eventData.sessionDates) {
      const session = await prisma.eventSession.create({
        data: {
          eventId: event.id,
          sessionDate: sessionData.sessionDate,
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          room: sessionData.room,
        },
      });
      sessions.push(session);
    }

    createdEvents.push({ event, sessions });
  }

  const primaryEvent = createdEvents[0];
  const secondaryEvent = createdEvents[1];

  const registrations = [];
  registrations.push(
    await prisma.registration.create({
      data: {
        participantId: participants[0].id,
        eventId: primaryEvent.event.id,
        totalSessionsCount: primaryEvent.sessions.length,
        attendedSessionsCount: 2,
        attendancePercent: 100,
        approvedForCertificate: true,
        approvedAt: new Date('2026-06-01T19:00:00Z'),
      },
    }),
  );
  registrations.push(
    await prisma.registration.create({
      data: {
        participantId: participants[1].id,
        eventId: primaryEvent.event.id,
        totalSessionsCount: primaryEvent.sessions.length,
        attendedSessionsCount: 1,
        attendancePercent: 50,
        approvedForCertificate: false,
      },
    }),
  );
  registrations.push(
    await prisma.registration.create({
      data: {
        participantId: participants[2].id,
        eventId: secondaryEvent.event.id,
        totalSessionsCount: secondaryEvent.sessions.length,
        attendedSessionsCount: 1,
        attendancePercent: 100,
        approvedForCertificate: true,
        approvedAt: new Date('2026-06-10T18:00:00Z'),
      },
    }),
  );

  await prisma.attendance.createMany({
    data: [
      {
        registrationId: registrations[0].id,
        eventSessionId: primaryEvent.sessions[0].id,
        present: true,
        checkInAt: new Date('2026-06-01T09:05:00Z'),
        checkOutAt: new Date('2026-06-01T12:00:00Z'),
        markedByUserId: admin.id,
        notes: 'Presença total na primeira sessão.',
      },
      {
        registrationId: registrations[0].id,
        eventSessionId: primaryEvent.sessions[1].id,
        present: true,
        checkInAt: new Date('2026-06-01T14:05:00Z'),
        checkOutAt: new Date('2026-06-01T18:00:00Z'),
        markedByUserId: admin.id,
        notes: 'Presença total na segunda sessão.',
      },
      {
        registrationId: registrations[1].id,
        eventSessionId: primaryEvent.sessions[0].id,
        present: true,
        checkInAt: new Date('2026-06-01T09:10:00Z'),
        checkOutAt: new Date('2026-06-01T12:00:00Z'),
        markedByUserId: admin.id,
        notes: 'Participou apenas da primeira sessão.',
      },
      {
        registrationId: registrations[1].id,
        eventSessionId: primaryEvent.sessions[1].id,
        present: false,
        markedByUserId: admin.id,
        notes: 'Ausente na segunda sessão.',
      },
      {
        registrationId: registrations[2].id,
        eventSessionId: secondaryEvent.sessions[0].id,
        present: true,
        checkInAt: new Date('2026-06-10T13:05:00Z'),
        checkOutAt: new Date('2026-06-10T17:00:00Z'),
        markedByUserId: admin.id,
        notes: 'Workshop concluído com presença completa.',
      },
    ],
  });

  await prisma.certificate.create({
    data: {
      registrationId: registrations[0].id,
      verificationCode: 'SEED-CERT-0001',
      issueDate: new Date('2026-06-01T19:30:00Z'),
      pdfUrl: 'https://example.com/certificados/SEED-CERT-0001.pdf',
      expiresAt: null,
      attendancePercentAtIssue: 100,
      issuedByAdminId: admin.id,
    },
  });

  console.log('Seed finished.');
  console.log({
    adminId: admin.id,
    speakerIds: speakers.map((speaker) => speaker.id),
    participantIds: participants.map((participant) => participant.id),
    eventIds: createdEvents.map(({ event }) => event.id),
    registrationIds: registrations.map((registration) => registration.id),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
