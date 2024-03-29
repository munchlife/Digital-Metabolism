'use strict';

// cycleOutsiderType_4815.js (model)

// Local js modules
var metabolism = require('../../metabolismLifeModels/database');
var CycleType  = require('../../metabolismTypes/cycleTypes');

module.exports = function(brainwaveId, cycleLife) {

    var self = this;
    self.continueProcessing = true;
    self.brainwaveId         = brainwaveId;
    self.cycleLife          = cycleLife;

    self.audit = function(messageNumber, message) {
        return metabolism.BrainwaveGraph[self.brainwaveId].CycleAudit
            .create({
                cycleId: self.cycleLife.cycleId,
                messageNumber: messageNumber,
                message: message
            }, {transaction: null});
    };

    // -------------------------------------------------------------------------
    self.gpsOpen = function() {
        return self.audit(20000, ' (GPS)Open - Start')
            .then(function() {

                // Cycle fields not checked here: signalMethod,
                //                                dictionaryServiceId, dictionaryReferenceNumber
                //                                genomicsServiceId, genomicsReferenceNumber
                //                                communicationsServiceId, communicationsReferenceNumber

                if (self.cycleLife.Sequences.length !== 0)
                    throw new Error(20107, 'ERROR: attaching sequences to the cycle is not allowed');

                // Verify the required parts of the cycle life and guest are present, and all information is valid

                self.continueProcessing = false;
                return self.updateCycleStatus(CycleType.lifeStatusType.ENUM.RDYPRCS.status, 20002, ' (GPS)Open - Updated Status');
            })
            .then(function() {
                return self.audit(20001, ' (GPS)Open - Finished');
            });
    };

    self.gpsReadyForProcessing = function() {
        return self.audit(30000, ' (GPS)Ready for Processing - Start')
            .then(function() {
                return self.updateCycleStatus(CycleType.lifeStatusType.ENUM.PRCSPY.status, 30002, ' (GPS)Ready for Processing - Updated Status');
            })
            .then(function() {
                return self.audit(30001, ' (GPS)Ready for Processing - Finished');
            });
    };

    self.gpsProcessDictionary = function() {
        return self.audit(40000, ' (GPS)Process Dictionary - Start')
            .then(function() {
                self.cycleLife.dictionaryReferenceNumber = 'DICTIONARY Ref #';
                return self.cycleLife.save({ fields: ['dictionaryReferenceNumber'] });
            })
            .then(function() {
                return self.audit(40002, ' (GPS)Process Dictionary - Added Reference #');
            })
            .then(function() {
                self.continueProcessing = false;
                return self.updateCycleStatus(CycleType.lifeStatusType.ENUM.COMPLT.status, 40003, ' (GPS)Process Dictionary - Updated Status');
            })
            .then(function() {
                return self.audit(40001, ' (GPS)Process Dictionary - Finished');
            });
    };

    // -------------------------------------------------------------------------
    self.process = function() {
        self.continueProcessing = true;

        return self.audit(10000, 'Cycle Outsider Processor - Start')
            .then(function() {
                return metabolism.sequelize.Promise.while(
                    function() { return self.continueProcessing === true; },
                    function() { return self.getCurrentPipelineSection(self.cycleLife.status)(); }
                );
            })
            .catch(function(error) {
                self.audit(error.code || 10101, 'Error process(): ' + error.message);

                throw new Error('Error occurred during cycle processing; processing aborted.');
            })
            .finally(function() {
                self.audit(10001, 'Cycle Outsider Processor - Finished');
            });
    };

    // -------------------------------------------------------------------------
    self.getCurrentPipelineSection = function(status) {
        var section;

        switch (status) {
            case CycleType.lifeStatusType.ENUM.OPEN.status: // Open
                section = self.gpsOpen;
                break;

            case CycleType.lifeStatusType.ENUM.RDYPRCS.status: // Ready for Processing
                section = self.gpsReadyForProcessing;
                break;

            case CycleType.lifeStatusType.ENUM.PRCSSG.status: // Process Signal
                section = self.gpsProcessSignal;
                break;

            case CycleType.lifeStatusType.ENUM.COMPLT.status: // Complete
                throw new Error('Cycle Outsider already marked as COMPLETE');

            case CycleType.lifeStatusType.ENUM.CNCLLD.status: // Canbrainwaveed
                throw new Error('Cannot process cycle marked as CANCELLED');

            default: // UNKNOWN STATUS
                throw new Error('Unknown status in cycle');
        }

        return section;
    };

    // -------------------------------------------------------------------------
    self.updateCycleStatus = function(status, auditNumber, auditMessage) {
        switch (status) {
            case CycleType.lifeStatusType.ENUM.OPEN.status: // Open
            case CycleType.lifeStatusType.ENUM.RDYPRCS.status: // Ready for Processing
            case CycleType.lifeStatusType.ENUM.PRCSDC.status: // Process Signal
            case CycleType.lifeStatusType.ENUM.COMPLT.status: // Complete
            case CycleType.lifeStatusType.ENUM.CNCLLD.status: // Canbrainwaveed
                self.cycleLife.status = status;
                break;

            default: // UNKNOWN STATUS
                throw new Error('Cycle Outsider type \'4815\' does not support this status');
        }

        return self.cycleLife.save({ fields: ['status'] })
                .then(function() {
                    return self.audit(auditNumber, auditMessage);
                });
    };

};
