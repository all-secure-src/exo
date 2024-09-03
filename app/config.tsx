export const config = {
    textChunkSize: 1000,
    textChunkOverlap: 400,
    numberOfSimilarityResults: 4,
    numberOfPagesToScan: 10,
    inferenceModel: 'accounts/fireworks/models/llama-v3p1-405b-instruct',
    inferenceAPIKey: "UXGdzMVrpGnTV344kCUAMbA9mCPHRwvmGQpPzyFTGZOGaS2X",
    llmBaseUrl: 'https://api.fireworks.ai/inference/v1',
    usApiEndpoint: 'https://api.us.inc',
    useFunctionCalling: true,
};