import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class TuyaService {
  private readonly logger = new Logger(TuyaService.name);
  private readonly baseUrl: string;
  private readonly accessKey: string;
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get('TUYA_API_URL'); // e.g., https://openapi.tuyaeu.com
    this.accessKey = this.configService.get('TUYA_ACCESS_KEY');
    this.secretKey = this.configService.get('TUYA_SECRET_KEY');
  }

  private async getAccessToken() {
    const timestamp = Date.now().toString();
    const sign = this.calcSign(this.accessKey, timestamp, this.secretKey);

    try {
      const response = await axios.get(`${this.baseUrl}/v1.0/token?grant_type=1`, {
        headers: {
          t: timestamp,
          sign_method: 'HMAC-SHA256',
          client_id: this.accessKey,
          sign: sign,
        },
      });
      return response.data.result.access_token;
    } catch (error) {
      this.logger.error('Failed to get Tuya access token', error.stack);
      throw error;
    }
  }

  private calcSign(clientId: string, timestamp: string, secret: string) {
    const str = clientId + timestamp;
    return crypto
      .createHmac('sha256', secret)
      .update(str)
      .digest('hex')
      .toUpperCase();
  }

  private calcBusinessSign(clientId: string, accessToken: string, timestamp: string, nonce: string, signUrl: string, secret: string) {
    const contentHash = crypto.createHash('sha256').update('').digest('hex');
    const stringToSign = ['GET', contentHash, '', signUrl].join('\n');
    const str = clientId + accessToken + timestamp + nonce + stringToSign;
    return crypto
      .createHmac('sha256', secret)
      .update(str)
      .digest('hex')
      .toUpperCase();
  }

  async controlDevice(deviceId: string, status: boolean) {
    const accessToken = await this.getAccessToken();
    const timestamp = Date.now().toString();

    const commands = [
      {
        code: 'switch_1', // Standard code for Tuya smart plugs
        value: status,
      },
    ];

    try {
      const response = await axios.post(
        `${this.baseUrl}/v1.0/devices/${deviceId}/commands`,
        { commands },
        {
          headers: {
            t: timestamp,
            client_id: this.accessKey,
            sign_method: 'HMAC-SHA256',
            access_token: accessToken,
            sign: await this.getBusinessSign('POST', `/v1.0/devices/${deviceId}/commands`, accessToken, timestamp, { commands }),
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to control Tuya device ${deviceId}`, error.stack);
      throw error;
    }
  }

  private async getBusinessSign(method: string, url: string, accessToken: string, timestamp: string, body: any = {}) {
    const contentHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
    const stringToSign = [method, contentHash, '', url].join('\n');
    const str = this.accessKey + accessToken + timestamp + stringToSign;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(str)
      .digest('hex')
      .toUpperCase();
  }
}
