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
    this.baseUrl = (this.configService.get('TUYA_API_URL') || 'https://openapi.tuyaeu.com').replace(/['"]/g, '').trim();
    this.accessKey = (this.configService.get('TUYA_ACCESS_KEY') || '').replace(/['"]/g, '').trim();
    this.secretKey = (this.configService.get('TUYA_SECRET_KEY') || '').replace(/['"]/g, '').trim();

    if (this.accessKey) {
      this.logger.log(`Tuya Service Initialized for: ${this.baseUrl}`);
    }
  }

  // الدالة الرسمية لحساب التوقيع حسب معايير Tuya الحديثة
  private calculateSign(method: string, url: string, accessToken: string, timestamp: string, body: any = null): string {
    const contentHash = crypto.createHash('sha256').update(body ? JSON.stringify(body) : '').digest('hex');
    const stringToSign = [method, contentHash, '', url].join('\n');
    const signStr = this.accessKey + (accessToken || '') + timestamp + stringToSign;

    return crypto
      .createHmac('sha256', this.secretKey)
      .update(signStr)
      .digest('hex')
      .toUpperCase();
  }

  private async getAccessToken() {
    const timestamp = Date.now().toString();
    const url = '/v1.0/token?grant_type=1';

    // في طلب التوكن، يكون accessToken فارغاً
    const sign = this.calculateSign('GET', url, '', timestamp);

    try {
      const response = await axios.get(`${this.baseUrl}${url}`, {
        headers: {
          t: timestamp,
          sign_method: 'HMAC-SHA256',
          client_id: this.accessKey,
          sign: sign,
        },
      });

      if (!response.data.success) {
        throw new Error(`Tuya Auth Failed: ${response.data.msg} (Code: ${response.data.code})`);
      }

      return response.data.result.access_token;
    } catch (error) {
      this.logger.error('Failed to get Tuya access token', error.response?.data || error.message);
      throw error;
    }
  }

  async controlDevice(deviceId: string, status: boolean) {
    if (!this.accessKey || !this.secretKey || !deviceId) return;

    try {
      const accessToken = await this.getAccessToken();
      const timestamp = Date.now().toString();
      const url = `/v1.0/devices/${deviceId.trim()}/commands`;

      const body = {
        commands: [
          { code: 'switch_1', value: status },
          { code: 'switch', value: status }
        ]
      };

      const sign = this.calculateSign('POST', url, accessToken, timestamp, body);

      const response = await axios.post(`${this.baseUrl}${url}`, body, {
        headers: {
          t: timestamp,
          client_id: this.accessKey,
          sign_method: 'HMAC-SHA256',
          access_token: accessToken,
          sign: sign,
          'Content-Type': 'application/json'
        },
      });

      if (response.data.success) {
        this.logger.log(`✅ Tuya Success: Device ${deviceId} -> ${status ? 'ON' : 'OFF'}`);
      } else {
        this.logger.error(`❌ Tuya API Error [${response.data.code}]: ${response.data.msg}`);
      }

      return response.data;
    } catch (error) {
      this.logger.error(`🚨 Tuya Connection Error: ${error.message}`);
      throw error;
    }
  }
}
