-- Align external integration source key and column defaults with Ember branding

UPDATE "TeacherProfile"
SET "externalSource" = 'ember_observe'
WHERE "externalSource" = 'anaxi_observe';

UPDATE "StudentProfile"
SET "externalSource" = 'ember_observe'
WHERE "externalSource" = 'anaxi_observe';

UPDATE "Classroom"
SET "externalSource" = 'ember_observe'
WHERE "externalSource" = 'anaxi_observe';

ALTER TABLE "TeacherProfile" ALTER COLUMN "externalSource" SET DEFAULT 'ember_observe';
ALTER TABLE "StudentProfile" ALTER COLUMN "externalSource" SET DEFAULT 'ember_observe';
ALTER TABLE "Classroom" ALTER COLUMN "externalSource" SET DEFAULT 'ember_observe';
