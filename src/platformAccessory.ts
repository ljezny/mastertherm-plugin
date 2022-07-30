import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { DataResponse, MasterThermAPI } from './masterthermAPI';

import { MasterThermHomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class MasterThermPlatformAccessory {
  private service: Service;
  private masterThermAPI: MasterThermAPI;
  private cachedData?: DataResponse;
  constructor(
    private readonly platform: MasterThermHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.masterThermAPI = new MasterThermAPI(platform.log, platform.config);

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'MasterTherm')
      .setCharacteristic(this.platform.Characteristic.Model, 'Heat pump')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.device.id);

    this.service = this.accessory.getService(this.platform.Service.Thermostat)
    || this.accessory.addService(this.platform.Service.Thermostat);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.module_name);

    this.service.getCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState)
      .onGet(this.handleCurrentHeatingCoolingStateGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.handleTargetHeatingCoolingStateGet.bind(this))
      .onSet(this.handleTargetHeatingCoolingStateSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.handleCurrentTemperatureGet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onGet(this.handleTargetTemperatureGet.bind(this))
      .onSet(this.handleTargetTemperatureSet.bind(this));

    this.service.getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(this.handleTemperatureDisplayUnitsGet.bind(this))
      .onSet(this.handleTemperatureDisplayUnitsSet.bind(this));

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
      await this.masterThermAPI.login();
      this.cachedData = await this.masterThermAPI.getData(this.accessory.context.device.id);

      this.service.updateCharacteristic(this.platform.Characteristic.CurrentHeatingCoolingState
        , await this.handleCurrentHeatingCoolingStateGet());
      this.service.updateCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState
        , await this.handleTargetHeatingCoolingStateGet());
      this.service.updateCharacteristic(this.platform.Characteristic.TargetTemperature
        , await this.handleTargetTemperatureGet());
      this.service.updateCharacteristic(this.platform.Characteristic.CurrentTemperature
        , await this.handleCurrentTemperatureGet());
    }, 1 * 60 * 1000); //one minute
  }

  /**
   * Handle requests to get the current value of the "Current Heating Cooling State" characteristic
   */
  async handleCurrentHeatingCoolingStateGet(): Promise<CharacteristicValue> {
    this.platform.log.debug('Triggered GET CurrentHeatingCoolingState');

    const response = this.cachedData ?? await this.masterThermAPI.getData(this.accessory.context.device.id);

    if(!this.masterThermAPI.getBoolValue(response, 3)) {
      return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
    }

    const season = this.masterThermAPI.getBoolValue(response, 24);
    if(season){
      return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
    } else {
      return this.platform.Characteristic.CurrentHeatingCoolingState.COOL;
    }
  }


  /**
 * Handle requests to get the current value of the "Target Heating Cooling State" characteristic
 */
  async handleTargetHeatingCoolingStateGet(): Promise<CharacteristicValue> {
    this.platform.log.debug('Triggered GET TargetHeatingCoolingState');

    const response = this.cachedData ?? await this.masterThermAPI.getData(this.accessory.context.device.id);

    if(!this.masterThermAPI.getBoolValue(response, 3)) {
      this.platform.log.debug('Triggered GET TargetHeatingCoolingState OFF');
      return this.platform.Characteristic.TargetHeatingCoolingState.OFF;
    }

    switch(this.masterThermAPI.getIntValue(response, 50)) {
      case 0:
        this.platform.log.debug('Triggered GET TargetHeatingCoolingState AUTO');
        return this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
      case 1:
        this.platform.log.debug('Triggered GET TargetHeatingCoolingState HEAT');
        return this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
      case 2:
        this.platform.log.debug('Triggered GET TargetHeatingCoolingState COOL');
        return this.platform.Characteristic.TargetHeatingCoolingState.COOL;
    }
    this.platform.log.debug('Triggered GET TargetHeatingCoolingState AUTO (default)');
    return this.platform.Characteristic.TargetHeatingCoolingState.AUTO;
  }

  /**
 * Handle requests to set the "Target Heating Cooling State" characteristic
 */
  async handleTargetHeatingCoolingStateSet(value: CharacteristicValue) {
    this.platform.log.debug('Triggered SET TargetHeatingCoolingState:' + value.toString());

    switch(value) {
      case this.platform.Characteristic.TargetHeatingCoolingState.OFF:
        await this.masterThermAPI.setData(this.accessory.context.device.id, 'D_3', 0);
        break;
      case this.platform.Characteristic.TargetHeatingCoolingState.AUTO:
        await this.masterThermAPI.setData(this.accessory.context.device.id, 'D_3', 1);
        await this.masterThermAPI.setData(this.accessory.context.device.id, 'I_50', 0);
        break;
      case this.platform.Characteristic.TargetHeatingCoolingState.HEAT:
        await this.masterThermAPI.setData(this.accessory.context.device.id, 'D_3', 1);
        await this.masterThermAPI.setData(this.accessory.context.device.id, 'I_50', 1);
        break;
      case this.platform.Characteristic.TargetHeatingCoolingState.COOL:
        await this.masterThermAPI.setData(this.accessory.context.device.id, 'D_3', 1);
        await this.masterThermAPI.setData(this.accessory.context.device.id, 'I_50', 2);
        break;
    }
  }

  /**
 * Handle requests to get the current value of the "Current Temperature" characteristic
 */
  async handleCurrentTemperatureGet(): Promise<CharacteristicValue> {
    this.platform.log.debug('Triggered GET CurrentTemperature');

    const response = this.cachedData ?? await this.masterThermAPI.getData(this.accessory.context.device.id);
    return this.masterThermAPI.getAnalogValue(response, 211);
  }


  /**
 * Handle requests to get the current value of the "Target Temperature" characteristic
 */
  async handleTargetTemperatureGet(): Promise<CharacteristicValue> {
    this.platform.log.debug('Triggered GET TargetTemperature');

    const response = this.cachedData ?? await this.masterThermAPI.getData(this.accessory.context.device.id);
    return this.masterThermAPI.getAnalogValue(response, 191);
  }

  /**
 * Handle requests to set the "Target Temperature" characteristic
 */
  async handleTargetTemperatureSet(value: CharacteristicValue) {
    this.platform.log.debug('Triggered SET TargetTemperature:' + value.toString());

    await this.masterThermAPI.setData(this.accessory.context.device.id, 'A_191', value as number);
  }

  /**
 * Handle requests to get the current value of the "Temperature Display Units" characteristic
 */
  handleTemperatureDisplayUnitsGet() {
    this.platform.log.debug('Triggered GET TemperatureDisplayUnits');

    // set this to a valid value for TemperatureDisplayUnits
    const currentValue = this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;

    return currentValue;
  }

  /**
 * Handle requests to set the "Temperature Display Units" characteristic
 */
  handleTemperatureDisplayUnitsSet(value: CharacteristicValue) {
    this.platform.log.debug('Triggered SET TemperatureDisplayUnits:' + value.toString());
  }

}
