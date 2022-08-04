import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { DataResponse, MasterThermAPI } from './masterthermAPI';

import { MasterThermHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class TemperatureSensorAccessory {
  private service: Service;
  private masterThermAPI: MasterThermAPI;
  private cachedData?: DataResponse;
  constructor(
    private readonly platform: MasterThermHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private readonly name: string,
    private readonly valueId: number,
  ) {
    this.masterThermAPI = new MasterThermAPI(platform.log, platform.config);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'MasterTherm')
      .setCharacteristic(this.platform.Characteristic.Model, 'Heat pump')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.id);

    this.service = this.accessory.getService(this.platform.Service.TemperatureSensor)
      || this.accessory.addService(this.platform.Service.TemperatureSensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.name);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */


    setInterval(async () => {
      try {
        await this.masterThermAPI.login();
        this.cachedData = await this.masterThermAPI.getData(this.accessory.context.device.id);

        this.service.updateCharacteristic(this.platform.Characteristic.CurrentTemperature
          , await this.handleCurrentTemperatureGet());
      } catch {
        platform.log.error('Interval update failure');
      }
    }, 1 * 60 * 1000); //one minute
  }

  /**
 * Handle requests to get the current value of the "Current Temperature" characteristic
 */
  async handleCurrentTemperatureGet(): Promise<CharacteristicValue> {
    try {
      this.platform.log.debug('Triggered GET CurrentTemperature');

      const response = this.cachedData ?? await this.masterThermAPI.getData(this.accessory.context.device.id);
      return this.masterThermAPI.getAnalogValue(response, this.valueId);
    } catch {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }
}
