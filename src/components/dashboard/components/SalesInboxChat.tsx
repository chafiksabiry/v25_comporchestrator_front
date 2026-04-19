import React, { useState, useEffect } from 'react';
import { 
  isConnectedToZoho, 
  getSalesInboxMessages, 
  sendSalesInboxMessage,
  getSalesInboxContacts
} from '../services/zohoService';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
}

export const SalesInboxChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // Vérifier si connecté à Zoho et charger les données
  useEffect(() => {
    const loadSalesInboxData = async () => {
      setLoading(true);
      setError(null);

      // Vérifier si connecté à Zoho
      if (!isConnectedToZoho()) {
        setError('Not connected to Zoho. Please connect in the integrations panel.');
        setLoading(false);
        return;
      }

      try {
        // Charger les messages
        const messagesResult = await getSalesInboxMessages();
        if (messagesResult.success) {
          setMessages(messagesResult.data);
        } else {
          setError(messagesResult.error || 'Failed to load messages');
        }

        // Charger les contacts
        const contactsResult = await getSalesInboxContacts();
        if (contactsResult.success) {
          setContacts(contactsResult.data);
        } else {
          console.error('Failed to load contacts:', contactsResult.error);
        }
      } catch (err) {
        setError('Failed to load SalesInbox data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadSalesInboxData();
  }, []);

  // Envoyer un message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    try {
      const result = await sendSalesInboxMessage({
        to: selectedContact,
        content: newMessage
      });

      if (result.success) {
        // Ajouter le message à la liste locale
        setMessages(prev => [...prev, {
          id: Math.random().toString(36).substring(2, 9),
          sender: 'me',
          content: newMessage,
          timestamp: new Date()
        }]);
        
        setNewMessage('');
      } else {
        setError(result.error || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    }
  };

  // Si pas connecté à Zoho, afficher un message
  if (!isConnectedToZoho()) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg p-4">
        <p className="text-gray-600 mb-4">
          You need to connect to Zoho CRM to use the SalesInbox.
        </p>
        <a 
          href="/integrations" 
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
        >
          Go to Integrations
        </a>
      </div>
    );
  }

  // Afficher un message de chargement
  if (loading) {
    return <div className="p-4 text-center">Loading SalesInbox...</div>;
  }

  // Afficher un message d'erreur
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Liste des contacts */}
      <div className="p-4 border-b">
        <h3 className="font-medium mb-2">Contacts</h3>
        <div className="flex flex-wrap gap-2">
          {contacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact.id)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedContact === contact.id 
                  ? 'bg-cyan-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {contact.name}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet</p>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`p-3 rounded-lg max-w-3/4 ${
                message.sender === 'me'
                  ? 'bg-cyan-100 text-cyan-800 ml-auto'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p>{message.content}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input pour nouveau message */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            disabled={!selectedContact}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !selectedContact}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesInboxChat; 
