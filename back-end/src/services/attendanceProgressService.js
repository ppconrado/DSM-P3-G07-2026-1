import { prisma } from '../database/client.js';

export async function recalculateRegistrationProgress(registrationId) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { eventId: true },
  });

  if (!registration) {
    return null;
  }

  const [totalSessionsCount, attendedSessionsCount] = await Promise.all([
    prisma.eventSession.count({ where: { eventId: registration.eventId } }),
    prisma.attendance.count({
      where: { registrationId, present: true },
    }),
  ]);

  const attendancePercent =
    totalSessionsCount > 0
      ? (attendedSessionsCount / totalSessionsCount) * 100
      : 0;

  return prisma.registration.update({
    where: { id: registrationId },
    data: {
      totalSessionsCount,
      attendedSessionsCount,
      attendancePercent,
    },
  });
}

export async function recalculateRegistrationsForEvent(eventId) {
  const registrations = await prisma.registration.findMany({
    where: { eventId },
    select: { id: true },
  });

  const updatedRegistrations = [];
  for (const registration of registrations) {
    const updated = await recalculateRegistrationProgress(registration.id);
    if (updated) {
      updatedRegistrations.push(updated);
    }
  }

  return updatedRegistrations;
}
