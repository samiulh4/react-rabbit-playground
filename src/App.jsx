import { useState, useEffect } from 'react';
import UserModal from './components/UserModal';
import ChatWindow from './components/ChatWindow';

function App() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const getSavedUsers = () => {
    const savedUsers = localStorage.getItem('chatUsers');
    if (!savedUsers) return [];

    try {
      return JSON.parse(savedUsers);
    } catch (error) {
      console.error('Error parsing stored users:', error);
      return [];
    }
  };

  const saveUsers = (users) => {
    localStorage.setItem('chatUsers', JSON.stringify(users));
  };

  const setCurrentUser = (userData) => {
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setUser(userData);
    setShowModal(false);
  };

  useEffect(() => {
    const savedCurrentUser = localStorage.getItem('currentUser');
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
      if (!response.ok) {
        return { error: data?.error || 'Unable to register. Please try again.' };
      }

      if (data?.error) {
        return { error: data.error };
      }

      return { success: true, user: data.user ?? { name: formData.name, email: formData.email } };
    } catch (error) {
      console.error('Error registering user:', error);
      return { error: 'Unable to register. Please check your network or server and try again.' };
    }
  };

  const handleUserSubmit = async (formData, mode) => {
    const users = getSavedUsers();

    if (mode === 'register') {
      const result = await registerUser(formData);
      if (result.error) {
        return result;
      }

      const newUser = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      };

      saveUsers([...users, newUser]);
      return { success: true };
    }

    if (mode === 'login') {
      const existingUser = users.find(
        (entry) => entry.email === formData.email && entry.password === formData.password,
      );

      if (!existingUser) {
        return { error: 'Invalid email or password. Please try again.' };
      }

      setCurrentUser({ name: existingUser.name, email: existingUser.email });
      return { success: true };
    }

    return { error: 'Unknown auth mode.' };
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
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
