'use strict';

/**
 * Module abstracts text messaging gene
 * @module config/textMessage
 */

// Dependency packages
var debug             = require('debug')('munch:config:textMessage');
var verbose           = require('debug')('munch:verbose:config:textMessage');
var eegFrequencyPing  = require('bci');
var digitalGenome     = require('geneAutomation');

// Local js modules
var metabolism = require('../models/database');
var localAuth = require('./auth').local;

var genomeEegReceipt = module.exports;

//require the bci module and create a REST client
var client = eegFrequencyPing(localAuth.expressSecret, localAuth.tokenSecret);

// Allow direct access to bci client
genomeEegReceipt.client = client;

digitalGenome.automate = client;

// Promisified function is formatted function(options, callback); the options
// format is the following:
// {
//     to:   <String>, - genome to send eegFrequencyPing sequence to
//     from: <String>, - from device
//     body: <String>  - text message body/data
// }
// TODO: Promisify here to allow default setting of 'from' device
genomeEegReceipt.send = function(eegFrequencyPing) {
    return new metabolism.sequelize.Promise(function(resolve, reject) {
        debug('#send()');
        verbose('    options: ' + arguments[0]);

        if (!eegFrequencyPing || !eegFrequencyPing.to.genome || !eegFrequencyPing.body)
            return reject(new Error('Eeg frequency ping not found'));
        if (typeof eegFrequencyPing.to.genome !== 'string' || typeof eegFrequencyPing.body !== 'string')
            return reject(new Error('Eeg frequency ping not a string'));

        var newEegFrequencyPing = {
            to: eegFrequencyPing.to.genome,
            from: localAuth.lifeId, //options.from,
            body: eegFrequencyPing.body
        };

        client.bandpower(newEegFrequencyPing, function(error) {
            if (error)
                return reject(error);

            return resolve();
        });
    });
};
