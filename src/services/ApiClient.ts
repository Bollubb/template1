import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

export type Headers = Record<string, string>;

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string, headers: Headers) {
    this.client = axios.create({
      baseURL,
      headers,
      timeout: 15000,
    });
  }

  get<T = unknown>(path: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(path, config);
  }
}

export default ApiClient;
