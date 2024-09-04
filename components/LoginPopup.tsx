import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface LoginPopupProps {
  onLogin: () => void;
  onClose: () => void;
}

const LoginPopup: React.FC<LoginPopupProps> = ({ onLogin, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email === 'demo@gmail.com' && password === 'Secure@2024') {
      const loginTime = new Date().getTime().toString(); // Convert to string
      sessionStorage.setItem('loginTime', loginTime);
      sessionStorage.setItem('isLoggedIn', 'true');
      onLogin();
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block mb-1">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block mb-1">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="flex justify-between">
            <Button type="submit">Login</Button>
            <Button onClick={onClose} variant="outline">Close</Button>
          </div>
        </form>
      </div>
    </div>
  )
};

export default LoginPopup;