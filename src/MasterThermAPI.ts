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

type ModuleInfoResponse = {
    moduleid: string;
    mb_addr: string;
    type: string;
    exp: string;
    pada: string;
    padb: string;
    padc: string;
    padd: string;
    pade: string;
    padf: string;
    padz: string;
    lang: string;
    reversation: number;
    givenname: string;
    surname: string;
    output: string;
    localization: string;
    password1: string;
    password2: string;
    password3: string;
    password4: string;
    password5: string;
    password6: string;
    password7: string;
    password8: string;
    password9: string;
    password10: string;
    city: string;
    notes: string;
    demo: number;
    regulation: number;
    returncode: number;
    message: string;
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
    const result = (await response.json()) as LoginResponse;

    if (result.returncode !== 0) { //error
      this.log.error(result.message);
      return result;
    } else {
      this.cookie = response.headers.get(['set-cookie']);
      this.log.debug(result.message);
      return result;
    }
  }

  /* not needed
  async moduleInfo(moduleId: string): Promise<ModuleInfoResponse> {
    const body = 'moduleid=' + moduleId + '&unitid=1';
    this.log.debug(body);
    const response = await fetch(this.BASE_URL + '/get_pumpinfo/get_pumpinfo.php', {
      method: 'POST',
      body: body,
      headers: {
        'Cookie': this.cookie,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });
    this.log.debug(await response.text());
    const result = (await response.json()) as ModuleInfoResponse;
    if (result.returncode !== 0) {
      this.log.error(result.message);
      return result;
    } else {
      this.log.debug(result.toString());
      return result;
    }
  }
*/
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
    const result = (await response.json()) as DataResponse;
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

/*
  async createUser() {
    try {
    // 👇️ const response: Response
      const response = await fetch('https://reqres.in/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'John Smith',
          job: 'manager',
        }),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error! status: ${response.status}`);
      }

      // 👇️ const result: CreateUserResponse
      const result = (await response.json()) as CreateUserResponse;
      this.log.debug
      console.log('result is: ', JSON.stringify(result, null, 4));

      return result;
    } catch (error) {
      if (error instanceof Error) {
        console.log('error message: ', error.message);
        return error.message;
      } else {
        console.log('unexpected error: ', error);
        return 'An unexpected error occurred';
      }
    }
  }*/
}