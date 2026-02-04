import ApiClient, { type Headers } from "@services/ApiClient";
import { FACTS_API_URL } from "@constants/index";

export type Facts = unknown;

const headers: Headers = {
  Accept: "application/json",
  "Content-Type": "application/json; charset=utf-8",
};

export default async function getFacts(path: string): Promise<Facts> {
  const api = new ApiClient(FACTS_API_URL, headers);
  const { data, status } = await api.get<Facts>(path);
  if (status === 200) return data;
  throw new Error("An unexpected error occurred");
}
