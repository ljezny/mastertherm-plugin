import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HeatPumpThermostatAccessory } from './HeatPumpThermostatAccessory';
import { DataResponse, MasterThermAPI } from './masterthermAPI';
import { TemperatureSensorAccessory } from './TemperatureSensorAccessory';
import { HotWaterThermostatAccessory } from './HotWaterThermostatAccessory';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class MasterThermHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  public data!: DataResponse;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  async discoverDevices() {
    const masterThermApi = new MasterThermAPI(this.log, this.config);
    const loginResponse = await masterThermApi.login();
    if (loginResponse.returncode === 0) {

      setInterval(async () => {
        try {
          await masterThermApi.login();
        } catch {
          this.log.error('Interval login failure');
        }
      }, 10 * 60 * 1000); //10 minutes

      for (const moduleInfo of loginResponse.modules) {
        this.data = await masterThermApi.getData(moduleInfo.id.toString());
        const dataResponse = this.data;

        setInterval(async () => {
          try {
            this.data = await masterThermApi.getData(moduleInfo.id.toString());
          } catch {
            this.log.error('Interval getData failure');
          }
        }, 2 * 60 * 1000); //2 minutes

        {
          const uuid = this.api.hap.uuid.generate(moduleInfo.id.toString() + 'HeatPump');
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new HeatPumpThermostatAccessory(this, existingAccessory, masterThermApi);
          } else {
            this.log.info('Adding new accessory:', moduleInfo.module_name);
            const accessory = new this.api.platformAccessory('Heating thermostat', uuid);
            accessory.context.device = moduleInfo;
            new HeatPumpThermostatAccessory(this, accessory, masterThermApi);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        }

        {
          const uuid = this.api.hap.uuid.generate(moduleInfo.id.toString() + 'IndoorTemp');
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new TemperatureSensorAccessory(this, existingAccessory, 'Indoor', 211, masterThermApi);
          } else {
            this.log.info('Adding new accessory:', moduleInfo.module_name);
            const accessory = new this.api.platformAccessory('Indoor temperature', uuid);
            accessory.context.device = moduleInfo;
            new TemperatureSensorAccessory(this, accessory, 'Indoor', 211, masterThermApi);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        }

        {
          const uuid = this.api.hap.uuid.generate(moduleInfo.id.toString() + 'OutdoorTemp');
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new TemperatureSensorAccessory(this, existingAccessory, 'Outdoor', 3, masterThermApi);
          } else {
            this.log.info('Adding new accessory:', moduleInfo.module_name);
            const accessory = new this.api.platformAccessory('Outdoor temperature', uuid);
            accessory.context.device = moduleInfo;
            new TemperatureSensorAccessory(this, accessory, 'Outdoor', 3, masterThermApi);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        }

        {
          const uuid = this.api.hap.uuid.generate(moduleInfo.id.toString() + 'HotWater');
          const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
          if (existingAccessory) {
            this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
            new HotWaterThermostatAccessory(this, existingAccessory,
              masterThermApi.getAnalogValue(dataResponse, 296), masterThermApi.getAnalogValue(dataResponse, 297), masterThermApi);
          } else {
            this.log.info('Adding new accessory:', moduleInfo.module_name);
            const accessory = new this.api.platformAccessory('Hot water system', uuid);
            accessory.context.device = moduleInfo;
            new HotWaterThermostatAccessory(this, accessory,
              masterThermApi.getAnalogValue(dataResponse, 296), masterThermApi.getAnalogValue(dataResponse, 297), masterThermApi);
            this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
          }
        }
      }
    }
  }
}
