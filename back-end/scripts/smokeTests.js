import 'dotenv/config';
// Use global fetch available in Node 18+

const base = 'http://localhost:8888';

function asList(payload) {
  return payload?.cursor?.firstBatch || payload || [];
}

function pickId(item) {
  return item?._id?.$oid || item?.id || item?._id;
}

async function run() {
  console.log('Running smoke tests...');

  // 1. GET events
  const evRes = await fetch(`${base}/events`);
  console.log('/events', evRes.status);
  const events = await evRes.json();
  const evList = asList(events);
  console.log('events count:', evList.length);

  // 2. GET speakers
  const spRes = await fetch(`${base}/speakers`);
  console.log('/speakers', spRes.status);
  const speakers = await spRes.json();
  const spList = asList(speakers);
  console.log('speakers count:', spList.length);

  const usersRes = await fetch(`${base}/users`);
  console.log('/users', usersRes.status);
  const users = await usersRes.json();
  const userList = asList(users);
  console.log('users count:', userList.length);

  // 3. GET users, registrations, attendance, certificates
  const usersRes = await fetch(`${base}/users`);
  console.log('/users', usersRes.status);
  const users = await usersRes.json();
  const userList = asList(users);
  console.log('users count:', userList.length);

  const registrationsRes = await fetch(`${base}/registrations`);
  console.log('/registrations', registrationsRes.status);
  const registrations = await registrationsRes.json();
  const regList = asList(registrations);
  console.log('registrations count:', regList.length);

  const attendanceRes = await fetch(
    `${base}/registrations/${regList[0] ? pickId(regList[0]) : ''}/attendance`,
  );
  console.log(
    '/registrations/:registrationId/attendance',
    attendanceRes.status,
  );
  const attendancePayload = attendanceRes.ok ? await attendanceRes.json() : [];
  console.log('attendance count:', asList(attendancePayload).length);

  const certificatesRes = await fetch(`${base}/certificates`);
  console.log('/certificates', certificatesRes.status);
  const certificates = await certificatesRes.json();
  const certificateList = asList(certificates);
  console.log('certificates count:', certificateList.length);

  // pick seeded event (title contains 'Seed Event') and seeded speaker (email = speaker@example.com) if present
  const event =
    evList.find(
      (e) =>
        (e.title && e.title.includes('Seed Event')) ||
        (e.name && e.name.includes('Seed Event')),
    ) || evList[0];
  const speaker =
    spList.find(
      (s) =>
        s.email === 'speaker@example.com' ||
        s.email === 'guest.speaker@example.com' ||
        (s.name && s.name.includes('Seed Speaker')),
    ) || spList[0];
  if (!event || !speaker) {
    console.log('No event or speaker available for further tests.');
    return;
  }

  const eventId = pickId(event);
  const speakerId = pickId(speaker);
  console.log({ eventId, speakerId });

  const eventDetailRes = await fetch(`${base}/events/${eventId}`);
  console.log('GET /events/:id', eventDetailRes.status);
  console.log(await eventDetailRes.json());

  const speakerDetailRes = await fetch(`${base}/speakers/${speakerId}`);
  console.log('GET /speakers/:id', speakerDetailRes.status);
  console.log(await speakerDetailRes.json());

  const registration = regList.find((reg) => pickId(reg)) || null;
  if (registration) {
    const registrationId = pickId(registration);
    const registrationDetailRes = await fetch(
      `${base}/registrations/${registrationId}`,
    );
    console.log('GET /registrations/:id', registrationDetailRes.status);
    console.log(await registrationDetailRes.json());

    const registrationAttendanceRes = await fetch(
      `${base}/registrations/${registrationId}/attendance`,
    );
    console.log(
      'GET /registrations/:registrationId/attendance',
      registrationAttendanceRes.status,
    );
    console.log(await registrationAttendanceRes.json());

    const certificate = certificateList.find((item) => pickId(item)) || null;
    if (certificate) {
      const certificateDetailRes = await fetch(
        `${base}/certificates/${pickId(certificate)}`,
      );
      console.log('GET /certificates/:id', certificateDetailRes.status);
      console.log(await certificateDetailRes.json());
    }
  }

  // 3. Create a temporary speaker and link it to the event via Speaker.eventIds
  const tempSpeakerRes = await fetch(`${base}/speakers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Seed Speaker ${Date.now()}`,
      email: `speaker+${Date.now()}@example.com`,
      bio: 'Smoke test speaker',
    }),
  });
  console.log('POST /speakers', tempSpeakerRes.status);
  const tempSpeaker = await tempSpeakerRes.json();
  const tempSpeakerId = pickId(tempSpeaker);

  const tempSpeakerExistingEventIds = Array.isArray(tempSpeaker.eventIds)
    ? tempSpeaker.eventIds
    : [];
  const updatedEventIds = tempSpeakerExistingEventIds.includes(eventId)
    ? tempSpeakerExistingEventIds
    : [...tempSpeakerExistingEventIds, eventId];
  const linkRes = await fetch(`${base}/speakers/${tempSpeakerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventIds: updatedEventIds }),
  });
  console.log('PUT /speakers/:id (eventIds)', linkRes.status);
  try {
    console.log(await linkRes.json());
  } catch (e) {}

  const verifySpeakerRes = await fetch(`${base}/speakers/${tempSpeakerId}`);
  const verifySpeaker = await verifySpeakerRes.json();
  console.log(
    'linked event present:',
    Array.isArray(verifySpeaker.eventIds) &&
      verifySpeaker.eventIds.includes(eventId),
  );

  // 4. Create participant as User with role PARTICIPANTE
  const pRes = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Seed Participant',
      email: `participant+${Date.now()}@example.com`,
      passwordHash: '',
      role: 'PARTICIPANTE',
    }),
  });
  console.log('POST /users (participant)', pRes.status);
  const participant = await pRes.json();
  const participantId = pickId(participant);
  console.log('participant id', participantId);

  const userCreateRes = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Smoke User ${Date.now()}`,
      email: `user+${Date.now()}@example.com`,
      passwordHash: 'smoke-user-password',
      role: 'ADMIN',
    }),
  });
  console.log('POST /users', userCreateRes.status);
  const createdUser = await userCreateRes.json();
  const createdUserId = pickId(createdUser);

  const userUpdateRes = await fetch(`${base}/users/${createdUserId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '(11) 99999-9999' }),
  });
  console.log('PATCH /users/:id', userUpdateRes.status);

  await fetch(`${base}/users/${createdUserId}`, { method: 'DELETE' });

  // 5. Create registration (include totalSessionsCount)
  const registrationBody = {
    participantId,
    eventId,
    totalSessionsCount: 1,
  };
  const regRes = await fetch(`${base}/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registrationBody),
  });
  console.log('POST /registrations', regRes.status);
  try {
    console.log(await regRes.json());
  } catch (e) {}

  await fetch(`${base}/speakers/${tempSpeakerId}`, { method: 'DELETE' });
  await fetch(`${base}/users/${participantId}`, { method: 'DELETE' });

  console.log('Smoke tests finished.');
}

run().catch((e) => {
  console.error('Smoke tests error', e);
  process.exit(1);
});
