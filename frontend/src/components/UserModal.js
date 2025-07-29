import React, { useState } from 'react';
import { User, Palette, ArrowRight } from 'lucide-react';

const UserModal = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#AED6F1', '#F1948A', '#D7BDE2'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        name: name.trim(),
        color: selectedColor
      });
    } catch (error) {
      console.error('Error submitting user info:', error);
      setIsSubmitting(false);
    }
  };

  const generateRandomName = () => {
    const adjectives = [
      'Creative', 'Brilliant', 'Swift', 'Clever', 'Bold', 'Bright',
      'Smart', 'Quick', 'Sharp', 'Wise', 'Cool', 'Epic'
    ];
    const nouns = [
      'Coder', 'Developer', 'Hacker', 'Builder', 'Creator', 'Maker',
      'Architect', 'Designer', 'Engineer', 'Programmer', 'Writer', 'Thinker'
    ];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 100);
    
    setName(`${adjective}${noun}${number}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Welcome to CodeSync
              </h2>
              <p className="text-sm text-gray-600">
                Join the collaborative coding experience
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name Input */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <div className="relative">
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                maxLength={50}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={generateRandomName}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Random
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This will be visible to other collaborators
            </p>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Palette className="w-4 h-4 inline mr-2" />
              Choose Your Color
            </label>
            <div className="grid grid-cols-5 gap-3">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                    selectedColor === color
                      ? 'border-gray-800 scale-110 shadow-lg'
                      : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Your cursor and selections will appear in this color
            </p>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Preview:</p>
            <div className="flex items-center space-x-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: selectedColor }}
              >
                {name.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium text-gray-900">
                {name || 'Your Name'}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="spinner"></div>
                <span>Joining...</span>
              </>
            ) : (
              <>
                <span>Join Collaboration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full mt-0.5 flex-shrink-0"></div>
              <div>
                <p className="text-xs text-blue-800 font-medium">
                  Real-time Collaboration
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  See live cursors, edits, and chat with other users in real-time
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserModal;
