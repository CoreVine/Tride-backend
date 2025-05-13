import { Sequelize } from "sequelize";
import databaseConfig from "../config/database";
import fs from "fs";

// The model files are loaded here
const modelFiles = fs
  .readdirSync(__dirname + "/../models/")
  .filter((file) => file.endsWith(".js"));

const syncOptions = { force: process.env.SYNC_DB_FORCE === "true", alter: process.env.SYNC_DB_ALTER === "true" };

const sequelizeService = {
  connection: null,
  
  init: async () => {
    try {
      let connection = new Sequelize(databaseConfig);
      sequelizeService.connection = connection;

      /* Loading models automatically */
      const models = [];
     
      // This is where models are initialized
      for (const file of modelFiles) {
        const model = await import(`../models/${file}`);

        model.default.init(connection);
        models.push(model.default);
      }

      // This is where associations are set up
      for (const model of models) {
        model.associate && model.associate(connection.models);
      }

      console.log("[SEQUELIZE] Database service initialized");
      
      // Sync database if syncOptions is provided
      if (process.env.SYNC_DATABASE === "true") {
        if (syncOptions.force && databaseConfig.dialect === 'mysql') {
          // For MySQL, temporarily disable foreign key checks
          await connection.query('SET FOREIGN_KEY_CHECKS = 0');
          try {
            await connection.sync(syncOptions);
            console.log("[SEQUELIZE] Database synchronized successfully");
          } finally {
            // Re-enable foreign key checks
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
          }
        } else {
          // For other dialects or when force is false, use normal sync
          await connection.sync(syncOptions);
          console.log("[SEQUELIZE] Database synchronized successfully");
        }
      }
      
      return connection;
    } catch (error) {
      console.log("[SEQUELIZE] Error during database service initialization");
      throw error;
    }
  },
};

export default sequelizeService;
