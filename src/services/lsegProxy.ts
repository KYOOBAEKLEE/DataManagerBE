import axios from 'axios';
import { CredentialManager, type RDPCredentials } from './credentialManager.js';

const RDP_AUTH_URL = 'https://api.refinitiv.com/auth/oauth2/v1/token';
const RDP_BASE_URL = 'https://api.refinitiv.com';

interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: string;
}

export class LsegProxy {
    private static tokenCache: Record<string, string> = {};

    private static async refreshAccessToken(credentials: RDPCredentials): Promise<string> {
        const cacheKey = credentials.appKey;
        try {
            console.log(`>>> Refreshing token for appKey: ${cacheKey.substring(0, 8)}...`);
            const payload = {
                username: credentials.username || '',
                password: credentials.password ? '***MASKED***' : 'MISSING',
                client_id: credentials.appKey,
                grant_type: 'password',
                scope: 'trapi',
                takeExclusiveSignOnControl: 'true'
            };
            console.log('>>> Requesting Token with:', JSON.stringify(payload, null, 2));

            const response = await axios.post(RDP_AUTH_URL, new URLSearchParams({
                username: credentials.username || '',
                password: credentials.password || '',
                client_id: credentials.appKey,
                grant_type: 'password',
                scope: 'trapi',
                takeExclusiveSignOnControl: 'true'
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const data = response.data as TokenResponse;
            this.tokenCache[cacheKey] = data.access_token;
            return data.access_token;
        } catch (error: any) {
            console.error('Error fetching RDP token:', error.response?.data || error.message);
            throw error;
        }
    }

    private static async getAccessToken(credentials: RDPCredentials, forceRefresh: boolean = false): Promise<string> {
        const cacheKey = credentials.appKey;
        if (!forceRefresh && this.tokenCache[cacheKey]) {
            return this.tokenCache[cacheKey];
        }
        return this.refreshAccessToken(credentials);
    }

    static async callApi(apiId: string, credentialType: string, options: any, isRetry: boolean = false): Promise<any> {
        console.log(`🔑 Requesting credentials for type: "${credentialType}"`);
        const credentials = CredentialManager.getCredentials(credentialType);
        console.log(`🔑 Received credentials:`, {
            username: credentials.username ? '***SET***' : 'EMPTY',
            password: credentials.password ? '***SET***' : 'EMPTY',
            appKey: credentials.appKey ? `${credentials.appKey.substring(0, 8)}...` : 'EMPTY'
        });
        let token = await this.getAccessToken(credentials);

        const { method, endpoint, query, body } = options;

        try {
            const response = await axios({
                method: method || 'GET',
                url: `${RDP_BASE_URL}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                params: method === 'GET' ? query : undefined,
                data: method !== 'GET' ? body : undefined
            });

            return response.data;
        } catch (error: any) {
            // If 401 Unauthorized and not already a retry, refresh token and try once more
            if (error.response?.status === 401 && !isRetry) {
                console.warn('Token expired or invalid (401). Retrying with fresh token...');
                // Force token refresh
                await this.getAccessToken(credentials, true);
                return this.callApi(apiId, credentialType, options, true);
            }

            console.error('API Call Error:', error.response?.data || error.message);
            // Throw the entire error object (or response data if available) so the caller can inspect status
            throw error;
        }
    }
}
