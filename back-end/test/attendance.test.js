import request from 'supertest';
import assert from 'assert';
import app from '../src/app.js';
import { prisma } from '../src/database/client.js';

describe('Attendance admin-only rule', function () {
  this.timeout(20000);

  let adminUser;
  let participant;
  let event;
  let session;
  let registration;

  before(async () => {
    // create admin user directly via prisma
    adminUser = await prisma.user.create({
      data: {
        name: 'Admin Test',
        email: `admin-${Date.now()}@example.com`,
        passwordHash: '',
        role: 'ADMIN',
      },
    });

    // create participant via the unified users API
    const email = `participant-${Date.now()}@example.com`;
    const createRes = await request(app).post('/users').send({
      name: 'Participant Test',
      email,
      passwordHash: 'participant-test-password',
      role: 'PARTICIPANTE',
    });
    assert.equal(createRes.status, 201);
    participant = createRes.body;

    // create event (published ATIVA)
    const now = new Date();
    const later = new Date(now.getTime() + 1000 * 60 * 60 * 24);
    const evRes = await request(app)
      .post('/events')
      .send({
        title: `Event Test ${Date.now()}`,
        description: 'Integration event',
        startDate: now.toISOString(),
        endDate: later.toISOString(),
        location: 'Online',
        type: 'Curso',
        capacity: 10,
        certificateRequiredPercent: 75,
        speakerIds: [],
        createdByAdminId: adminUser.id,
        status: 'ATIVA',
      });
    assert.equal(evRes.status, 201);
    event = evRes.body;

    // create event session
    const sessRes = await request(app)
      .post(`/events/${event.id}/sessions`)
      .send({
        sessionDate: now.toISOString(),
        startTime: '09:00',
        endTime: '11:00',
      });
    assert.equal(sessRes.status, 201);
    session = sessRes.body;

    // create registration
    const regRes = await request(app).post('/registrations').send({
      participantId: participant.id,
      eventId: event.id,
    });
    assert.equal(regRes.status, 201);
    registration = regRes.body;
  });

  after(async () => {
    // cleanup created data
    await prisma.attendance
      .deleteMany({ where: { registrationId: registration.id } })
      .catch(() => {});
    await prisma.registration
      .deleteMany({ where: { id: registration.id } })
      .catch(() => {});
    await prisma.eventSession
      .deleteMany({ where: { id: session.id } })
      .catch(() => {});
    await prisma.event.deleteMany({ where: { id: event.id } }).catch(() => {});
    await prisma.user
      .deleteMany({ where: { id: adminUser.id } })
      .catch(() => {});
    await prisma.user
      .deleteMany({ where: { id: participant.id } })
      .catch(() => {});
  });

  it('should reject marking attendance by non-admin', async () => {
    const res = await request(app)
      .post(`/registrations/${registration.id}/attendance`)
      .send({
        eventSessionId: session.id,
        present: true,
        markedByUserId: participant.id,
      });
    assert.equal(res.status, 403);
  });

  it('should allow marking attendance by admin', async () => {
    const res = await request(app)
      .post(`/registrations/${registration.id}/attendance`)
      .send({
        eventSessionId: session.id,
        present: true,
        markedByUserId: adminUser.id,
      });
    assert.equal(res.status, 201);
    const att = res.body;
    assert.equal(att.registrationId, registration.id);
    assert.equal(att.eventSessionId, session.id);
  });

  it('should reject invalid attendance date strings', async () => {
    const res = await request(app)
      .post(`/registrations/${registration.id}/attendance`)
      .send({
        eventSessionId: session.id,
        present: true,
        markedByUserId: adminUser.id,
        checkInAt: 'not-a-date',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Data inválida em checkInAt.');
  });

  it('should reject malformed event session ids', async () => {
    const res = await request(app)
      .post(`/registrations/${registration.id}/attendance`)
      .send({
        eventSessionId: '6a0e26f4901a0b53815a2da',
        present: true,
        markedByUserId: adminUser.id,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'ID inválido em eventSessionId.');
  });

  it('should reject invalid certificate date strings', async () => {
    const res = await request(app).post('/certificates').send({
      registrationId: registration.id,
      pdfUrl: 'https://example.com/certificate.pdf',
      issuedByAdminId: adminUser.id,
      issueDate: 'invalid-date',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Data inválida em issueDate.');
  });
});
