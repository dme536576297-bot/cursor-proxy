export type ChatMessage = {
  role: string;
  content: string;
};

export type GenerateInput = {
  model: string;
  system?: string;
  messages: ChatMessage[];
  maxTokens?: number;
};

export type GenerateResult = {
  text: string;
  model: string;
};

export interface Backend {
  readonly name: string;
  generate(input: GenerateInput): Promise<GenerateResult>;
}
