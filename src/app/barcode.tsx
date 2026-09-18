import { BarcodeScreen, useBarcodeRouteParams } from '@/features/barcode';

export default function BarcodeRoute() {
  const { destination, mode } = useBarcodeRouteParams();
  return <BarcodeScreen initialDestination={destination} initialMode={mode} />;
}
