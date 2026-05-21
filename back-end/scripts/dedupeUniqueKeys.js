import { prisma } from '../src/database/client.js';

async function dedupeCollection(
  collectionName,
  groupId,
  sort = { createdAt: 1, _id: 1 },
) {
  const result = await prisma.$runCommandRaw({
    aggregate: collectionName,
    pipeline: [
      { $sort: sort },
      {
        $group: {
          _id: groupId,
          ids: { $push: '$_id' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
    cursor: {},
  });

  const duplicates = result?.cursor?.firstBatch ?? [];
  let deleted = 0;

  for (const dup of duplicates) {
    const idsToDelete = (dup.ids ?? []).slice(1);
    if (!idsToDelete.length) {
      continue;
    }

    await prisma.$runCommandRaw({
      delete: collectionName,
      deletes: [
        {
          q: { _id: { $in: idsToDelete } },
          limit: 0,
        },
      ],
    });

    deleted += idsToDelete.length;
  }

  return { collectionName, duplicateGroups: duplicates.length, deleted };
}

async function main() {
  const summaries = [];

  summaries.push(await dedupeCollection('User', { email: '$email' }));
  summaries.push(await dedupeCollection('Speaker', { email: '$email' }));
  summaries.push(await dedupeCollection('Event', { title: '$title' }));
  summaries.push(
    await dedupeCollection('Registration', {
      participantId: '$participantId',
      eventId: '$eventId',
    }),
  );
  summaries.push(
    await dedupeCollection('Attendance', {
      registrationId: '$registrationId',
      eventSessionId: '$eventSessionId',
    }),
  );
  summaries.push(
    await dedupeCollection('Certificate', {
      registrationId: '$registrationId',
    }),
  );
  summaries.push(
    await dedupeCollection('Certificate', {
      verificationCode: '$verificationCode',
    }),
  );

  console.log(JSON.stringify(summaries, null, 2));
}

main()
  .catch((error) => {
    console.error('Failed to deduplicate unique keys:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
