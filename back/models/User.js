const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "Users",
    {
      UserID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      EmployeeID: {
        type: DataTypes.INTEGER,
        unique: true,
        allowNull: false,
      },
      Username: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false,
      },
      Email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
      },
      PasswordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      IsAdmin: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: 0,
      },
      Role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: [["Администратор", "Сотрудник"]],
        },
      },
    },
    {
      tableName: "Users",
      timestamps: false,
    }
  );

  return User;
};