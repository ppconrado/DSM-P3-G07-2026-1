import request from 'supertest';
import assert from 'assert';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { prisma } from '../src/database/client.js';

// Simple integration tests that exercise a few endpoints.
describe('Integration tests', function () {
  this.timeout(10000);

  it('GET /events returns 200', async () => {
    const res = await request(app).get('/events');
    assert.equal(res.status, 200);
  });

  it('GET /speakers returns 200', async () => {
    const res = await request(app).get('/speakers');
    assert.equal(res.status, 200);
  });

  it('GET /speakers/:id rejects malformed ids', async () => {
    const res = await request(app).get('/speakers/6a0ce88f6c5a6baecc42755');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'ID inválido em speakerId.');
  });

  it('GET /speakers/:id returns 404 for a valid but missing id', async () => {
    const res = await request(app).get('/speakers/6a0ce88f6c5a6baecc427551');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'Palestrante não encontrado.');
  });

  it('Create, update and delete user lifecycle', async () => {
    const email = `user-${Date.now()}@example.com`;
    const plainPassword = 'integration-user-password';
    const createRes = await request(app).post('/users').send({
      name: 'Integration User',
      email,
      passwordHash: plainPassword,
      role: 'ADMIN',
    });
    assert.equal(createRes.status, 201);
    const user = createRes.body;
    assert.ok(user.id, 'user id present');
    assert.equal(user.passwordHash, undefined);

    const storedUser = await prisma.user.findUnique({ where: { id: user.id } });
    assert.ok(storedUser, 'stored user present');
    assert.notEqual(storedUser.passwordHash, plainPassword);
    assert.equal(
      await bcrypt.compare(plainPassword, storedUser.passwordHash),
      true,
    );

    const updateRes = await request(app)
      .put(`/users/${user.id}`)
      .send({ phone: '(11) 98888-7777' });
    assert.equal(updateRes.status, 200);

    const delRes = await request(app).delete(`/users/${user.id}`);
    assert.equal(delRes.status, 200);
  });

  it('Create and delete participant lifecycle through users', async () => {
    const email = `test-${Date.now()}@example.com`;
    const createRes = await request(app).post('/users').send({
      name: 'Integration Test',
      email,
      passwordHash: 'integration-test-password',
      role: 'PARTICIPANTE',
    });
    assert.equal(createRes.status, 201);
    const participant = createRes.body;
    assert.ok(participant.id, 'participant id present');

    const delRes = await request(app).delete(`/users/${participant.id}`);
    assert.equal(delRes.status, 200);
  });

  it('POST /users rejects duplicate email with friendly message', async () => {
    const email = `duplicate-${Date.now()}@example.com`;

    const firstRes = await request(app).post('/users').send({
      name: 'First User',
      email,
      passwordHash: 'first-user-password',
      role: 'PARTICIPANTE',
    });
    assert.equal(firstRes.status, 201);

    try {
      const secondRes = await request(app).post('/users').send({
        name: 'Second User',
        email,
        passwordHash: 'second-user-password',
        role: 'PARTICIPANTE',
      });

      assert.equal(secondRes.status, 409);
      assert.equal(secondRes.body.error, 'E-mail já cadastrado.');
    } finally {
      await prisma.user.deleteMany({ where: { email } }).catch(() => {});
    }
  });

  it('POST /auth/login issues cookies and /auth/me returns the authenticated user', async () => {
    const email = `auth-${Date.now()}@example.com`;
    const password = 'auth-test-password';

    try {
      const createRes = await request(app).post('/users').send({
        name: 'Auth Integration User',
        email,
        passwordHash: password,
        role: 'PARTICIPANTE',
      });
      assert.equal(createRes.status, 201);

      const agent = request.agent(app);

      const loginRes = await agent
        .post('/auth/login')
        .send({ email, password });
      assert.equal(loginRes.status, 200);
      assert.equal(loginRes.body.user.email, email);
      assert.equal(loginRes.body.user.role, 'PARTICIPANTE');

      const meRes = await agent.get('/auth/me');
      assert.equal(meRes.status, 200);
      assert.equal(meRes.body.user.email, email);

      const logoutRes = await agent.post('/auth/logout');
      assert.equal(logoutRes.status, 200);

      const afterLogoutRes = await agent.get('/auth/me');
      assert.equal(afterLogoutRes.status, 401);
    } finally {
      await prisma.user.deleteMany({ where: { email } }).catch(() => {});
    }
  });

  it('POST /events accepts date-only future payloads', async () => {
    const adminUser = await prisma.user.create({
      data: {
        name: 'Event Admin Test',
        email: `event-admin-${Date.now()}@example.com`,
        passwordHash: '',
        role: 'ADMIN',
      },
    });

    const title = `Fatec TechWeek ${Date.now()}`;

    try {
      const res = await request(app).post('/events').send({
        title,
        description: 'Evento Acadêmico',
        startDate: '2026-05-22',
        endDate: '2026-05-25',
        location: 'Auditório',
        type: 'Palestra',
        capacity: 100,
        certificateRequiredPercent: 75,
        createdByAdminId: adminUser.id,
        status: 'CRIANDO',
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.title, title);
      assert.equal(res.body.startDate, '2026-05-22T00:00:00.000Z');
      assert.equal(res.body.endDate, '2026-05-25T00:00:00.000Z');
    } finally {
      await prisma.event.deleteMany({ where: { title } }).catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: adminUser.id } })
        .catch(() => {});
    }
  });

  it('POST /events rejects invalid date strings', async () => {
    const adminUser = await prisma.user.create({
      data: {
        name: 'Event Admin Invalid Date Test',
        email: `event-admin-invalid-${Date.now()}@example.com`,
        passwordHash: '',
        role: 'ADMIN',
      },
    });

    const title = `Invalid Event ${Date.now()}`;

    try {
      const res = await request(app).post('/events').send({
        title,
        description: 'Evento Acadêmico',
        startDate: '2026-05-22',
        endDate: 'not-a-date',
        location: 'Auditório',
        type: 'Palestra',
        capacity: 100,
        certificateRequiredPercent: 75,
        createdByAdminId: adminUser.id,
        status: 'CRIANDO',
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'Data inválida em endDate.');
    } finally {
      await prisma.event.deleteMany({ where: { title } }).catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: adminUser.id } })
        .catch(() => {});
    }
  });

  it('POST /events rejects participant users', async () => {
    const participant = await prisma.user.create({
      data: {
        name: 'Event Participant Test',
        email: `event-participant-${Date.now()}@example.com`,
        passwordHash: '',
        role: 'PARTICIPANTE',
      },
    });

    const title = `Participant Event ${Date.now()}`;

    try {
      const res = await request(app).post('/events').send({
        title,
        description: 'Evento criado por participante',
        startDate: '2026-05-22',
        endDate: '2026-05-25',
        location: 'Auditório',
        type: 'Palestra',
        capacity: 100,
        certificateRequiredPercent: 75,
        createdByAdminId: participant.id,
        status: 'CRIANDO',
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'Apenas ADMIN pode criar eventos.');
    } finally {
      await prisma.event.deleteMany({ where: { title } }).catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: participant.id } })
        .catch(() => {});
    }
  });

  it('PUT /events publishes event with speakerIds in the same request', async () => {
    const adminUser = await prisma.user.create({
      data: {
        name: 'Event Publish Admin Test',
        email: `event-publish-admin-${Date.now()}@example.com`,
        passwordHash: '',
        role: 'ADMIN',
      },
    });

    const speakerRes = await request(app)
      .post('/speakers')
      .send({
        name: 'Event Publish Speaker Test',
        email: `event-publish-speaker-${Date.now()}@example.com`,
        bio: 'Bio de teste',
        institution: 'Fatec',
      });
    assert.equal(speakerRes.status, 201);
    const speaker = speakerRes.body;

    const title = `Event Publish ${Date.now()}`;
    let eventId;

    try {
      const createRes = await request(app).post('/events').send({
        title,
        description: 'Evento para publicação',
        startDate: '2026-05-22',
        endDate: '2026-05-25',
        location: 'Auditório',
        type: 'Palestra',
        capacity: 100,
        certificateRequiredPercent: 75,
        createdByAdminId: adminUser.id,
        status: 'CRIANDO',
      });
      assert.equal(createRes.status, 201);
      eventId = createRes.body.id;

      const sessionRes = await request(app)
        .post(`/events/${eventId}/sessions`)
        .send({
          sessionDate: '2026-05-23',
          startTime: '16:00',
          endTime: '18:00',
          room: 'Sala 10',
        });
      assert.equal(sessionRes.status, 201);

      const updateRes = await request(app)
        .put(`/events/${eventId}`)
        .send({
          status: 'ATIVA',
          speakerIds: [speaker.id],
        });

      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.body.status, 'ATIVA');
      assert.deepEqual(updateRes.body.speakerIds, [speaker.id]);
    } finally {
      await prisma.event.deleteMany({ where: { title } }).catch(() => {});
      await prisma.speaker
        .deleteMany({ where: { id: speaker.id } })
        .catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: adminUser.id } })
        .catch(() => {});
    }
  });

  it('DELETE /events returns a client message', async () => {
    const adminUser = await prisma.user.create({
      data: {
        name: 'Event Delete Admin Test',
        email: `event-delete-admin-${Date.now()}@example.com`,
        passwordHash: '',
        role: 'ADMIN',
      },
    });

    const title = `Delete Event ${Date.now()}`;
    let eventId;

    try {
      const eventRes = await request(app).post('/events').send({
        title,
        description: 'Evento para exclusão',
        startDate: '2026-05-22',
        endDate: '2026-05-25',
        location: 'Auditório',
        type: 'Palestra',
        capacity: 100,
        certificateRequiredPercent: 75,
        createdByAdminId: adminUser.id,
        status: 'CRIANDO',
      });

      assert.equal(eventRes.status, 201);
      eventId = eventRes.body.id;

      const deleteRes = await request(app).delete(`/events/${eventId}`);

      assert.equal(deleteRes.status, 200);
      assert.equal(deleteRes.body.message, 'Evento deletado com sucesso.');
    } finally {
      await prisma.event.deleteMany({ where: { title } }).catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: adminUser.id } })
        .catch(() => {});
    }
  });

  it('DELETE /speakers returns a client message', async () => {
    const speakerRes = await request(app)
      .post('/speakers')
      .send({
        name: 'Speaker Delete Test',
        email: `speaker-delete-${Date.now()}@example.com`,
        bio: 'Bio de teste',
        institution: 'Fatec',
      });

    assert.equal(speakerRes.status, 201);
    const speaker = speakerRes.body;
    assert.ok(speaker.id, 'speaker id present');

    const deleteRes = await request(app).delete(`/speakers/${speaker.id}`);

    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.message, 'Palestrante deletado com sucesso.');
  });

  it('DELETE /registrations returns a client message', async () => {
    const participantRes = await request(app)
      .post('/users')
      .send({
        name: 'Registration Delete Participant',
        email: `registration-delete-${Date.now()}@example.com`,
        passwordHash: 'registration-delete-password',
        role: 'PARTICIPANTE',
      });
    assert.equal(participantRes.status, 201);
    const participant = participantRes.body;

    const adminUser = await prisma.user.create({
      data: {
        name: 'Registration Delete Admin Test',
        email: `registration-delete-admin-${Date.now()}@example.com`,
        passwordHash: '',
        role: 'ADMIN',
      },
    });

    const title = `Registration Delete Event ${Date.now()}`;
    let eventId;
    let registrationId;

    try {
      const eventRes = await request(app).post('/events').send({
        title,
        description: 'Evento para exclusão de inscrição',
        startDate: '2026-05-22',
        endDate: '2026-05-25',
        location: 'Auditório',
        type: 'Palestra',
        capacity: 100,
        certificateRequiredPercent: 75,
        createdByAdminId: adminUser.id,
        status: 'ATIVA',
      });
      assert.equal(eventRes.status, 201);
      eventId = eventRes.body.id;

      const registrationRes = await request(app).post('/registrations').send({
        participantId: participant.id,
        eventId,
      });
      assert.equal(registrationRes.status, 201);
      registrationId = registrationRes.body.id;

      const deleteRes = await request(app).delete(
        `/registrations/${registrationId}`,
      );

      assert.equal(deleteRes.status, 200);
      assert.equal(deleteRes.body.message, 'Inscrição deletada com sucesso.');
    } finally {
      if (registrationId) {
        await prisma.registration
          .deleteMany({ where: { id: registrationId } })
          .catch(() => {});
      }
      await prisma.event.deleteMany({ where: { title } }).catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: adminUser.id } })
        .catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: participant.id } })
        .catch(() => {});
    }
  });

  it('POST /registrations rejects duplicate participant-event pairs', async () => {
    const participantEmail = `registration-dup-${Date.now()}@example.com`;
    const participantRes = await request(app).post('/users').send({
      name: 'Registration Dup Participant',
      email: participantEmail,
      passwordHash: 'registration-dup-password',
      role: 'PARTICIPANTE',
    });
    assert.equal(participantRes.status, 201);
    const participant = participantRes.body;

    const adminUser = await prisma.user.create({
      data: {
        name: 'Registration Dup Admin Test',
        email: `registration-dup-admin-${Date.now()}@example.com`,
        passwordHash: '',
        role: 'ADMIN',
      },
    });

    const title = `Registration Dup Event ${Date.now()}`;
    let eventId;

    try {
      const eventRes = await request(app).post('/events').send({
        title,
        description: 'Evento para teste de inscrição duplicada',
        startDate: '2026-05-22',
        endDate: '2026-05-25',
        location: 'Auditório',
        type: 'Palestra',
        capacity: 100,
        certificateRequiredPercent: 75,
        createdByAdminId: adminUser.id,
        status: 'ATIVA',
      });
      assert.equal(eventRes.status, 201);
      eventId = eventRes.body.id;

      const firstRes = await request(app).post('/registrations').send({
        participantId: participant.id,
        eventId,
      });
      assert.equal(firstRes.status, 201);

      const secondRes = await request(app).post('/registrations').send({
        participantId: participant.id,
        eventId,
      });
      assert.equal(secondRes.status, 409);
      assert.equal(
        secondRes.body.error,
        'Inscrição duplicada: este participante já está inscrito neste evento.',
      );
    } finally {
      await prisma.registration
        .deleteMany({ where: { participantId: participant.id } })
        .catch(() => {});
      await prisma.event.deleteMany({ where: { title } }).catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: adminUser.id } })
        .catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: participant.id } })
        .catch(() => {});
    }
  });

  it('DELETE /events/:eventId/sessions returns a client message', async () => {
    const adminUser = await prisma.user.create({
      data: {
        name: 'Session Delete Admin Test',
        email: `session-delete-admin-${Date.now()}@example.com`,
        passwordHash: '',
        role: 'ADMIN',
      },
    });

    const title = `Session Delete Event ${Date.now()}`;
    let eventId;
    let sessionId;

    try {
      const eventRes = await request(app).post('/events').send({
        title,
        description: 'Evento para exclusão de sessão',
        startDate: '2026-05-22',
        endDate: '2026-05-25',
        location: 'Auditório',
        type: 'Palestra',
        capacity: 100,
        certificateRequiredPercent: 75,
        createdByAdminId: adminUser.id,
        status: 'CRIANDO',
      });
      assert.equal(eventRes.status, 201);
      eventId = eventRes.body.id;

      const sessionRes = await request(app)
        .post(`/events/${eventId}/sessions`)
        .send({
          sessionDate: '2026-05-23',
          startTime: '16:00',
          endTime: '18:00',
          room: 'Sala 10',
        });
      assert.equal(sessionRes.status, 201);
      sessionId = sessionRes.body.id;

      const deleteRes = await request(app).delete(
        `/events/${eventId}/sessions/${sessionId}`,
      );

      assert.equal(deleteRes.status, 200);
      assert.equal(deleteRes.body.message, 'Sessão deletada com sucesso.');
    } finally {
      if (sessionId) {
        await prisma.eventSession
          .deleteMany({ where: { id: sessionId } })
          .catch(() => {});
      }
      await prisma.event.deleteMany({ where: { title } }).catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: adminUser.id } })
        .catch(() => {});
    }
  });

  it('POST /events/:eventId/sessions accepts date-only sessionDate payloads', async () => {
    const adminUser = await prisma.user.create({
      data: {
        name: 'Session Admin Test',
        email: `session-admin-${Date.now()}@example.com`,
        passwordHash: '',
        role: 'ADMIN',
      },
    });

    const title = `Session Event ${Date.now()}`;
    let eventId;

    try {
      const eventRes = await request(app).post('/events').send({
        title,
        description: 'Evento Acadêmico',
        startDate: '2026-05-22',
        endDate: '2026-05-25',
        location: 'Auditório',
        type: 'Palestra',
        capacity: 100,
        certificateRequiredPercent: 75,
        createdByAdminId: adminUser.id,
        status: 'CRIANDO',
      });
      assert.equal(eventRes.status, 201);
      eventId = eventRes.body.id;

      const sessionRes = await request(app)
        .post(`/events/${eventId}/sessions`)
        .send({
          sessionDate: '2026-05-23',
          startTime: '16:00',
          endTime: '18:00',
          room: 'Sala 10',
        });

      assert.equal(sessionRes.status, 201);
      assert.equal(sessionRes.body.sessionDate, '2026-05-23T00:00:00.000Z');
      assert.equal(sessionRes.body.room, 'Sala 10');
    } finally {
      if (eventId) {
        await prisma.eventSession
          .deleteMany({ where: { eventId } })
          .catch(() => {});
      }
      await prisma.event.deleteMany({ where: { title } }).catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: adminUser.id } })
        .catch(() => {});
    }
  });

  it('POST /events/:eventId/sessions rejects invalid sessionDate strings', async () => {
    const adminUser = await prisma.user.create({
      data: {
        name: 'Session Invalid Date Admin Test',
        email: `session-invalid-admin-${Date.now()}@example.com`,
        passwordHash: '',
        role: 'ADMIN',
      },
    });

    const title = `Session Invalid Event ${Date.now()}`;
    let eventId;

    try {
      const eventRes = await request(app).post('/events').send({
        title,
        description: 'Evento Acadêmico',
        startDate: '2026-05-22',
        endDate: '2026-05-25',
        location: 'Auditório',
        type: 'Palestra',
        capacity: 100,
        certificateRequiredPercent: 75,
        createdByAdminId: adminUser.id,
        status: 'CRIANDO',
      });
      assert.equal(eventRes.status, 201);
      eventId = eventRes.body.id;

      const sessionRes = await request(app)
        .post(`/events/${eventId}/sessions`)
        .send({
          sessionDate: 'not-a-date',
          startTime: '16:00',
          endTime: '18:00',
          room: 'Sala 10',
        });

      assert.equal(sessionRes.status, 400);
      assert.equal(sessionRes.body.error, 'Data inválida em sessionDate.');
    } finally {
      if (eventId) {
        await prisma.eventSession
          .deleteMany({ where: { eventId } })
          .catch(() => {});
      }
      await prisma.event.deleteMany({ where: { title } }).catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: adminUser.id } })
        .catch(() => {});
    }
  });

  it('POST /events/:eventId/sessions rejects session dates outside event range', async () => {
    const adminUser = await prisma.user.create({
      data: {
        name: 'Session Range Admin Test',
        email: `session-range-admin-${Date.now()}@example.com`,
        passwordHash: '',
        role: 'ADMIN',
      },
    });

    const title = `Session Range Event ${Date.now()}`;
    let eventId;

    try {
      const eventRes = await request(app).post('/events').send({
        title,
        description: 'Evento Acadêmico',
        startDate: '2026-05-22',
        endDate: '2026-05-25',
        location: 'Auditório',
        type: 'Palestra',
        capacity: 100,
        certificateRequiredPercent: 75,
        createdByAdminId: adminUser.id,
        status: 'CRIANDO',
      });
      assert.equal(eventRes.status, 201);
      eventId = eventRes.body.id;

      const sessionRes = await request(app)
        .post(`/events/${eventId}/sessions`)
        .send({
          sessionDate: '2026-05-26',
          startTime: '16:00',
          endTime: '18:00',
          room: 'Sala 10',
        });

      assert.equal(sessionRes.status, 400);
      assert.equal(
        sessionRes.body.error,
        'Data da sessão deve estar dentro do período do evento.',
      );
    } finally {
      if (eventId) {
        await prisma.eventSession
          .deleteMany({ where: { eventId } })
          .catch(() => {});
      }
      await prisma.event.deleteMany({ where: { title } }).catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: adminUser.id } })
        .catch(() => {});
    }
  });

  it('POST /events/:eventId/sessions accepts session dates on event boundaries', async () => {
    const adminUser = await prisma.user.create({
      data: {
        name: 'Session Boundary Admin Test',
        email: `session-boundary-admin-${Date.now()}@example.com`,
        passwordHash: '',
        role: 'ADMIN',
      },
    });

    const title = `Session Boundary Event ${Date.now()}`;
    let eventId;

    try {
      const eventRes = await request(app).post('/events').send({
        title,
        description: 'Evento para testar datas-limite',
        startDate: '2026-07-19',
        endDate: '2026-07-21',
        location: 'Auditório',
        type: 'Palestra',
        capacity: 100,
        certificateRequiredPercent: 75,
        createdByAdminId: adminUser.id,
        status: 'CRIANDO',
      });
      assert.equal(eventRes.status, 201);
      eventId = eventRes.body.id;

      const boundaryDates = ['2026-07-19', '2026-07-21'];

      for (const sessionDate of boundaryDates) {
        const sessionRes = await request(app)
          .post(`/events/${eventId}/sessions`)
          .send({
            sessionDate,
            startTime: '16:00',
            endTime: '18:00',
            room: 'Sala 10',
          });

        assert.equal(sessionRes.status, 201);
        assert.equal(sessionRes.body.sessionDate.slice(0, 10), sessionDate);
      }
    } finally {
      if (eventId) {
        await prisma.eventSession
          .deleteMany({ where: { eventId } })
          .catch(() => {});
      }
      await prisma.event.deleteMany({ where: { title } }).catch(() => {});
      await prisma.user
        .deleteMany({ where: { id: adminUser.id } })
        .catch(() => {});
    }
  });
});
