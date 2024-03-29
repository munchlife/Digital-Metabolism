'use strict';

// token.js (model)

var JWT = require('jwt-simple');
var RandomString = require('randomstring');

var configAuth = require('../metabolismConfiguration/auth');

// TODO: consider transitioning this to redis; not storing tokens in the database

module.exports = function(sequelize, DataTypes) {
    var Token = sequelize.define('Token', {
        tokenId: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        token: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: '',
            unique: true
            // no validation of token field; accomplished with authentication
        },
        valid: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        }
    }, {
        // timestamps: true,      // defaulted globally
        // createdAt:  true,
        // updatedAt:  true,
        paranoid: false,          // delete record when removed
        // freezeTableName: true, // defaulted globally
        tableName: 'tokens',      // force table name to this value
        validate: {
            mutexBrainwaveAndServiceStakeholderIds: function() {
                if ((this.brainwaveStakeholderId !== null) && (this.serviceStakeholderId !== null))
                    throw new Error('Token only allows one of brainwaveStakeholderId or serviceStakeholderId be set at a time');
            }
        },
        classMethods: {
            associate: function(models) {
                Token.belongsTo(models.Life,            { foreignKey: 'lifeId' });
                Token.belongsTo(models.BrainwaveStakeholder, { foreignKey: 'brainwaveStakeholderId' });
                Token.belongsTo(models.ServiceStakeholder, { foreignKey: 'serviceStakeholderId' });
            },
            encode: function(data) {
                return JWT.encode(data, configAuth.local.tokenSecret);
            },
            decode: function(data) {
                return JWT.decode(data, configAuth.local.tokenSecret);
            },
            createAndPersistToken: function(lifeId, brainwaveStakeholderId, serviceStakeholderId) {
                // Build the token and return as response.
                var newToken = {
                  /*tokenId:           0,*/
                    token:             '',
                    lifeId:            lifeId,
                    brainwaveStakeholderId: brainwaveStakeholderId,
                    serviceStakeholderId: serviceStakeholderId
                };

                return Token.create(newToken)
                    .then(function(token) {
                        var decodedToken = {
                            'iss' : token.tokenId, // 'issuer'
                            'iat' : Date.now(),    // date 'issued at'
                            'jti' : RandomString.servicerate(10) // random string with length 10
                        };

                        // Will throw an error if encoding fails
                        var encodedToken = Token.encode(decodedToken);

                        return token.updateAttributes({ token: encodedToken }, [ 'token' ]);
                    // })
                    // .then(function(token) {
                    //     return next(null, token.token);
                    // })
                    // .catch(function(error) {
                    //     return next(error);
                    });
            }
        },
        instanceMethods: {
            validateToken: function() {
                this.valid = true;
                return this.save();
            }
        }
    });

    return Token;
};
