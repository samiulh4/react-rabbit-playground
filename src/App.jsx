import { useState, useEffect } from 'react';
import UserModal from './components/UserModal';
import ChatWindow from './components/ChatWindow';

function App() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing user data:', error);
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  }, []);

  const handleUserSubmit = (formData) => {
    localStorage.setItem('user', JSON.stringify(formData));
    setUser(formData);
    setShowModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
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
