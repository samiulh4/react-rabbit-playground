import { useState } from 'react';
import Swal from "sweetalert2";

function UserModal({ onSubmit }) {
  const [mode, setMode] = useState('register');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  const validateForm = () => {
    const newErrors = {};

    if (mode === 'register' && !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'register') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    setAuthError('');
    setAuthSuccess('');
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const authResult = await onSubmit(
      {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      },
      mode,
    );

    if (authResult?.error) {
      setAuthError(authResult.error);
      Swal.fire({
        title: "Error!",
        text: authResult.error,
        icon: "error",
        confirmButtonText: "OK"
      });
      return;
    }

    if (mode === 'register' && authResult?.success) {
      setAuthSuccess('Registration succeeded. Please login to continue.');
      setMode('login');
      setFormData((prev) => ({
        ...prev,
        password: '',
        confirmPassword: '',
        name: '',
      }));
      Swal.fire({
        title: "Success!",
        text: "Registration succeeded. Please login to continue.",
        icon: "success",
        confirmButtonText: "OK"
      });
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setErrors({});
    setAuthError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    if (authError) {
      setAuthError('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-1">
              {mode === 'register' ? 'Create an Account' : 'Login to Chat'}
            </h2>
            <p className="text-gray-600">
              {mode === 'register'
                ? 'Register a new account or switch to login if you already have one.'
                : 'Sign in with your email and password to continue.'}
            </p>
          </div>
          <div className="rounded-full bg-gray-100 p-1 flex items-center">
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`px-3 py-1 text-sm font-semibold rounded-lg transition ${mode === 'register'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
                }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`ml-2 px-3 py-1 text-sm font-semibold rounded-lg transition ${mode === 'login'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
                }`}
            >
              Login
            </button>
          </div>
        </div>

        {authError && <p className="text-red-500 text-sm mb-4">{authError}</p>}
        {authSuccess && <p className="text-green-600 text-sm mb-4">{authSuccess}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition duration-200 transform hover:scale-105 mt-6"
          >
            {mode === 'register' ? 'Register Account' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default UserModal;
