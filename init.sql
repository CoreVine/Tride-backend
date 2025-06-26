-- init.sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
FLUSH PRIVILEGES;

-- Optional: Create a dedicated user for your Node.js app (recommended for production)
-- CREATE USER 'myapp_user'@'%' IDENTIFIED WITH mysql_native_password BY 'myapp_password';
-- GRANT ALL PRIVILEGES ON myapp.* TO 'myapp_user'@'%';
-- FLUSH PRIVILEGES;