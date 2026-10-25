import { useState } from 'react';
import { Key, Eye, EyeOff, Lock } from 'lucide-react';
import { Button, Input, Modal } from '../ui';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: string, key: string) => Promise<void>;
  provider: string | null;
  providerName: string;
  ephemeral?: boolean;
}

export const ApiKeyModal = ({
  isOpen,
  onClose,
  onSave,
  provider,
  providerName,
  ephemeral = false,
}: ApiKeyModalProps) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API Key Is Required');
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      await onSave(provider || '', apiKey.trim());
      setApiKey('');
      setIsSaving(false);
    } catch {
      setError('Invalid API Key. Please Check & Try Again.');
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setApiKey('');
    setError('');
    setShowKey(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Add ${providerName} API Key`}>
      <div className="space-y-4">
        <p className="font-mono text-sm text-wharf-text-secondary capitalize">
          {ephemeral
            ? `Enter your ${providerName} API key. It stays in this tab's session storage and is sent only with generation requests.`
            : `Enter your ${providerName} API key. Your key will be encrypted before storage.`}
        </p>

        <div className="space-y-2">
          <label className="font-mono text-sm ml-1 font-bold text-wharf-text-secondary uppercase tracking-wider">
            API Key
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Key className="w-4 h-4 text-wharf-text-tertiary" />
            </div>
            <Input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError('');
              }}
              placeholder={`Paste Your ${providerName} API Key...`}
              className="pl-9 font-mono text-sm rounded-xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 group cursor-pointer transition-colors"
              type="button"
            >
              {showKey ? (
                <EyeOff className="w-4 h-4 text-wharf-text-tertiary group-hover:text-black transition-colors" />
              ) : (
                <Eye className="w-4 h-4 text-wharf-text-tertiary group-hover:text-black transition-colors" />
              )}
            </button>
          </div>
          {error && <p className="font-mono text-xs text-wharf-error">{error}</p>}
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            rounded="2xl"
            onClick={handleSave}
            loading={isSaving}
            className="flex-1"
          >
            {isSaving ? 'Verifying...' : 'Verify & Save'}
          </Button>
          <Button variant="outline" rounded="2xl" onClick={handleClose}>
            Cancel
          </Button>
        </div>

        <div className="p-3 mt-6 border-2 border-wharf-border-secondary bg-wharf-surface-secondary rounded-2xl">
          <div className="flex items-start gap-2 font-mono text-xs text-wharf-text-secondary capitalize">
            <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              {ephemeral
                ? 'This key is never saved to the Wharf database and clears when the browser session ends.'
                : 'Your key is encrypted with AES-256-GCM. We never store keys in plaintext...'}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
