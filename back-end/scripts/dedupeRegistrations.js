import { prisma } from '../src/database/client.js';

async function main() {
  const grouped = await prisma.$runCommandRaw({
    aggregate: 'Registration',
    pipeline: [
      {
        $sort: {
          participantId: 1,
          eventId: 1,
          createdAt: 1,
          _id: 1,
        },
      },
      {
        $group: {
          _id: {
            participantId: '$participantId',
            eventId: '$eventId',
          },
          ids: { $push: '$_id' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
    cursor: {},
  });

  const duplicates = grouped?.cursor?.firstBatch ?? [];

  let deletedCount = 0;

  for (const dup of duplicates) {
    const idsToDelete = (dup.ids ?? []).slice(1);
    if (idsToDelete.length === 0) {
      continue;
    }

    await prisma.$runCommandRaw({
      delete: 'Registration',
      deletes: [
        {
          q: { _id: { $in: idsToDelete } },
          limit: 0,
        },
      ],
    });

    deletedCount += idsToDelete.length;
  }

  console.log(
    JSON.stringify(
      {
        duplicateGroups: duplicates.length,
        deletedRegistrations: deletedCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error('Failed to deduplicate registrations:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
