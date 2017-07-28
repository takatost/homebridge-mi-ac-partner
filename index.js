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
	this.mode = 0;

	this.services = [];

	this.powerOnOffModes = config.powerOnOffModes || {
                "on": "018011111111301402",
                "off": "018011111101301402"
	};

	// Modes supported
	this.tempModes = config.tempModes || [
                [10, {"temp": "29", "code": "018011111111301d12"}],
                [20, {"temp": "28", "code": "018011111111301c12"}],
                [30, {"temp": "27", "code": "018011111111301b12"}],
                [40, {"temp": "26", "code": "018011111111301a12"}],
                [50, {"temp": "25", "code": "018011111111301912"}],
                [60, {"temp": "24", "code": "018011111111301812"}],
                [70, {"temp": "23", "code": "018011111111301712"}],
                [80, {"temp": "22", "code": "018011111111301612"}],
                [90, {"temp": "21", "code": "018011111111301512"}],
                [100, {"temp": "20", "code": "018011111111301412"}]
	];

	// Ac Partner is not available in Homekit yet, register as Fan
	this.acPartnerService = new Service.Fan(this.name);

//	this.acPartnerService
//		.getCharacteristic(Characteristic.On)
//		.on('get', this.getPowerState.bind(this))
//		.on('set', this.setPowerState.bind(this));

	this.acPartnerService
		.getCharacteristic(Characteristic.RotationSpeed)
		.on('get', this.getTemperature.bind(this))
		.on('set', this.setTemperature.bind(this));

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

		log.debug('Discovering Mi ac partner devices...');

		// Discover device in the network
		var browser = miio.browse();
		
		browser.on('available', function(reg){
			// Skip device without token
			if(!reg.token)
				return;

			miio.device(reg).then(function(device){
				if(device.type != 'gateway')
					return;
				if(device.model != 'lumi.acpartner.v1')
					return;

				devices[reg.id] = device;
				accessory.device = device;

				log.debug('Discovered "%s" (ID: %s) on %s:%s.', reg.hostname, device.id, device.address, device.port);
			});
		});

		browser.on('unavailable', function(reg){
			// Skip device without token
			if(!reg.token)
				return;

			var device = devices[reg.id];
			
			if(!device)
				return;

			device.destroy();
			delete devices[reg.id];
		});
	},

	getPowerState: function(callback) {
		if(!this.device){
			callback(null, false);
			return;
		}

		callback(null, this.device.power);
	},

	setPowerState: function(state, callback) {
		if(!this.device){
			callback(new Error('No ac partner is discovered.'));
			return;
		}
		
		if (state) {
			if (this.mode == 0) {
				this.log.debug('Ac Partner Power on');
				this.device.call('send_cmd', [this.powerOnOffModes["on"]]);
				this.mode = 100;
			}
		} else {
			this.log.debug('Ac Partner Power off');
			this.device.call('send_cmd', [this.powerOnOffModes["off"]]);
			this.mode = 0;
		}

		callback();
	},

	getTemperature: function(callback) {
		if(!this.device){
			callback(null, 0);
			return;
		}

		callback(null, this.mode);
		return;
	},

	setTemperature: function(temp, callback) {
		if(!this.device){
			callback(new Error('No ac partner is discovered.'));
			return;
		}

		if (temp == 100) {
			this.log.debug('Ac Partner Power on');
                        this.device.call('send_cmd', [this.powerOnOffModes["on"]]);
                        this.mode = 100;
		} else if (temp == 0) {
			this.log.debug('Ac Partner Power off');
                        this.device.call('send_cmd', [this.powerOnOffModes["off"]]);
                        this.mode = 0;
		} else {
			for(var item of this.tempModes){
				if(temp <= item[0]){
					this.log.debug('Set temperature: ' + item[1]['temp']);
					var code = item[1]['code'];
					this.device.call('send_cmd', [code]);
					this.mode = item[0];
					break;
				}
			}
		}

		callback();
	},

	identify: function(callback) {
		callback();
	},

	getServices: function() {
		return this.services;
	}
};
