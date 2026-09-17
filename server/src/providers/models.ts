export type ProviderEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export type ModelCapabilities = {
  imageInput: true;
  structuredOutputs: true;
  efforts: readonly ProviderEffort[];
};

const ALL_EFFORTS: readonly ProviderEffort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

export const SUPPORTED_MODELS: Readonly<Record<string, ModelCapabilities>> = {
  'claude-sonnet-5': { imageInput: true, structuredOutputs: true, efforts: ALL_EFFORTS },
  'claude-opus-5': { imageInput: true, structuredOutputs: true, efforts: ALL_EFFORTS },
};

export const DEFAULT_MODEL = 'claude-sonnet-5';

export const DEFAULT_EFFORT: ProviderEffort = 'medium';

export function isSupportedModel(model: string): boolean {
  return Object.hasOwn(SUPPORTED_MODELS, model);
}

export function isEffortSupported(model: string, effort: string): effort is ProviderEffort {
  return isSupportedModel(model) && (SUPPORTED_MODELS[model].efforts as readonly string[]).includes(effort);
}
