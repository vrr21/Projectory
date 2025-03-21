const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Task = sequelize.define(
    "Task",
    {
      TaskID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      Title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      Description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      Status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "To Do", // Например: "To Do", "In Progress", "Done"
      },
      DueDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      CreatedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "UserID",
        },
      },
    },
    {
      tableName: "Tasks",
      timestamps: true, // Включаем createdAt и updatedAt
    }
  );

  return Task;
};