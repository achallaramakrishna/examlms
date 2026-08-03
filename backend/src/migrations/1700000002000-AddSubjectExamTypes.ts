import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes subjects exam-type-aware (NEET/KCET/JEE) so the app can be reused
 * across exam tracks that share some subjects (Physics, Chemistry) but not
 * others (Botany/Zoology are NEET/KCET-only; Mathematics is JEE/KCET-only).
 * Purely additive — existing subjects/topics/questions are untouched except
 * for the new exam_types tag.
 */
export class AddSubjectExamTypes1700000002000 implements MigrationInterface {
  name = 'AddSubjectExamTypes1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subjects" ADD COLUMN "exam_types" text NOT NULL DEFAULT ''`);

    await queryRunner.query(`UPDATE "subjects" SET "exam_types" = 'NEET,KCET,JEE' WHERE "name" IN ('Physics', 'Chemistry')`);
    await queryRunner.query(`UPDATE "subjects" SET "exam_types" = 'NEET,KCET' WHERE "name" IN ('Botany', 'Zoology')`);

    const mathResult = await queryRunner.query(`
      INSERT INTO "subjects" ("name", "code", "exam_types")
      VALUES ('Mathematics', 'MATH', 'JEE,KCET')
      ON CONFLICT ("name") DO NOTHING
      RETURNING "id"
    `);
    const mathSubjectId: string | undefined = mathResult[0]?.id;
    if (!mathSubjectId) return;

    const chapters = [
      'Sets, Relations and Functions',
      'Complex Numbers and Quadratic Equations',
      'Matrices and Determinants',
      'Permutations and Combinations',
      'Binomial Theorem and its Simple Applications',
      'Sequences and Series',
      'Limit, Continuity and Differentiability',
      'Integral Calculus',
      'Differential Equations',
      'Coordinate Geometry',
      'Three Dimensional Geometry',
      'Vector Algebra',
      'Statistics and Probability',
      'Trigonometry',
      'Mathematical Reasoning',
    ];

    for (const name of chapters) {
      await queryRunner.query(
        `INSERT INTO "topic_hierarchy" ("subject_id", "name", "level") VALUES ($1, $2, 0)`,
        [mathSubjectId, name]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "topic_hierarchy" WHERE "subject_id" = (SELECT "id" FROM "subjects" WHERE "name" = 'Mathematics')
    `);
    await queryRunner.query(`DELETE FROM "subjects" WHERE "name" = 'Mathematics'`);
    await queryRunner.query(`ALTER TABLE "subjects" DROP COLUMN "exam_types"`);
  }
}
