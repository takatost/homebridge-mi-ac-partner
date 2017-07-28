# homebridge-mi-ac-partner

This is Xiaomi Mi Ac Partner plugin for [Homebridge](https://github.com/nfarina/homebridge). Since Apple Homekit is not supporting ac partner device yet, this plugin will add the ac partner as **Fan** to your Home app.

### Features

* Switch on / off.

* Control modes:

  - Lift ac partner temperature between 1 - 100%.

    **Notes:** Alternatively, you can ask Siri to change the fan speed within the range to adjust the ac partner mode. Example:

    ```
    Hey Siri, change the ac partner speed to 100.
    ```

    ​

### Installation

1. Install required packages.

   ```
   npm install -g homebridge-mi-ac-partner miio
   ```

   ​

2. Add following accessory to the `config.json`.

   ```
     "accessories": [
       {
		"accessory": "MiAcPartner",
                "name": "Ac Partner",
                "powerOnOffModes": {
                       "on": "018011111111301402",
                       "off": "018011111101301402"
                },
                "tempModes": [
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
                ]

       }
     ]
   ```

   ​

3. Restart Homebridge, and your Mi ac partner will be discovered automatically.



### License

See the [LICENSE](https://github.com/takatost/homebridge-mi-ac-partner/blob/master/LICENSE.md) file for license rights and limitations (MIT).



