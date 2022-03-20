import { Logger, PlatformConfig } from 'homebridge';
import fetch from 'node-fetch';
import sha1 from 'sha1';

type DataErrorResponse = {
    errorId: number;
    errorMessage: string;
};

type DataResponse = {
  timestamp: number;
  data: any;
  error: DataErrorResponse;
};

type ModuleResponse = {
    id: number;
    module_name: string;
};

type LoginResponse = {
    returncode: number;
    message: string;
    modules: [ModuleResponse];
};

export class MasterThermAPI {
  constructor(
        public readonly log: Logger,
        public readonly config: PlatformConfig,
  ) {
  }

  private cookie = '';
  private messageId = 1;

  readonly BASE_URL = 'https://mastertherm.vip-it.cz/plugins';
  readonly PARAMS_BASE_URL = 'https://mastertherm.vip-it.cz/mt';

  async login(): Promise<LoginResponse> {
    const body = 'login=login&uname=' + (this.config.username ?? '') + '&upwd=' + sha1(this.config.password ?? '');
    this.log.debug(body);
    const response = await fetch(this.BASE_URL + '/mastertherm_login/client_login.php', {
      method: 'POST',
      body: body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });
    const jsonResult = await response.json();
    this.log.debug(jsonResult);
    const result = jsonResult as LoginResponse;

    if (result.returncode !== 0) { //error
      this.log.error(result.message);
      return result;
    } else {
      this.cookie = response.headers.get(['set-cookie']);
      this.log.debug(result.message);
      return result;
    }
  }

  async getData(moduleId: string): Promise<DataResponse> {
    this.messageId++;

    const body = 'messageId=' + this.messageId + '&moduleId=' + moduleId + '&fullRange=true';
    this.log.debug(body);
    const response = await fetch(this.PARAMS_BASE_URL + '/PassiveVizualizationServlet', {
      method: 'POST',
      body: body,
      headers: {
        'Cookie': this.cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });
    const jsonResult = await response.json();
    this.log.debug(jsonResult);
    const result = jsonResult as DataResponse;
    if (result.error.errorId !== 0) {
      this.log.error(result.error.errorMessage);
      return result;
    } else {
      return result;
    }
  }

  async setData(moduleId: string, parameter: string, value: number): Promise<DataResponse> {
    this.messageId++;

    const body = 'messageId=' + this.messageId + '&moduleId=' + moduleId
        + '&deviceId=1&configFile=varfile_mt1_config&errorResponse=true&variableId='
        + parameter + '&variableValue='+ value;
    this.log.debug(body);
    this.log.debug(this.cookie);
    const response = await fetch(this.PARAMS_BASE_URL + '/ActiveVizualizationServlet', {
      method: 'POST',
      body: body,
      headers: {
        'Cookie': this.cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });
    const jsonResult = await response.json();
    this.log.debug(jsonResult);
    const result = jsonResult as DataResponse;
    if (result.error.errorId !== 0) {
      this.log.error(result.error.errorMessage);
      return result;
    } else {
      return result;
    }
  }

  getAnalogValue(dataResponse: DataResponse, id: number):number {
    return dataResponse.data['varfile_mt1_config1']['001']['A_'+id] as number;
  }

  getBoolValue(dataResponse: DataResponse, id: number):boolean {
    return dataResponse.data['varfile_mt1_config1']['001']['D_'+id] as boolean;
  }

  getIntValue(dataResponse: DataResponse, id: number):number {
    return dataResponse.data['varfile_mt1_config1']['001']['I_'+id] as number;
  }
}