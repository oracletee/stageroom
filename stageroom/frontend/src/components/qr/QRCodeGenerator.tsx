import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  label?: string;
}

export function QRCodeGenerator({ value, size = 200, label }: QRCodeGeneratorProps) {
  return (
    <div className="text-center">
      <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
        <QRCodeSVG value={value} size={size} />
      </div>
      {label && <p className="text-sm text-gray-500 mt-2">{label}</p>}
    </div>
  );
}
