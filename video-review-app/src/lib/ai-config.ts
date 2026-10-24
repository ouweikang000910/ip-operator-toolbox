export type AIConfig = {
  AI_ENABLED: string;
  AI_BASE_URL: string;
  AI_MODEL: string;
  AI_API_KEY: string;
};
let config: AIConfig = {
  AI_ENABLED: "false",
  AI_BASE_URL: "https://api.openai.com/v1",
  AI_MODEL: "",
  AI_API_KEY: "",
};
export const getAIConfig = () => ({ ...config });
export function setAIConfig(value: AIConfig) {
  const u = new URL(value.AI_BASE_URL);
  if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash)
    throw new Error("服务地址必须是无凭据、无参数的 HTTPS 基础地址");
  config = {
    ...value,
    AI_BASE_URL: u.href.replace(/\/$/, ""),
    AI_MODEL: value.AI_MODEL.trim(),
    AI_ENABLED: value.AI_API_KEY && value.AI_MODEL ? "true" : "false",
  };
}
