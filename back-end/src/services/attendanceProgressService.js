import { prisma } from '../database/client.js';

export async function recalculateRegistrationProgress(registrationId) {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      eventId: true,
      approvedAt: true,
    },
  });

  if (!registration) {
    return null;
  }

  const [event, totalSessionsCount, attendedSessionsCount] = await Promise.all([
    prisma.event.findUnique({
      where: { id: registration.eventId },
      select: { certificateRequiredPercent: true },
    }),
    prisma.eventSession.count({ where: { eventId: registration.eventId } }),
    prisma.attendance.count({
      where: { registrationId, present: true },
    }),
  ]);

  const attendancePercent =
    totalSessionsCount > 0
      ? (attendedSessionsCount / totalSessionsCount) * 100
      : 0;

  const requiredPercent = event?.certificateRequiredPercent ?? 75;
  const approvedForCertificate =
    totalSessionsCount > 0 && attendancePercent >= requiredPercent;

  const approvedAt = approvedForCertificate
    ? (registration.approvedAt ?? new Date())
    : null;

  return prisma.registration.update({
    where: { id: registrationId },
    data: {
      totalSessionsCount,
      attendedSessionsCount,
      attendancePercent,
      approvedForCertificate,
      approvedAt,
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
