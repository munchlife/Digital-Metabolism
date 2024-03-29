'use strict';

// brainwaveField.js (model)

// Field (UUID) Version Info:
//      Version 1 - MAC address  (UNSECURE)
//      Version 2 - DCE Security (UNSECURE)
//      Version 3 - MD5 hash     (UNSECURE)
//      Version 4 - random       (currently using this version)
//      Version 5 - SHA-1 hash

module.exports = function(sequelize, DataTypes) {
    var BrainwaveField = sequelize.define('BrainwaveField', {
        fieldId: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        field: {
            type: DataTypes.STRING(40),
            allowNull: false,
            unique: true,
            validate: {
                isUUID: {
                    args: [ 4 ],
                    msg: 'Field is not in a UUIDv4 valid format'
                }
            }
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, {
        // timestamps: true,        // defaulted globally to true
        createdAt: false,
        updatedAt: false,
        paranoid:  true,            // adds deletedAt timestamp (won't actually delete entries)
        // freezeTableName: true,   // defaulted globally
        tableName: 'brainwaveFields',    // force table name to this value
        validate: {
        },
        classMethods: {
            associate: function(models) {
                BrainwaveField.hasMany(models.BrainwaveInstance,      { as: 'Instances',        foreignKey: 'brainwaveFieldId' });
                BrainwaveField.hasMany(models.Electromagnetism,  { as: 'Electromagnetism', foreignKey: 'electromagnetismId' });
             // BrainwaveField.belongsTo(models.IonosphereField, { as: 'Ionosphere',       foreignKey: 'ionosphereId' });
            }
        },
        instanceMethods: {
        }
    });

    return BrainwaveField;
};
