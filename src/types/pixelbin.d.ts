declare module '@pixelbin/admin' {
  export interface PixelbinConfigOptions {
    domain: string;
    apiSecret: string;
  }

  export class PixelbinConfig {
    constructor(options: PixelbinConfigOptions);
  }

  export interface PredictionInput {
    prompt: string;
    num_images_per_prompt?: number;
    num_inference_steps?: number;
    generation_style?: string;
    aspect_ratio?: string;
    guidance_scale?: number;
    use_deepcache?: boolean;
    seed?: number;
  }

  export interface CreatePredictionParams {
    name: string;
    input: PredictionInput;
  }

  export interface PredictionResult {
    output?: {
      url?: string;
    } | string;
    url?: string;
    data?: {
      url?: string;
    };
  }

  export interface Predictions {
    createAndWait(params: CreatePredictionParams): Promise<PredictionResult>;
  }

  export class PixelbinClient {
    predictions: Predictions;
    constructor(config: PixelbinConfig);
  }
}