require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const fs = require("fs");
const config = {
  dialect: "mysql",
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || "admisiones_crm",
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  timezone: "+00:00",
  logging: false,
  seederStorage: "sequelize",
  dialectOptions:
    process.env.DB_SSL === "true"
      ? {
          ssl: {
            rejectUnauthorized: true,
            ...(process.env.DB_SSL_CA
              ? { ca: fs.readFileSync(process.env.DB_SSL_CA, "utf8") }
              : {}),
          },
        }
      : {},
};
module.exports = {
  development: config,
  test: {
    ...config,
    database: process.env.DB_TEST_NAME || "admisiones_crm_test",
  },
  production: config,
};
