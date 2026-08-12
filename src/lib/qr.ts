import QRCode from 'qrcode';

export async function qrDataUrl(url: string) {
  return QRCode.toDataURL(url, { errorCorrectionLevel: 'M', width: 400 });
}
