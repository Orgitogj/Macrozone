import { AiMealScreen, useAiMealRouteParams } from '@/features/ai-meal';

export default function AiMealRoute() {
  const { destination, input } = useAiMealRouteParams();
  return <AiMealScreen initialDestination={destination} initialInput={input} />;
}
