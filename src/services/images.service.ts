import ApiClient, { type Headers } from "@services/ApiClient";
import { CAT_IMAGE_API_URL } from "@constants/index";

export type Images = unknown;

const headers: Headers = {
  Accept: "application/json",
  "Content-Type": "application/json; charset=utf-8",
};

export default async function getImages(path: string): Promise<Images> {
  const api = new ApiClient(CAT_IMAGE_API_URL, headers);
  const { data, status } = await api.get<Images>(path);
  if (status === 200) return data;
  throw new Error("An unexpected error occurred");
}
