import fetch from 'node-fetch';
import { Logger, PlatformConfig } from 'homebridge';

export class MasterThermAPI {
  constructor(
        public readonly log: Logger,
        public readonly config: PlatformConfig,
  ) {
  }

  readonly BASE_URL = 'https://mastertherm.vip-it.cz/plugins';

  async login() {
    const response = await fetch(this.BASE_URL + 'mastertherm_login/client_login.php', {
      method: 'POST',
      body: 'login=login&uname=' + this.config.name ?? '&upwd' + (this.config.password ?? ''),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });
    this.log.info(await response.text());
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