import React, { useState } from 'react'; 
import axios from 'axios';
import '../styles/AIRecommendations.css';
import { FaHardHat, FaCogs, FaWrench } from 'react-icons/fa';  // Construction icons

// Background Animation Component
const BackgroundAnimation = () => {
  return (
    <div className="background-animation">
      <div className="building1"></div>
      <div className="building2"></div>
      <div className="construction"></div>
    </div>
  );
};

const AIRecommendations = () => {
  const [messages, setMessages] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [imageUrl, setImageUrl] = useState(null);

  const handleTextGuidance = async () => {
    if (!userQuery.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: userQuery }]);

    try {
      const response = await axios.post('https://127.0.0.1:5000/generate_text', {
        text: userQuery,
      });

      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: response.data.generated_text },
      ]);
    } catch (error) {
      console.error('Error getting guidance:', error);
      setMessages(prev => [
        ...prev,
        { sender: 'ai', text: 'Sorry, an error occurred. Please try again.' },
      ]);
    }

    setUserQuery('');
  };

  const handleImageGeneration = async () => {
    if (!userQuery.trim()) return;

    try {
      const response = await axios.post('https://127.0.0.1:5000/generate_image', {
        prompt: userQuery,
      });

      if (response.data.image_url) {
        setImageUrl(response.data.image_url);
      } else {
        console.error('No image generated');
      }
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  return (
    <div className="full-screen">
       {/* Main Header */}
    <div className="header">
      <h1>🏗️ FAMBZZH</h1>
      <p className="header-tagline">Building the Future with Excellence</p>
    </div>
    <div className="chat-container">
      <div className="chat-header">
        <h2>Fizzi AI</h2>
        <div className="construction-icons">
          <FaHardHat className="icon" />
          <FaCogs className="icon" />
          <FaWrench className="icon" />
        </div>
      </div>
      <div className="chat-box">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${msg.sender === 'user' ? 'user' : 'ai'}`}
          >
            <div className="message-bubble">
              <strong>{msg.sender === 'user' ? 'You' : 'FIZZI'}</strong>
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        {imageUrl && (
          <div className="image-result">
            <img src={imageUrl} alt="Generated result" />
          </div>
        )}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Type your message here..."
        />
        <button onClick={handleTextGuidance}>Send</button>
        <button onClick={handleImageGeneration}>Generate Image</button>
      </div>
    </div>
    </div>
  );
};

export default AIRecommendations;
