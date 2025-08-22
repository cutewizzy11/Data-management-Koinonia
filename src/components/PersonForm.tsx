import React, { useState } from 'react';
import { Save, User, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import ImageUpload from './ImageUpload';
import { useGCSBackup } from '../hooks/useGCSBackup';

interface PersonFormData {
  name: string;
  email: string;
  phone: string;
  image?: string;
}

interface PersonFormProps {
  onSubmit?: (data: PersonFormData) => void;
  initialData?: Partial<PersonFormData>;
  submitButtonText?: string;
}

const PersonForm: React.FC<PersonFormProps> = ({
  onSubmit,
  initialData = {},
  submitButtonText = 'Save Person'
}) => {
  const [formData, setFormData] = useState<PersonFormData>({
    name: initialData.name || '',
    email: initialData.email || '',
    phone: initialData.phone || '',
    image: initialData.image || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isBackingUp, backupSingle } = useGCSBackup();

  const handleInputChange = (field: keyof PersonFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUploaded = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, image: imageUrl }));
    toast.success('Image uploaded', { 
      description: 'Profile picture has been saved to Google Cloud Storage' 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // If the image is a Google Drive link, back it up to GCS on submit
      if (formData.image && formData.image.includes('drive.google.com')) {
        const res = await backupSingle(formData.image, {
          personId: formData.email,
          personName: formData.name,
          type: 'applicant',
          fieldType: 'image',
          source: 'form-submit'
        });
        if (res.success && res.gcsUrl) {
          setFormData(prev => ({ ...prev, image: res.gcsUrl }));
        }
      }

      // Simulate API call or call your save endpoint
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onSubmit?.(formData);
      
      toast.success('Person saved successfully', {
        description: formData.image 
          ? 'Profile with image saved to Google Cloud Storage'
          : 'Profile saved (no image uploaded)'
      });
      
      // Reset form after successful submission
      setFormData({
        name: '',
        email: '',
        phone: '',
        image: ''
      });
      
    } catch (error) {
      console.error('Submit failed:', error);
      toast.error('Failed to save person', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <User className="text-blue-600" size={24} />
        {initialData.name ? 'Edit Person' : 'Add New Person'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload Section */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Profile Picture
          </label>
          <ImageUpload
            onImageUploaded={handleImageUploaded}
            currentImageUrl={formData.image}
            personId={formData.email || 'new-person'}
            personName={formData.name}
            disabled={isSubmitting || isBackingUp}
          />
          {(isBackingUp) && (
            <p className="text-sm text-blue-600">Backing up image to cloud...</p>
          )}
          {formData.image && !formData.image.includes('drive.google.com') && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              ✓ Image saved to Google Cloud Storage
            </p>
          )}
        </div>

        {/* Name Field */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Full Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter full name"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email address"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Phone Field */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter phone number"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: '',
                email: '',
                phone: '',
                image: ''
              });
            }}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !formData.name.trim() || !formData.email.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                {submitButtonText}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Form Data Preview (for development) */}
      {import.meta.env.DEV && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Form Data (Dev Only)</h3>
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PersonForm;