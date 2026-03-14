/**
 * Credits calculation and management helpers.
 *
 * Pricing model (example with margin):
 *   GPT-4o-mini  input:  $0.15 / 1M tokens  → base cost
 *   GPT-4o-mini  output: $0.60 / 1M tokens  → base cost
 *   We apply a 3x margin to cover infrastructure + profit.
 *   1 credit = $0.01 USD
 */

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },   // USD per 1M tokens
  'gpt-4o':      { input: 2.50, output: 10.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
}

const MARGIN_MULTIPLIER = 3       // 3x margin over OpenAI base cost
const USD_PER_CREDIT    = 0.01    // 1 credit = $0.01 USD

/**
 * Calculate cost and credits consumed for an API call.
 */
export function calculateCredits(
  model: string,
  tokensInput: number,
  tokensOutput: number
): { costUsd: number; creditsConsumed: number } {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['gpt-4o-mini']

  const costUsd =
    (tokensInput  / 1_000_000) * pricing.input +
    (tokensOutput / 1_000_000) * pricing.output

  const costWithMargin = costUsd * MARGIN_MULTIPLIER
  const creditsConsumed = costWithMargin / USD_PER_CREDIT

  return {
    costUsd: parseFloat(costUsd.toFixed(6)),
    creditsConsumed: parseFloat(creditsConsumed.toFixed(4)),
  }
}

/**
 * Check whether a client has enough credits to proceed.
 */
export function hasEnoughCredits(balance: number, minimum = 0): boolean {
  return balance > minimum
}

/**
 * Check if balance is below the alert threshold.
 */
export function isBelowThreshold(balance: number, threshold: number): boolean {
  return balance <= threshold
}
