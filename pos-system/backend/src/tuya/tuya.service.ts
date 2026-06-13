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
    this.baseUrl = this.configService.get('TUYA_API_URL') || 'https://openapi.tuyaeu.com';
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

      if (!response.data.success) {
        throw new Error(`Tuya Auth Failed: ${response.data.msg}`);
      }

      return response.data.result.access_token;
    } catch (error) {
      this.logger.error('Failed to get Tuya access token', error.response?.data || error.message);
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

  async controlDevice(deviceId: string, status: boolean) {
    if (!this.accessKey || !this.secretKey || !deviceId) {
      this.logger.warn(`Tuya Skip: Missing configuration for device ${deviceId}`);
      return;
    }

    try {
      const accessToken = await this.getAccessToken();
      const timestamp = Date.now().toString();

      // سنحاول إرسال الكودين switch و switch_1 لضمان عمل الجهاز أياً كان نوعه
      const commands = [
        { code: 'switch_1', value: status },
        { code: 'switch', value: status }
      ];

      const body = { commands };
      const url = `/v1.0/devices/${deviceId}/commands`;

      // حساب التوقيع الخاص بالطلب
      const sign = await this.getBusinessSign('POST', url, accessToken, timestamp, body);

      const response = await axios.post(
        `${this.baseUrl}${url}`,
        body,
        {
          headers: {
            t: timestamp,
            client_id: this.accessKey,
            sign_method: 'HMAC-SHA256',
            access_token: accessToken,
            sign: sign,
          },
        },
      );

      if (response.data.success) {
        this.logger.log(`✅ Tuya Success: Device ${deviceId} set to ${status}`);
      } else {
        this.logger.error(`❌ Tuya API Error [${response.data.code}]: ${response.data.msg}`);
      }

      return response.data;
    } catch (error) {
      const errorData = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`🚨 Tuya Connection Error for ${deviceId}: ${errorData}`);
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
