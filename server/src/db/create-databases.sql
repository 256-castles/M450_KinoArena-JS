-- Legt die Datenbanken fuer KinoArena an (Alternative zu `npm run db:create`,
-- z. B. zum Einfuegen in phpMyAdmin unter http://localhost/phpmyadmin).

CREATE DATABASE IF NOT EXISTS kinoarena_development
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS kinoarena_test
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
