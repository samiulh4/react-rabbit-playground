import { useState, useEffect } from 'react';
import UserModal from './components/UserModal';
import ChatWindow from './components/ChatWindow';


function App() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const setCurrentUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setShowModal(false);
  };

  useEffect(() => {
    const savedCurrentUser = localStorage.getItem('user');
    if (savedCurrentUser) {
      try {
        setUser(JSON.parse(savedCurrentUser));
      } catch (error) {
        console.error('Error parsing current user:', error);
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  }, []);

  const registerUser = async (formData) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/user/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json().catch(() => ({}));
    
      return data;
    } catch (error) {
      console.error('Error registering user:', error);
      return { error: 'Unable to register. Please check your network or server and try again.' };
    }
  };

  const loginUser = async (formData) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      return data;
    } catch (error) {
      console.error('Error logging in:', error);
      return { error: 'Unable to login. Please check your network or server and try again.' };
    }
  };

  const handleUserSubmit = async (formData, mode) => {

    if (mode === 'register') {
      const response = await registerUser(formData);
      if (response.success) {
        return { success: true }
      } else {
        return { error: response.message || 'Unable to register. Please try again.' }
      }
    }

    if (mode === 'login') {
      const response = await loginUser(formData);
      if (response.success) {
        setCurrentUser(response.data?.user ? response.data.user : '');
        return { success: true };
      } else {
        return { error: response.message || 'Invalid email or password. Please try again.' };
      }
    }

    return { error: 'Unknown auth mode.' };
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setShowModal(true);
  };

  return (
    <>
      {showModal && <UserModal onSubmit={handleUserSubmit} />}
      {user && !showModal && <ChatWindow user={user} onLogout={handleLogout} />}
    </>
  );
}

export default App;
