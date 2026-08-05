-- Custom SQL migration file, put your code below! --

-- Align stored role wording with the Better Auth role catalogue:
-- the admin role key `sysAdmin` is renamed to `System_Administrator`
-- (see packages/auth/src/permissions.ts). `user.role` may hold a
-- comma-separated list, so rewrite each entry individually.
UPDATE "user"
SET "role" = (
  SELECT string_agg(
    CASE WHEN trim(entry) = 'sysAdmin' THEN 'System_Administrator' ELSE trim(entry) END,
    ','
  )
  FROM unnest(string_to_array("role", ',')) AS entry
)
WHERE "role" IS NOT NULL
  AND 'sysAdmin' IN (SELECT trim(entry) FROM unnest(string_to_array("role", ',')) AS entry);
