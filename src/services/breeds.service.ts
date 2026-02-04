import ApiClient, { type Headers } from "@services/ApiClient";
import { BREEDS_API_URL } from "@constants/index";

export type Breeds = unknown;

const headers: Headers = {
  Accept: "application/json",
  "Content-Type": "application/json; charset=utf-8",
};

export default async function getBreeds(path: string): Promise<Breeds> {
  const api = new ApiClient(BREEDS_API_URL, headers);
  const { data, status } = await api.get<Breeds>(path);
  if (status === 200) return data;
  throw new Error("An unexpected error occurred");
}
