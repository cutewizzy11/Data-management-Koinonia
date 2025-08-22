import { X, Image as ImageIcon } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  signatureUrl?: string;
}

const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  personName,
  signatureUrl
}) => {
  if (!isOpen) return null;

  // Convert relative URLs to work in both development and production
  const getAbsoluteImageUrl = (url?: string) => {
    if (!url) return url;
    if (url.startsWith('http')) return url; // Already absolute
    if (url.startsWith('/images/')) {
      // Prefer same-origin to avoid cross-origin blocks (CORP/COEP) during development
      // Vite serves public/images at the same origin in dev; Express serves /images in prod
      return url;
    }
    return url;
  };

  const resolvedUrl = getAbsoluteImageUrl(signatureUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Signature - {personName}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {resolvedUrl ? (
            <img
              src={resolvedUrl}
              alt={`${personName}'s signature`}
              className="max-h-[70vh] w-auto mx-auto"
              onError={(e) => {
                // Fallback to same-origin path if an absolute URL was attempted
                const target = e.currentTarget as HTMLImageElement;
                if (signatureUrl && signatureUrl.startsWith('/images/')) {
                  target.src = signatureUrl;
                }
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500">
              <ImageIcon className="h-12 w-12 mb-2" />
              <p>No signature available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;