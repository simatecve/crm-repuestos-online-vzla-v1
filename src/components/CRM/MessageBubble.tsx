import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { MessageDisplay } from './MessageDisplay';

interface MessageBubbleProps {
  id: string;
  content: string;
  type: string;
  adjunto?: string | null;
  direction: 'sent' | 'received';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  pushname?: string | null;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  type,
  adjunto,
  direction,
  status,
  timestamp,
  pushname
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = () => {
    if (direction === 'received') return null;
    
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className={`flex flex-col ${direction === 'sent' ? 'items-end' : 'items-start'} mb-4`}>
      {direction === 'received' && pushname && (
        <span className="text-xs text-gray-500 ml-2 mb-1">{pushname}</span>
      )}
      
      <div className="flex flex-col">
        <MessageDisplay 
          content={content} 
          type={type} 
          adjunto={adjunto} 
          direction={direction} 
        />
        
        <div className={`flex items-center space-x-1 text-xs ${direction === 'sent' ? 'justify-end mr-2' : 'justify-start ml-2'}`}>
          <span className="text-gray-500">{formatTime(timestamp)}</span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
};