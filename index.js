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
	this.codePrefix = "0180111111";

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
        17: "11",
        16: "10"
	};

	// Ac Partner is not available in Homekit yet, register as Fan
	this.acPartnerService = new Service.Thermostat(this.name);

  	this.acPartnerService
  		.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    	.on('set', this.setTargetHeatingCoolingState.bind(this))
    	.on('get', this.getTargetHeatingCoolingState.bind(this));

    this.acPartnerService
    	.getCharacteristic(Characteristic.CurrentHeatingCoolingState)    
    	.on('get', this.getCurrentHeatingCoolingState.bind(this));

	this.acPartnerService
		.getCharacteristic(Characteristic.TargetTemperature)
	    .setProps({
	        maxValue: 30,
	        minValue: 16,
	        minStep: 1
	    })
	    .on('set', this.setTargetTemperature.bind(this))
	    .on('get', this.getTargetTemperature.bind(this));

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

            if(reg.type != 'gateway') {
					return;
			}	

			if(reg.model != 'lumi.acpartner.v1') {
				return;
			}

            reg.token = token;

			miio.device(reg).then(function(device){
				devices[reg.id] = device;
				accessory.device = device;

				log.debug('Discovered "%s" (ID: %s) on %s:%s.', reg.hostname, device.id, device.address, device.port);
			});
		});

		browser.on('unavailable', function(reg){
			var device = devices[reg.id];
			
			if(!device)
				return;

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

	getCurrentHeatingCoolingState: function(callback) {
    	callback(null, this.TargetHeatingCoolingState);
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

			this.log.debug('Set temperature: ' + TargetTemperature);
			this.SendCmd();
	    }

	    callback();
	},

	identify: function(callback) {
		callback();
	},

	getServices: function() {
		return this.services;
	},

	SendCmd: function() {
		var code = this.codePrefix
				 + ((this.TargetHeatingCoolingState != Characteristic.TargetHeatingCoolingState.OFF) ? "1" : "0")	// Power
				 + ((this.TargetHeatingCoolingState != Characteristic.TargetHeatingCoolingState.OFF) ? this.stateMaps[this.TargetHeatingCoolingState] : "2")
				 + "3"	// Speed
				 + "0"
				 + this.tempMaps[this.TargetTemperature]
				 + "02";	// Light

		this.log.debug("code: " + code);

		this.device.call('send_cmd', [code]);
	}
};
