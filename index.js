var miio = require('miio');
var Accessory, Service, Characteristic;
var devices = [];

module.exports = function(homebridge) {
    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory('homebridge-mi-ac-partner', 'MiAcPartner', MiAcPartner);
}

function MiAcPartner(log, config) {
    this.log = log;
    this.name = config.name || 'Ac Partner';
    this.token = config.token;

    this.TargetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.OFF;
    this.TargetTemperature = 23;

    var presets = require('./presets.json');

    if (!presets[config.brand] || !presets[config.brand][config.preset_no]) {
        log.error('Brand or preset_no invalid');
    } else {
        this.codeTpl = presets[config.brand][config.preset_no];
    }

    this.services = [];

    this.stateMaps = {
        3: "2",
        2: "1",
        1: "0",
    };

    this.tempMaps = {
        30: "1e",
        29: "1d",
        28: "1c",
        27: "1b",
        26: "1a",
        25: "19",
        24: "18",
        23: "17",
        22: "16",
        21: "15",
        20: "14",
        19: "13",
        18: "12",
        17: "11"
    };

    // Ac Partner is not available in Homekit yet, register as Fan
    this.acPartnerService = new Service.Thermostat(this.name);

      this.acPartnerService
          .getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .on('set', this.setTargetHeatingCoolingState.bind(this))
        .on('get', this.getTargetHeatingCoolingState.bind(this));

    this.acPartnerService
        .getCharacteristic(Characteristic.TargetTemperature)
        .setProps({
            maxValue: 30,
            minValue: 17,
            minStep: 1
        })
        .on('set', this.setTargetTemperature.bind(this))
        .on('get', this.getTargetTemperature.bind(this));

    this.acPartnerService
        .getCharacteristic(Characteristic.CurrentTemperature)
        .setProps({
            maxValue: 30,
            minValue: 17,
            minStep: 1
        })
        .on('get', this.getCurrentTemperature.bind(this));;

    this.services.push(this.acPartnerService);

    this.serviceInfo = new Service.AccessoryInformation();

    this.serviceInfo
        .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
        .setCharacteristic(Characteristic.Model, 'Ac Partner');
    
    this.services.push(this.serviceInfo);

    this.discover();
}

MiAcPartner.prototype = {
    discover: function(){
        var accessory = this;
        var log = this.log;
        var token = this.token;

        log.debug('Discovering Mi ac partner devices...');

        // Discover device in the network
        var browser = miio.browse();
        
        browser.on('available', function(reg){
            if (!token) {
                log.debug('token is invalid');
                return;
            }

            if(reg.model != 'lumi.acpartner.v1' && reg.model != 'lumi.acpartner.v2') {
                return;
            }

            reg.token = token;

            miio.device(reg)
                .then(function(device){
                	if (devices.length > 0) {
                        return;
                    }

                    devices[reg.id] = device;
                    accessory.device = device;

                    log.debug('Discovered "%s" (ID: %s) on %s:%s.', reg.hostname, device.id, device.address, device.port);
                }).catch(function(e) {
                	if (devices.length > 0) {
                        return;
                    }
                    
                    log.error('Device "%s" (ID: %s) register failed: %s (Maybe invalid token?)', reg.hostname, reg.id, e.message);
                });
        });

        browser.on('unavailable', function(reg){
            if(reg.model != 'lumi.acpartner.v1' && reg.model != 'lumi.acpartner.v2') {
                return;
            }

            var device = devices[reg.id];
            
            if(!device) {
                return;
            }

            device.destroy();
            delete devices[reg.id];
        });
    },

    getTargetHeatingCoolingState: function(callback) {
        callback(null, this.TargetHeatingCoolingState);
    },

    setTargetHeatingCoolingState: function(TargetHeatingCoolingState, callback, context) {
        if(context !== 'fromSetValue') {
            this.TargetHeatingCoolingState = TargetHeatingCoolingState;
            if (this.TargetHeatingCoolingState == Characteristic.TargetHeatingCoolingState.OFF) {
                this.log.debug('Ac Partner Power off');
            } else {
                this.log.debug('Set TargetHeatingCoolingState: ' + this.TargetHeatingCoolingState);
            }

            this.SendCmd();
        }
        callback();
    },

    getTargetTemperature: function(callback) {
        callback(null, this.TargetTemperature);
    },

    setTargetTemperature: function(TargetTemperature, callback, context) {
        if(context !== 'fromSetValue') {
              this.TargetTemperature = TargetTemperature;
              if (this.TargetHeatingCoolingState == Characteristic.TargetHeatingCoolingState.OFF) {
                  this.TargetHeatingCoolingState = Characteristic.TargetHeatingCoolingState.AUTO;
              }

            // Update current temperature
            this.acPartnerService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .updateValue(parseFloat(TargetTemperature));

            this.log.debug('Set temperature: ' + TargetTemperature);
            this.SendCmd();
        }

        callback();
    },

    getCurrentTemperature: function(callback) {
        this.log("CurrentTemperature %s", this.TargetTemperature);
        callback(null, parseFloat(this.TargetTemperature));
    },

    identify: function(callback) {
        callback();
    },

    getServices: function() {
        return this.services;
    },

    SendCmd: function() {
        if (!this.device) {
            this.log.error('Device not exists.');
            return;
        }

        if (!this.codeTpl) {
            this.log.error('Command code invalid, brand or preset_no not set?')
            return;
        }

        var code = this.codeTpl
                .replace("p", ((this.TargetHeatingCoolingState != Characteristic.TargetHeatingCoolingState.OFF) ? "1" : "0"))    // Power
                .replace("m", ((this.TargetHeatingCoolingState != Characteristic.TargetHeatingCoolingState.OFF) ? this.stateMaps[this.TargetHeatingCoolingState] : "2"))
                .replace("tt", this.tempMaps[this.TargetTemperature]);

        this.log.debug("code: " + code);

        this.device.call('send_cmd', [code]);
    }
};
